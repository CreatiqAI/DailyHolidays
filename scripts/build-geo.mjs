// Builds the map data used by the homepage explorer, from Natural Earth (world-atlas):
//   public/geo/<iso-numeric>.json  one GeoJSON Feature per country (50m detail)
//   public/geo/index.json          country name -> id
//   public/geo/world.json          low-detail land + borders drawn faintly around the selected country
// Run: node scripts/build-geo.mjs
import { feature, mesh } from "topojson-client";
import { geoArea } from "d3-geo";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const countries50 = require("world-atlas/countries-50m.json");
const countries110 = require("world-atlas/countries-110m.json");
const land110 = require("world-atlas/land-110m.json");

mkdirSync("public/geo", { recursive: true });

// Dependencies share their sovereign's code (e.g. Ashmore Reef is "036" like Australia),
// so keep only the largest feature per id.
const best = new Map();
for (const f of feature(countries50, countries50.objects.countries).features) {
  if (!f.id) continue;
  const prev = best.get(f.id);
  if (!prev || geoArea(f) > geoArea(prev)) best.set(f.id, f);
}

const index = {};
let bytes = 0;
for (const [id, f] of best) {
  const name = f.properties.name;
  const out = JSON.stringify({ type: "Feature", id, properties: { name }, geometry: f.geometry });
  writeFileSync(`public/geo/${id}.json`, out);
  bytes += out.length;
  index[name] = id;
}
writeFileSync("public/geo/index.json", JSON.stringify(index));

const world = JSON.stringify({
  land: feature(land110, land110.objects.land),
  borders: mesh(countries110, countries110.objects.countries, (a, b) => a !== b),
});
writeFileSync("public/geo/world.json", world);

console.log(`${best.size} countries, ${(bytes / 1024 / 1024).toFixed(1)} MB; world.json ${(world.length / 1024).toFixed(0)} KB`);
