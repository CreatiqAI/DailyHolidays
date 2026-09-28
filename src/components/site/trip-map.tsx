"use client";

import { geoMercator } from "d3-geo";
import { select } from "d3-selection";
import "d3-transition";
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { satelliteTiles } from "./satellite";

export type TripStop = { id: string; name: string; lat: number; lng: number; day: number; image?: string | null };

const PAD = 70;

/** Satellite map of a trip: the route drawn through every stop, numbered by day, flying to the active day. */
export function TripMap({
  stops,
  activeDay,
  onSelectDay,
}: {
  stops: TripStop[];
  activeDay: number | null;
  onSelectDay: (day: number) => void;
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

  const projection = useMemo(() => {
    if (!w || !h || !stops.length) return null;
    const pts = { type: "MultiPoint" as const, coordinates: stops.map((s) => [s.lng, s.lat]) };
    const p = geoMercator().fitExtent([[PAD, PAD], [w - PAD, h - PAD]], pts);
    // a single stop (or stops in one spot) would zoom in absurdly far: cap to roughly city scale
    const maxScale = 2 ** 11 * 256 / (2 * Math.PI);
    if (p.scale() > maxScale) {
      p.scale(maxScale);
      const [x, y] = p([stops[0].lng, stops[0].lat]) ?? [0, 0];
      const [tx, ty] = p.translate();
      p.translate([tx + w / 2 - x, ty + h / 2 - y]);
    }
    return p;
  }, [w, h, stops]);

  const points = useMemo(
    () => (projection ? stops.map((s) => ({ ...s, xy: projection([s.lng, s.lat]) ?? [0, 0] })) : []),
    [projection, stops],
  );
  const tiles = useMemo(() => (projection && w && h ? satelliteTiles(projection, w, h, t) : []), [projection, w, h, t]);

  const route = useMemo(() => {
    if (points.length < 2) return "";
    return `M${points.map((p) => `${p.xy[0].toFixed(1)},${p.xy[1].toFixed(1)}`).join("L")}`;
  }, [points]);

  const flyTo = useCallback((target: ZoomTransform, duration: number) => {
    const svg = svgRef.current;
    const z = zoomRef.current;
    if (!svg || !z) return;
    if (duration === 0) select(svg).call(z.transform, target);
    else select(svg).transition().duration(duration).call(z.transform, target);
  }, []);

  // fly to the active day's stops, or show the whole trip
  const dayPts = activeDay == null ? [] : points.filter((p) => p.day === activeDay);
  const bounds = dayPts.length
    ? dayPts.reduce(
        (b, p) => [Math.min(b[0], p.xy[0]), Math.min(b[1], p.xy[1]), Math.max(b[2], p.xy[0]), Math.max(b[3], p.xy[1])],
        [Infinity, Infinity, -Infinity, -Infinity],
      )
    : null;
  const bx1 = bounds?.[0];
  const by1 = bounds?.[1];
  const bx2 = bounds?.[2];
  const by2 = bounds?.[3];
  useEffect(() => {
    if (!w || !h) return;
    if (bx1 == null || by1 == null || bx2 == null || by2 == null) {
      flyTo(zoomIdentity, 900);
      return;
    }
    const bw = Math.max(bx2 - bx1, 1);
    const bh = Math.max(by2 - by1, 1);
    const k = Math.max(1, Math.min(8, 0.6 / Math.max(bw / w, bh / h)));
    flyTo(zoomIdentity.translate(w / 2, h / 2).scale(k).translate(-(bx1 + bx2) / 2, -(by1 + by2) / 2), 1100);
  }, [bx1, by1, bx2, by2, w, h, flyTo]);

  const zoomBy = (f: number) => {
    const svg = svgRef.current;
    const z = zoomRef.current;
    if (svg && z) select(svg).transition().duration(300).call(z.scaleBy, f);
  };

  const inv = 1 / t.k;
  // one numbered marker per day (at its first stop); the active day's stops get their own dots + labels
  const dayMarkers = useMemo(() => {
    const seen = new Set<number>();
    return points.filter((p) => (seen.has(p.day) ? false : (seen.add(p.day), true)));
  }, [points]);

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden bg-navy-900">
      {w > 0 && (
        <svg ref={svgRef} width={w} height={h} className="absolute inset-0 h-full w-full cursor-grab select-none active:cursor-grabbing" role="img" aria-label="Map of the trip route">
          <defs>
            <clipPath id="stop-clip">
              <circle r={15} />
            </clipPath>
          </defs>
          <g>
            {tiles.map((tl) => (
              <image key={tl.key} href={tl.url} x={tl.x} y={tl.y} width={tl.size} height={tl.size} preserveAspectRatio="none" className="tile-in" />
            ))}
          </g>
          <rect width={w} height={h} fill="#0b0f29" fillOpacity={0.25} />

          <g transform={t.toString()}>
            {route && (
              <>
                <path d={route} fill="none" stroke="#e8841a" strokeOpacity={0.35} strokeWidth={9 * inv} strokeLinecap="round" strokeLinejoin="round" />
                <path d={route} fill="none" stroke="#fcd29d" strokeWidth={2.4 * inv} strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="route-draw" />
              </>
            )}

            {points
              .filter((p) => p.day === activeDay)
              .map((p) => (
                <g key={`s-${p.id}-${p.day}`} transform={`translate(${p.xy[0]}, ${p.xy[1]}) scale(${inv})`}>
                  {/* the entrance animation lives on an inner group: a CSS transform would override the positioning one */}
                  <g className="spot-body">
                  {p.image ? (
                    <>
                      <circle r={19} fill="#0b0f29" fillOpacity={0.5} />
                      <circle r={17} fill="#ffffff" />
                      <image href={p.image} x={-15} y={-15} width={30} height={30} preserveAspectRatio="xMidYMid slice" clipPath="url(#stop-clip)" />
                    </>
                  ) : (
                    <>
                      <circle r={9} fill="#ffffff" fillOpacity={0.18} />
                      <circle r={4} fill="#ffffff" stroke="#0b0f29" strokeOpacity={0.6} strokeWidth={1.5} />
                    </>
                  )}
                  <rect x={p.image ? 22 : 12} y={-10} width={p.name.length * 6.2 + 16} height={20} rx={10} fill="#0b0f29" fillOpacity={0.75} stroke="#ffffff" strokeOpacity={0.15} />
                  <text x={(p.image ? 22 : 12) + (p.name.length * 6.2 + 16) / 2} y={4} textAnchor="middle" fontSize={11} fontWeight={600} fill="#ffffff">
                    {p.name}
                  </text>
                  </g>
                </g>
              ))}

            {dayMarkers.map((p, i) => {
              const active = p.day === activeDay;
              return (
                <g
                  key={`d-${p.day}`}
                  transform={`translate(${p.xy[0]}, ${p.xy[1]}) scale(${inv})`}
                  className="pin cursor-pointer outline-none"
                  style={{ opacity: activeDay != null && !active ? 0.55 : 1, transition: "opacity 300ms" }}
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
                    {active && <circle r={24} fill="#e8841a" className="pin-pulse" />}
                    <circle r={active ? 16 : 13} fill="#0b0f29" fillOpacity={0.5} />
                    <circle r={active ? 14 : 11} fill={active ? "#e8841a" : "#ffffff"} />
                    <text y={active ? 5 : 4} textAnchor="middle" fontSize={active ? 13 : 11} fontWeight={800} fill={active ? "#ffffff" : "#131940"}>
                      {p.day}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>
      )}

      <div className="absolute right-3 top-3 z-10 flex flex-col overflow-hidden rounded-xl bg-navy-950/70 text-white shadow-lg ring-1 ring-white/10 backdrop-blur">
        <button type="button" onClick={() => zoomBy(1.7)} aria-label="Zoom in" className="grid size-9 place-items-center hover:bg-white/10">
          <Plus className="size-4" />
        </button>
        <button type="button" onClick={() => zoomBy(1 / 1.7)} aria-label="Zoom out" className="grid size-9 place-items-center border-t border-white/10 hover:bg-white/10">
          <Minus className="size-4" />
        </button>
        <button type="button" onClick={() => flyTo(zoomIdentity, 600)} aria-label="Show the whole trip" className="grid size-9 place-items-center border-t border-white/10 hover:bg-white/10">
          <RotateCcw className="size-4" />
        </button>
      </div>
      <div className={`pointer-events-none absolute inset-x-0 top-1/2 z-10 flex justify-center transition-opacity duration-300 ${hint ? "opacity-100" : "opacity-0"}`} aria-hidden={!hint}>
        <span className="rounded-full bg-navy-950/85 px-4 py-2 text-xs font-medium text-white shadow-lg ring-1 ring-white/10">Hold Ctrl (⌘) and scroll to zoom · drag to move</span>
      </div>
      <p className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-white/50">Imagery © Esri, Maxar, Earthstar Geographics</p>
    </div>
  );
}
