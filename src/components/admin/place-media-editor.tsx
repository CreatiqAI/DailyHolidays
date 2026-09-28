"use client";

import { useRef, useState, useTransition } from "react";
import { Check, ExternalLink, ImagePlus, LoaderCircle, MapPin, Search, Sparkles, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  choosePlacePhoto,
  findPlaceMedia,
  searchPlacePhotos,
  setPlaceManualPhoto,
  setPlaceMediaStatus,
  updatePlace,
  type PhotoOption,
} from "@/app/admin/actions";
import type { ActionResult } from "@/lib/admin";
import { ActionForm, Status, SubmitButton, input, label } from "./ui";

export type EditablePlace = {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  description: string | null;
  image_url: string | null;
  image_credit: string | null;
  image_source_url: string | null;
  info_source_url: string | null;
  media_status: string | null;
  area?: string | null;
  tourCount?: number;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  found: { label: "Published · auto-verified", cls: "bg-green-100 text-green-800" },
  approved: { label: "Published", cls: "bg-green-100 text-green-800" },
  manual: { label: "Published · your photo", cls: "bg-green-100 text-green-800" },
  review: { label: "Needs review", cls: "bg-sun-100 text-sun-700" },
  none: { label: "No photo found", cls: "bg-navy-100 text-navy-600" },
  rejected: { label: "Rejected", cls: "bg-navy-100 text-navy-600" },
  unsearched: { label: "Not searched yet", cls: "bg-navy-50 text-navy-500" },
};

