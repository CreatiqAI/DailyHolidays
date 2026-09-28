"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type Img = { id: string; url: string; caption: string | null };

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
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  if (!images.length) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setOpen(i)}
            className="relative aspect-[4/3] overflow-hidden rounded-xl bg-navy-100"
          >
            <Image
              src={img.url}
              alt={img.caption ?? `${title} photo ${i + 1}`}
              fill
              sizes="(min-width: 640px) 33vw, 50vw"
              className="object-cover transition duration-300 hover:scale-105"
            />
          </button>
        ))}
      </div>

      {open != null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal
          onClick={() => setOpen(null)}
        >
          <button type="button" aria-label="Close" className="absolute right-4 top-4 rounded-full p-2 text-white hover:bg-white/10">
            <X className="size-7" />
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous"
                onClick={(e) => { e.stopPropagation(); step(-1); }}
                className="absolute left-2 rounded-full p-2 text-white hover:bg-white/10 sm:left-6"
              >
                <ChevronLeft className="size-8" />
              </button>
              <button
                type="button"
                aria-label="Next"
                onClick={(e) => { e.stopPropagation(); step(1); }}
                className="absolute right-2 rounded-full p-2 text-white hover:bg-white/10 sm:right-6"
              >
                <ChevronRight className="size-8" />
              </button>
            </>
          )}
          <div className="relative h-[80vh] w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <Image src={images[open].url} alt={images[open].caption ?? title} fill sizes="100vw" className="object-contain" />
          </div>
          <p className="absolute bottom-4 text-sm text-white/70">{open + 1} / {images.length}</p>
        </div>
      )}
    </>
  );
}
