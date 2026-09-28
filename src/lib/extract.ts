import "server-only";
import OpenAI from "openai";
import { slugify, todayISO } from "@/lib/format";
import type { AdminClient } from "@/lib/admin";

export const EXTRACT_MODEL = "gpt-5.4-mini";

export type Extraction = {
  title: string;
  code: string | null;
  tour_type: "group" | "ground" | "cruise" | "malaysia" | "other";
  country: string;
  area: string | null;
  region: string;
  duration_days: number | null;
  duration_nights: number | null;
  summary: string;
  highlights: string[];
  inclusions: string[];
  exclusions: string[];
  airline: string | null;
  hotel_rating: string | null;
  departures: { date: string; price_myr: number | null; price_note: string | null }[];
  days: {
    day_number: number;
    title: string;
    description: string;
    meals: string[];
    hotel: string | null;
    places: { name: string; city: string | null; country: string }[];
  }[];
};

const str = { type: "string" };
const nstr = { type: ["string", "null"] };
const nint = { type: ["integer", "null"] };
const strArr = { type: "array", items: str };

const schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title", "code", "tour_type", "country", "area", "region", "duration_days", "duration_nights", "summary",
    "highlights", "inclusions", "exclusions", "airline", "hotel_rating", "departures", "days",
  ],
  properties: {
    title: str,
    code: nstr,
    tour_type: { type: "string", enum: ["group", "ground", "cruise", "malaysia", "other"] },
    country: str,
    area: nstr,
    region: { type: "string", enum: ["Asia", "Europe", "Middle East", "Africa", "Oceania", "Americas", "Malaysia"] },
    duration_days: nint,
    duration_nights: nint,
    summary: str,
    highlights: strArr,
    inclusions: strArr,
    exclusions: strArr,
    airline: nstr,
    hotel_rating: nstr,
    departures: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["date", "price_myr", "price_note"],
        properties: { date: str, price_myr: { type: ["number", "null"] }, price_note: nstr },
      },
    },
    days: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["day_number", "title", "description", "meals", "hotel", "places"],
        properties: {
          day_number: { type: "integer" },
          title: str,
          description: str,
          meals: { type: "array", items: { type: "string", enum: ["Breakfast", "Lunch", "Dinner"] } },
          hotel: nstr,
          places: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "city", "country"],
              properties: { name: str, city: nstr, country: str },
            },
          },
        },
      },
    },
  },
};

function instructions() {
  return `You extract structured tour data from travel-agency itinerary PDFs for Daily Holidays (a Malaysian agency).
Rules:
- Write everything in clear English (translate Chinese or Malay).
- title: a clean marketing title such as "5D4N Voyage Hainan". Drop prefixes like "Ground-".
- tour_type: ground tour (land arrangements only) -> "ground"; cruise -> "cruise"; domestic Malaysia trip -> "malaysia"; otherwise "group".
- summary: 1-2 appealing sentences. highlights: 3-6 short phrases.
- departures: one entry per departure date. Dates often omit the year: today is ${todayISO()}; infer the year from the document's validity/update date and month order (a season such as SEP..MAR crosses into the next year). price_myr is the per-person fare in RM; put promos or "per couple" in price_note. Never invent dates or prices that are not in the document.
- days: follow the document's day-by-day plan. description: 2-4 sentences. meals only if stated.
- places: real named attractions/landmarks visited that day (not hotels, airports or restaurants), max 6 per day, with city and country so they can be found on a map.
- Use null or [] when something is not in the document.`;
}

export async function extractTourFromPdf(pdf: ArrayBuffer, filename: string): Promise<Extraction> {
  const client = new OpenAI();
  const completion = await client.chat.completions.create({
    model: EXTRACT_MODEL,
    messages: [
      { role: "developer", content: instructions() },
      {
        role: "user",
        content: [
          {
            type: "file",
            file: { filename, file_data: `data:application/pdf;base64,${Buffer.from(pdf).toString("base64")}` },
          },
          { type: "text", text: "Extract this tour." },
        ],
      },
    ],
    response_format: { type: "json_schema", json_schema: { name: "tour", strict: true, schema } },
  });
  const content = completion.choices[0]?.message.content;
  if (!content) throw new Error("The AI returned no data for this PDF.");
  return JSON.parse(content) as Extraction;
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => "\\" + m);

