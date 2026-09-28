// Finds a real photo and a short description for an itinerary stop, using Wikipedia and Wikimedia Commons
// (free to reuse with attribution). Shared by the admin panel and scripts/enrich-places.mjs, so it has no
// framework imports: pass in a Supabase client and, optionally, an OpenAI key for the description.
import type { SupabaseClient } from "@supabase/supabase-js";

const UA = "DailyHolidaysSite/1.0 (enquiry@dailyholidays.com.my)";
const VERIFIED_KM = 25; // match within this distance of the stop -> published automatically
const MAX_KM = 150; // further than this -> treated as a different place

// words too generic to identify a place
const STOPWORDS = new Set(
  "the of and a an in at on to area zone tourist tourism tour cultural culture scenic spot spots attraction attractions site sites national aaaaa 5a visit".split(" "),
);

// landscape/landmark words: a match on these alone doesn't identify a particular place
const COMMON = new Set(
  "old new street road bay beach island islands lake river hill hills mountain mount mt park garden gardens temple pagoda palace museum village town city square market hall tower bridge church manor wedding castle falls waterfall valley coast coastline sea ocean port harbour harbor centre center night show world resort hotel".split(" "),
);

export type MediaStatus = "found" | "review" | "approved" | "manual" | "none" | "rejected";
export const PUBLIC_MEDIA: MediaStatus[] = ["found", "approved", "manual"];

export type PlaceContext = {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  area?: string | null;
  country?: string | null;
};

/** A Wikipedia article that plausibly describes the stop. */
export type Candidate = {
  title: string;
  pageUrl: string;
  extract: string;
  file: string | null;
  lat: number | null;
  lng: number | null;
  distanceKm: number | null;
  score: number;
  verified: boolean;
};

/** A photo ready to store, from an article's lead image or from a Commons search. */
export type Photo = {
  title: string;
  url: string;
  sourceUrl: string;
  credit: string;
  distanceKm: number | null;
  verified: boolean;
  score: number;
};

export type EnrichResult = {
  placeId: string;
  name: string;
  status: MediaStatus;
  match?: string;
  distanceKm?: number | null;
  error?: string;
};

const tokens = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\(.*?\)/g, " ")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

const keyTokens = (s: string) => {
  const t = tokens(s).filter((w) => !STOPWORDS.has(w));
  return t.length ? t : tokens(s);
};

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

