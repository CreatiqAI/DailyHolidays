"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BedDouble, CalendarDays, MapPinned, Route, Utensils } from "lucide-react";
import type { TourDetail } from "@/lib/queries";
import { durationLabel, formatMonth, formatRM } from "@/lib/format";
import { TripMap, type TripStop } from "./trip-map";

const TABS = [
  {
    key: "days",
    icon: Route,
    title: "Every day, planned",
    body: "Where you go, what you see, which meals are included and where you sleep. Day by day, before you book.",
  },
  {
    key: "map",
    icon: MapPinned,
    title: "The route, on a real map",
    body: "Follow every stop on a satellite map, so you know how the trip flows and how far you'll travel each day.",
  },
  {
    key: "fares",
    icon: CalendarDays,
    title: "Every date, every fare",
    body: "Upcoming departures with the price for each one, per person in Ringgit. Pick a date and enquire in one tap.",
  },
] as const;
type TabKey = (typeof TABS)[number]["key"];
const CYCLE_MS = 7000;

/** "See it before you book": auto-cycling tabs, each previewing a real tour's itinerary, route or fares. */
export function TripShowcase({ tour }: { tour: TourDetail }) {
  const [tab, setTab] = useState<TabKey>("days");
  const [paused, setPaused] = useState(false);
  const [mapDay, setMapDay] = useState<number | null>(null);
  const [cycle, setCycle] = useState(0); // restarts the progress bar animation
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 });
    if (rootRef.current) io.observe(rootRef.current);
    return () => io.disconnect();
  }, []);

  // advance to the next tab every CYCLE_MS while visible and not hovered
  useEffect(() => {
    if (paused || !inView) return;
    const id = setTimeout(() => {
      setTab((t) => TABS[(TABS.findIndex((x) => x.key === t) + 1) % TABS.length].key);
      setCycle((c) => c + 1);
    }, CYCLE_MS);
    return () => clearTimeout(id);
  }, [tab, paused, inView, cycle]);

  const stops = useMemo<TripStop[]>(
    () =>
      tour.days.flatMap((d) =>
        d.places.filter((p) => p.lat != null && p.lng != null).map((p) => ({ id: p.id, name: p.name, lat: p.lat!, lng: p.lng!, day: d.day_number, image: p.image_url })),
      ),
    [tour],
  );

  // on the map tab, step through the days
  useEffect(() => {
    if (tab !== "map") return;
    const days = [...new Set(stops.map((s) => s.day))];
    let i = 0;
    const id = setInterval(() => {
      setMapDay(days[i % days.length] ?? null);
      i++;
    }, 1600);
    return () => {
      clearInterval(id);
      setMapDay(null);
    };
  }, [tab, stops]);

  const months = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const d of tour.departures) {
      const k = d.departure_date.slice(0, 7);
      m.set(k, [...(m.get(k) ?? []), d.price_myr ?? Infinity]);
    }
    return [...m.entries()].slice(0, 6).map(([k, prices]) => ({ month: k, count: prices.length, from: Math.min(...prices) }));
  }, [tour]);

  const pick = (k: TabKey) => {
    setTab(k);
    setCycle((c) => c + 1);
  };

  return (
    <div
      ref={rootRef}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10"
    >
      {/* tabs */}
      <div className="flex flex-col gap-3" role="tablist" aria-label="What each trip page shows">
        {TABS.map((t, i) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => pick(t.key)}
              className={`group relative overflow-hidden rounded-3xl p-5 text-left transition duration-300 sm:p-6 ${
                active ? "bg-white shadow-lg shadow-navy-900/10 ring-1 ring-navy-100" : "hover:bg-white/70"
              }`}
            >
              <span className="flex items-start gap-4">
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-2xl transition duration-300 ${
                    active ? "glass-sun" : "bg-navy-50 text-navy-500 group-hover:text-navy-800"
                  }`}
                >
                  <t.icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="text-[11px] font-semibold tracking-[0.2em] text-navy-400">0{i + 1}</span>
                  <span className={`block text-lg font-bold ${active ? "text-navy-950" : "text-navy-700"}`}>{t.title}</span>
                  <span
                    className={`grid transition-all duration-500 ${active ? "mt-1 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                  >
                    <span className="overflow-hidden text-sm leading-relaxed text-navy-500">{t.body}</span>
                  </span>
                </span>
              </span>
              {active && (
                <span className="absolute inset-x-5 bottom-0 h-0.5 overflow-hidden rounded-full bg-navy-50">
                  <span
                    key={`${cycle}-${paused}`}
                    className="block h-full origin-left rounded-full bg-sun-500"
                    style={{ animation: paused || !inView ? "none" : `showcase-progress ${CYCLE_MS}ms linear forwards` }}
                  />
                </span>
              )}
            </button>
          );
        })}
        <Link
          href={`/tours/${tour.slug}`}
          className="glass-light mt-2 inline-flex items-center justify-between gap-3 self-start rounded-full px-5 py-3 text-sm font-semibold"
        >
          See it on a real trip: {tour.title} <ArrowRight className="size-4" />
        </Link>
      </div>

      {/* preview */}
      <div className="relative min-h-[440px] overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-navy-900/10 ring-1 ring-navy-100">
        <div className="flex items-center justify-between gap-3 border-b border-navy-50 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate font-bold text-navy-950">{tour.title}</p>
            <p className="text-xs text-navy-500">
              {[durationLabel(tour.duration_days, tour.duration_nights), tour.destination?.name].filter(Boolean).join(" · ")}
            </p>
          </div>
          {tour.price_from_myr && (
            <p className="shrink-0 text-right text-xs text-navy-500">
              from <span className="block text-lg font-extrabold text-navy-950">{formatRM(tour.price_from_myr, { compact: true })}</span>
            </p>
          )}
        </div>

        {tab === "days" && (
          <ol key="days" className="space-y-2 p-4 sm:p-5">
            {tour.days.slice(0, 5).map((d, i) => {
              const photos = d.places.filter((p) => p.image_url).slice(0, 3);
              return (
                <li key={d.id} className="fade-up flex gap-3 rounded-2xl p-2.5 ring-1 ring-navy-50" style={{ animationDelay: `${i * 90}ms` }}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy-50 text-center">
                    <span className="text-[8px] font-semibold uppercase leading-none tracking-widest text-navy-400">Day</span>
                    <span className="-mt-2 text-base font-extrabold text-navy-900">{d.day_number}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 text-sm font-semibold text-navy-900">{d.title}</span>
                    <span className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-navy-500">
                      {d.meals.length > 0 && (
                        <span className="flex items-center gap-1"><Utensils className="size-3" /> {d.meals.join(" · ")}</span>
                      )}
                      {d.hotel && (
                        <span className="flex items-center gap-1"><BedDouble className="size-3" /> {d.hotel}</span>
                      )}
                    </span>
                  </span>
                  {photos.length > 0 && (
                    <span className="hidden shrink-0 -space-x-3 sm:flex">
                      {photos.map((p) => (
                        <span key={p.id} className="relative size-10 overflow-hidden rounded-full ring-2 ring-white">
                          <Image src={p.image_url!} alt={p.name} fill sizes="40px" className="object-cover" />
                        </span>
                      ))}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {tab === "map" && (
          <div key="map" className="absolute inset-x-0 bottom-0 top-[73px]">
            <TripMap stops={stops} activeDay={mapDay} onSelectDay={setMapDay} />
            <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-navy-950/75 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
              {mapDay ? `Day ${mapDay} of ${tour.days.length}` : "The whole route"}
            </span>
          </div>
        )}

        {tab === "fares" && (
          <div key="fares" className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5">
            {months.map((m, i) => (
              <div key={m.month} className="fade-up rounded-2xl p-4 ring-1 ring-navy-100" style={{ animationDelay: `${i * 70}ms` }}>
                <p className="text-xs font-semibold uppercase tracking-widest text-navy-400">{formatMonth(`${m.month}-01`)}</p>
                <p className="mt-2 text-xl font-extrabold text-navy-950">{Number.isFinite(m.from) ? formatRM(m.from, { compact: true }) : "Ask us"}</p>
                <p className="text-xs text-navy-500">
                  {m.count} {m.count === 1 ? "departure" : "departures"}
                </p>
              </div>
            ))}
            <Link
              href={`/tours/${tour.slug}#book`}
              className="glass-sun col-span-2 mt-1 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold sm:col-span-3"
            >
              <CalendarDays className="size-4" /> Pick a date
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
