"use client";

import { geoMercator, geoPath } from "d3-geo";
import { select } from "d3-selection";
import "d3-transition";
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import type { Feature, Geometry, MultiLineString } from "geojson";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { satelliteTiles } from "./satellite";

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

const FLY_ZOOM = 3.2; // zoom applied when a place is selected
const SPOTS_FROM = 1.9; // zoom level at which itinerary stops appear
const SPOT_LABELS_FROM = 2.8;

type CountryFeature = Feature<Geometry, { name: string }>;
type World = { land: Feature<Geometry>; borders: MultiLineString };
type Point = MapPin & { x: number; y: number };
type SpotPoint = MapSpot & { id: string; x: number; y: number };
type Box = { x1: number; y1: number; x2: number; y2: number };
/** Pins that overlap at the current zoom are shown as one; anchored on the busiest member. */
type Cluster = {
  id: string;
  x: number;
  y: number;
  members: Point[];
  count: number;
  live: boolean;
  image: string | null;
  name: string;
  sub: string;
};

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

type LabelSide = "right" | "left" | "below" | "above";

/**
 * Greedy label placement in screen space: heaviest first. Each label tries the right of its marker,
 * then the left; it is dropped if both would cover another label or a marker.
 */
function placeLabels(
  items: { id: string; weight: number; boxes: { side: LabelSide; box: Box }[] }[],
  obstacles: { id: string; box: Box }[],
  forced: Set<string>,
  bounds: Box,
) {
  const placed: Box[] = [];
  const show = new Map<string, LabelSide>();
  const inside = (b: Box) => b.x1 >= bounds.x1 && b.x2 <= bounds.x2 && b.y1 >= bounds.y1 && b.y2 <= bounds.y2;
  for (const it of [...items].sort((a, b) => b.weight - a.weight)) {
    const free = (box: Box) =>
      inside(box) && !placed.some((b) => overlaps(box, b)) && !obstacles.some((o) => o.id !== it.id && overlaps(box, o.box));
    // e.g. the selected pin: its label is always shown, so others must avoid it
    const pick = it.boxes.find((b) => free(b.box)) ?? (forced.has(it.id) ? it.boxes[0] : undefined);
    if (!pick) continue;
    placed.push(pick.box);
    show.set(it.id, pick.side);
  }
  return show;
}

