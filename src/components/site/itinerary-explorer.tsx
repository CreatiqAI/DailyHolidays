"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { BedDouble, ExternalLink, MapPin, Utensils, X } from "lucide-react";
import { TripMap, type TripStop } from "./trip-map";

export type ItineraryDay = {
  id: string;
  day_number: number;
  title: string;
  description: string | null;
  meals: string[];
  hotel: string | null;
  places: Stop[];
};

type Stop = {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  description?: string | null;
  image_url?: string | null;
  image_credit?: string | null;
  image_source_url?: string | null;
  info_source_url?: string | null;
};

/** Full photo, description and credit for one stop. */
function StopSheet({ stop, day, onClose, onShowOnMap }: { stop: Stop; day: number; onClose: () => void; onShowOnMap?: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-navy-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal aria-label={stop.name} onClick={onClose}>
      <div className="fade-up relative w-full max-w-2xl overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-navy-100 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        {stop.image_url && (
          <div className="relative aspect-[16/10] bg-navy-100">
            <Image src={stop.image_url} alt={stop.name} fill sizes="(min-width: 640px) 672px, 100vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-transparent to-transparent" />
          </div>
        )}
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-navy-950/60 text-white ring-1 ring-white/20 backdrop-blur hover:bg-navy-950/80">
          <X className="size-5" />
        </button>
        <div className="space-y-3 p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sun-600">Day {day}</p>
          <h3 className="text-2xl font-extrabold text-navy-950">{stop.name}</h3>
          {stop.description && <p className="leading-relaxed text-navy-700">{stop.description}</p>}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {onShowOnMap && stop.lat != null && (
              <button type="button" onClick={onShowOnMap} className="glass-sun inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white">
                <MapPin className="size-4" /> Show on map
              </button>
            )}
            {stop.info_source_url && (
              <a href={stop.info_source_url} target="_blank" rel="noopener" className="glass-light inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-navy-950">
                Read more <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
          {stop.image_credit && (
            <p className="pt-2 text-[11px] text-navy-400">
              {stop.image_source_url ? (
                <a href={stop.image_source_url} target="_blank" rel="noopener" className="hover:text-navy-950 hover:underline">
                  {stop.image_credit}
                </a>
              ) : (
                stop.image_credit
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

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
  const [sheet, setSheet] = useState<{ stop: Stop; day: number } | null>(null);
  const cardRefs = useRef(new Map<number, HTMLElement>());

  const stops = useMemo<TripStop[]>(
    () =>
      withoutOutliers(
        days.flatMap((d) =>
          d.places
            .filter((p) => p.lat != null && p.lng != null)
            .map((p) => ({ id: p.id, name: p.name, lat: p.lat!, lng: p.lng!, day: d.day_number, image: p.image_url ?? null })),
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
    <div className={hasMap ? "grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]" : "mx-auto max-w-3xl"}>
      {hasMap && (
        <div className="sticky top-16 z-10 -mx-4 h-[38svh] sm:mx-0 lg:order-2 lg:top-24 lg:h-[calc(100svh-8rem)]">
          <div className="relative h-full overflow-hidden shadow-2xl ring-1 ring-navy-100 sm:rounded-3xl">
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
                className={`absolute left-0 top-5 grid size-14 place-items-center rounded-2xl text-center transition duration-300 ${
                  active ? "glass-sun" : "bg-white text-navy-950 ring-1 ring-navy-100 hover:ring-navy-200"
                }`}
              >
                <span className="text-[9px] font-semibold uppercase tracking-widest opacity-80">Day</span>
                <span className="-mt-1 text-xl font-extrabold leading-none">{d.day_number}</span>
              </button>

              <article
                className={`rounded-3xl p-5 ring-1 backdrop-blur transition duration-500 sm:p-6 ${
                  active ? "bg-white ring-sun-300 shadow-xl shadow-sun-600/10" : "bg-white/70 shadow-sm ring-navy-100"
                }`}
              >
                <h3 className="text-lg font-bold leading-snug text-navy-950">{d.title}</h3>
                {d.description && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-navy-700">{d.description}</p>}
                {d.places.some((p) => p.image_url) && (
                  <ul className="no-scrollbar -mx-1 mt-4 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
                    {d.places
                      .filter((p) => p.image_url)
                      .map((p) => (
                        <li key={p.id} className="shrink-0 snap-start">
                          <button
                            type="button"
                            onClick={() => setSheet({ stop: p, day: d.day_number })}
                            className="group relative block h-28 w-40 overflow-hidden rounded-2xl text-left ring-1 ring-navy-100 transition hover:-translate-y-0.5 hover:ring-sun-400/70 sm:h-32 sm:w-48"
                          >
                            <Image src={p.image_url!} alt={p.name} fill sizes="192px" className="object-cover transition duration-700 group-hover:scale-110" />
                            <span className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/10 to-transparent" />
                            <span className="absolute inset-x-2.5 bottom-2 line-clamp-2 text-xs font-semibold leading-snug text-white">{p.name}</span>
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
                {d.places.some((p) => !p.image_url) && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {d.places
                      .filter((p) => !p.image_url)
                      .map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => (p.description ? setSheet({ stop: p, day: d.day_number }) : goToDay(d.day_number))}
                            className="flex items-center gap-1.5 rounded-full bg-sand-100 px-3 py-1 text-xs font-medium text-navy-900 ring-1 ring-navy-100 hover:bg-sun-50"
                          >
                            <MapPin className="size-3 text-sun-600" /> {p.name}
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
                {(d.meals.length > 0 || d.hotel) && (
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-navy-100 pt-4 text-xs text-navy-500">
                    {d.meals.length > 0 && (
                      <span className="flex items-center gap-1.5"><Utensils className="size-3.5 text-sun-600" /> {d.meals.join(" · ")}</span>
                    )}
                    {d.hotel && (
                      <span className="flex items-center gap-1.5"><BedDouble className="size-3.5 text-sun-600" /> {d.hotel}</span>
                    )}
                  </div>
                )}
              </article>
            </li>
          );
        })}
      </ol>

      {sheet && (
        <StopSheet
          stop={sheet.stop}
          day={sheet.day}
          onClose={() => setSheet(null)}
          onShowOnMap={
            hasMap
              ? () => {
                  const day = sheet.day;
                  setSheet(null);
                  goToDay(day);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
