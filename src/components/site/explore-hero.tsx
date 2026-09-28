"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import type { ExploreCountry, ExploreTour } from "@/lib/explore";
import { durationLabel, formatDate, formatMonth, formatRM } from "@/lib/format";
import { CountryMap, type MapPin as Pin } from "./country-map";

type Sort = "soonest" | "cheapest" | "shortest";

const sorters: Record<Sort, (a: ExploreTour, b: ExploreTour) => number> = {
  soonest: (a, b) =>
    (a.next_departure ?? "9").localeCompare(b.next_departure ?? "9") || a.title.localeCompare(b.title),
  cheapest: (a, b) =>
    (a.price_from_myr ?? Infinity) - (b.price_from_myr ?? Infinity) || a.title.localeCompare(b.title),
  shortest: (a, b) =>
    (a.duration_days ?? Infinity) - (b.duration_days ?? Infinity) || a.title.localeCompare(b.title),
};

const chip = (active: boolean) =>
  `rounded-full px-3 py-1.5 text-xs font-semibold transition ${
    active ? "bg-sun-500 text-white shadow-lg shadow-sun-500/30" : "bg-white/10 text-white ring-1 ring-white/10 hover:bg-white/20"
  }`;

/** Measured height of an element, so the map can fit the country between the overlays. */
function useHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // border box: the overlays' padding is part of the space they cover
    const ro = new ResizeObserver(([entry]) => setHeight(Math.round(entry.borderBoxSize?.[0]?.blockSize ?? entry.target.getBoundingClientRect().height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, height] as const;
}

/** Full-bleed photo that crossfades when the country changes. */
function HeroBackdrop({ image }: { image: string | null }) {
  const [pair, setPair] = useState({ prev: null as string | null, cur: image, key: 0 });
  if (pair.cur !== image) setPair({ prev: pair.cur, cur: image, key: pair.key + 1 });
  return (
    <div className="absolute inset-0 overflow-hidden bg-navy-950">
      {pair.prev && <Image key={`p${pair.key}`} src={pair.prev} alt="" fill sizes="100vw" className="object-cover" />}
      {pair.cur && (
        <div key={`c${pair.key}`} className="hero-bg absolute inset-0">
          <Image src={pair.cur} alt="" fill priority sizes="100vw" className="object-cover" />
        </div>
      )}
      {/* soften the photo so the map reads as the subject */}
      <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-[2px]" />
    </div>
  );
}

/** Horizontal, snapping card shelf with arrow buttons on large screens. */
function Shelf({ children, itemKey }: { children: ReactNode; itemKey: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <div className="group/shelf relative">
      <div key={itemKey} ref={ref} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 pt-2 sm:mx-0 sm:px-0">
        {children}
      </div>
      {[-1, 1].map((dir) => (
        <button
          key={dir}
          type="button"
          onClick={() => scroll(dir)}
          aria-label={dir < 0 ? "Scroll left" : "Scroll right"}
          className={`absolute top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-navy-950/80 text-white shadow-lg ring-1 ring-white/15 backdrop-blur transition hover:bg-navy-950 lg:grid ${
            dir < 0 ? "-left-5" : "-right-5"
          }`}
        >
          {dir < 0 ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
        </button>
      ))}
    </div>
  );
}

export function ExploreHero({ countries }: { countries: ExploreCountry[] }) {
  const [countryId, setCountryId] = useState(countries[0]?.id ?? null);
  const [areaId, setAreaId] = useState<string | null>(null);
  const [hotId, setHotId] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("soonest");
  const [month, setMonth] = useState<string | null>(null);
  const [topRef, topH] = useHeight<HTMLDivElement>();
  const [shelfRef, shelfH] = useHeight<HTMLDivElement>();

  const country = countries.find((c) => c.id === countryId) ?? countries[0];

  // one entry per area; tours filed under the country itself become an "Across …" card
  // (and the only pin, at the centre, when the country has no areas)
  const places = useMemo<(Pin & { onMap: boolean })[]>(() => {
    if (!country) return [];
    const list = country.areas.map((a) => ({
      id: a.id,
      name: a.name,
      lat: a.lat,
      lng: a.lng,
      count: a.tours.length,
      live: a.tours.some((t) => t.departure_count > 0),
      image: a.image,
      onMap: true,
    }));
    if (country.tours.length) {
      list.push({
        id: country.id,
        name: country.areas.length ? `Across ${country.name}` : country.name,
        lat: null,
        lng: null,
        count: country.tours.length,
        live: country.tours.some((t) => t.departure_count > 0),
        image: country.tours.find((t) => t.cover_image_url)?.cover_image_url ?? country.image,
        onMap: country.areas.length === 0,
      });
    }
    return list;
  }, [country]);
  const pins = useMemo(() => places.filter((p) => p.onMap), [places]);
  // stops revealed on zoom: only the selected place's when one is chosen, otherwise the whole country's
  const spots = useMemo(() => {
    if (!country) return [];
    if (areaId && areaId !== country.id) return country.areas.find((a) => a.id === areaId)?.spots ?? [];
    if (areaId === country.id) return country.spots;
    return [...country.spots, ...country.areas.flatMap((a) => a.spots)];
  }, [country, areaId]);

  const area = useMemo(() => {
    if (!country || !areaId) return null;
    if (areaId === country.id) return { id: country.id, name: country.name, tours: country.tours };
    const a = country.areas.find((x) => x.id === areaId);
    return a ? { id: a.id, name: a.name, tours: a.tours } : null;
  }, [country, areaId]);

  const months = useMemo(() => [...new Set(area?.tours.flatMap((t) => t.months) ?? [])].sort(), [area]);
  const tours = useMemo(
    () => (area?.tours ?? []).filter((t) => !month || t.months.includes(month)).sort(sorters[sort]),
    [area, month, sort],
  );

  // keep the country clear of the tile row (pins under it can't be tapped); the shelf's faded top may overlap a little
  const fit = useMemo(() => ({ top: Math.max(120, topH - 36), right: 72, bottom: Math.max(120, shelfH - 32), left: 48 }), [topH, shelfH]);

  if (!country) return null;

  const pickCountry = (id: string) => {
    setCountryId(id);
    setAreaId(null);
    setMonth(null);
  };
  const pickArea = (id: string | null) => {
    setAreaId(id);
    setMonth(null);
  };

  return (
    <section className="relative isolate h-[100svh] min-h-[760px] overflow-hidden bg-navy-950 text-white">
      <HeroBackdrop image={country.image} />

      <CountryMap
        geoId={country.geoId}
        pins={pins}
        spots={spots}
        selectedId={areaId}
        highlightId={hotId}
        onSelect={pickArea}
        fit={fit}
      />

      {/* top: headline + country selector */}
      <div ref={topRef} className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-navy-950/95 via-navy-950/55 to-transparent pb-12 pt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-sun-300">Group tours · Ground tours · Cruises</p>
              <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-5xl">
                Where to <span className="font-script font-semibold text-sun-300">next?</span>
              </h1>
            </div>
            <Link href="/tours" className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15 backdrop-blur hover:bg-white/20">
              Browse all trips <ChevronRight className="size-4" />
            </Link>
          </div>

          <div className="relative mt-4">
            <div
              className="pointer-events-auto no-scrollbar -mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 py-1.5 sm:-mx-1.5 sm:px-1.5 [mask-image:linear-gradient(to_right,black_calc(100%_-_4rem),transparent)]"
              role="tablist"
              aria-label="Countries"
            >
              {countries.map((c) => {
                const active = c.id === country.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => pickCountry(c.id)}
                    className={`group relative h-16 w-32 shrink-0 snap-start overflow-hidden rounded-xl text-left transition-all duration-300 sm:h-[72px] sm:w-36 ${
                      active
                        ? "shadow-2xl shadow-sun-500/25 ring-2 ring-sun-400"
                        : "opacity-70 ring-1 ring-white/15 hover:opacity-100"
                    }`}
                  >
                    {c.image ? (
                      <Image src={c.image} alt="" fill sizes="144px" className="object-cover transition duration-700 group-hover:scale-110" />
                    ) : (
                      <span className="absolute inset-0 bg-gradient-to-br from-navy-600 to-navy-800" />
                    )}
                    <span className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/20 to-transparent" />
                    <span className="absolute bottom-2 left-2.5 right-2">
                      <span className="block text-sm font-bold leading-tight">{c.name}</span>
                      <span className="text-[11px] text-navy-100">{c.tourCount} trips</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* bottom: shelf of places, or of the selected place's trips */}
      <div ref={shelfRef} className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-navy-950 via-navy-950/85 to-transparent pb-3 pt-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div key={area?.id ?? "areas"} className="panel-in flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {area && (
                <button
                  type="button"
                  onClick={() => pickArea(null)}
                  aria-label={`Back to all of ${country.name}`}
                  className="pointer-events-auto grid size-8 place-items-center self-center rounded-full bg-white/10 text-sun-300 ring-1 ring-white/15 hover:bg-white/20"
                >
                  <ArrowLeft className="size-4" />
                </button>
              )}
              <h2 className="text-xl font-bold leading-tight sm:text-2xl">{area ? area.name : `Where in ${country.name}?`}</h2>
              <p className="text-sm text-navy-200">
                {area
                  ? `${tours.length} of ${area.tours.length} trips in ${country.name}`
                  : `${country.tourCount} trips · ${places.length} ${places.length === 1 ? "place" : "places"} · tap a place on the map or below`}
              </p>
            </div>
            {area && (
              <div className="pointer-events-auto flex flex-wrap gap-1.5">
                {(["soonest", "cheapest", "shortest"] as Sort[]).map((s) => (
                  <button key={s} type="button" onClick={() => setSort(s)} className={chip(sort === s)}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </button>
                ))}
                {months.length > 0 && <span className="mx-1 hidden w-px self-stretch bg-white/15 sm:block" />}
                {months.length > 0 && (
                  <button type="button" onClick={() => setMonth(null)} className={chip(month === null)}>
                    Any month
                  </button>
                )}
                {months.map((m) => (
                  <button key={m} type="button" onClick={() => setMonth(m)} className={chip(month === m)}>
                    {formatMonth(`${m}-01`).replace(/ \d{4}$/, "")}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pointer-events-auto mt-2">
            {!area ? (
              <Shelf itemKey={`areas-${country.id}`}>
                {places.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => pickArea(p.id)}
                    onMouseEnter={() => setHotId(p.id)}
                    onMouseLeave={() => setHotId(null)}
                    className="fade-up group relative h-28 w-44 shrink-0 snap-start overflow-hidden rounded-2xl text-left ring-1 ring-white/15 transition duration-300 hover:-translate-y-1 hover:ring-sun-400 sm:w-52"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    {p.image ? (
                      <Image src={p.image} alt="" fill sizes="224px" className="object-cover transition duration-700 group-hover:scale-110" />
                    ) : (
                      <span className="absolute inset-0 bg-gradient-to-br from-navy-600 to-navy-800" />
                    )}
                    <span className="absolute inset-0 bg-gradient-to-t from-navy-950/95 via-navy-950/30 to-transparent" />
                    <span className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-navy-950/60 text-sun-300 backdrop-blur">
                      <MapPin className="size-4" />
                    </span>
                    <span className="absolute inset-x-3 bottom-3">
                      <span className="block text-base font-bold leading-tight">{p.name}</span>
                      <span className="mt-0.5 flex items-center gap-2 text-xs text-navy-100">
                        {p.count} {p.count === 1 ? "trip" : "trips"}
                        {p.live && <span className="rounded-full bg-sun-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Dates open</span>}
                      </span>
                    </span>
                  </button>
                ))}
              </Shelf>
            ) : (
              <Shelf itemKey={`${area.id}-${sort}-${month ?? ""}`}>
                {tours.map((t, i) => (
                  <Link
                    key={t.id}
                    href={`/tours/${t.slug}`}
                    className="fade-up group w-56 shrink-0 snap-start rounded-2xl bg-white/5 p-2 ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 hover:bg-white/10 hover:ring-sun-400/70 sm:w-64"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <span className="relative block h-24 overflow-hidden rounded-xl bg-navy-800 sm:h-28">
                      {t.cover_image_url ? (
                        <Image src={t.cover_image_url} alt="" fill sizes="256px" className="object-cover transition duration-700 group-hover:scale-110" />
                      ) : (
                        <span className="absolute inset-0 bg-gradient-to-br from-navy-600 to-sun-500" />
                      )}
                      {t.duration_days && (
                        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-navy-950/70 px-2 py-0.5 text-[11px] font-semibold backdrop-blur">
                          <Clock className="size-3" /> {durationLabel(t.duration_days, t.duration_nights)}
                        </span>
                      )}
                    </span>
                    <span className="mt-2 block line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug">{t.title}</span>
                    <span className="mt-1.5 flex items-end justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1 text-navy-200">
                        <CalendarDays className="size-3" />
                        {t.next_departure ? `${formatDate(t.next_departure)}${t.departure_count > 1 ? ` +${t.departure_count - 1}` : ""}` : "Dates on request"}
                      </span>
                      <span className="text-right">
                        {t.price_from_myr && <span className="block text-[10px] uppercase tracking-wide text-navy-300">from</span>}
                        <span className="text-sm font-bold text-sun-300">{formatRM(t.price_from_myr, { compact: true }) ?? "Ask us"}</span>
                      </span>
                    </span>
                  </Link>
                ))}
                {tours.length === 0 && (
                  <p className="rounded-2xl bg-white/5 p-4 text-sm text-navy-100">No trips in that month. Try another month.</p>
                )}
              </Shelf>
            )}
          </div>

          <p className="mt-2 text-right text-[10px] text-navy-400">Imagery © Esri, Maxar, Earthstar Geographics · Boundaries: Natural Earth</p>
        </div>
      </div>
    </section>
  );
}
