"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, ChevronRight, Clock, MapPin } from "lucide-react";
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
    active ? "bg-sun-500 text-white shadow-lg shadow-sun-500/30" : "bg-white/10 text-white hover:bg-white/20"
  }`;

/** Full-bleed photo that crossfades when the country changes. */
function HeroBackdrop({ image }: { image: string | null }) {
  const [pair, setPair] = useState({ prev: null as string | null, cur: image, key: 0 });
  if (pair.cur !== image) setPair({ prev: pair.cur, cur: image, key: pair.key + 1 });
  return (
    <div className="absolute inset-0 -z-20 overflow-hidden bg-navy-950">
      {pair.prev && <Image key={`p${pair.key}`} src={pair.prev} alt="" fill sizes="100vw" className="object-cover" />}
      {pair.cur && (
        <div key={`c${pair.key}`} className="hero-bg absolute inset-0">
          <Image src={pair.cur} alt="" fill priority sizes="100vw" className="object-cover" />
        </div>
      )}
    </div>
  );
}

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
      <HeroBackdrop image={country.image} />
      {/* darken only where the text and panels sit, so the photo stays vivid */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(90deg, rgba(11,15,41,0.92) 0%, rgba(11,15,41,0.55) 40%, rgba(11,15,41,0.2) 100%), linear-gradient(0deg, #0b0f29 0%, rgba(11,15,41,0.35) 30%, rgba(11,15,41,0) 55%)",
        }}
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-sun-300">Group tours · Ground tours · Cruises</p>
            <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-6xl">
              Where to <span className="font-script font-semibold text-sun-300">next?</span>
            </h1>
            <p className="mt-3 max-w-xl text-navy-100">Pick a country, tap a place on the map, and find the trip that fits you.</p>
          </div>
          <Link href="/tours" className="inline-flex items-center gap-1 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15 backdrop-blur hover:bg-white/20">
            Browse all trips <ChevronRight className="size-4" />
          </Link>
        </div>

        {/* country selector */}
        <div className="relative mt-8">
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-navy-950/70 to-transparent" />
          <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 pt-1 sm:mx-0 sm:px-0" role="tablist" aria-label="Countries">
            {countries.map((c) => {
              const active = c.id === country.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => pickCountry(c.id)}
                  className={`group relative h-24 w-40 shrink-0 snap-start overflow-hidden rounded-2xl text-left transition-all duration-300 ${
                    active
                      ? "scale-[1.04] shadow-2xl shadow-sun-500/25 ring-2 ring-sun-400"
                      : "opacity-75 ring-1 ring-white/15 hover:scale-[1.02] hover:opacity-100"
                  }`}
                >
                  {c.image ? (
                    <Image src={c.image} alt="" fill sizes="160px" className="object-cover transition duration-700 group-hover:scale-110" />
                  ) : (
                    <span className="absolute inset-0 bg-gradient-to-br from-navy-600 to-navy-800" />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/25 to-transparent" />
                  <span className="absolute bottom-2.5 left-3 right-3">
                    <span className="block text-sm font-bold leading-tight">{c.name}</span>
                    <span className="text-[11px] text-navy-100">
                      {c.tourCount} {c.tourCount === 1 ? "trip" : "trips"}
                    </span>
                  </span>
                  {active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-sun-400" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          {/* map */}
          <div className="relative aspect-[3/2] overflow-hidden rounded-3xl bg-navy-950/55 shadow-2xl ring-1 ring-white/10 backdrop-blur-md">
            <CountryMap geoId={country.geoId} image={country.image} pins={pins} selectedId={areaId} onSelect={pickArea} />
            {area ? (
              <button
                type="button"
                onClick={() => pickArea(null)}
                className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-navy-950/75 px-3 py-1.5 text-xs font-semibold text-white shadow-lg ring-1 ring-white/10 backdrop-blur hover:bg-navy-950/95"
              >
                <ArrowLeft className="size-3.5" /> All of {country.name}
              </button>
            ) : (
              <p className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-navy-950/75 px-3 py-1.5 text-xs text-navy-100 shadow-lg ring-1 ring-white/10 backdrop-blur">
                Tap a place to see its trips
              </p>
            )}
          </div>

          {/* panel */}
          <div
            key={area?.id ?? "areas"}
            className="panel-in flex max-h-[600px] flex-col rounded-3xl bg-navy-950/70 p-5 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-xl"
          >
            {!area ? (
              <>
                <h2 className="text-lg font-bold">Where in {country.name}?</h2>
                <p className="mt-1 text-sm text-navy-200">
                  {country.tourCount} trips across {places.length} {places.length === 1 ? "place" : "places"}
                </p>
                <ul className="-mr-2 mt-4 space-y-1 overflow-y-auto pr-2">
                  {places.map((p, i) => (
                    <li key={p.id} className="fade-up" style={{ animationDelay: `${i * 45}ms` }}>
                      <button
                        type="button"
                        onClick={() => pickArea(p.id)}
                        className="group flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-white/10"
                      >
                        <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-navy-800 ring-1 ring-white/10">
                          {p.image ? (
                            <Image src={p.image} alt="" fill sizes="56px" className="object-cover transition duration-500 group-hover:scale-110" />
                          ) : (
                            <span className="grid h-full w-full place-items-center text-navy-300"><MapPin className="size-5" /></span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">{p.name}</span>
                          <span className="text-xs text-navy-200">
                            {p.count} {p.count === 1 ? "trip" : "trips"}
                          </span>
                          {p.live && (
                            <span className="ml-2 rounded-full bg-sun-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sun-200">Dates open</span>
                          )}
                        </span>
                        <ChevronRight className="size-4 text-navy-300 transition group-hover:translate-x-0.5 group-hover:text-white" />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sun-300">{country.name}</p>
                    <h2 className="text-xl font-bold">{area.name}</h2>
                  </div>
                  <p className="text-sm text-navy-200">
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

                <ul key={`${sort}-${month ?? ""}`} className="-mr-2 mt-4 space-y-2 overflow-y-auto pr-2">
                  {tours.map((t, i) => (
                    <li key={t.id} className="fade-up" style={{ animationDelay: `${i * 45}ms` }}>
                      <Link
                        href={`/tours/${t.slug}`}
                        className="group flex gap-3 rounded-2xl bg-white/5 p-2 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-white/10 hover:ring-sun-400/60"
                      >
                        <span className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-navy-800">
                          {t.cover_image_url ? (
                            <Image src={t.cover_image_url} alt="" fill sizes="80px" className="object-cover transition duration-500 group-hover:scale-110" />
                          ) : (
                            <span className="absolute inset-0 bg-gradient-to-br from-navy-600 to-sun-500" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 text-sm font-semibold leading-snug">{t.title}</span>
                          <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-navy-200">
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
                          <span className="block text-[10px] uppercase tracking-wide text-navy-300">{t.price_from_myr ? "from" : ""}</span>
                          <span className="text-sm font-bold text-sun-300">{formatRM(t.price_from_myr, { compact: true }) ?? "Ask us"}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                  {tours.length === 0 && (
                    <li className="rounded-2xl bg-white/5 p-4 text-sm text-navy-100">No trips in that month. Try another month.</li>
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
