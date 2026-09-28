"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";

type Img = { id: string; url: string; caption: string | null };

/** Bento mosaic (one large photo, up to four small) that opens a full-screen lightbox. */
export function Gallery({ images, title }: { images: Img[]; title: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const step = useCallback(
    (dir: number) => setOpen((i) => (i == null ? i : (i + dir + images.length) % images.length)),
    [images.length],
  );

  useEffect(() => {
    if (open == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, step]);

  if (!images.length) return null;
  const shown = images.slice(0, 5);

  return (
    <>
      <div className="grid auto-rows-[160px] grid-cols-2 gap-3 sm:auto-rows-[200px] md:grid-cols-4">
        {shown.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setOpen(i)}
            className={`group relative overflow-hidden rounded-2xl bg-navy-100 ring-1 ring-navy-100 ${i === 0 ? "col-span-2 row-span-2" : ""}`}
          >
            <Image
              src={img.url}
              alt={img.caption ?? `${title} photo ${i + 1}`}
              fill
              sizes={i === 0 ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 50vw"}
              className="object-cover transition duration-700 group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-navy-950/0 transition group-hover:bg-navy-950/20" />
            {i === shown.length - 1 && images.length > shown.length && (
              <span className="absolute inset-0 grid place-items-center bg-navy-950/60 text-sm font-semibold text-white backdrop-blur-sm">
                <span className="flex items-center gap-2"><Images className="size-4" /> +{images.length - shown.length} photos</span>
              </span>
            )}
          </button>
        ))}
      </div>

      {open != null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-950/95 p-4 backdrop-blur" role="dialog" aria-modal aria-label="Photos" onClick={() => setOpen(null)}>
          <button type="button" aria-label="Close" className="absolute right-4 top-4 rounded-full p-2 text-white hover:bg-white/10">
            <X className="size-7" />
          </button>
          {images.length > 1 && (
            <>
              <button type="button" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); step(-1); }} className="absolute left-2 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:left-6">
                <ChevronLeft className="size-7" />
              </button>
              <button type="button" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); step(1); }} className="absolute right-2 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:right-6">
                <ChevronRight className="size-7" />
              </button>
            </>
          )}
          <div key={open} className="fade-up relative h-[78vh] w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
            <Image src={images[open].url} alt={images[open].caption ?? title} fill sizes="100vw" className="object-contain" />
          </div>
          <div className="no-scrollbar absolute inset-x-0 bottom-4 flex justify-center gap-2 overflow-x-auto px-4" onClick={(e) => e.stopPropagation()}>
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setOpen(i)}
                aria-label={`Photo ${i + 1}`}
                className={`relative h-12 w-16 shrink-0 overflow-hidden rounded-lg ring-2 transition ${i === open ? "ring-sun-400" : "opacity-50 ring-transparent hover:opacity-100"}`}
              >
                <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
