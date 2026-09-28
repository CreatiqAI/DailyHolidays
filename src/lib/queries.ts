import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/format";
import type { Tables } from "@/lib/database.types";
import { PUBLIC_MEDIA, type MediaStatus } from "@/lib/place-enrich";

export type Destination = Tables<"destinations">;

export type TourCard = Pick<
  Tables<"tours">,
  "id" | "slug" | "title" | "tour_type" | "duration_days" | "duration_nights" | "price_from_myr" | "cover_image_url" | "summary"
> & {
  destination: Pick<Destination, "id" | "name" | "slug" | "region" | "parent_id"> | null;
  next_departure: string | null;
  departure_count: number;
};

const cardSelect =
  "id, slug, title, tour_type, duration_days, duration_nights, price_from_myr, cover_image_url, summary, destination:destinations(id, name, slug, region, parent_id), tour_departures(departure_date, status)";

type CardRow = Omit<TourCard, "next_departure" | "departure_count"> & {
  tour_departures: { departure_date: string; status: string }[];
};

function toCard(row: CardRow, today: string): TourCard {
  const { tour_departures, ...rest } = row;
  const upcoming = tour_departures
    .filter((d) => d.departure_date >= today && d.status !== "cancelled")
    .map((d) => d.departure_date)
    .sort();
  return { ...rest, next_departure: upcoming[0] ?? null, departure_count: upcoming.length };
}

/** Upcoming departures first (soonest first), then everything else by title. */
function sortCards(a: TourCard, b: TourCard) {
  if (a.next_departure && b.next_departure) return a.next_departure.localeCompare(b.next_departure);
  if (a.next_departure) return -1;
  if (b.next_departure) return 1;
  return a.title.localeCompare(b.title);
}

export const getDestinations = cache(async () => {
  const { data, error } = await createPublicClient().from("destinations").select("*").order("name");
  if (error) throw error;
  return data;
});

export type TourFilters = {
  q?: string;
  destination?: string; // destination slug (includes child areas)
  region?: string;
  month?: string; // YYYY-MM
  maxPrice?: number;
  type?: string;
  duration?: string; // "short" | "mid" | "long"
};

export async function listTours(filters: TourFilters = {}, limit?: number) {
  const supabase = createPublicClient();
  const today = todayISO();
  const destinations = await getDestinations();

  let query = supabase.from("tours").select(cardSelect).eq("status", "published");

  if (filters.destination || filters.region) {
    const ids = destinations
      .filter((d) => {
        if (filters.destination) {
          const root = destinations.find((x) => x.slug === filters.destination);
          return root && (d.id === root.id || d.parent_id === root.id);
        }
        return d.region === filters.region;
      })
      .map((d) => d.id);
    if (ids.length === 0) return [];
    query = query.in("destination_id", ids);
  }
  if (filters.q) query = query.ilike("title", `%${filters.q.replace(/[%_,()]/g, " ")}%`);
  if (filters.type) query = query.eq("tour_type", filters.type as Tables<"tours">["tour_type"]);
  if (filters.maxPrice) query = query.lte("price_from_myr", filters.maxPrice);
  if (filters.duration === "short") query = query.lte("duration_days", 4);
  if (filters.duration === "mid") query = query.gte("duration_days", 5).lte("duration_days", 8);
  if (filters.duration === "long") query = query.gte("duration_days", 9);

  const { data, error } = await query;
  if (error) throw error;

  let cards = (data as unknown as CardRow[]).map((r) => toCard(r, today));

  if (filters.month) {
    const month = filters.month;
    const ids = new Set(
      (data as unknown as CardRow[])
        .filter((r) =>
          r.tour_departures.some(
            (d) => d.departure_date.startsWith(month) && d.departure_date >= today && d.status !== "cancelled",
          ),
        )
        .map((r) => r.id),
    );
    cards = cards.filter((c) => ids.has(c.id));
  }

  cards.sort(sortCards);
  return limit ? cards.slice(0, limit) : cards;
}

export const getTour = cache(async (slug: string) => {
  const { data, error } = await createPublicClient()
    .from("tours")
    .select(
      `*,
       destination:destinations(id, name, slug, region, parent_id),
       tour_departures(id, departure_date, price_myr, price_note, status),
       tour_days(id, day_number, title, description, meals, hotel,
         tour_day_places(sort_order, place:places(id, name, lat, lng, description, image_url, image_credit, image_source_url, info_source_url, media_status))),
       tour_media(id, kind, url, caption, sort_order)`,
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const today = todayISO();
  const destinations = await getDestinations();
  const parent = destinations.find((d) => d.id === data.destination?.parent_id);
  return {
    ...data,
    destination: data.destination
      ? { ...data.destination, parent: parent ? { id: parent.id, name: parent.name, slug: parent.slug } : null }
      : null,
    departures: [...data.tour_departures]
      .filter((d) => d.departure_date >= today && d.status !== "cancelled")
      .sort((a, b) => a.departure_date.localeCompare(b.departure_date)),
    days: [...data.tour_days]
      .sort((a, b) => a.day_number - b.day_number)
      .map((d) => ({
        ...d,
        places: [...d.tour_day_places]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((p) => p.place)
          .filter((p): p is NonNullable<typeof p> => p !== null)
          .map(({ media_status, ...p }) => {
            // photos and descriptions are only shown once verified or approved by staff
            const shown = PUBLIC_MEDIA.includes(media_status as MediaStatus);
            return {
              ...p,
              image_url: shown ? p.image_url : null,
              image_credit: shown ? p.image_credit : null,
              image_source_url: shown ? p.image_source_url : null,
              description: shown || media_status == null ? p.description : null,
            };
          }),
      })),
    images: data.tour_media.filter((m) => m.kind === "image").sort((a, b) => a.sort_order - b.sort_order),
    pdfs: data.tour_media.filter((m) => m.kind === "pdf").sort((a, b) => a.sort_order - b.sort_order),
  };
});

export type TourDetail = NonNullable<Awaited<ReturnType<typeof getTour>>>;

/** Ids of destinations with a published tour, plus the countries those areas belong to. */
export async function getActiveDestinationIds() {
  const [destinations, { data, error }] = await Promise.all([
    getDestinations(),
    createPublicClient().from("tours").select("destination_id").eq("status", "published"),
  ]);
  if (error) throw error;
  const ids = new Set(data.map((t) => t.destination_id).filter((id): id is string => !!id));
  for (const d of destinations) if (ids.has(d.id) && d.parent_id) ids.add(d.parent_id);
  return ids;
}

/** The generated country hero photos (for page backdrops), in a stable order. */
export async function getHeroImages() {
  const destinations = await getDestinations();
  return destinations
    .filter((d) => !d.parent_id && d.cover_image_url?.includes("/hero/"))
    .map((d) => ({ name: d.name, url: d.cover_image_url! }));
}
