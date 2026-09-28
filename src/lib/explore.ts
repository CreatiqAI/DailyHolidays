import "server-only";
import { createPublicClient } from "@/lib/supabase/server";
import { getDestinations } from "@/lib/queries";
import { todayISO } from "@/lib/format";
import type { Tables } from "@/lib/database.types";
import geoIndex from "../../public/geo/index.json";

// Natural Earth names that differ from ours
const GEO_ALIASES: Record<string, string> = {
  "United States": "United States of America",
  Macau: "Macao",
  "Czech Republic": "Czechia",
};

const SPOTS_PER_DESTINATION = 40;

export type ExploreTour = {
  id: string;
  slug: string;
  title: string;
  tour_type: Tables<"tours">["tour_type"];
  duration_days: number | null;
  duration_nights: number | null;
  price_from_myr: number | null;
  cover_image_url: string | null;
  next_departure: string | null;
  departure_count: number;
  months: string[]; // YYYY-MM of upcoming departures
};

/** An itinerary stop with a map position; revealed when zooming into an area. */
export type ExploreSpot = { name: string; lat: number; lng: number };

export type ExploreArea = {
  id: string;
  name: string;
  slug: string;
  lat: number | null;
  lng: number | null;
  image: string | null; // a tour photo from this area, used for its map pin
  spots: ExploreSpot[];
  tours: ExploreTour[];
};

export type ExploreCountry = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  geoId: string | null; // file in public/geo
  tourCount: number;
  areas: ExploreArea[];
  tours: ExploreTour[]; // tours filed under the country itself, not an area
  spots: ExploreSpot[]; // stops of those country-level tours
};

/** Upcoming departures first (soonest), then by title. */
export function sortExploreTours(a: ExploreTour, b: ExploreTour) {
  if (a.next_departure && b.next_departure) return a.next_departure.localeCompare(b.next_departure);
  if (a.next_departure) return -1;
  if (b.next_departure) return 1;
  return a.title.localeCompare(b.title);
}

/** Countries with published tours, most tours first, each with its areas as map pins. */
export async function getExploreCountries(limit = 10): Promise<ExploreCountry[]> {
  const today = todayISO();
  const supabase = createPublicClient();
  const [destinations, { data, error }, { data: placeRows, error: placeError }] = await Promise.all([
    getDestinations(),
    supabase
      .from("tours")
      .select(
        "id, slug, title, tour_type, duration_days, duration_nights, price_from_myr, cover_image_url, destination_id, tour_departures(departure_date, status)",
      )
      .eq("status", "published"),
    supabase.from("places").select("name, lat, lng, destination_id").not("lat", "is", null).not("lng", "is", null).order("name"),
  ]);
  if (error) throw error;
  if (placeError) throw placeError;

  const spotsByDest = new Map<string, ExploreSpot[]>();
  for (const p of placeRows) {
    if (!p.destination_id || p.lat == null || p.lng == null) continue;
    const list = spotsByDest.get(p.destination_id) ?? [];
    if (list.length >= SPOTS_PER_DESTINATION || list.some((s) => s.name.toLowerCase() === p.name.toLowerCase())) continue;
    list.push({ name: p.name, lat: p.lat, lng: p.lng });
    spotsByDest.set(p.destination_id, list);
  }

  const byId = new Map(destinations.map((d) => [d.id, d]));
  const countries = new Map<string, ExploreCountry>();

  for (const t of data) {
    const dest = t.destination_id ? byId.get(t.destination_id) : undefined;
    if (!dest) continue;
    const country = dest.parent_id ? byId.get(dest.parent_id) : dest;
    if (!country) continue;

    let c = countries.get(country.id);
    if (!c) {
      const geoName = GEO_ALIASES[country.name] ?? country.name;
      c = {
        id: country.id,
        name: country.name,
        slug: country.slug,
        image: country.cover_image_url,
        geoId: (geoIndex as Record<string, string>)[geoName] ?? null,
        tourCount: 0,
        areas: [],
        tours: [],
        spots: spotsByDest.get(country.id) ?? [],
      };
      countries.set(country.id, c);
    }

    const upcoming = t.tour_departures
      .filter((d) => d.departure_date >= today && d.status !== "cancelled")
      .map((d) => d.departure_date)
      .sort();
    const tour: ExploreTour = {
      id: t.id,
      slug: t.slug,
      title: t.title,
      tour_type: t.tour_type,
      duration_days: t.duration_days,
      duration_nights: t.duration_nights,
      price_from_myr: t.price_from_myr,
      cover_image_url: t.cover_image_url,
      next_departure: upcoming[0] ?? null,
      departure_count: upcoming.length,
      months: [...new Set(upcoming.map((d) => d.slice(0, 7)))],
    };

    c.tourCount++;
    if (!c.image && t.cover_image_url) c.image = t.cover_image_url;
    if (dest.parent_id) {
      let area = c.areas.find((a) => a.id === dest.id);
      if (!area) {
        area = {
          id: dest.id,
          name: dest.name,
          slug: dest.slug,
          lat: dest.lat,
          lng: dest.lng,
          image: dest.cover_image_url,
          spots: spotsByDest.get(dest.id) ?? [],
          tours: [],
        };
        c.areas.push(area);
      }
      if (!area.image && tour.cover_image_url) area.image = tour.cover_image_url;
      area.tours.push(tour);
    } else {
      c.tours.push(tour);
    }
  }

  for (const c of countries.values()) {
    c.areas.sort((a, b) => b.tours.length - a.tours.length || a.name.localeCompare(b.name));
    for (const a of c.areas) a.tours.sort(sortExploreTours);
    c.tours.sort(sortExploreTours);
  }

  return [...countries.values()].sort((a, b) => b.tourCount - a.tourCount || a.name.localeCompare(b.name)).slice(0, limit);
}
