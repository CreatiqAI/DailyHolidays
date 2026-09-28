// Generate one hero image per country with Kie.ai and store it in Supabase Storage (hero/<slug>.jpg).
// Usage: node --env-file=.env.local scripts/generate-country-images.mjs [--only china,japan] [--force] [--model gpt-image-2-text-to-image] [--resolution 1K]
import { createClient } from "@supabase/supabase-js";

const KIE = "https://api.kie.ai";
const key = process.env.KIE_API_KEY;
if (!key) throw new Error("KIE_API_KEY missing in .env.local");

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const only = opt("--only")?.split(",").map((s) => s.trim()).filter(Boolean);
const force = args.includes("--force");
const model = opt("--model") ?? "gpt-image-2-text-to-image";
const resolution = opt("--resolution") ?? "1K"; // GPT Image-2: 1K | 2K | 4K

// what to show for each country; anything missing falls back to "its most iconic landmark"
const SCENES = {
  china: "the Great Wall winding over misty green mountains",
  australia: "Sydney Opera House and Harbour Bridge across the water",
  thailand: "Wat Arun temple beside the Chao Phraya river with a long-tail boat",
  japan: "Mount Fuji behind the Chureito pagoda with cherry blossoms",
  taiwan: "Taipei 101 rising above the city with mountains behind, lanterns in the foreground",
  vietnam: "Ha Long Bay limestone islands with a traditional junk boat",
  turkey: "hot-air balloons drifting over the fairy chimneys of Cappadocia at sunrise",
  italy: "a cliffside village on the Amalfi Coast above the sea",
  "south-korea": "Gyeongbokgung Palace gate with autumn maples and the Seoul skyline",
  "united-states": "the Grand Canyon at sunset",
  morocco: "the blue lanes of Chefchaouen with the Rif mountains beyond",
  "new-zealand": "Milford Sound fjord with Mitre Peak reflected in still water",
  greece: "the white houses and blue domes of Santorini above the caldera",
  nepal: "Himalayan peaks with prayer flags fluttering in the foreground",
  argentina: "the Perito Moreno glacier wall above turquoise water",
  "sri-lanka": "a blue train crossing the Nine Arch Bridge through tea plantations",
  bhutan: "the Tiger's Nest monastery clinging to the cliff above pine forest",
  india: "the Taj Mahal reflected in its pool at sunrise",
  macau: "the Ruins of St. Paul's with the old town steps",
  "hong-kong": "Victoria Harbour skyline seen from the Peak at dusk",
  oman: "the Sultan Qaboos Grand Mosque with desert dunes beyond",
  switzerland: "the Matterhorn above Zermatt with alpine meadows",
  "saudi-arabia": "Elephant Rock in AlUla under a starry dusk sky",
  georgia: "Gergeti Trinity Church on its hill below Mount Kazbek",
  spain: "the Sagrada Familia towers above Barcelona rooftops",
  singapore: "the Marina Bay skyline with Supertree Grove",
  egypt: "the Pyramids of Giza with the Sphinx at golden hour",
  philippines: "the limestone lagoon of El Nido, Palawan, with an outrigger boat",
  jordan: "the Treasury at Petra glowing in the canyon",
  pakistan: "the Hunza Valley with Rakaposhi peak and apricot blossoms",
  indonesia: "Bali rice terraces with a temple gate",
  cuba: "old Havana with pastel colonial buildings and a classic car",
  cambodia: "Angkor Wat reflected in its moat at sunrise",
  "south-africa": "Cape Town beneath Table Mountain from the waterfront",
  france: "the Eiffel Tower across the Seine at golden hour",
  netherlands: "Amsterdam canal houses with tulips and a bicycle on the bridge",
  "united-arab-emirates": "the Dubai skyline with the Burj Khalifa above the desert haze",
  russia: "the frozen turquoise ice of Lake Baikal",
  kazakhstan: "the red rock walls of Charyn Canyon under a wide sky",
  maldives: "overwater villas on a turquoise lagoon",
  laos: "the turquoise pools of Kuang Si waterfall near Luang Prabang",
  myanmar: "the temples of Bagan with hot-air balloons at dawn",
  germany: "Neuschwanstein Castle above autumn forest",
  "czech-republic": "Charles Bridge and Prague Castle at dawn",
  iran: "the tiled domes of Naqsh-e Jahan Square in Isfahan",
  azerbaijan: "the Flame Towers of Baku above the old walled city",
  fiji: "a palm-fringed island and coral lagoon in Fiji",
};

