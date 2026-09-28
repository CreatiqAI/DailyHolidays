import { tile as d3tile } from "d3-tile";
import { zoomIdentity, type ZoomTransform } from "d3-zoom";
import type { GeoProjection } from "d3-geo";

// Esri World Imagery; pages using it show "Imagery © Esri, Maxar, Earthstar Geographics".
const tileUrl = (x: number, y: number, z: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
const TILE_MAX_Z = 18;

export type SatelliteTile = { key: string; url: string; x: number; y: number; size: number };

/**
 * Web-mercator tiles covering a w×h viewport, positioned in screen space for a d3 Mercator
 * projection viewed through a zoom transform. Past the imagery's max zoom, parent tiles are stretched.
 */
export function satelliteTiles(projection: GeoProjection, w: number, h: number, t: ZoomTransform): SatelliteTile[] {
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
  const d = Math.max(0, z - TILE_MAX_Z);
  const out: SatelliteTile[] = [];
  const seen = new Set<string>();
  for (const [x, y] of list) {
    const px = x >> d;
    const py = y >> d;
    const pz = z - d;
    const key = `${pz}/${px}/${py}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const n = 2 ** pz;
    if (py < 0 || py >= n) continue;
    out.push({
      key,
      url: tileUrl(((px % n) + n) % n, py, pz),
      x: (px * 2 ** d + tx) * list.scale,
      y: (py * 2 ** d + ty) * list.scale,
      size: list.scale * 2 ** d,
    });
  }
  return out;
}
