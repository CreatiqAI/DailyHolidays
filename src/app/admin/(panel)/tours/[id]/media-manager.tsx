"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { FileText, ImagePlus, LoaderCircle, Sparkles, Star, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addMedia, deleteMedia, reextractFromPdf, setCover } from "@/app/admin/actions";
import type { ActionResult } from "@/lib/admin";
import { Status } from "@/components/admin/ui";
import { Section } from "./section";

type Media = { id: string; kind: "image" | "pdf"; url: string; caption: string | null };

const safeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+/, "").slice(-80);

export function MediaManager({ tourId, media, coverUrl }: { tourId: string; media: Media[]; coverUrl: string | null }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [aiResult, setAiResult] = useState<ActionResult>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);

  const images = media.filter((m) => m.kind === "image");
  const pdfs = media.filter((m) => m.kind === "pdf");

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const supabase = createClient();
    const bucket = supabase.storage.from("tour-media");
    const items: { kind: "image" | "pdf"; url: string; caption: string | null }[] = [];
    for (const [i, file] of [...files].entries()) {
      setUploading(`Uploading ${i + 1} of ${files.length}…`);
      const isPdf = file.type === "application/pdf";
      if (!isPdf && !file.type.startsWith("image/")) continue;
      const path = `tours/${tourId}/${Date.now()}-${safeName(file.name)}`;
      const { error: upErr } = await bucket.upload(path, file, { contentType: file.type });
      if (upErr) {
        setError(`${file.name}: ${upErr.message}`);
        continue;
      }
      items.push({
        kind: isPdf ? "pdf" : "image",
        url: bucket.getPublicUrl(path).data.publicUrl,
        caption: isPdf ? file.name.replace(/\.pdf$/i, "") : null,
      });
    }
    if (items.length) await addMedia(tourId, items);
    setUploading(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <Section
      title="Photos & PDFs"
      description="The starred photo is the cover. PDFs appear as downloads on the tour page."
      actions={
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-navy-800 px-3 py-2 text-sm font-semibold text-white hover:bg-navy-700">
          {uploading ? <LoaderCircle className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          {uploading ?? "Upload photos / PDF"}
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            className="sr-only"
            disabled={!!uploading}
            onChange={(e) => upload(e.target.files)}
          />
        </label>
      }
    >
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {images.length > 0 ? (
        <ul className={`grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5 ${pending ? "opacity-60" : ""}`}>
          {images.map((m) => {
            const isCover = m.url === coverUrl;
            return (
              <li key={m.id} className={`group relative aspect-[4/3] overflow-hidden rounded-lg bg-navy-100 ${isCover ? "ring-2 ring-sun-500" : ""}`}>
                <Image src={m.url} alt="" fill sizes="200px" className="object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
                  <button
                    type="button"
                    title="Make cover"
                    onClick={() => start(() => setCover(tourId, m.url))}
                    className="rounded-md bg-white/90 p-1.5 text-navy-800 hover:bg-white"
                  >
                    <Star className={`size-4 ${isCover ? "fill-sun-500 text-sun-500" : ""}`} />
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    onClick={() => confirm("Delete this photo?") && start(() => deleteMedia(m.id, tourId))}
                    className="rounded-md bg-white/90 p-1.5 text-red-600 hover:bg-white"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                {isCover && <span className="absolute left-1.5 top-1.5 rounded bg-sun-500 px-1.5 py-0.5 text-[10px] font-bold text-white">COVER</span>}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-navy-400">No photos yet. Tours with a cover photo look much better in listings.</p>
      )}

      {pdfs.length > 0 && (
        <ul className="mt-5 space-y-2">
          {pdfs.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-lg p-2 ring-1 ring-navy-100">
              <FileText className="size-5 text-red-500" />
              <a href={m.url} target="_blank" rel="noopener" className="min-w-0 flex-1 truncate text-sm font-medium text-navy-800 hover:underline">
                {m.caption ?? "Itinerary PDF"}
              </a>
              <button
                type="button"
                disabled={!!aiBusy}
                onClick={async () => {
                  if (!confirm("Replace this tour's dates and itinerary with what AI reads from this PDF?")) return;
                  setAiBusy(m.id);
                  setAiResult(await reextractFromPdf(tourId, m.id));
                  setAiBusy(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-sun-700 hover:bg-sun-50 disabled:opacity-50"
              >
                {aiBusy === m.id ? <LoaderCircle className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                {aiBusy === m.id ? "Reading…" : "Update dates & itinerary from PDF"}
              </button>
              <button
                type="button"
                title="Delete PDF"
                onClick={() => confirm("Delete this PDF?") && start(() => deleteMedia(m.id, tourId))}
                className="rounded-lg p-1.5 text-navy-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2"><Status state={aiResult} /></div>
    </Section>
  );
}