const STYLE =
  "Photorealistic travel photograph, as shot on a full-frame camera with a 24mm lens, golden-hour natural light, " +
  "true-to-life colours, crisp detail, light atmospheric haze, wide establishing shot with the landmark as the clear focal point and open sky above. " +
  "No text, no logos, no watermarks, no borders, no people in the foreground.";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

async function credits() {
  const r = await fetch(`${KIE}/api/v1/chat/credit`, { headers });
  return (await r.json()).data;
}

async function generate(prompt) {
  const r = await fetch(`${KIE}/api/v1/jobs/createTask`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, input: { prompt, aspect_ratio: "16:9", ...(model.startsWith("gpt-image-2") ? { resolution } : {}) } }),
  });
  const j = await r.json();
  if (j.code !== 200 || !j.data?.taskId) throw new Error(`createTask: ${JSON.stringify(j).slice(0, 300)}`);
  const { taskId } = j.data;
  for (let i = 0; i < 80; i++) {
    await new Promise((res) => setTimeout(res, 3000));
    const s = await (await fetch(`${KIE}/api/v1/jobs/recordInfo?taskId=${taskId}`, { headers })).json();
    const st = s.data?.state;
    if (st === "success") {
      const urls = JSON.parse(s.data.resultJson ?? "{}").resultUrls ?? [];
      if (!urls[0]) throw new Error("no result url");
      return urls[0];
    }
    if (st === "fail") throw new Error(`task failed: ${s.data.failCode} ${s.data.failMsg}`);
  }
  throw new Error("timed out waiting for image");
}

const { data: countries, error } = await supabase
  .from("destinations")
  .select("id, slug, name, cover_image_url, tours!tours_destination_id_fkey(status), areas:destinations!parent_id(tours!tours_destination_id_fkey(status))")
  .is("parent_id", null);
if (error) throw error;

const published = (c) =>
  c.tours.filter((t) => t.status === "published").length +
  c.areas.flatMap((a) => a.tours).filter((t) => t.status === "published").length;

const todo = countries
  .map((c) => ({ ...c, published: published(c) }))
  .filter((c) => c.published > 0)
  .filter((c) => !only || only.includes(c.slug))
  .filter((c) => force || !c.cover_image_url?.includes("/hero/"))
  .sort((a, b) => b.published - a.published);

console.log(`model ${model} (${resolution}) · credits ${await credits()} · ${todo.length} countries to generate`);
for (const c of todo) {
  const scene = SCENES[c.slug] ?? `the most iconic landmark and landscape of ${c.name}`;
  try {
    const url = await generate(`${scene}. ${STYLE}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download ${res.status}`);
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const bytes = Buffer.from(await res.arrayBuffer());
    const path = `hero/${c.slug}.${contentType.includes("png") ? "png" : "jpg"}`;
    const { error: upErr } = await supabase.storage.from("tour-media").upload(path, bytes, { contentType, upsert: true });
    if (upErr) throw upErr;
    // drop a previous image saved under the other extension
    await supabase.storage.from("tour-media").remove([path.endsWith(".png") ? `hero/${c.slug}.jpg` : `hero/${c.slug}.png`]);
    const publicUrl = `${supabase.storage.from("tour-media").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
    const { error: dbErr } = await supabase.from("destinations").update({ cover_image_url: publicUrl }).eq("id", c.id);
    if (dbErr) throw dbErr;
    console.log(`ok   ${c.name} (${(bytes.length / 1024).toFixed(0)} KB) -> ${path}`);
  } catch (e) {
    console.log(`FAIL ${c.name}: ${e.message}`);
  }
}
console.log(`credits left ${await credits()}`);
