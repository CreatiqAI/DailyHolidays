"use client";

import { geoGraticule10, geoMercator, geoPath } from "d3-geo";
import { select } from "d3-selection";
import "d3-transition";
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import type { Feature, Geometry, MultiLineString } from "geojson";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type MapPin = {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  count: number;
  live: boolean; // has upcoming departures
  image: string | null;
};

const W = 960;
const H = 640;
const R = 20; // pin thumbnail radius
const FLY_ZOOM = 2.6;

type CountryFeature = Feature<Geometry, { name: string }>;
type World = { land: Feature<Geometry>; borders: MultiLineString };
type Point = MapPin & { x: number; y: number };

const geoCache = new Map<string, Promise<CountryFeature>>();
let worldPromise: Promise<World> | null = null;

function loadJson<T>(url: string) {
  return fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${url}: ${r.status}`);
    return r.json() as Promise<T>;
  });
}
function loadCountry(geoId: string) {
  let p = geoCache.get(geoId);
  if (!p) {
    p = loadJson<CountryFeature>(`/geo/${geoId}.json`);
    geoCache.set(geoId, p);
  }
  return p;
}
function loadWorld() {
  return (worldPromise ??= loadJson<World>("/geo/world.json"));
}

type Box = { x1: number; y1: number; x2: number; y2: number };
const overlaps = (a: Box, b: Box) => !(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2);

/** Greedy label placement in map units: busiest places first; drop a label that would cover another label or pin. */
function visibleLabels(points: Point[], u: number) {
  const pins = points.map((p) => ({ id: p.id, box: { x1: p.x - R * u, y1: p.y - R * u, x2: p.x + R * u, y2: p.y + R * u } }));
  const placed: Box[] = [];
  const show = new Set<string>();
  for (const p of [...points].sort((a, b) => b.count - a.count)) {
    const box: Box = { x1: p.x + (R + 4) * u, y1: p.y - 14 * u, x2: p.x + (R + 12 + p.name.length * 8) * u, y2: p.y + 16 * u };
    if (placed.some((b) => overlaps(box, b)) || pins.some((d) => d.id !== p.id && overlaps(box, d.box))) continue;
    placed.push(box);
    show.add(p.id);
  }
  return show;
}

export function CountryMap({
  geoId,
  image,
  pins,
  selectedId,
  onSelect,
}: {
  geoId: string | null;
  image: string | null;
  pins: MapPin[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [t, setT] = useState<ZoomTransform>(zoomIdentity);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const [s, setScale] = useState(1); // pins grow a little when the map is rendered small
  const [world, setWorld] = useState<World | null>(null);
  const [loaded, setLoaded] = useState<{ id: string; feature: CountryFeature } | null>(null);
  const feature = loaded && loaded.id === geoId ? loaded.feature : null;

  useEffect(() => {
    loadWorld().then(setWorld).catch(() => {});
  }, []);

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

  // pan & zoom: drag, ctrl/⌘ + wheel (also trackpad pinch), two-finger touch, buttons
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.7, 9])
      .translateExtent([[-W * 0.6, -H * 0.6], [W * 1.6, H * 1.6]])
      .filter((event: WheelEvent | TouchEvent | MouseEvent) => {
        if (event.type === "wheel") return (event as WheelEvent).ctrlKey || (event as WheelEvent).metaKey;
        if (event.type.startsWith("touch")) return (event as TouchEvent).touches.length >= 2;
        return !(event as MouseEvent).button;
      })
      .wheelDelta((event: WheelEvent) => -event.deltaY * (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002) * 2)
      .on("zoom", (event) => setT(event.transform));
    select(svg).call(z).on("dblclick.zoom", null);
    zoomRef.current = z;

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) setHint(true);
    };
    svg.addEventListener("wheel", onWheel, { passive: true });
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width < 520 ? 1.25 : 1));
    ro.observe(svg);
    return () => {
      select(svg).on(".zoom", null);
      svg.removeEventListener("wheel", onWheel);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!hint) return;
    const id = setTimeout(() => setHint(false), 1800);
    return () => clearTimeout(id);
  }, [hint]);

  const geo = useMemo(() => {
    if (!feature) return null;
    const projection = geoMercator()
      .fitExtent([[90, 70], [W - 90, H - 70]], feature)
      .clipExtent([[-W, -H], [2 * W, 2 * H]]);
    const path = geoPath(projection);
    const [[bx1, by1], [bx2, by2]] = path.bounds(feature);
    // fall back to the centre of the country for a place without coordinates
    const centre: [number, number] = [(bx1 + bx2) / 2, (by1 + by2) / 2];
    const points: Point[] = pins.map((p) => {
      const xy = p.lat != null && p.lng != null ? projection([p.lng, p.lat]) : null;
      return { ...p, x: xy?.[0] ?? centre[0], y: xy?.[1] ?? centre[1] };
    });
    return {
      country: path(feature) ?? "",
      bbox: { x: bx1, y: by1, w: bx2 - bx1, h: by2 - by1 },
      land: world ? (path(world.land) ?? "") : "",
      borders: world ? (path(world.borders) ?? "") : "",
      graticule: path(geoGraticule10()) ?? "",
      points,
    };
  }, [feature, world, pins]);

  const points = useMemo(() => geo?.points ?? [], [geo]);
  const u = s / t.k; // one screen pixel of pin size, in map units
  const labels = useMemo(() => visibleLabels(points, u), [points, u]);

  const flyTo = useCallback((target: ZoomTransform, duration: number) => {
    const svg = svgRef.current;
    const z = zoomRef.current;
    if (!svg || !z) return;
    if (duration === 0) select(svg).call(z.transform, target);
    else select(svg).transition().duration(duration).call(z.transform, target);
  }, []);

  // new country: start from the full view
  useEffect(() => {
    flyTo(zoomIdentity, 0);
  }, [geoId, flyTo]);

  // fly to the selected place, or back out when unselected
  const sel = points.find((p) => p.id === selectedId);
  const selX = sel?.x;
  const selY = sel?.y;
  useEffect(() => {
    if (selX == null || selY == null) {
      flyTo(zoomIdentity, 700);
      return;
    }
    flyTo(zoomIdentity.translate(W / 2, H / 2).scale(FLY_ZOOM).translate(-selX, -selY), 900);
  }, [selX, selY, flyTo]);

  const zoomBy = (factor: number) => {
    const svg = svgRef.current;
    const z = zoomRef.current;
    if (svg && z) select(svg).transition().duration(300).call(z.scaleBy, factor);
  };

  const clipId = `clip-${geoId ?? "none"}`;

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className={`h-full w-full select-none ${t.k > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-grab"}`}
        role="img"
        aria-label={feature ? `Map of ${feature.properties.name}` : "Map"}
      >
        <defs>
          <clipPath id={clipId}>{geo && <path d={geo.country} />}</clipPath>
          <clipPath id="pin-clip">
            <circle r={R} />
          </clipPath>
          <linearGradient id="country-tint" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0b0f29" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#0b0f29" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        <g transform={t.toString()}>
          {geo && (
            <g key={geoId}>
              {/* faint world around the country */}
              <path d={geo.graticule} fill="none" stroke="#ffffff" strokeOpacity={0.06} strokeWidth={0.6 / t.k} />
              <path d={geo.land} fill="#ffffff" fillOpacity={0.05} stroke="none" />
              <path d={geo.borders} fill="none" stroke="#ffffff" strokeOpacity={0.14} strokeWidth={0.8 / t.k} />

              {/* the country, filled with its photo */}
              <g clipPath={`url(#${clipId})`}>
                <rect x={geo.bbox.x} y={geo.bbox.y} width={geo.bbox.w} height={geo.bbox.h} fill="#2a3884" />
                {image && (
                  <image
                    href={image}
                    x={geo.bbox.x}
                    y={geo.bbox.y}
                    width={geo.bbox.w}
                    height={geo.bbox.h}
                    preserveAspectRatio="xMidYMid slice"
                    className="country-photo"
                  />
                )}
                <rect x={geo.bbox.x} y={geo.bbox.y} width={geo.bbox.w} height={geo.bbox.h} fill="url(#country-tint)" />
              </g>
              <path d={geo.country} fill="none" stroke="#f9b563" strokeOpacity={0.35} strokeWidth={9 / t.k} strokeLinejoin="round" />
              <path
                d={geo.country}
                fill="none"
                stroke="#fcd29d"
                strokeWidth={2.2 / t.k}
                strokeLinejoin="round"
                pathLength={1}
                className="country-draw"
              />
            </g>
          )}

          {points.map((p, i) => {
            const active = p.id === selectedId;
            const dim = selectedId != null && !active;
            const showLabel = active || p.id === hoverId || labels.has(p.id);
            return (
              <g
                key={`${geoId}-${p.id}`}
                transform={`translate(${p.x}, ${p.y}) scale(${u})`}
                className="pin cursor-pointer outline-none"
                style={{ opacity: dim ? 0.6 : 1, transition: "opacity 300ms" }}
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
                <g className="pin-body" style={{ animationDelay: `${150 + i * 60}ms` }}>
                  {p.live && <circle r={R + 8} fill="#e8841a" className="pin-pulse" />}
                  <circle r={R + 4} fill="#0b0f29" fillOpacity={0.55} />
                  <circle r={R + 2} fill={active ? "#e8841a" : "#ffffff"} />
                  <circle r={R} fill="#1b2356" />
                  {p.image && (
                    <image href={p.image} x={-R} y={-R} width={2 * R} height={2 * R} preserveAspectRatio="xMidYMid slice" clipPath="url(#pin-clip)" />
                  )}
                  <circle cx={R * 0.72} cy={-R * 0.72} r={10} fill={p.live ? "#e8841a" : "#ffffff"} stroke="#0b0f29" strokeWidth={1.5} />
                  <text x={R * 0.72} y={-R * 0.72 + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill={p.live ? "#ffffff" : "#131940"}>
                    {p.count}
                  </text>
                  {showLabel && (
                    <>
                      <text x={R + 10} y={-1} fontSize={14} fontWeight={700} fill="#ffffff" stroke="#0b0f29" strokeWidth={3.5} paintOrder="stroke" strokeLinejoin="round">
                        {p.name}
                      </text>
                      <text x={R + 10} y={15} fontSize={11} fontWeight={600} fill="#fcd29d" stroke="#0b0f29" strokeWidth={3} paintOrder="stroke" strokeLinejoin="round">
                        {p.count} {p.count === 1 ? "trip" : "trips"}
                        {p.live ? " · dates open" : ""}
                      </text>
                    </>
                  )}
                </g>
              </g>
            );
          })}
        </g>
      </svg>

      {/* zoom controls */}
      <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-xl bg-navy-950/70 text-white shadow-lg ring-1 ring-white/10 backdrop-blur">
        <button type="button" onClick={() => zoomBy(1.6)} aria-label="Zoom in" className="grid size-9 place-items-center hover:bg-white/10">
          <Plus className="size-4" />
        </button>
        <button type="button" onClick={() => zoomBy(1 / 1.6)} aria-label="Zoom out" className="grid size-9 place-items-center border-t border-white/10 hover:bg-white/10">
          <Minus className="size-4" />
        </button>
        <button type="button" onClick={() => flyTo(zoomIdentity, 500)} aria-label="Reset view" className="grid size-9 place-items-center border-t border-white/10 hover:bg-white/10">
          <RotateCcw className="size-4" />
        </button>
      </div>

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-3 flex justify-center transition-opacity duration-300 ${hint ? "opacity-100" : "opacity-0"}`}
        aria-hidden={!hint}
      >
        <span className="rounded-full bg-navy-950/85 px-4 py-2 text-xs font-medium text-white shadow-lg">Hold Ctrl (⌘ on Mac) and scroll to zoom · drag to move</span>
      </div>
    </div>
  );
}
