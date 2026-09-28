"use client";

import { geoMercator } from "d3-geo";
import { select } from "d3-selection";
import "d3-transition";
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { satelliteTiles } from "./satellite";

export type TripStop = { id: string; name: string; lat: number; lng: number; day: number; image?: string | null };

const PAD = 80;
const ORANGE = "#f39a34";

type Pt = TripStop & { xy: [number, number] };
type Leg = { day: number; d: string };
type Box = { x1: number; y1: number; x2: number; y2: number };
const overlaps = (a: Box, b: Box) => !(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2);

/** A gentle arc from a to b (always bowing the same way), like a flight path. */
function arc(a: [number, number], b: [number, number]) {
  const [x1, y1] = a;
  const [x2, y2] = b;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const bow = Math.min(len * 0.18, 60);
  const cx = (x1 + x2) / 2 - (dy / (len || 1)) * bow;
  const cy = (y1 + y2) / 2 + (dx / (len || 1)) * bow;
  return `M${x1.toFixed(1)},${y1.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
}

/**
 * Satellite map of a trip. The route is drawn as arcs between stops: the active day's legs in orange with a
 * moving dash showing the direction of travel, the rest as a faint dotted line. Each day has a numbered pin
 * at its first stop; the active day's stops show photos and labels. Optional day selector along the top.
 */
export function TripMap({
  stops,
  activeDay,
  onSelectDay,
  showDayBar = true,
}: {
  stops: TripStop[];
  activeDay: number | null;
  onSelectDay: (day: number | null) => void;
  showDayBar?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [t, setT] = useState<ZoomTransform>(zoomIdentity);
  const [hint, setHint] = useState(false);
  const { w, h } = size;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !w || !h) return;
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.6, 40])
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

  const topPad = showDayBar ? 52 : 0; // keep the route clear of the day selector along the top
  const projection = useMemo(() => {
    if (!w || !h || !stops.length) return null;
    const pts = { type: "MultiPoint" as const, coordinates: stops.map((s) => [s.lng, s.lat]) };
    const p = geoMercator().fitExtent([[PAD, PAD + topPad], [w - PAD, h - PAD]], pts);
    // a single stop (or stops in one spot) would zoom in absurdly far: cap to roughly city scale
    const maxScale = (2 ** 11 * 256) / (2 * Math.PI);
    if (p.scale() > maxScale) {
      p.scale(maxScale);
      const [x, y] = p([stops[0].lng, stops[0].lat]) ?? [0, 0];
      const [tx, ty] = p.translate();
      p.translate([tx + w / 2 - x, ty + topPad + (h - topPad) / 2 - y]);
    }
    return p;
  }, [w, h, stops, topPad]);

  // stops in order, dropping consecutive repeats of the same place
  const points = useMemo<Pt[]>(() => {
    if (!projection) return [];
    const out: Pt[] = [];
    for (const s of stops) {
      const xy = (projection([s.lng, s.lat]) ?? [0, 0]) as [number, number];
      const prev = out.at(-1);
      if (prev && Math.hypot(prev.xy[0] - xy[0], prev.xy[1] - xy[1]) < 0.5) continue;
      out.push({ ...s, xy });
    }
    return out;
  }, [projection, stops]);

  // each leg belongs to the day of the stop it arrives at
  const legs = useMemo<Leg[]>(() => points.slice(1).map((p, i) => ({ day: p.day, d: arc(points[i].xy, p.xy) })), [points]);
  const days = useMemo(() => [...new Set(stops.map((s) => s.day))].sort((a, b) => a - b), [stops]);
  const dayStarts = useMemo(() => days.map((d) => points.find((p) => p.day === d)).filter((p): p is Pt => !!p), [days, points]);
  const tiles = useMemo(() => (projection && w && h ? satelliteTiles(projection, w, h, t) : []), [projection, w, h, t]);

  const flyTo = useCallback((target: ZoomTransform, duration: number) => {
    const svg = svgRef.current;
    const z = zoomRef.current;
    if (!svg || !z) return;
    if (duration === 0) select(svg).call(z.transform, target);
    else select(svg).transition().duration(duration).call(z.transform, target);
  }, []);

  // fly to the active day (its stops plus where it set off from), or show the whole trip
  const dayPts = useMemo(() => {
    if (activeDay == null) return [];
    const idx = points.findIndex((p) => p.day === activeDay);
    const own = points.filter((p) => p.day === activeDay);
    return idx > 0 ? [points[idx - 1], ...own] : own;
  }, [points, activeDay]);
  const bounds = dayPts.length
    ? dayPts.reduce(
        (b, p) => [Math.min(b[0], p.xy[0]), Math.min(b[1], p.xy[1]), Math.max(b[2], p.xy[0]), Math.max(b[3], p.xy[1])],
        [Infinity, Infinity, -Infinity, -Infinity],
      )
    : null;
  const [bx1, by1, bx2, by2] = bounds ?? [null, null, null, null];
  useEffect(() => {
    if (!w || !h) return;
    if (bx1 == null || by1 == null || bx2 == null || by2 == null) {
      flyTo(zoomIdentity, 900);
      return;
    }
    const bw = Math.max(bx2 - bx1, 1);
    const bh = Math.max(by2 - by1, 1);
    const availH = h - topPad;
    const k = Math.max(1, Math.min(8, 0.6 / Math.max(bw / w, bh / availH)));
    flyTo(zoomIdentity.translate(w / 2, topPad + availH / 2).scale(k).translate(-(bx1 + bx2) / 2, -(by1 + by2) / 2), 1100);
  }, [bx1, by1, bx2, by2, w, h, topPad, flyTo]);

  const zoomBy = (f: number) => {
    const svg = svgRef.current;
    const z = zoomRef.current;
    if (svg && z) select(svg).transition().duration(300).call(z.scaleBy, f);
  };

  // labels for the active day's stops, placed right or left of the marker, never overlapping (screen space)
  const labels = useMemo(() => {
    const out = new Map<string, "right" | "left">();
    if (activeDay == null) return out;
    const placed: Box[] = [];
    const markers = points.map((p) => {
      const [x, y] = t.apply(p.xy);
      const r = p.day === activeDay ? 19 : 8;
      return { x1: x - r, y1: y - r, x2: x + r, y2: y + r };
    });
    for (const p of points.filter((q) => q.day === activeDay)) {
      const [x, y] = t.apply(p.xy);
      const r = p.image ? 22 : 12;
      const wLabel = p.name.length * 6.2 + 18;
      const options: ["right" | "left", Box][] = [
        ["right", { x1: x + r, y1: y - 11, x2: x + r + wLabel, y2: y + 11 }],
        ["left", { x1: x - r - wLabel, y1: y - 11, x2: x - r, y2: y + 11 }],
      ];
      const pick = options.find(
        ([, b]) => b.x1 > 4 && b.x2 < w - 56 && !placed.some((o) => overlaps(o, b)) && !markers.some((m) => overlaps(m, b) && !(Math.abs((m.x1 + m.x2) / 2 - x) < 1 && Math.abs((m.y1 + m.y2) / 2 - y) < 1)),
      );
      if (!pick) continue;
      placed.push(pick[1]);
      out.set(p.id + p.day, pick[0]);
    }
    return out;
  }, [points, activeDay, t, w]);

  const inv = 1 / t.k;
  const hasActive = activeDay != null;

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden bg-navy-900">
      {w > 0 && (
        <svg ref={svgRef} width={w} height={h} className="absolute inset-0 h-full w-full cursor-grab select-none active:cursor-grabbing" role="img" aria-label="Map of the trip route">
          <defs>
            <clipPath id="stop-clip">
              <circle r={15} />
            </clipPath>
          </defs>

          {/* softened imagery so the route reads clearly */}
          <g style={{ filter: "saturate(0.7) brightness(0.82) contrast(1.05)" }}>
            {tiles.map((tl) => (
              <image key={tl.key} href={tl.url} x={tl.x} y={tl.y} width={tl.size} height={tl.size} preserveAspectRatio="none" className="tile-in" />
            ))}
          </g>
          <rect width={w} height={h} fill="#071a33" fillOpacity={0.18} />

          <g transform={t.toString()}>
            {/* route: faint dotted line for the whole trip */}
            {legs.map((l, i) => (
              <path
                key={`base-${i}`}
                d={l.d}
                fill="none"
                stroke="#ffffff"
                strokeOpacity={hasActive ? 0.5 : 0}
                strokeWidth={1.6}
                strokeDasharray="1 6"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                style={{ transition: "stroke-opacity 400ms" }}
              />
            ))}
            {/* highlighted legs: the active day, or the whole trip when no day is chosen */}
            {legs.map((l, i) => {
              const on = !hasActive || l.day === activeDay;
              if (!on) return null;
              return (
                <g key={`on-${i}-${activeDay ?? "all"}`}>
                  <path d={l.d} fill="none" stroke={ORANGE} strokeOpacity={0.28} strokeWidth={8} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  <path d={l.d} fill="none" stroke={ORANGE} strokeWidth={2.6} strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength={1} className="route-draw" />
                  {hasActive && (
                    <path d={l.d} fill="none" stroke="#fff7ec" strokeWidth={2.6} strokeLinecap="round" strokeDasharray="2 14" vectorEffect="non-scaling-stroke" className="route-flow" />
                  )}
                </g>
              );
            })}

            {/* small dots for every stop (not the active day's, which get photo markers) */}
            {points
              .filter((p) => p.day !== activeDay)
              .map((p) => (
                <g key={`dot-${p.id}-${p.day}`} transform={`translate(${p.xy[0]}, ${p.xy[1]}) scale(${inv})`} style={{ opacity: hasActive ? 0.7 : 1 }}>
                  <circle r={4} fill="#ffffff" stroke="#071a33" strokeOpacity={0.5} strokeWidth={1.5} />
                </g>
              ))}

            {/* active day's stops */}
            {points
              .filter((p) => p.day === activeDay)
              .map((p) => {
                const side = labels.get(p.id + p.day);
                const r = p.image ? 22 : 12;
                const wLabel = p.name.length * 6.2 + 18;
                const lx = side === "left" ? -r - wLabel : r;
                return (
                  <g key={`s-${p.id}-${p.day}`} transform={`translate(${p.xy[0]}, ${p.xy[1]}) scale(${inv})`}>
                    <g className="spot-body">
                      {p.image ? (
                        <>
                          <circle r={19} fill="#071a33" fillOpacity={0.45} />
                          <circle r={17} fill="#ffffff" />
                          <image href={p.image} x={-15} y={-15} width={30} height={30} preserveAspectRatio="xMidYMid slice" clipPath="url(#stop-clip)" />
                        </>
                      ) : (
                        <>
                          <circle r={10} fill={ORANGE} fillOpacity={0.25} />
                          <circle r={5} fill="#ffffff" stroke={ORANGE} strokeWidth={2} />
                        </>
                      )}
                      {side && (
                        <g>
                          <rect x={lx} y={-11} width={wLabel} height={22} rx={11} fill="#ffffff" fillOpacity={0.95} />
                          <text x={lx + wLabel / 2} y={4} textAnchor="middle" fontSize={11} fontWeight={600} fill="#0b2545">
                            {p.name}
                          </text>
                        </g>
                      )}
                    </g>
                  </g>
                );
              })}

            {/* a numbered pin where each day begins */}
            {dayStarts.map((p, i) => {
              const active = p.day === activeDay;
              return (
                <g
                  key={`d-${p.day}`}
                  transform={`translate(${p.xy[0]}, ${p.xy[1]}) scale(${inv})`}
                  className="pin cursor-pointer outline-none"
                  style={{ opacity: hasActive && !active ? 0.75 : 1, transition: "opacity 300ms" }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Day ${p.day}: ${p.name}`}
                  onClick={() => onSelectDay(p.day)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectDay(p.day);
                    }
                  }}
                >
                  <g className="pin-body" style={{ animationDelay: `${300 + i * 90}ms` }}>
                    {/* teardrop pin, tip at the stop */}
                    <g transform={active ? "translate(0,-4) scale(1.15)" : "translate(0,-4)"}>
                      <path d="M0 0 C -4 -7 -13 -12 -13 -22 A 13 13 0 1 1 13 -22 C 13 -12 4 -7 0 0 Z" fill={active ? ORANGE : "#ffffff"} stroke="#071a33" strokeOpacity={0.35} strokeWidth={1} />
                      <text y={-18} textAnchor="middle" fontSize={12} fontWeight={800} fill={active ? "#ffffff" : "#0b2545"}>
                        {p.day}
                      </text>
                    </g>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>
      )}

      {/* zoom */}
      <div className="absolute right-3 top-3 z-10 flex flex-col overflow-hidden rounded-xl bg-white text-navy-900 shadow-lg ring-1 ring-navy-100">
        <button type="button" onClick={() => zoomBy(1.7)} aria-label="Zoom in" className="grid size-9 place-items-center hover:bg-navy-50">
          <Plus className="size-4" />
        </button>
        <button type="button" onClick={() => zoomBy(1 / 1.7)} aria-label="Zoom out" className="grid size-9 place-items-center border-t border-navy-100 hover:bg-navy-50">
          <Minus className="size-4" />
        </button>
        <button type="button" onClick={() => (showDayBar ? onSelectDay(null) : flyTo(zoomIdentity, 600))} aria-label="Show the whole trip" className="grid size-9 place-items-center border-t border-navy-100 hover:bg-navy-50">
          <RotateCcw className="size-4" />
        </button>
      </div>

      {/* day selector */}
      {showDayBar && days.length > 1 && (
        <div className="absolute left-3 right-16 top-3 z-10 flex">
          <div className="no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-full bg-white/95 p-1 shadow-lg ring-1 ring-navy-100 backdrop-blur">
            <button
              type="button"
              onClick={() => onSelectDay(null)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${!hasActive ? "bg-navy-900 text-white" : "text-navy-600 hover:bg-navy-50"}`}
            >
              Whole trip
            </button>
            {days.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onSelectDay(d)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${activeDay === d ? "bg-sun-500 text-white" : "text-navy-600 hover:bg-navy-50"}`}
              >
                Day {d}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`pointer-events-none absolute inset-x-0 top-1/2 z-10 flex justify-center transition-opacity duration-300 ${hint ? "opacity-100" : "opacity-0"}`} aria-hidden={!hint}>
        <span className="rounded-full bg-navy-950/85 px-4 py-2 text-xs font-medium text-white shadow-lg">Hold Ctrl (⌘) and scroll to zoom · drag to move</span>
      </div>
      <p className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-white/60">Imagery © Esri, Maxar, Earthstar Geographics</p>
    </div>
  );
}
