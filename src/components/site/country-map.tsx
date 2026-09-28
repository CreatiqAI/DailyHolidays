"use client";

import { geoCentroid, geoMercator, geoPath } from "d3-geo";
import type { Feature, Geometry } from "geojson";
import { useEffect, useMemo, useRef, useState } from "react";

export type MapPin = {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  count: number;
  live: boolean; // has upcoming departures
};

const W = 800;
const H = 560;
const ZOOM = 2.2;
const EASE = "transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1)";

type CountryFeature = Feature<Geometry, { name: string }>;
type Point = MapPin & { x: number; y: number };

const cache = new Map<string, Promise<CountryFeature>>();

function loadCountry(geoId: string) {
  let p = cache.get(geoId);
  if (!p) {
    p = fetch(`/geo/${geoId}.json`).then((r) => {
      if (!r.ok) throw new Error(`geo ${geoId}: ${r.status}`);
      return r.json() as Promise<CountryFeature>;
    });
    cache.set(geoId, p);
  }
  return p;
}

type Box = { x1: number; y1: number; x2: number; y2: number };
const overlaps = (a: Box, b: Box) => !(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2);

/** Greedy label placement: busiest places first; a label is dropped if it would cover another label or dot. */
function visibleLabels(points: Point[], s: number) {
  const dots = points.map((p) => ({ id: p.id, box: { x1: p.x - 12 * s, y1: p.y - 12 * s, x2: p.x + 12 * s, y2: p.y + 12 * s } }));
  const placed: Box[] = [];
  const show = new Set<string>();
  for (const p of [...points].sort((a, b) => b.count - a.count)) {
    const box: Box = { x1: p.x + 12 * s, y1: p.y - 10 * s, x2: p.x + (16 + p.name.length * 7.5) * s, y2: p.y + 26 * s };
    const blocked = placed.some((b) => overlaps(box, b)) || dots.some((d) => d.id !== p.id && overlaps(box, d.box));
    if (blocked) continue;
    placed.push(box);
    show.add(p.id);
  }
  return show;
}

export function CountryMap({
  geoId,
  pins,
  selectedId,
  onSelect,
}: {
  geoId: string | null;
  pins: MapPin[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  // pins and labels scale up when the map is rendered small (phones)
  const [s, setScale] = useState(1);
  // remember which country the loaded outline belongs to, so a stale one is never drawn
  const [loaded, setLoaded] = useState<{ id: string; feature: CountryFeature } | null>(null);
  const feature = loaded && loaded.id === geoId ? loaded.feature : null;

  useEffect(() => {
    let alive = true;
    if (!geoId) return;
    loadCountry(geoId)
      .then((f) => alive && setLoaded({ id: geoId, feature: f }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [geoId]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setScale(w < 480 ? 1.9 : w < 720 ? 1.35 : 1);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { d, points } = useMemo(() => {
    if (!feature) return { d: "", points: [] as Point[] };
    const projection = geoMercator().fitExtent([[70, 60], [W - 70, H - 60]], feature);
    const centre = projection(geoCentroid(feature)) ?? [W / 2, H / 2];
    const points = pins.map((p) => {
      const xy = p.lat != null && p.lng != null ? projection([p.lng, p.lat]) : null;
      return { ...p, x: xy?.[0] ?? centre[0], y: xy?.[1] ?? centre[1] };
    });
    return { d: geoPath(projection)(feature) ?? "", points };
  }, [feature, pins]);

  const labels = useMemo(() => visibleLabels(points, s), [points, s]);

  // zoom towards the selected pin; pins live outside the zoomed group so they keep their size
  const sel = points.find((p) => p.id === selectedId);
  const k = sel ? ZOOM : 1;
  const tx = sel ? W / 2 - k * sel.x : 0;
  const ty = sel ? H / 2 - k * sel.y : 0;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className="h-full w-full select-none"
      role="img"
      aria-label={feature ? `Map of ${feature.properties.name}` : "Map"}
    >
      <g style={{ transform: `translate(${tx}px, ${ty}px) scale(${k})`, transition: EASE }}>
        {d && (
          <path
            key={geoId}
            d={d}
            className="country-path"
            fill="rgba(255,255,255,0.10)"
            stroke="#f9b563"
            strokeWidth={1.5 / k}
            strokeLinejoin="round"
          />
        )}
      </g>

      {points.map((p) => {
        const active = p.id === selectedId;
        const dim = selectedId != null && !active;
        const showLabel = active || p.id === hoverId || labels.has(p.id);
        return (
          <g
            key={p.id}
            style={{ transform: `translate(${tx + k * p.x}px, ${ty + k * p.y}px)`, transition: EASE, opacity: dim ? 0.55 : 1 }}
            className="cursor-pointer outline-none"
            role="button"
            tabIndex={0}
            aria-label={`${p.name}, ${p.count} trips`}
            aria-pressed={active}
            onClick={() => onSelect(p.id)}
            onMouseEnter={() => setHoverId(p.id)}
            onMouseLeave={() => setHoverId(null)}
            onFocus={() => setHoverId(p.id)}
            onBlur={() => setHoverId(null)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(p.id);
              }
            }}
          >
            {p.live && <circle r={18 * s} fill="#e8841a" className="pin-pulse" />}
            <circle r={(active ? 11 : 8) * s} fill={active || p.live ? "#e8841a" : "#ffffff"} stroke="#131940" strokeWidth={2.5 * s} />
            {showLabel && (
              <>
                <text x={16 * s} y={5 * s} fontSize={13 * s} fontWeight={700} fill="#ffffff" stroke="#131940" strokeWidth={3 * s} paintOrder="stroke" strokeLinejoin="round">
                  {p.name}
                </text>
                <text x={16 * s} y={21 * s} fontSize={11 * s} fontWeight={600} fill="#fcd29d" stroke="#131940" strokeWidth={3 * s} paintOrder="stroke" strokeLinejoin="round">
                  {p.count} {p.count === 1 ? "trip" : "trips"}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