/** Find a destination by name (case-insensitive) or create it. */
async function ensureDestination(
  supabase: AdminClient,
  name: string,
  region: string | null,
  parentId: string | null,
): Promise<string> {
  const { data: existing } = await supabase.from("destinations").select("id").ilike("name", escapeLike(name)).maybeSingle();
  if (existing) return existing.id;
  const base = slugify(name) || "destination";
  const { data, error } = await supabase
    .from("destinations")
    .insert({ name, slug: parentId ? `${base}-${Date.now().toString(36)}` : base, region, parent_id: parentId })
    .select("id")
    .single();
  if (error) {
    // slug collision: retry with suffix
    const retry = await supabase
      .from("destinations")
      .insert({ name, slug: `${base}-${Date.now().toString(36)}`, region, parent_id: parentId })
      .select("id")
      .single();
    if (retry.error) throw retry.error;
    return retry.data.id;
  }
  return data.id;
}

export async function resolveDestination(supabase: AdminClient, x: Pick<Extraction, "country" | "area" | "region">) {
  const countryId = await ensureDestination(supabase, x.country, x.region, null);
  if (x.area && x.area.toLowerCase() !== x.country.toLowerCase()) {
    return ensureDestination(supabase, x.area, x.region, countryId);
  }
  return countryId;
}

/** Replace a tour's departures and itinerary days with the extracted ones. Places are created without coordinates. */
export async function writeExtraction(supabase: AdminClient, tourId: string, x: Extraction, destinationId: string) {
  await supabase.from("tour_departures").delete().eq("tour_id", tourId);
  await supabase.from("tour_days").delete().eq("tour_id", tourId);

  const seen = new Set<string>();
  const departures = x.departures
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date))
    .filter((d) => {
      const key = `${d.date}|${d.price_note ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((d) => ({ tour_id: tourId, departure_date: d.date, price_myr: d.price_myr, price_note: d.price_note }));
  if (departures.length) {
    const { error } = await supabase.from("tour_departures").insert(departures);
    if (error) throw error;
  }

  for (const day of x.days) {
    const { data: row, error } = await supabase
      .from("tour_days")
      .insert({
        tour_id: tourId,
        day_number: day.day_number,
        title: day.title,
        description: day.description,
        meals: day.meals,
        hotel: day.hotel,
      })
      .select("id")
      .single();
    if (error) throw error;
    await linkPlaces(supabase, row.id, day.places.map((p) => p.name), destinationId);
  }
}

/** Link places to a day, reusing existing places of the same name. */
export async function linkPlaces(supabase: AdminClient, dayId: string, names: string[], destinationId: string | null) {
  await supabase.from("tour_day_places").delete().eq("tour_day_id", dayId);
  const links: { tour_day_id: string; place_id: string; sort_order: number }[] = [];
  for (const [i, name] of names.entries()) {
    let q = supabase.from("places").select("id").ilike("name", escapeLike(name));
    q = destinationId ? q.eq("destination_id", destinationId) : q.is("destination_id", null);
    const { data: found } = await q.limit(1).maybeSingle();
    let placeId = found?.id;
    if (!placeId) {
      const { data, error } = await supabase
        .from("places")
        .insert({ name, destination_id: destinationId })
        .select("id")
        .single();
      if (error) throw error;
      placeId = data.id;
    }
    if (!links.some((l) => l.place_id === placeId)) links.push({ tour_day_id: dayId, place_id: placeId, sort_order: i });
  }
  if (links.length) {
    const { error } = await supabase.from("tour_day_places").insert(links);
    if (error) throw error;
  }
}

/** Cheapest upcoming fare, used for listing cards and sorting. */
export async function refreshPriceFrom(supabase: AdminClient, tourId: string) {
  const { data } = await supabase
    .from("tour_departures")
    .select("price_myr")
    .eq("tour_id", tourId)
    .gte("departure_date", todayISO())
    .neq("status", "cancelled")
    .not("price_myr", "is", null)
    .order("price_myr")
    .limit(1)
    .maybeSingle();
  await supabase.from("tours").update({ price_from_myr: data?.price_myr ?? null }).eq("id", tourId);
}
