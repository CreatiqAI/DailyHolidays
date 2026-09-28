"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, type ActionResult } from "@/lib/admin";
import { lines, slugify } from "@/lib/format";
import { geocode } from "@/lib/geocode";
import { extractTourFromPdf, linkPlaces, refreshPriceFrom, resolveDestination, writeExtraction } from "@/lib/extract";
import type { Database } from "@/lib/database.types";

type TourType = Database["public"]["Enums"]["tour_type"];
type TourStatus = Database["public"]["Enums"]["tour_status"];
type DepartureStatus = Database["public"]["Enums"]["departure_status"];

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const sOrNull = (fd: FormData, k: string) => s(fd, k) || null;
const intOrNull = (fd: FormData, k: string) => {
  const n = parseInt(s(fd, k), 10);
  return Number.isFinite(n) ? n : null;
};
const numOrNull = (fd: FormData, k: string) => {
  const v = s(fd, k).replace(/,/g, "");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const errMsg = (e: unknown) => (e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String(e.message) : "Something went wrong");

/** Public pages are cached; purge them after any content change. */
function publish() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------- auth

export async function signIn(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: s(fd, "email"), password: s(fd, "password") });
  if (error) return { ok: false, error: "Wrong email or password." };
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    await supabase.auth.signOut();
    return { ok: false, error: "This account does not have admin access." };
  }
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// ---------------------------------------------------------------- tours