async function mediawiki(host: string, params: Record<string, string>) {
  const url = new URL(`https://${host}/w/api.php`);
  Object.entries({ format: "json", formatversion: "2", ...params }).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${host} ${res.status}`);
  return res.json();
}

const hereOf = (p: PlaceContext) => (p.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng } : null);

function credit(meta: Record<string, { value: string }> | undefined) {
  const artist = stripHtml(meta?.Artist?.value ?? "") || "Unknown author";
  const license = stripHtml(meta?.LicenseShortName?.value ?? "");
  return `Photo: ${artist.slice(0, 120)}${license ? ` / ${license}` : ""} via Wikimedia Commons`;
}

/** Wikipedia articles for the stop, best first. Tries the plain name, then the name with its location. */
export async function searchCandidates(place: PlaceContext, query?: string): Promise<Candidate[]> {
  const where = [place.area, place.country].filter(Boolean).join(" ");
  const queries = query?.trim() ? [query.trim()] : [place.name, `${place.name} ${where}`.trim()];
  const subject = query?.trim() || place.name;
  const key = keyTokens(subject);
  const generic = new Set([place.area, place.country].filter(Boolean).map((s) => tokens(s!).join(" ")));
  const here = hereOf(place);

  const byTitle = new Map<string, Candidate>();
  for (const q of queries) {
    const data = await mediawiki("en.wikipedia.org", {
      action: "query",
      generator: "search",
      gsrsearch: q,
      gsrlimit: "6",
      prop: "coordinates|pageimages|extracts|info",
      piprop: "name",
      pilicense: "free",
      exintro: "1",
      explaintext: "1",
      exsentences: "3",
      exlimit: "6",
      inprop: "url",
      colimit: "6",
    });
    const pages: {
      title: string;
      fullurl: string;
      extract?: string;
      pageimage?: string;
      coordinates?: { lat: number; lon: number }[];
    }[] = data.query?.pages ?? [];

    for (const p of pages) {
      if (byTitle.has(p.title) || generic.has(tokens(p.title).join(" "))) continue; // skip the city/country page itself
      const extract = p.extract ?? "";
      const titleTokens = new Set(tokens(p.title));
      const overlap = key.filter((t) => titleTokens.has(t)).length / key.length;
      const mention = extract.toLowerCase().includes(subject.toLowerCase()) || p.title.toLowerCase().includes(subject.toLowerCase());
      const coord = p.coordinates?.[0];
      const distanceKm = here && coord ? Math.round(km(here, { lat: coord.lat, lng: coord.lon })) : null;
      if (distanceKm != null && distanceKm > MAX_KM) continue;
      let score = overlap + (mention ? 0.6 : 0);
      if (!p.pageimage) score -= 0.3;
      if (distanceKm != null && distanceKm <= VERIFIED_KM) score += 0.4;
      if (score < 0.6) continue;
      byTitle.set(p.title, {
        title: p.title,
        pageUrl: p.fullurl,
        extract,
        file: p.pageimage ?? null,
        lat: coord?.lat ?? null,
        lng: coord?.lon ?? null,
        distanceKm,
        score,
        verified: distanceKm != null && distanceKm <= VERIFIED_KM,
      });
    }
  }
  return [...byTitle.values()].sort((a, b) => b.score - a.score);
}

/** The lead image of an article, as a Photo. */
export async function articlePhoto(c: Candidate): Promise<Photo | null> {
  if (!c.file) return null;
  const data = await mediawiki("en.wikipedia.org", { action: "query", titles: `File:${c.file}`, prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "1280" });
  const info = data.query?.pages?.[0]?.imageinfo?.[0];
  if (!info) return null;
  return {
    title: c.title,
    url: info.thumburl ?? info.url,
    sourceUrl: info.descriptionurl ?? c.pageUrl,
    credit: credit(info.extmetadata),
    distanceKm: c.distanceKm,
    verified: c.verified,
    score: c.score,
  };
}

/**
 * Photos on Wikimedia Commons whose file name matches the stop, for sights without a Wikipedia article.
 * A geotagged photo within VERIFIED_KM of the stop counts as verified.
 */
export async function searchCommons(place: PlaceContext, query?: string, limit = 8): Promise<Photo[]> {
  const subject = query?.trim() || place.name;
  const key = keyTokens(subject);
  const here = hereOf(place);
  const data = await mediawiki("commons.wikimedia.org", {
    action: "query",
    generator: "search",
    gsrnamespace: "6",
    gsrsearch: subject,
    gsrlimit: String(limit),
    prop: "coordinates|imageinfo",
    iiprop: "url|extmetadata|mime",
    iiurlwidth: "1280",
  });
  const pages: {
    title: string;
    index: number;
    coordinates?: { lat: number; lon: number }[];
    imageinfo?: { thumburl?: string; url: string; descriptionurl: string; mime: string; extmetadata?: Record<string, { value: string }> }[];
  }[] = data.query?.pages ?? [];

  const out: Photo[] = [];
  for (const p of pages.sort((a, b) => a.index - b.index)) {
    const info = p.imageinfo?.[0];
    if (!info || !/^image\/(jpeg|png|webp)$/.test(info.mime)) continue;
    const fileTokens = new Set(tokens(p.title.replace(/^File:/, "").replace(/\.[a-z]+$/i, "")));
    const matched = key.filter((t) => fileTokens.has(t));
    const overlap = matched.length / key.length;
    if (overlap < 0.6 || !matched.some((t) => !COMMON.has(t))) continue; // needs a distinctive word, e.g. "Shimei"
    const coord = p.coordinates?.[0];
    const distanceKm = here && coord ? Math.round(km(here, { lat: coord.lat, lng: coord.lon })) : null;
    if (distanceKm != null && distanceKm > MAX_KM) continue;
    const verified = distanceKm != null && distanceKm <= VERIFIED_KM;
    out.push({
      title: p.title,
      url: info.thumburl ?? info.url,
      sourceUrl: info.descriptionurl,
      credit: credit(info.extmetadata),
      distanceKm,
      verified,
      score: overlap + (verified ? 0.4 : 0),
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** One or two friendly sentences, grounded only in the Wikipedia extract. Falls back to the extract itself. */
export async function writeBlurb(name: string, extract: string, openaiKey?: string) {
  const fallback = extract.split(/(?<=\.)\s+/).slice(0, 2).join(" ").slice(0, 320);
  if (!openaiKey || !extract) return fallback || null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        messages: [
          {
            role: "developer",
            content:
              "You write short descriptions of sights for a Malaysian travel agency's itinerary pages. Use ONLY facts stated in the provided Wikipedia extract; never add facts. 1-2 sentences, at most 40 words, plain and inviting, no exclamation marks.",
          },
          { role: "user", content: `Sight: ${name}\n\nWikipedia extract:\n${extract}` },
        ],
      }),
    });
    if (!res.ok) return fallback || null;
    const json = await res.json();
    return (json.choices?.[0]?.message?.content as string | undefined)?.trim() || fallback || null;
  } catch {
    return fallback || null;
  }
}

/** Copy a photo into Supabase Storage (tour-media/places/<id>.<ext>) and return its public URL. */
async function storePhoto(supabase: SupabaseClient, placeId: string, photo: Photo) {
  const img = await fetch(photo.url, { headers: { "User-Agent": UA } });
  if (!img.ok) throw new Error(`photo download ${img.status}`);
  const type = img.headers.get("content-type") ?? "image/jpeg";
  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  const path = `places/${placeId}.${ext}`;
  const { error } = await supabase.storage.from("tour-media").upload(path, Buffer.from(await img.arrayBuffer()), { contentType: type, upsert: true });
  if (error) throw error;
  return `${supabase.storage.from("tour-media").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
}

/**
 * Find and store a photo + description for one stop: the best Wikipedia article (its lead image and a
 * grounded blurb), else a matching Commons photo. Verified matches are published; others wait for review.
 * Pass `photo` to store a specific photo (e.g. one staff picked from the alternatives).
 */
export async function enrichPlace(
  supabase: SupabaseClient,
  place: PlaceContext,
  opts: { query?: string; openaiKey?: string; photo?: Photo } = {},
): Promise<EnrichResult> {
  try {
    const best = (await searchCandidates(place, opts.query))[0] ?? null;
    let photo = opts.photo ?? (best ? await articlePhoto(best) : null);
    if (!photo) photo = (await searchCommons(place, opts.query))[0] ?? null;

    if (!best && !photo) {
      await supabase.from("places").update({ media_status: "none", enriched_at: new Date().toISOString() }).eq("id", place.id);
      return { placeId: place.id, name: place.name, status: "none" };
    }

    const imageUrl = photo ? await storePhoto(supabase, place.id, photo) : null;
    const description = best ? await writeBlurb(place.name, best.extract, opts.openaiKey) : null;
    const status: MediaStatus = opts.photo ? "approved" : photo?.verified ? "found" : "review";
    const update: Record<string, unknown> = {
      image_url: imageUrl,
      image_credit: photo?.credit ?? null,
      image_source_url: photo?.sourceUrl ?? null,
      info_source_url: best?.pageUrl ?? null,
      description,
      media_status: imageUrl ? status : "review",
      enriched_at: new Date().toISOString(),
    };
    // a stop with no map position borrows the article's, when the name match is strong
    if (place.lat == null && best && best.lat != null && best.score >= 1.2) {
      update.lat = best.lat;
      update.lng = best.lng;
    }
    const { error } = await supabase.from("places").update(update).eq("id", place.id);
    if (error) throw error;
    return { placeId: place.id, name: place.name, status: update.media_status as MediaStatus, match: photo?.title ?? best?.title, distanceKm: photo?.distanceKm ?? best?.distanceKm };
  } catch (e) {
    return { placeId: place.id, name: place.name, status: "none", error: e instanceof Error ? e.message : String(e) };
  }
}

/** Places joined with their area/country names, ready for enrichPlace. */
export async function loadPlaceContexts(supabase: SupabaseClient, ids: string[]): Promise<PlaceContext[]> {
  if (!ids.length) return [];
  const { data: dests } = await supabase.from("destinations").select("id, name, parent_id");
  const places: { id: string; name: string; lat: number | null; lng: number | null; destination_id: string | null }[] = [];
  for (let i = 0; i < ids.length; i += 150) {
    // chunked: a long id list would overflow the request URL
    const { data, error } = await supabase.from("places").select("id, name, lat, lng, destination_id").in("id", ids.slice(i, i + 150));
    if (error) throw error;
    places.push(...(data ?? []));
  }
  const byId = new Map((dests ?? []).map((d: { id: string; name: string; parent_id: string | null }) => [d.id, d]));
  return places.map((p) => {
    const d = p.destination_id ? byId.get(p.destination_id) : undefined;
    const parent = d?.parent_id ? byId.get(d.parent_id) : undefined;
    return { id: p.id, name: p.name, lat: p.lat, lng: p.lng, area: parent ? d!.name : null, country: parent?.name ?? d?.name ?? null };
  });
}
