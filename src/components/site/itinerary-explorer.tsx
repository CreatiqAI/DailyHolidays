"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BedDouble, MapPin, Utensils } from "lucide-react";
import { TripMap, type TripStop } from "./trip-map";

export type ItineraryDay = {
  id: string;
  day_number: number;
  title: string;
  description: string | null;
  meals: string[];
  hotel: string | null;
  places: { id: string; name: string; lat: number | null; lng: number | null }[];
};

const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

/**
 * Drop stops that were geocoded far away from the rest of the trip (a name matched the wrong place).
 * The threshold scales with the trip's own spread, so multi-country routes are kept intact.
 */
function withoutOutliers(stops: TripStop[]) {
  if (stops.length < 4) return stops;
  const centre = { lat: median(stops.map((s) => s.lat)), lng: median(stops.map((s) => s.lng)) };
  const dist = stops.map((s) => km(centre, s));
  const limit = Math.max(400, median(dist) * 5);
  return stops.filter((_, i) => dist[i] <= limit);
}

/** Day-by-day timeline beside a sticky satellite map; the map follows whichever day is in the middle of the screen. */
export function ItineraryExplorer({ days }: { days: ItineraryDay[] }) {
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const cardRefs = useRef(new Map<number, HTMLElement>());

  const stops = useMemo<TripStop[]>(
    () =>
      withoutOutliers(
        days.flatMap((d) =>
          d.places
            .filter((p) => p.lat != null && p.lng != null)
            .map((p) => ({ id: p.id, name: p.name, lat: p.lat!, lng: p.lng!, day: d.day_number })),
        ),
      ),
    [days],
  );
  const hasMap = stops.length > 0;

  // the day card crossing the middle of the viewport becomes the active day
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (hit) setActiveDay(Number((hit.target as HTMLElement).dataset.day));
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    cardRefs.current.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [days]);

  const goToDay = (day: number) => {
    setActiveDay(day);
    cardRefs.current.get(day)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className={hasMap ? "grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]" : "mx-auto max-w-3xl"}>
      {hasMap && (
        <div className="sticky top-16 z-10 -mx-4 h-[38svh] sm:mx-0 lg:order-2 lg:top-24 lg:h-[calc(100svh-8rem)]">
          <div className="relative h-full overflow-hidden shadow-2xl ring-1 ring-white/10 sm:rounded-3xl">
            <TripMap stops={stops} activeDay={activeDay} onSelectDay={goToDay} />
            <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-navy-950/75 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/10 backdrop-blur">
              {activeDay == null ? `${days.length} days · the whole route` : `Day ${activeDay} of ${days.length}`}
            </div>
          </div>
        </div>
      )}

      <ol className="relative space-y-5 lg:order-1">
        <span className="absolute bottom-6 left-[27px] top-6 w-px bg-gradient-to-b from-sun-400/60 via-white/15 to-transparent" aria-hidden />
        {days.map((d) => {
          const active = d.day_number === activeDay;
          return (
            <li
              key={d.id}
              data-day={d.day_number}
              ref={(el) => {
                if (el) cardRefs.current.set(d.day_number, el);
                else cardRefs.current.delete(d.day_number);
              }}
              className="relative scroll-mt-32 pl-16"
            >
              <button
                type="button"
                onClick={() => goToDay(d.day_number)}
                aria-label={`Show day ${d.day_number} on the map`}
                className={`absolute left-0 top-5 grid size-14 place-items-center rounded-2xl text-center ring-1 transition duration-300 ${
                  active ? "bg-sun-500 text-white shadow-lg shadow-sun-500/30 ring-sun-400" : "bg-navy-900 text-white ring-white/15 hover:ring-white/40"
                }`}
              >
                <span className="text-[9px] font-semibold uppercase tracking-widest opacity-80">Day</span>
                <span className="-mt-1 text-xl font-extrabold leading-none">{d.day_number}</span>
              </button>

              <article
                className={`rounded-3xl p-5 ring-1 backdrop-blur transition duration-500 sm:p-6 ${
                  active ? "bg-white/10 ring-sun-400/50 shadow-xl shadow-black/30" : "bg-white/[0.04] ring-white/10"
                }`}
              >
                <h3 className="text-lg font-bold leading-snug text-white">{d.title}</h3>
                {d.description && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-navy-100">{d.description}</p>}
                {d.places.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {d.places.map((p) => (
                      <li key={p.id} className="flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1 text-xs font-medium text-white ring-1 ring-white/10">
                        <MapPin className="size-3 text-sun-300" /> {p.name}
                      </li>
                    ))}
                  </ul>
                )}
                {(d.meals.length > 0 || d.hotel) && (
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-white/10 pt-4 text-xs text-navy-200">
                    {d.meals.length > 0 && (
                      <span className="flex items-center gap-1.5"><Utensils className="size-3.5 text-sun-300" /> {d.meals.join(" · ")}</span>
                    )}
                    {d.hotel && (
                      <span className="flex items-center gap-1.5"><BedDouble className="size-3.5 text-sun-300" /> {d.hotel}</span>
                    )}
                  </div>
                )}
              </article>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
