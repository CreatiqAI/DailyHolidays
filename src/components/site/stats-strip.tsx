"use client";

import { useEffect, useRef, useState } from "react";

/** Numbers that count up from zero the first time they scroll into view. */
export function StatsStrip({ items }: { items: { value: number; label: string; suffix?: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setProgress(1);
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / 1400);
        setProgress(1 - (1 - p) ** 3); // ease-out
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-navy-100 shadow-sm ring-1 ring-navy-100 lg:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="bg-white px-5 py-6 sm:px-7 sm:py-8">
          <p className="text-3xl font-extrabold tabular-nums text-navy-950 sm:text-4xl">
            {Math.round(it.value * progress).toLocaleString("en-MY")}
            {it.suffix && <span className="text-sun-600">{it.suffix}</span>}
          </p>
          <p className="mt-1 text-sm text-navy-500">{it.label}</p>
        </div>
      ))}
    </div>
  );
}
