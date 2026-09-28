"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, ChevronRight, Clock, MapPin } from "lucide-react";
import type { ExploreCountry, ExploreTour } from "@/lib/explore";
import { durationLabel, formatDate, formatMonth, formatRM } from "@/lib/format";
import { CountryMap, type MapPin as Pin } from "./country-map";
import { TourImagePlaceholder } from "./tour-image-placeholder";

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
    active ? "bg-navy-800 text-white" : "bg-navy-50 text-navy-700 hover:bg-navy-100"
  }`;

export function ExploreHero({ countries }: { countries: ExploreCountry[] }) {
  const [countryId, setCountryId] = useState(countries[0]?.id ?? null);
  const [areaId, setAreaId] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("soonest");
  const [month, setMonth] = useState<string | null>(null);

  const country = countries.find((c) => c.id === countryId) ?? countries[0];

  // one entry per area; tours filed under the country itself become an "Across …" row in the panel
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
        onMap: country.areas.length === 0,
      });
    }
    return list;
  }, [country]);
  const pins = useMemo(() => places.filter((p) => p.onMap), [places]);

  const area = useMemo(() => {
    if (!country || !areaId) return null;
    if (areaId === country.id) return { id: country.id, name: country.name, tours: country.tours };
    const a = country.areas.find((x) => x.id === areaId);
    return a ? { id: a.id, name: a.name, tours: a.tours } : null;
  }, [country, areaId]);

  const months = useMemo(
    () => [...new Set(area?.tours.flatMap((t) => t.months) ?? [])].sort(),
    [area],
  );
  const tours = useMemo(
    () => (area?.tours ?? []).filter((t) => !month || t.months.includes(month)).sort(sorters[sort]),
    [area, month, sort],
  );

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
    <section className="relative isolate overflow-hidden bg-navy-950 pt-16 text-white">
      {country.image && (
        <Image key={country.id} src={country.image} alt="" fill priority sizes="100vw" className="hero-bg -z-10 object-cover" />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-navy-950/80 via-navy-950/70 to-navy-950" />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
              Where to <span className="font-script text-sun-300">next?</span>
            </h1>
            <p className="mt-2 text-navy-100">Pick a country, tap a place on the map, and find the trip that fits you.</p>
          </div>
          <Link href="/tours" className="inline-flex items-center gap-1 text-sm font-semibold text-sun-300 hover:text-sun-200">
            Browse all trips <ChevronRight className="size-4" />
          </Link>
        </div>

        {/* country selector */}
        <div className="relative mt-6">
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-navy-950/80 to-transparent" />
        <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0" role="tablist" aria-label="Countries">
          {countries.map((c) => {
            const active = c.id === country.id;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => pickCountry(c.id)}
                className={`flex shrink-0 snap-start items-center gap-3 rounded-2xl p-2 pr-4 text-left transition ${
                  active ? "bg-white text-navy-950 shadow-lg" : "bg-white/10 text-white backdrop-blur hover:bg-white/20"
                }`}
              >
                <span className="relative size-12 overflow-hidden rounded-xl bg-navy-700">
                  {c.image && <Image src={c.image} alt="" fill sizes="48px" className="object-cover" />}
                </span>
                <span>
                  <span className="block text-sm font-bold leading-tight">{c.name}</span>
                  <span className={`text-xs ${active ? "text-navy-500" : "text-navy-200"}`}>
                    {c.tourCount} {c.tourCount === 1 ? "trip" : "trips"}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          {/* map */}
          <div className="relative aspect-[10/7] overflow-hidden rounded-3xl bg-white/5 ring-1 ring-white/10">
            <CountryMap geoId={country.geoId} pins={pins} selectedId={areaId} onSelect={pickArea} />
            {area ? (
              <button
                type="button"
                onClick={() => pickArea(null)}
                className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-navy-950/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-navy-950/90"
              >
                <ArrowLeft className="size-3.5" /> All of {country.name}
              </button>
            ) : (
              <p className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-navy-950/70 px-3 py-1.5 text-xs text-navy-100 backdrop-blur">
                Tap a place to see its trips
              </p>
            )}
          </div>

          {/* panel */}
          <div className="flex max-h-[560px] flex-col rounded-3xl bg-white p-5 text-navy-950 shadow-xl">
            {!area ? (
              <>
                <h2 className="text-lg font-bold">Where in {country.name}?</h2>
                <p className="mt-1 text-sm text-navy-500">{country.tourCount} trips across {places.length} {places.length === 1 ? "place" : "places"}.</p>
                <ul className="mt-4 divide-y divide-navy-50 overflow-y-auto">
                  {places.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => pickArea(p.id)}
                        className="flex w-full items-center gap-3 py-3 text-left hover:bg-navy-50/60"
                      >
                        <span className={`grid size-9 shrink-0 place-items-center rounded-full ${p.live ? "bg-sun-100 text-sun-600" : "bg-navy-50 text-navy-500"}`}>
                          <MapPin className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">{p.name}</span>
                          <span className="text-xs text-navy-500">
                            {p.count} {p.count === 1 ? "trip" : "trips"}
                            {p.live ? " · dates available" : ""}
                          </span>
                        </span>
                        <ChevronRight className="size-4 text-navy-300" />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-sun-600">{country.name}</p>
                    <h2 className="text-lg font-bold">{area.name}</h2>
                  </div>
                  <p className="text-sm text-navy-500">
                    {tours.length} of {area.tours.length}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(["soonest", "cheapest", "shortest"] as Sort[]).map((s) => (
                    <button key={s} type="button" onClick={() => setSort(s)} className={chip(sort === s)}>
                      {s[0].toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
                {months.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => setMonth(null)} className={chip(month === null)}>
                      Any month
                    </button>
                    {months.map((m) => (
                      <button key={m} type="button" onClick={() => setMonth(m)} className={chip(month === m)}>
                        {formatMonth(`${m}-01`).replace(/ \d{4}$/, "")}
                      </button>
                    ))}
                  </div>
                )}

                <ul className="mt-4 -mr-2 space-y-2 overflow-y-auto pr-2">
                  {tours.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/tours/${t.slug}`}
                        className="flex gap-3 rounded-2xl p-2 ring-1 ring-navy-100 transition hover:ring-sun-300"
                      >
                        <span className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-navy-100">
                          {t.cover_image_url ? (
                            <Image src={t.cover_image_url} alt="" fill sizes="80px" className="object-cover" />
                          ) : (
                            <TourImagePlaceholder label="" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 text-sm font-semibold leading-snug">{t.title}</span>
                          <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-navy-500">
                            {t.duration_days && (
                              <span className="flex items-center gap-1"><Clock className="size-3" /> {durationLabel(t.duration_days, t.duration_nights)}</span>
                            )}
                            <span className="flex items-center gap-1">
                              <CalendarDays className="size-3" />
                              {t.next_departure ? `${formatDate(t.next_departure)}${t.departure_count > 1 ? ` +${t.departure_count - 1}` : ""}` : "Dates on request"}
                            </span>
                          </span>
                        </span>
                        <span className="shrink-0 self-center text-right">
                          <span className="block text-[10px] uppercase text-navy-400">{t.price_from_myr ? "from" : ""}</span>
                          <span className="text-sm font-bold text-navy-900">{formatRM(t.price_from_myr, { compact: true }) ?? "Ask us"}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                  {tours.length === 0 && (
                    <li className="rounded-2xl bg-navy-50 p-4 text-sm text-navy-600">No trips in that month. Try another month.</li>
                  )}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