export async function createTour(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const title = s(fd, "title");
  if (!title) return { ok: false, error: "Title is required." };
  const { data, error } = await supabase
    .from("tours")
    .insert({
      title,
      slug: `${slugify(title)}-${Date.now().toString(36)}`,
      tour_type: (s(fd, "tour_type") || "group") as TourType,
      destination_id: sOrNull(fd, "destination_id"),
      source: "manual",
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  redirect(`/admin/tours/${data.id}`);
}

export async function updateTour(id: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const slug = slugify(s(fd, "slug"));
  if (!s(fd, "title") || !slug) return { ok: false, error: "Title and URL slug are required." };
  const { error } = await supabase
    .from("tours")
    .update({
      title: s(fd, "title"),
      slug,
      code: sOrNull(fd, "code"),
      tour_type: s(fd, "tour_type") as TourType,
      status: s(fd, "status") as TourStatus,
      destination_id: sOrNull(fd, "destination_id"),
      duration_days: intOrNull(fd, "duration_days"),
      duration_nights: intOrNull(fd, "duration_nights"),
      summary: sOrNull(fd, "summary"),
      description: sOrNull(fd, "description"),
      highlights: lines(fd.get("highlights")),
      inclusions: lines(fd.get("inclusions")),
      exclusions: lines(fd.get("exclusions")),
      airline: sOrNull(fd, "airline"),
      hotel_rating: sOrNull(fd, "hotel_rating"),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.code === "23505" ? "That URL slug is already used by another tour." : error.message };
  publish();
  return { ok: true, message: "Saved" };
}

export async function deleteTour(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("tours").delete().eq("id", id);
  if (error) throw error;
  publish();
  redirect("/admin/tours");
}

// ---------------------------------------------------------------- departures

export async function addDeparture(tourId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const date = s(fd, "departure_date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Pick a departure date." };
  const { error } = await supabase.from("tour_departures").insert({
    tour_id: tourId,
    departure_date: date,
    price_myr: numOrNull(fd, "price_myr"),
    price_note: sOrNull(fd, "price_note"),
    status: (s(fd, "status") || "available") as DepartureStatus,
  });
  if (error) return { ok: false, error: error.code === "23505" ? "That date already exists." : error.message };
  await refreshPriceFrom(supabase, tourId);
  publish();
  return { ok: true, message: "Date added" };
}

export async function updateDeparture(id: string, tourId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("tour_departures")
    .update({
      departure_date: s(fd, "departure_date"),
      price_myr: numOrNull(fd, "price_myr"),
      price_note: sOrNull(fd, "price_note"),
      status: s(fd, "status") as DepartureStatus,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  await refreshPriceFrom(supabase, tourId);
  publish();
  return { ok: true, message: "Saved" };
}

export async function deleteDeparture(id: string, tourId: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("tour_departures").delete().eq("id", id);
  await refreshPriceFrom(supabase, tourId);
  publish();
  revalidatePath(`/admin/tours/${tourId}`);
}

// ---------------------------------------------------------------- itinerary days

export async function saveDay(tourId: string, dayId: string | null, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const dayNumber = intOrNull(fd, "day_number");
  if (!dayNumber || !s(fd, "title")) return { ok: false, error: "Day number and title are required." };
  const values = {
    tour_id: tourId,
    day_number: dayNumber,
    title: s(fd, "title"),
    description: sOrNull(fd, "description"),
    meals: fd.getAll("meals").map(String),
    hotel: sOrNull(fd, "hotel"),
  };
  const res = dayId
    ? await supabase.from("tour_days").update(values).eq("id", dayId).select("id").single()
    : await supabase.from("tour_days").insert(values).select("id").single();
  if (res.error) return { ok: false, error: res.error.code === "23505" ? `Day ${dayNumber} already exists.` : res.error.message };

  const { data: tour } = await supabase.from("tours").select("destination_id").eq("id", tourId).single();
  try {
    await linkPlaces(supabase, res.data.id, lines(fd.get("places")), tour?.destination_id ?? null);
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
  publish();
  revalidatePath(`/admin/tours/${tourId}`);
  return { ok: true, message: "Day saved" };
}

export async function deleteDay(id: string, tourId: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("tour_days").delete().eq("id", id);
  publish();
  revalidatePath(`/admin/tours/${tourId}`);
}

/** Look up map coordinates for this tour's places that don't have any yet (max ~40 per click). */
export async function locatePlaces(tourId: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { data: days } = await supabase
    .from("tour_days")
    .select("tour_day_places(place:places(id, name, lat, destination:destinations(name, parent_id)))")
    .eq("tour_id", tourId);
  const { data: allDest } = await supabase.from("destinations").select("id, name");
  const nameOf = new Map((allDest ?? []).map((d) => [d.id, d.name]));

  const pending = new Map<string, { name: string; area: string | null; country: string | null }>();
  for (const d of days ?? []) {
    for (const link of d.tour_day_places) {
      const p = link.place;
      if (!p || p.lat != null) continue;
      const dest = p.destination;
      const parentName = dest?.parent_id ? nameOf.get(dest.parent_id) : undefined;
      pending.set(p.id, {
        name: p.name,
        area: parentName ? dest!.name : null,
        country: parentName ?? dest?.name ?? null,
      });
    }
  }

  let found = 0;
  const batch = [...pending.entries()].slice(0, 40);
  for (const [id, p] of batch) {
    const hit = await geocode(p.name, p.area, p.country);
    if (hit) {
      await supabase.from("places").update({ lat: hit.lat, lng: hit.lng }).eq("id", id);
      found++;
    }
  }
  publish();
  revalidatePath(`/admin/tours/${tourId}`);
  const left = pending.size - batch.length;
  return {
    ok: true,
    message: `Found ${found} of ${batch.length} places on the map.${left > 0 ? ` ${left} more — click again.` : ""}`,
  };
}

export async function updatePlace(id: string, tourId: string, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("places")
    .update({ name: s(fd, "name"), lat: numOrNull(fd, "lat"), lng: numOrNull(fd, "lng") })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  publish();
  revalidatePath(`/admin/tours/${tourId}`);
  return { ok: true, message: "Saved" };
}

// ---------------------------------------------------------------- media

export async function addMedia(tourId: string, items: { kind: "image" | "pdf"; url: string; caption: string | null }[]) {
  const { supabase } = await requireAdmin();
  const { data: last } = await supabase
    .from("tour_media")
    .select("sort_order")
    .eq("tour_id", tourId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  let order = (last?.sort_order ?? -1) + 1;
  const { error } = await supabase
    .from("tour_media")
    .insert(items.map((m) => ({ tour_id: tourId, kind: m.kind, url: m.url, caption: m.caption, sort_order: order++ })));
  if (error) throw error;

  const { data: tour } = await supabase.from("tours").select("cover_image_url").eq("id", tourId).single();
  const firstImage = items.find((m) => m.kind === "image");
  if (tour && !tour.cover_image_url && firstImage) {
    await supabase.from("tours").update({ cover_image_url: firstImage.url }).eq("id", tourId);
  }
  publish();
  revalidatePath(`/admin/tours/${tourId}`);
}

const storagePrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/tour-media/`;

export async function deleteMedia(id: string, tourId: string) {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("tour_media").delete().eq("id", id).select("url").single();
  if (data?.url.startsWith(storagePrefix)) {
    await supabase.storage.from("tour-media").remove([decodeURIComponent(data.url.slice(storagePrefix.length))]);
  }
  const { data: tour } = await supabase.from("tours").select("cover_image_url").eq("id", tourId).single();
  if (data && tour?.cover_image_url === data.url) {
    await supabase.from("tours").update({ cover_image_url: null }).eq("id", tourId);
  }
  publish();
  revalidatePath(`/admin/tours/${tourId}`);
}

export async function setCover(tourId: string, url: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("tours").update({ cover_image_url: url }).eq("id", tourId);
  publish();
  revalidatePath(`/admin/tours/${tourId}`);
}

// ---------------------------------------------------------------- AI import

/** Create a draft tour from a PDF already uploaded to storage (imports/…). */
export async function importTourFromPdf(path: string, filename: string): Promise<{ id?: string; error?: string }> {
  const { supabase } = await requireAdmin();
  if (!path.startsWith("imports/")) return { error: "Invalid file." };

  try {
    const { data: file, error: dlError } = await supabase.storage.from("tour-media").download(path);
    if (dlError) throw dlError;
    const x = await extractTourFromPdf(await file.arrayBuffer(), filename);

    const destinationId = await resolveDestination(supabase, x);
    const { data: tour, error } = await supabase
      .from("tours")
      .insert({
        title: x.title,
        slug: `${slugify(x.title)}-${Date.now().toString(36)}`,
        code: x.code,
        tour_type: x.tour_type,
        destination_id: destinationId,
        duration_days: x.duration_days,
        duration_nights: x.duration_nights,
        summary: x.summary,
        highlights: x.highlights,
        inclusions: x.inclusions,
        exclusions: x.exclusions,
        airline: x.airline,
        hotel_rating: x.hotel_rating,
        status: "draft",
        source: "pdf_upload",
      })
      .select("id")
      .single();
    if (error) throw error;

    await writeExtraction(supabase, tour.id, x, destinationId);
    await supabase.from("tour_media").insert({
      tour_id: tour.id,
      kind: "pdf",
      url: storagePrefix + path.split("/").map(encodeURIComponent).join("/"),
      caption: filename.replace(/\.pdf$/i, ""),
    });
    await refreshPriceFrom(supabase, tour.id);
    return { id: tour.id };
  } catch (e) {
    console.error("PDF import failed", e);
    return { error: `Import failed: ${errMsg(e)}` };
  }
}

/** Re-read a tour's PDF with AI and replace its dates and itinerary (keeps title, photos and status). */
export async function reextractFromPdf(tourId: string, mediaId: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { data: media } = await supabase.from("tour_media").select("url, caption").eq("id", mediaId).single();
  if (!media) return { ok: false, error: "PDF not found." };
  try {
    const res = await fetch(media.url);
    if (!res.ok) throw new Error(`Could not download the PDF (${res.status}).`);
    const x = await extractTourFromPdf(await res.arrayBuffer(), `${media.caption ?? "itinerary"}.pdf`);
    const { data: tour } = await supabase.from("tours").select("destination_id").eq("id", tourId).single();
    const destinationId = tour?.destination_id ?? (await resolveDestination(supabase, x));
    await writeExtraction(supabase, tourId, x, destinationId);
    await supabase
      .from("tours")
      .update({
        duration_days: x.duration_days,
        duration_nights: x.duration_nights,
        inclusions: x.inclusions,
        exclusions: x.exclusions,
        airline: x.airline,
        hotel_rating: x.hotel_rating,
      })
      .eq("id", tourId);
    await refreshPriceFrom(supabase, tourId);
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
  publish();
  revalidatePath(`/admin/tours/${tourId}`);
  return { ok: true, message: "Dates and itinerary updated from the PDF. Use “Locate places” to update the map." };
}

// ---------------------------------------------------------------- enquiries

export async function setEnquiryHandled(id: string, handled: boolean) {
  const { supabase } = await requireAdmin();
  await supabase.from("enquiries").update({ handled }).eq("id", id);
  revalidatePath("/admin/enquiries");
  revalidatePath("/admin");
}

export async function deleteEnquiry(id: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("enquiries").delete().eq("id", id);
  revalidatePath("/admin/enquiries");
}

// ---------------------------------------------------------------- destinations

export async function saveDestination(id: string | null, _prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const name = s(fd, "name");
  if (!name) return { ok: false, error: "Name is required." };
  const values = {
    name,
    slug: slugify(s(fd, "slug") || name),
    region: sOrNull(fd, "region"),
    parent_id: sOrNull(fd, "parent_id"),
    cover_image_url: sOrNull(fd, "cover_image_url"),
    lat: numOrNull(fd, "lat"),
    lng: numOrNull(fd, "lng"),
  };
  if (values.parent_id === id) return { ok: false, error: "A destination can't be its own parent." };
  if ((values.lat == null) !== (values.lng == null)) return { ok: false, error: "Enter both latitude and longitude, or neither." };
  if (values.lat != null && (Math.abs(values.lat) > 90 || Math.abs(values.lng!) > 180))
    return { ok: false, error: "Latitude must be between -90 and 90, longitude between -180 and 180." };
  const { error } = id
    ? await supabase.from("destinations").update(values).eq("id", id)
    : await supabase.from("destinations").insert(values);
  if (error) return { ok: false, error: error.code === "23505" ? "That slug is already used." : error.message };
  publish();
  revalidatePath("/admin/destinations");
  return { ok: true, message: "Saved" };
}

export async function deleteDestination(id: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("destinations").delete().eq("id", id);
  publish();
  revalidatePath("/admin/destinations");
}
