"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Horizontal, snapping row of cards. Glass arrow buttons (desktop) and an edge fade appear only on the
 * side that has more to scroll; side padding keeps the first/last card's ring and lift from being clipped.
 */
export function ScrollRow({
  children,
  resetKey,
  gap = "gap-3",
  className = "",
  label,
  role,
}: {
  children: ReactNode;
  resetKey?: string;
  gap?: string;
  className?: string;
  label?: string;
  role?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true });
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
      mo.disconnect();
    };
  }, [resetKey]);

  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });
  const fade = `linear-gradient(to right, ${edges.left ? "transparent, black 3rem" : "black, black"}, ${edges.right ? "black calc(100% - 3rem), transparent" : "black, black"})`;

  return (
    <div className={`relative ${className}`}>
      <div
        key={resetKey}
        ref={ref}
        role={role}
        aria-label={label}
        className={`no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 overflow-x-auto px-4 py-2 sm:-mx-2 sm:scroll-px-2 sm:px-2 ${gap}`}
        style={{ maskImage: fade, WebkitMaskImage: fade }}
      >
        {children}
      </div>
      {([-1, 1] as const).map((dir) => {
        const show = dir < 0 ? edges.left : edges.right;
        return (
          <button
            key={dir}
            type="button"
            onClick={() => scroll(dir)}
            aria-label={dir < 0 ? "Scroll left" : "Scroll right"}
            tabIndex={show ? 0 : -1}
            className={`glass absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full transition-opacity duration-300 lg:grid ${
              dir < 0 ? "-left-5" : "-right-5"
            } ${show ? "opacity-100" : "pointer-events-none opacity-0"}`}
          >
            {dir < 0 ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
          </button>
        );
      })}
    </div>
  );
}
