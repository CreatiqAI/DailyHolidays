"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  MapPinned,
  Route,
  Utensils,
} from "lucide-react";
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
const PIN_TOP = 96; // px from the top of the viewport where the showcase pins (below the header)

/**
 * "See it before you book": tabs previewing a real tour's itinerary, route and fares.
 * Desktop: the block pins while you scroll and the scroll position drives the tabs (and the map's day).
 * Phones: tap the tabs.
 */
export function TripShowcase({
  tour,
  header,
}: {
  tour: TourDetail;
  header?: ReactNode;
}) {
  const [tab, setTab] = useState<TabKey>("days");
  const [sub, setSub] = useState(0); // 0..1 progress through the current tab while scrolling
  const [pinned, setPinned] = useState(false); // desktop scroll-driven mode
  const [mapDay, setMapDay] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setPinned(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // scroll position within the tall track -> active tab and progress
  useEffect(() => {
    if (!pinned) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const track = trackRef.current;
      const sticky = stickyRef.current;
      if (!track || !sticky) return;
      const range = track.offsetHeight - sticky.offsetHeight;
      const p = Math.min(
        1,
        Math.max(
          0,
          (PIN_TOP - track.getBoundingClientRect().top) / Math.max(1, range),
        ),
      );
      const idx = Math.min(TABS.length - 1, Math.floor(p * TABS.length));
      setTab(TABS[idx].key);
      setSub(Math.min(1, p * TABS.length - idx));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [pinned]);

  const stops = useMemo<TripStop[]>(
    () =>
      tour.days.flatMap((d) =>
        d.places
          .filter((p) => p.lat != null && p.lng != null)
          .map((p) => ({
            id: p.id,
            name: p.name,
            lat: p.lat!,
            lng: p.lng!,
            day: d.day_number,
            image: p.image_url,
          })),
      ),
    [tour],
  );

  const stopDays = useMemo(
    () => [...new Set(stops.map((st) => st.day))],
    [stops],
  );

  // desktop: scrolling through the map tab walks through the days
  const scrollDay =
    pinned && tab === "map" && stopDays.length
      ? stopDays[
          Math.min(stopDays.length - 1, Math.floor(sub * stopDays.length))
        ]
      : null;

  // phones: step through the days on a timer while the map tab is open
  useEffect(() => {
    if (pinned || tab !== "map") return;
    let i = 0;
    const id = setInterval(() => {
      setMapDay(stopDays[i % stopDays.length] ?? null);
      i++;
    }, 1600);
    return () => {
      clearInterval(id);
      setMapDay(null);
    };
  }, [pinned, tab, stopDays]);
  const activeMapDay = pinned ? scrollDay : mapDay;

  const months = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const d of tour.departures) {
      const k = d.departure_date.slice(0, 7);
      m.set(k, [...(m.get(k) ?? []), d.price_myr ?? Infinity]);
    }
    return [...m.entries()].slice(0, 6).map(([k, prices]) => ({
      month: k,
      count: prices.length,
      from: Math.min(...prices),
    }));
  }, [tour]);

  const pick = (k: TabKey) => {
    const track = trackRef.current;
    const sticky = stickyRef.current;
    if (!pinned || !track || !sticky) return setTab(k);
    // scroll to the start of that tab's stretch of the track
    const idx = TABS.findIndex((t) => t.key === k);
    const range = track.offsetHeight - sticky.offsetHeight;
    const top =
      window.scrollY +
      track.getBoundingClientRect().top -
      PIN_TOP +
      ((idx + 0.02) / TABS.length) * range;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <div ref={trackRef} className="lg:h-[300vh]">
      <div
        ref={stickyRef}
        className="lg:sticky lg:flex lg:h-[calc(100vh-96px)] lg:flex-col lg:justify-center lg:pb-6"
        style={{ top: PIN_TOP }}
      >
        {header}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10">
          {/* tabs */}
          <div
            className="flex flex-col gap-3"
            role="tablist"
            aria-label="What each trip page shows"
          >
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
                    active
                      ? "bg-white shadow-lg shadow-navy-900/10 ring-1 ring-navy-100"
                      : "hover:bg-white/70"
                  }`}
                >
                  <span className="flex items-start gap-4">
                    <span
                      className={`grid size-11 shrink-0 place-items-center rounded-2xl transition duration-300 ${
                        active
                          ? "glass-sun"
                          : "bg-navy-50 text-navy-500 group-hover:text-navy-800"
                      }`}
                    >
                      <t.icon className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="text-[11px] font-semibold tracking-[0.2em] text-navy-400">
                        0{i + 1}
                      </span>
                      <span
                        className={`block text-lg font-bold ${active ? "text-navy-950" : "text-navy-700"}`}
                      >
                        {t.title}
                      </span>
                      <span
                        className={`grid transition-all duration-500 ${active ? "mt-1 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                      >
                        <span className="overflow-hidden text-sm leading-relaxed text-navy-500">
                          {t.body}
                        </span>
                      </span>
                    </span>
                  </span>
                  {active && (
                    <span className="absolute inset-x-5 bottom-0 h-0.5 overflow-hidden rounded-full bg-navy-50">
                      <span
                        className="block h-full origin-left rounded-full bg-sun-500 transition-transform duration-150"
                        style={{
                          transform: `scaleX(${pinned ? Math.max(0.04, sub) : 1})`,
                        }}
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
              See it on a real trip: {tour.title}{" "}
              <ArrowRight className="size-4" />
            </Link>
          </div>

          {/* preview */}
          <div className="relative min-h-[440px] overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-navy-900/10 ring-1 ring-navy-100">
            <div className="flex items-center justify-between gap-3 border-b border-navy-50 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate font-bold text-navy-950">{tour.title}</p>
                <p className="text-xs text-navy-500">
                  {[
                    durationLabel(tour.duration_days, tour.duration_nights),
                    tour.destination?.name,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {tour.price_from_myr && (
                <p className="shrink-0 text-right text-xs text-navy-500">
                  from{" "}
                  <span className="block text-lg font-extrabold text-navy-950">
                    {formatRM(tour.price_from_myr, { compact: true })}
                  </span>
                </p>
              )}
            </div>

            {tab === "days" && (
              <ol key="days" className="space-y-2 p-4 sm:p-5">
                {tour.days.slice(0, 5).map((d, i) => {
                  const photos = d.places
                    .filter((p) => p.image_url)
                    .slice(0, 3);
                  return (
                    <li
                      key={d.id}
                      className="fade-up flex gap-3 rounded-2xl p-2.5 ring-1 ring-navy-50"
                      style={{ animationDelay: `${i * 90}ms` }}
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy-50 text-center">
                        <span className="text-[8px] font-semibold uppercase leading-none tracking-widest text-navy-400">
                          Day
                        </span>
                        <span className="-mt-2 text-base font-extrabold text-navy-900">
                          {d.day_number}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 text-sm font-semibold text-navy-900">
                          {d.title}
                        </span>
                        <span className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-navy-500">
                          {d.meals.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Utensils className="size-3" />{" "}
                              {d.meals.join(" · ")}
                            </span>
                          )}
                          {d.hotel && (
                            <span className="flex items-center gap-1">
                              <BedDouble className="size-3" /> {d.hotel}
                            </span>
                          )}
                        </span>
                      </span>
                      {photos.length > 0 && (
                        <span className="hidden shrink-0 -space-x-3 sm:flex">
                          {photos.map((p) => (
                            <span
                              key={p.id}
                              className="relative size-10 overflow-hidden rounded-full ring-2 ring-white"
                            >
                              <Image
                                src={p.image_url!}
                                alt={p.name}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
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
                <TripMap
                  stops={stops}
                  activeDay={activeMapDay}
                  onSelectDay={setMapDay}
                />
                <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-navy-950/75 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                  {activeMapDay
                    ? `Day ${activeMapDay} of ${tour.days.length}`
                    : "The whole route"}
                </span>
              </div>
            )}

            {tab === "fares" && (
              <div
                key="fares"
                className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5"
              >
                {months.map((m, i) => (
                  <div
                    key={m.month}
                    className="fade-up rounded-2xl p-4 ring-1 ring-navy-100"
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-widest text-navy-400">
                      {formatMonth(`${m.month}-01`)}
                    </p>
                    <p className="mt-2 text-xl font-extrabold text-navy-950">
                      {Number.isFinite(m.from)
                        ? formatRM(m.from, { compact: true })
                        : "Ask us"}
                    </p>
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
      </div>
    </div>
  );
}
