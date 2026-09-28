"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { BedDouble, MapPin, Utensils } from "lucide-react";
import type { MapStop } from "./route-map";

const RouteMap = dynamic(() => import("./route-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-navy-50" />,
});

export type ItineraryDay = {
  id: string;
  day_number: number;
  title: string;
  description: string | null;
  meals: string[];
  hotel: string | null;
  places: { id: string; name: string; lat: number | null; lng: number | null }[];
};

export function ItineraryExplorer({ days }: { days: ItineraryDay[] }) {
  const [activeDay, setActiveDay] = useState<number | null>(null);

  const stops = useMemo<MapStop[]>(
    () =>
      days.flatMap((d) =>
        d.places
          .filter((p) => p.lat != null && p.lng != null)
          .map((p) => ({ id: p.id, name: p.name, lat: p.lat!, lng: p.lng!, day: d.day_number })),
      ),
    [days],
  );
  const hasMap = stops.length > 0;

  const selectDay = (day: number) => {
    setActiveDay(day);
    document.getElementById(`day-${day}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  return (
    <div className={hasMap ? "grid gap-6 lg:grid-cols-[1fr_minmax(0,420px)]" : ""}>
      <ol className="relative space-y-4 border-l-2 border-dashed border-navy-100 pl-6">
        {days.map((d) => {
          const active = d.day_number === activeDay;
          return (
            <li key={d.id} id={`day-${d.day_number}`} className="relative scroll-mt-28">
              <span
                className={`absolute -left-[39px] top-4 grid size-7 place-items-center rounded-full text-xs font-bold text-white ring-4 ring-sand-50 ${
                  active ? "bg-sun-500" : "bg-navy-700"
                }`}
              >
                {d.day_number}
              </span>
              <button
                type="button"
                onClick={() => setActiveDay(active ? null : d.day_number)}
                className={`w-full rounded-2xl bg-white p-5 text-left ring-1 transition ${
                  active ? "shadow-md ring-sun-300" : "ring-navy-100 hover:ring-navy-200"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-sun-600">Day {d.day_number}</p>
                <h3 className="mt-1 font-semibold text-navy-900">{d.title}</h3>
                {d.description && (
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-navy-600">{d.description}</p>
                )}
                {d.places.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {d.places.map((p) => (
                      <li key={p.id} className="flex items-center gap-1 rounded-full bg-navy-50 px-3 py-1 text-xs font-medium text-navy-700">
                        <MapPin className="size-3" /> {p.name}
                      </li>
                    ))}
                  </ul>
                )}
                {(d.meals.length > 0 || d.hotel) && (
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-navy-50 pt-3 text-xs text-navy-500">
                    {d.meals.length > 0 && (
                      <span className="flex items-center gap-1"><Utensils className="size-3.5" /> {d.meals.join(" · ")}</span>
                    )}
                    {d.hotel && (
                      <span className="flex items-center gap-1"><BedDouble className="size-3.5" /> {d.hotel}</span>
                    )}
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {hasMap && (
        <div className="order-first lg:order-none">
          <div className="h-80 overflow-hidden rounded-2xl ring-1 ring-navy-100 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] lg:max-h-[640px]">
            <RouteMap stops={stops} activeDay={activeDay} onSelectDay={selectDay} />
          </div>
          <p className="mt-2 text-xs text-navy-400">Tap a day to zoom to its stops. Map positions are approximate.</p>
        </div>
      )}
    </div>
  );
}