/** Photo, description and position of one itinerary stop, with find / choose / upload / approve tools. */
export function PlaceMediaEditor({ place, tourId = null }: { place: EditablePlace; tourId?: string | null }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult>(null);
  const [picker, setPicker] = useState(false);
  const [query, setQuery] = useState(place.name);
  const [options, setOptions] = useState<PhotoOption[] | null>(null);
  const [busyUrl, setBusyUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const st = STATUS[place.media_status ?? "unsearched"] ?? STATUS.unsearched;
  const run = (fn: () => Promise<ActionResult>) => start(async () => setResult(await fn()));

  const search = () =>
    start(async () => {
      setOptions(null);
      const r = await searchPlacePhotos(place.id, query);
      setOptions(r.options);
      if (r.error) setResult({ ok: false, error: r.error });
    });

  async function upload(file: File | undefined) {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `places/${place.id}-own-${Date.now()}.${ext}`;
    const bucket = createClient().storage.from("tour-media");
    start(async () => {
      const { error } = await bucket.upload(path, file, { contentType: file.type, upsert: true });
      if (error) return setResult({ ok: false, error: `Upload failed: ${error.message}` });
      setResult(await setPlaceManualPhoto(place.id, bucket.getPublicUrl(path).data.publicUrl, null));
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-navy-100">
      <div className="grid gap-0 sm:grid-cols-[220px_1fr]">
        <div className="relative aspect-[16/10] bg-navy-50 sm:aspect-auto sm:min-h-[150px]">
          {place.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin preview of an arbitrary storage URL
            <img src={place.image_url} alt={place.name} className={`absolute inset-0 h-full w-full object-cover ${place.media_status === "review" ? "opacity-90" : ""}`} />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-navy-300">
              <ImagePlus className="size-8" />
            </div>
          )}
          {pending && (
            <div className="absolute inset-0 grid place-items-center bg-white/70">
              <LoaderCircle className="size-6 animate-spin text-navy-600" />
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-2 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-navy-900">{place.name}</p>
              <p className="flex items-center gap-1 text-xs text-navy-500">
                <MapPin className={`size-3 ${place.lat != null ? "text-green-600" : "text-navy-300"}`} />
                {place.area ?? ""}
                {place.lat == null ? " · not on map" : ""}
                {place.tourCount ? ` · in ${place.tourCount} tour${place.tourCount === 1 ? "" : "s"}` : ""}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
          </div>

          {place.description && <p className="line-clamp-3 text-sm text-navy-700">{place.description}</p>}
          {(place.image_credit || place.info_source_url) && (
            <p className="flex flex-wrap gap-x-3 text-[11px] text-navy-400">
              {place.image_credit && (
                <a href={place.image_source_url ?? undefined} target="_blank" rel="noopener" className="hover:underline">
                  {place.image_credit}
                </a>
              )}
              {place.info_source_url && (
                <a href={place.info_source_url} target="_blank" rel="noopener" className="inline-flex items-center gap-0.5 hover:underline">
                  Wikipedia <ExternalLink className="size-3" />
                </a>
              )}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5 pt-1">
            {place.media_status === "review" && (
              <>
                <button type="button" disabled={pending} onClick={() => run(() => setPlaceMediaStatus(place.id, "approved"))} className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                  <Check className="size-3.5" /> Approve
                </button>
                <button type="button" disabled={pending} onClick={() => run(() => setPlaceMediaStatus(place.id, "rejected"))} className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50">
                  <X className="size-3.5" /> Reject
                </button>
              </>
            )}
            {(place.media_status == null || place.media_status === "none") && (
              <button type="button" disabled={pending} onClick={() => run(() => findPlaceMedia([place.id]))} className="inline-flex items-center gap-1 rounded-lg bg-navy-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-700 disabled:opacity-50">
                <Sparkles className="size-3.5" /> Find photo
              </button>
            )}
            <button type="button" onClick={() => setPicker((v) => !v)} className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-navy-800 ring-1 ring-navy-200 hover:bg-navy-50">
              <Search className="size-3.5" /> {place.image_url ? "Choose another photo" : "Search photos"}
            </button>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-navy-800 ring-1 ring-navy-200 hover:bg-navy-50">
              <Upload className="size-3.5" /> Upload your own
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
            </label>
            <button type="button" onClick={() => setEditing((v) => !v)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-navy-600 hover:bg-navy-50">
              {editing ? "Close" : "Edit details"}
            </button>
          </div>
          <Status state={result} />
        </div>
      </div>

      {picker && (
        <div className="border-t border-navy-100 bg-navy-50/50 p-4">
          <div className="flex flex-wrap gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), search())}
              placeholder="Search Wikipedia & Wikimedia Commons…"
              className={`${input} max-w-sm`}
            />
            <button type="button" onClick={search} disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-50">
              {pending && !busyUrl ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />} Search
            </button>
          </div>
          <p className="mt-1.5 text-xs text-navy-500">Tip: try the English or official name (e.g. &ldquo;Guanyin of Nanshan&rdquo;). Photos are free to use with the credit shown on the site.</p>
          {options && options.length === 0 && <p className="mt-3 text-sm text-navy-500">No photos found. Try another name, or upload your own.</p>}
          {options && options.length > 0 && (
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {options.map((o) => (
                <li key={o.url}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setBusyUrl(o.url);
                      start(async () => {
                        setResult(await choosePlacePhoto(place.id, o, query));
                        setBusyUrl(null);
                        setPicker(false);
                        setOptions(null);
                      });
                    }}
                    className="group block w-full overflow-hidden rounded-lg bg-white text-left ring-1 ring-navy-100 hover:ring-2 hover:ring-sun-400 disabled:opacity-60"
                  >
                    <span className="relative block aspect-[4/3] bg-navy-100">
                      {/* eslint-disable-next-line @next/next/no-img-element -- remote Wikimedia thumbnail */}
                      <img src={o.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                      {busyUrl === o.url && (
                        <span className="absolute inset-0 grid place-items-center bg-white/70"><LoaderCircle className="size-5 animate-spin" /></span>
                      )}
                    </span>
                    <span className="block p-2">
                      <span className="line-clamp-1 text-xs font-medium text-navy-800">{o.title.replace(/^File:/, "")}</span>
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] text-navy-500">
                        {o.source === "wikipedia" ? "Wikipedia" : "Commons"}
                        {o.distanceKm != null ? (
                          <span className={o.verified ? "text-green-700" : ""}>· {o.distanceKm} km {o.verified ? "✓" : ""}</span>
                        ) : (
                          <span>· no location</span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {editing && (
        <div className="border-t border-navy-100 p-4">
          <ActionForm action={updatePlace.bind(null, place.id, tourId)} className="grid gap-3 sm:grid-cols-[1fr_130px_130px]">
            {(state) => (
              <>
                <label className="block">
                  <span className={label}>Name</span>
                  <input name="name" defaultValue={place.name} className={input} />
                </label>
                <label className="block">
                  <span className={label}>Latitude</span>
                  <input name="lat" inputMode="decimal" defaultValue={place.lat ?? ""} className={input} />
                </label>
                <label className="block">
                  <span className={label}>Longitude</span>
                  <input name="lng" inputMode="decimal" defaultValue={place.lng ?? ""} className={input} />
                </label>
                <label className="block sm:col-span-3">
                  <span className={label}>Description (shown to customers)</span>
                  <textarea name="description" rows={3} defaultValue={place.description ?? ""} className={input} />
                </label>
                <div className="flex items-center gap-3 sm:col-span-3">
                  <SubmitButton>Save</SubmitButton>
                  {place.lat != null && (
                    <a href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=14/${place.lat}/${place.lng}`} target="_blank" rel="noopener" className="text-xs text-navy-600 underline">
                      Check position on a map
                    </a>
                  )}
                  <Status state={state} />
                </div>
              </>
            )}
          </ActionForm>
        </div>
      )}
    </div>
  );
}
