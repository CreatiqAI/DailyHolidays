"use client";

import { geoMercator, geoPath } from "d3-geo";
import { select } from "d3-selection";
import { tile as d3tile } from "d3-tile";
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
export type MapSpot = { name: string; lat: number; lng: number };
export type FitPadding = { top: number; right: number; bottom: number; left: number };

// Satellite imagery inside the country outline. Esri World Imagery, attribution shown by the parent.
const tileUrl = (x: number, y: number, z: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
const TILE_MAX_Z = 18;
const FLY_ZOOM = 3.2; // zoom applied when a place is selected
const SPOTS_FROM = 1.9; // zoom level at which itinerary stops appear
const SPOT_LABELS_FROM = 2.8;

type CountryFeature = Feature<Geometry, { name: string }>;
type World = { land: Feature<Geometry>; borders: MultiLineString };
type Point = MapPin & { x: number; y: number };
type SpotPoint = MapSpot & { id: string; x: number; y: number };
type Box = { x1: number; y1: number; x2: number; y2: number };

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

const overlaps = (a: Box, b: Box) => !(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2);

/** Greedy label placement in screen space: heaviest first; a label is dropped if it would cover another label or a marker. */
function placeLabels(items: { id: string; weight: number; box: Box }[], obstacles: { id: string; box: Box }[], forced: Set<string>) {
  const placed: Box[] = [];
  const show = new Set<string>();
  for (const it of [...items].sort((a, b) => b.weight - a.weight)) {
    const must = forced.has(it.id); // e.g. the selected pin: its label is always shown, so others must avoid it
    if (!must && (placed.some((b) => overlaps(it.box, b)) || obstacles.some((o) => o.id !== it.id && overlaps(it.box, o.box)))) continue;
    placed.push(it.box);
    show.add(it.id);
  }
  return show;
}

export function CountryMap({
  geoId,
  pins,
  spots,
  selectedId,
  highlightId,
  onSelect,
  fit,
}: {
  geoId: string | null;
  pins: MapPin[];
  spots: MapSpot[];
  selectedId: string | null;
  highlightId: string | null;
  onSelect: (id: string) => void;
  fit: FitPadding;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [t, setT] = useState<ZoomTransform>(zoomIdentity);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const [world, setWorld] = useState<World | null>(null);
  const [loaded, setLoaded] = useState<{ id: string; feature: CountryFeature } | null>(null);
  const feature = loaded && loaded.id === geoId ? loaded.feature : null;

  const { w, h } = size;
  const R = w > 0 && w < 640 ? 17 : 22; // pin thumbnail radius

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

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setSize({ w: Math.round(entry.contentRect.width), h: Math.round(entry.contentRect.height) }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // pan & zoom: drag, ctrl/⌘ + wheel (also trackpad pinch), two-finger touch, buttons
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !w || !h) return;
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.8, 12])
      .translateExtent([[-w * 0.75, -h * 0.75], [w * 1.75, h * 1.75]])
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
    return () => {
      select(svg).on(".zoom", null);
      svg.removeEventListener("wheel", onWheel);
    };
  }, [w, h]);

  useEffect(() => {
    if (!hint) return;
    const id = setTimeout(() => setHint(false), 1800);
    return () => clearTimeout(id);
  }, [hint]);

  const { top: fitTop, right: fitRight, bottom: fitBottom, left: fitLeft } = fit;
  const projection = useMemo(() => {
    if (!feature || !w || !h) return null;
    return geoMercator()
      .fitExtent([[fitLeft, fitTop], [Math.max(fitLeft + 100, w - fitRight), Math.max(fitTop + 100, h - fitBottom)]], feature)
      .clipExtent([[-w, -h], [2 * w, 2 * h]]);
  }, [feature, w, h, fitTop, fitRight, fitBottom, fitLeft]);

  const paths = useMemo(() => {
    if (!projection || !feature) return null;
    const path = geoPath(projection);
    const [[x1, y1], [x2, y2]] = path.bounds(feature);
    return {
      country: path(feature) ?? "",
      land: world ? (path(world.land) ?? "") : "",
      borders: world ? (path(world.borders) ?? "") : "",
      centre: [(x1 + x2) / 2, (y1 + y2) / 2] as [number, number],
    };
  }, [projection, feature, world]);

  const points = useMemo<Point[]>(() => {
    if (!projection || !paths) return [];
    return pins.map((p) => {
      const xy = p.lat != null && p.lng != null ? projection([p.lng, p.lat]) : null;
      return { ...p, x: xy?.[0] ?? paths.centre[0], y: xy?.[1] ?? paths.centre[1] };
    });
  }, [projection, paths, pins]);

  const spotPoints = useMemo<SpotPoint[]>(() => {
    if (!projection) return [];
    return spots.flatMap((s, i) => {
      const xy = projection([s.lng, s.lat]);
      return xy ? [{ ...s, id: `s${i}`, x: xy[0], y: xy[1] }] : [];
    });
  }, [projection, spots]);

  // satellite tiles, positioned in screen space for the current zoom
  const tiles = useMemo(() => {
    if (!projection || !w || !h) return [];
    const S = projection.scale();
    const [X, Y] = projection.translate();
    const tiler = d3tile()
      .extent([[0, 0], [w, h]])
      .tileSize(256)
      .clampX(false)
      .zoomDelta(typeof window !== "undefined" && window.devicePixelRatio > 1.5 ? 1 : 0);
    const list = tiler(zoomIdentity.translate(t.x + t.k * X, t.y + t.k * Y).scale(t.k * 2 * Math.PI * S));
    const [tx, ty] = list.translate;
    const z = list[0]?.[2] ?? 0;
    const d = Math.max(0, z - TILE_MAX_Z); // beyond the imagery's max zoom, stretch parent tiles
    const out: { key: string; url: string; x: number; y: number; size: number }[] = [];
    const seen = new Set<string>();
    for (const [x, y] of list) {
      const px = x >> d;
      const py = y >> d;
      const pz = z - d;
      const key = `${pz}/${px}/${py}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const n = 2 ** pz;
      const wx = ((px % n) + n) % n;
      if (py < 0 || py >= n) continue;
      out.push({
        key,
        url: tileUrl(wx, py, pz),
        x: (px * 2 ** d + tx) * list.scale,
        y: (py * 2 ** d + ty) * list.scale,
        size: list.scale * 2 ** d,
      });
    }
    return out;
  }, [projection, w, h, t]);

  // which labels fit (screen space, since markers keep their screen size while zooming)
  const showSpots = t.k >= SPOTS_FROM;
  const visibleSpots = useMemo(() => {
    if (!showSpots) return [];
    return spotPoints.filter((s) => {
      const [sx, sy] = t.apply([s.x, s.y]);
      return sx > -40 && sx < w + 40 && sy > -40 && sy < h + 40;
    });
  }, [showSpots, spotPoints, t, w, h]);

  const labels = useMemo(() => {
    const sp = (p: { x: number; y: number }) => t.apply([p.x, p.y]);
    const pinObstacles = points.map((p) => {
      const [x, y] = sp(p);
      return { id: p.id, box: { x1: x - R, y1: y - R, x2: x + R, y2: y + R } };
    });
    const spotObstacles = visibleSpots.map((s) => {
      const [x, y] = sp(s);
      return { id: s.id, box: { x1: x - 6, y1: y - 6, x2: x + 6, y2: y + 6 } };
    });
    const pinItems = points.map((p) => {
      const [x, y] = sp(p);
      const sub = `${p.count} trips${p.live ? " · dates open" : ""}`;
      const width = Math.max(p.name.length * 8, sub.length * 6.2);
      return { id: p.id, weight: 1000 + p.count, box: { x1: x + R + 4, y1: y - 14, x2: x + R + 12 + width, y2: y + 22 } };
    });
    const spotItems =
      t.k >= SPOT_LABELS_FROM
        ? visibleSpots.map((s) => {
            const [x, y] = sp(s);
            return { id: s.id, weight: 1, box: { x1: x + 8, y1: y - 8, x2: x + 12 + s.name.length * 6.5, y2: y + 8 } };
          })
        : [];
    const forced = new Set([selectedId, hoverId, highlightId].filter((id): id is string => !!id));
    // while a place is selected, the other pins keep their thumbnails but drop their labels
    const items = selectedId ? [...pinItems.filter((p) => forced.has(p.id)), ...spotItems] : [...pinItems, ...spotItems];
    return placeLabels(items, [...pinObstacles, ...spotObstacles], forced);
  }, [points, visibleSpots, t, R, selectedId, hoverId, highlightId]);

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

  // fly to the selected place (centred in the area not covered by overlays), or back out
  const sel = points.find((p) => p.id === selectedId);
  const selX = sel?.x;
  const selY = sel?.y;
  const focusX = (fitLeft + (w - fitRight)) / 2;
  const focusY = (fitTop + (h - fitBottom)) / 2;
  useEffect(() => {
    if (!w || !h) return;
    if (selX == null || selY == null) {
      flyTo(zoomIdentity, 700);
      return;
    }
    flyTo(zoomIdentity.translate(focusX, focusY).scale(FLY_ZOOM).translate(-selX, -selY), 1000);
  }, [selX, selY, focusX, focusY, w, h, flyTo]);

  const zoomBy = (factor: number) => {
    const svg = svgRef.current;
    const z = zoomRef.current;
    if (svg && z) select(svg).transition().duration(300).call(z.scaleBy, factor);
  };

  const inv = 1 / t.k;

  return (
    <div ref={wrapRef} className="absolute inset-0">
      {w > 0 && (
        <svg
          ref={svgRef}
          width={w}
          height={h}
          className="absolute inset-0 h-full w-full cursor-grab select-none active:cursor-grabbing"
          role="img"
          aria-label={feature ? `Map of ${feature.properties.name}` : "Map"}
        >
          <defs>
            <clipPath id="country-clip">{paths && <path d={paths.country} transform={t.toString()} />}</clipPath>
            <clipPath id="pin-clip">
              <circle r={R} />
            </clipPath>
          </defs>

          {/* satellite imagery, only inside the country */}
          {paths && (
            <g key={`tiles-${geoId}`} clipPath="url(#country-clip)">
              {tiles.map((tl) => (
                <image key={tl.key} href={tl.url} x={tl.x} y={tl.y} width={tl.size} height={tl.size} preserveAspectRatio="none" className="tile-in" />
              ))}
            </g>
          )}

          <g transform={t.toString()}>
            {paths && (
              <g key={geoId}>
                <path d={paths.land} fill="#ffffff" fillOpacity={0.05} />
                <path d={paths.borders} fill="none" stroke="#ffffff" strokeOpacity={0.16} strokeWidth={0.8 * inv} />
                <path d={paths.country} fill="none" stroke="#f9b563" strokeOpacity={0.35} strokeWidth={10 * inv} strokeLinejoin="round" />
                <path d={paths.country} fill="none" stroke="#fcd29d" strokeWidth={2.2 * inv} strokeLinejoin="round" pathLength={1} className="country-draw" />
              </g>
            )}

            {/* itinerary stops, revealed when zoomed in */}
            {visibleSpots.map((s) => (
              <g key={s.id} transform={`translate(${s.x}, ${s.y}) scale(${inv})`} className="spot">
                <g className="spot-body">
                  <circle r={5} fill="#ffffff" stroke="#e8841a" strokeWidth={2.5} />
                  {labels.has(s.id) && (
                    <text x={10} y={4} fontSize={11.5} fontWeight={600} fill="#ffffff" stroke="#0b0f29" strokeWidth={3} paintOrder="stroke" strokeLinejoin="round">
                      {s.name}
                    </text>
                  )}
                </g>
              </g>
            ))}

            {/* one pin per area */}
            {points.map((p, i) => {
              const active = p.id === selectedId;
              const dim = selectedId != null && !active;
              const showLabel = labels.has(p.id);
              return (
                <g
                  key={`${geoId}-${p.id}`}
                  transform={`translate(${p.x}, ${p.y}) scale(${inv})`}
                  className={`pin cursor-pointer outline-none ${p.id === highlightId ? "is-hot" : ""}`}
                  style={{ opacity: dim ? 0.55 : 1, transition: "opacity 300ms" }}
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
                  <g className="pin-body" style={{ animationDelay: `${200 + i * 60}ms` }}>
                    {p.live && <circle r={R + 9} fill="#e8841a" className="pin-pulse" />}
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
      )}

      {/* zoom controls */}
      <div className="absolute right-4 top-1/2 z-10 flex -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-navy-950/70 text-white shadow-lg ring-1 ring-white/10 backdrop-blur">
        <button type="button" onClick={() => zoomBy(1.7)} aria-label="Zoom in" className="grid size-10 place-items-center hover:bg-white/10">
          <Plus className="size-4" />
        </button>
        <button type="button" onClick={() => zoomBy(1 / 1.7)} aria-label="Zoom out" className="grid size-10 place-items-center border-t border-white/10 hover:bg-white/10">
          <Minus className="size-4" />
        </button>
        <button type="button" onClick={() => flyTo(zoomIdentity, 500)} aria-label="Reset view" className="grid size-10 place-items-center border-t border-white/10 hover:bg-white/10">
          <RotateCcw className="size-4" />
        </button>
      </div>

      <div
        className={`pointer-events-none absolute inset-x-0 z-10 flex justify-center transition-opacity duration-300 ${hint ? "opacity-100" : "opacity-0"}`}
        style={{ top: focusY - 20 }}
        aria-hidden={!hint}
      >
        <span className="rounded-full bg-navy-950/85 px-4 py-2 text-xs font-medium text-white shadow-lg ring-1 ring-white/10">
          Hold Ctrl (⌘ on Mac) and scroll to zoom · drag to move
        </span>
      </div>
    </div>
  );
}
