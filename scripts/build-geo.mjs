// Writes one GeoJSON file per country to public/geo/<iso-numeric>.json (from Natural Earth via world-atlas)
// plus public/geo/index.json mapping country name -> id. Run: node scripts/build-geo.mjs
import { feature } from "topojson-client";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const topo = require("world-atlas/countries-50m.json");
const { features } = feature(topo, topo.objects.countries);

mkdirSync("public/geo", { recursive: true });
const index = {};
let bytes = 0;
for (const f of features) {
  if (!f.id) continue;
  const name = f.properties.name;
  const out = JSON.stringify({ type: "Feature", id: f.id, properties: { name }, geometry: f.geometry });
  writeFileSync(`public/geo/${f.id}.json`, out);
  bytes += out.length;
  index[name] = f.id;
}
writeFileSync("public/geo/index.json", JSON.stringify(index));
console.log(`${Object.keys(index).length} countries, ${(bytes / 1024 / 1024).toFixed(1)} MB total`);
