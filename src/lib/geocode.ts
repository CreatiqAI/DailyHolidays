import "server-only";

// OpenStreetMap Nominatim: max 1 request/second, identify the app in the User-Agent.
const UA = "DailyHolidaysAdmin/1.0 (enquiry@dailyholidays.com.my)";
let last = 0;

async function throttle() {
  const wait = last + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
}

async function search(q: string) {
  await throttle();
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`, {
    headers: { "User-Agent": UA, "Accept-Language": "en" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const [hit] = (await res.json()) as { lat: string; lon: string }[];
  return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
}

export async function geocode(name: string, city?: string | null, country?: string | null) {
  const full = [name, city, country].filter(Boolean).join(", ");
  const hit = await search(full);
  if (hit || !city) return hit;
  return search([name, country].filter(Boolean).join(", "));
}