/** Text position for a pin label's first (line 0) or second (line 1) line on the chosen side. */
function labelAt(side: LabelSide, R: number, line: 0 | 1) {
  if (side === "below") return { x: 0, y: R + (line ? 34 : 19), textAnchor: "middle" as const };
  if (side === "above") return { x: 0, y: -R - (line ? 12 : 27), textAnchor: "middle" as const };
  return { x: side === "left" ? -R - 10 : R + 10, y: line ? 15 : -1, textAnchor: side === "left" ? ("end" as const) : ("start" as const) };
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
    // the glowing outline traces only substantial landmasses; tiny islands would render as orange specks
    // (they still show their satellite imagery through the clip, with a thin edge)
    const geom = feature.geometry;
    const polys = geom.type === "MultiPolygon" ? geom.coordinates : geom.type === "Polygon" ? [geom.coordinates] : [];
    const withArea = polys.map((coordinates) => {
      const f = { type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates } };
      return { f, area: path.area(f) };
    });
    const largest = Math.max(0, ...withArea.map((p) => p.area));
    const isMain = (a: number) => a >= Math.max(60, largest * 0.004);
    const pathOf = (list: typeof withArea) =>
      list.length ? (path({ type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: list.map((p) => p.f.geometry.coordinates) } }) ?? "") : "";
    return {
      country: path(feature) ?? "",
      outline: withArea.length ? pathOf(withArea.filter((p) => isMain(p.area))) : (path(feature) ?? ""),
      islets: pathOf(withArea.filter((p) => !isMain(p.area))),
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

  // merge pins that would overlap on screen at this zoom
  const clusters = useMemo<Cluster[]>(() => {
    const minGap = 2 * R + 6;
    const groups: { members: Point[]; sx: number; sy: number }[] = [];
    for (const p of [...points].sort((a, b) => b.count - a.count)) {
      const [sx, sy] = t.apply([p.x, p.y]);
      const near = groups.find((g) => Math.hypot(g.sx - sx, g.sy - sy) < minGap);
      if (near) near.members.push(p);
      else groups.push({ members: [p], sx, sy });
    }
    return groups.map(({ members }) => {
      const [main] = members;
      const count = members.reduce((n, m) => n + m.count, 0);
      const names = members.map((m) => m.name);
      const single = members.length === 1;
      return {
        id: members.map((m) => m.id).join("+"),
        x: main.x,
        y: main.y,
        members,
        count,
        live: members.some((m) => m.live),
        image: members.find((m) => m.image)?.image ?? null,
        name: single ? main.name : names.length === 2 ? names.join(" · ") : `${names[0]} · ${names[1]} +${names.length - 2}`,
        sub: single ? `${count} ${count === 1 ? "trip" : "trips"}${main.live ? " · dates open" : ""}` : `${count} trips · ${members.length} places`,
      };
    });
  }, [points, t, R]);

  const spotPoints = useMemo<SpotPoint[]>(() => {
    if (!projection) return [];
    return spots.flatMap((s, i) => {
      const xy = projection([s.lng, s.lat]);
      return xy ? [{ ...s, id: `s${i}`, x: xy[0], y: xy[1] }] : [];
    });
  }, [projection, spots]);

  // satellite imagery, clipped to the country below
  const tiles = useMemo(() => (projection && w && h ? satelliteTiles(projection, w, h, t) : []), [projection, w, h, t]);

  const showSpots = t.k >= SPOTS_FROM;
  const visibleSpots = useMemo(() => {
    if (!showSpots) return [];
    return spotPoints.filter((s) => {
      const [sx, sy] = t.apply([s.x, s.y]);
      return sx > -40 && sx < w + 40 && sy > -40 && sy < h + 40;
    });
  }, [showSpots, spotPoints, t, w, h]);

  const clusterOf = useCallback(
    (memberId: string | null) => (memberId ? clusters.find((c) => c.members.some((m) => m.id === memberId)) ?? null : null),
    [clusters],
  );
  const selectedCluster = clusterOf(selectedId);
  const highlightCluster = clusterOf(highlightId);

  // which labels fit (screen space, since markers keep their screen size while zooming)
  const labels = useMemo(() => {
    const sp = (p: { x: number; y: number }) => t.apply([p.x, p.y]);
    const forced = new Set([selectedCluster?.id, hoverId, highlightCluster?.id].filter((id): id is string => !!id));
    const pinObstacles = clusters.map((c) => {
      const [x, y] = sp(c);
      return { id: c.id, box: { x1: x - R, y1: y - R, x2: x + R, y2: y + R } };
    });
    const spotObstacles = visibleSpots.map((s) => {
      const [x, y] = sp(s);
      return { id: s.id, box: { x1: x - 6, y1: y - 6, x2: x + 6, y2: y + 6 } };
    });
    const pinItems = clusters
      // while a place is selected, the other pins keep their thumbnails but drop their labels
      .filter((c) => !selectedCluster || forced.has(c.id))
      .map((c) => {
        const [x, y] = sp(c);
        const width = Math.max(c.name.length * 8, c.sub.length * 6.2);
        return {
          id: c.id,
          weight: 1000 + c.count,
          boxes: [
            { side: "right" as const, box: { x1: x + R + 4, y1: y - 14, x2: x + R + 12 + width, y2: y + 22 } },
            { side: "left" as const, box: { x1: x - R - 12 - width, y1: y - 14, x2: x - R - 4, y2: y + 22 } },
            { side: "below" as const, box: { x1: x - width / 2 - 4, y1: y + R + 4, x2: x + width / 2 + 4, y2: y + R + 40 } },
            { side: "above" as const, box: { x1: x - width / 2 - 4, y1: y - R - 44, x2: x + width / 2 + 4, y2: y - R - 8 } },
          ],
        };
      });
    const spotItems =
      t.k >= SPOT_LABELS_FROM
        ? visibleSpots.map((s) => {
            const [x, y] = sp(s);
            const width = s.name.length * 6.2 + 16; // pill label
            return {
              id: s.id,
              weight: 1,
              boxes: [
                { side: "right" as const, box: { x1: x + 10, y1: y - 12, x2: x + 14 + width, y2: y + 12 } },
                { side: "left" as const, box: { x1: x - 14 - width, y1: y - 12, x2: x - 10, y2: y + 12 } },
              ],
            };
          })
        : [];
    // keep labels on screen and clear of the zoom buttons on the right
    return placeLabels([...pinItems, ...spotItems], [...pinObstacles, ...spotObstacles], forced, { x1: 6, y1: 0, x2: w - 64, y2: h });
  }, [clusters, visibleSpots, t, R, selectedCluster, hoverId, highlightCluster, w, h]);

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

  // a merged pin zooms in until its members separate; a single pin selects its place
  const activate = (c: Cluster) => {
    if (c.members.length === 1) {
      onSelect(c.members[0].id);
      return;
    }
    const k = Math.min(12, t.k * 2.5);
    flyTo(zoomIdentity.translate(focusX, focusY).scale(k).translate(-c.x, -c.y), 700);
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
                <path d={paths.islets} fill="none" stroke="#fcd29d" strokeOpacity={0.5} strokeWidth={0.8 * inv} />
                <path d={paths.outline} fill="none" stroke="#f9b563" strokeOpacity={0.35} strokeWidth={10 * inv} strokeLinejoin="round" />
                <path d={paths.outline} fill="none" stroke="#fcd29d" strokeWidth={2.2 * inv} strokeLinejoin="round" pathLength={1} className="country-draw" />
              </g>
            )}

            {/* itinerary stops, revealed when zoomed in */}
            {visibleSpots.map((s) => (
              <g key={s.id} transform={`translate(${s.x}, ${s.y}) scale(${inv})`} className="spot">
                <g className="spot-body">
                  <circle r={9} fill="#ffffff" fillOpacity={0.16} />
                  <circle r={3.5} fill="#ffffff" stroke="#0b0f29" strokeOpacity={0.6} strokeWidth={1.5} />
                  {labels.has(s.id) && (() => {
                    const wLabel = s.name.length * 6.2 + 16;
                    const left = labels.get(s.id) === "left";
                    const x0 = left ? -12 - wLabel : 12;
                    return (
                      <g className="spot-label">
                        <rect x={x0} y={-10} width={wLabel} height={20} rx={10} fill="#0b0f29" fillOpacity={0.72} stroke="#ffffff" strokeOpacity={0.14} />
                        <text x={x0 + wLabel / 2} y={4} textAnchor="middle" fontSize={11} fontWeight={600} fill="#ffffff">
                          {s.name}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              </g>
            ))}

            {/* one pin per place (merged while they overlap) */}
            {clusters.map((c, i) => {
              const active = c.id === selectedCluster?.id;
              const dim = selectedCluster != null && !active;
              const merged = c.members.length > 1;
              return (
                <g
                  key={`${geoId}-${c.id}`}
                  transform={`translate(${c.x}, ${c.y}) scale(${inv})`}
                  className={`pin cursor-pointer outline-none ${c.id === highlightCluster?.id ? "is-hot" : ""}`}
                  style={{ opacity: dim ? 0.55 : 1, transition: "opacity 300ms" }}
                  role="button"
                  tabIndex={0}
                  aria-label={merged ? `${c.name}: ${c.sub}. Zoom in to separate` : `${c.name}, ${c.sub}`}
                  aria-pressed={active}
                  onClick={() => activate(c)}
                  onMouseEnter={() => setHoverId(c.id)}
                  onMouseLeave={() => setHoverId(null)}
                  onFocus={() => setHoverId(c.id)}
                  onBlur={() => setHoverId(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      activate(c);
                    }
                  }}
                >
                  <g className="pin-body" style={{ animationDelay: `${120 + i * 50}ms` }}>
                    {c.live && <circle r={R + 9} fill="#e8841a" className="pin-pulse" />}
                    {merged && <circle r={R + 7} fill="none" stroke="#ffffff" strokeOpacity={0.5} strokeWidth={1.5} strokeDasharray="4 4" />}
                    <circle r={R + 4} fill="#0b0f29" fillOpacity={0.55} />
                    <circle r={R + 2} fill={active ? "#e8841a" : "#ffffff"} />
                    <circle r={R} fill="#1b2356" />
                    {c.image && (
                      <image href={c.image} x={-R} y={-R} width={2 * R} height={2 * R} preserveAspectRatio="xMidYMid slice" clipPath="url(#pin-clip)" />
                    )}
                    <circle cx={R * 0.72} cy={-R * 0.72} r={10} fill={c.live ? "#e8841a" : "#ffffff"} stroke="#0b0f29" strokeWidth={1.5} />
                    <text x={R * 0.72} y={-R * 0.72 + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill={c.live ? "#ffffff" : "#131940"}>
                      {c.count}
                    </text>
                    {labels.has(c.id) && (
                      <>
                        <text {...labelAt(labels.get(c.id)!, R, 0)} fontSize={14} fontWeight={700} fill="#ffffff" stroke="#0b0f29" strokeWidth={3.5} paintOrder="stroke" strokeLinejoin="round">
                          {c.name}
                        </text>
                        <text {...labelAt(labels.get(c.id)!, R, 1)} fontSize={11} fontWeight={600} fill="#fcd29d" stroke="#0b0f29" strokeWidth={3} paintOrder="stroke" strokeLinejoin="round">
                          {c.sub}
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
