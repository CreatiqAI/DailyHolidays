// Bulk-find real photos + descriptions for itinerary stops (Wikipedia / Wikimedia Commons).
// Usage: node --env-file=.env.local scripts/enrich-places.mjs [--limit 50] [--tour <slug>] [--redo]
//   default: stops never searched before; --redo also retries "none" results.
import { createClient } from "@supabase/supabase-js";
import { enrichPlace, loadPlaceContexts } from "../src/lib/place-enrich.ts";

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const limit = Number(opt("--limit") ?? 50);
const tourSlug = opt("--tour");
const redo = args.includes("--redo");

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let ids;
if (tourSlug) {
  const { data, error } = await supabase
    .from("tours")
    .select("tour_days(tour_day_places(place_id))")
    .eq("slug", tourSlug)
    .single();
  if (error) throw error;
  ids = [...new Set(data.tour_days.flatMap((d) => d.tour_day_places.map((l) => l.place_id)))];
} else {
  // stops used by published tours, not searched yet (or --redo: also those with no result)
  const { data: tours, error } = await supabase.from("tours").select("tour_days(tour_day_places(place_id))").eq("status", "published");
  if (error) throw error;
  const all = [...new Set(tours.flatMap((t) => t.tour_days.flatMap((d) => d.tour_day_places.map((l) => l.place_id))))];
  ids = [];
  for (let k = 0; k < all.length; k += 150) {
    let q = supabase.from("places").select("id").in("id", all.slice(k, k + 150));
    q = redo ? q.or("media_status.is.null,media_status.eq.none") : q.is("media_status", null);
    const { data, error: e2 } = await q;
    if (e2) throw e2;
    ids.push(...data.map((p) => p.id));
  }
}

const places = await loadPlaceContexts(supabase, ids.slice(0, limit));
console.log(`enriching ${places.length} stops`);
const tally = {};
const CONCURRENCY = 4; // gentle on Wikipedia; each worker also pauses between stops
let next = 0;
async function worker() {
  while (next < places.length) {
    const p = places[next++];
    const r = await enrichPlace(supabase, p, { openaiKey: process.env.OPENAI_API_KEY });
    tally[r.status] = (tally[r.status] ?? 0) + 1;
    console.log(`${r.status.padEnd(7)} ${p.name}${r.match ? `  ->  ${r.match}${r.distanceKm != null ? ` (${r.distanceKm} km)` : ""}` : ""}${r.error ? `  ERROR ${r.error}` : ""}`);
    await new Promise((res) => setTimeout(res, 250));
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log("done:", tally);
