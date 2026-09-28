"""Step 3-7: write destinations, tours, departures, days, places, media to Supabase (PostgREST).

Idempotent: tours are upserted on (source, source_ref); their departures / days / media are
deleted and re-inserted (tour_day_places cascades). Places are deduped on
(lower(name), country) against what is already in the database."""
from __future__ import annotations

import re
from collections import Counter
from datetime import date

from geocode import resolve as geo_resolve
from lib import (EXTRACT, GEOCODE_JSON, SOURCES_JSON, TODAY, UPLOADS_JSON, log, public_url,
                 read_json, rest, rest_select_all, slugify)
from places import keep_place, norm_country, place_key

MERGE = "resolution=merge-duplicates,return=representation"
REP = "return=representation"


# ------------------------------------------------------------------ destinations
class Destinations:
    def __init__(self):
        rows = rest_select_all("destinations", "id,slug,name,region,parent_id,cover_image_url")
        self.by_id = {r["id"]: r for r in rows}
        self.by_slug = {r["slug"]: r for r in rows}

    def country_name_of(self, dest_id):
        d = self.by_id.get(dest_id)
        if not d:
            return None
        while d.get("parent_id") and d["parent_id"] in self.by_id:
            d = self.by_id[d["parent_id"]]
        return d["name"]

    def _create(self, slug, name, region, parent_id):
        row = rest("POST", "destinations", body={"slug": slug, "name": name, "region": region, "parent_id": parent_id},
                   params={"on_conflict": "slug"}, prefer=MERGE)[0]
        self.by_id[row["id"]] = row
        self.by_slug[row["slug"]] = row
        return row

    def country(self, name, region):
        slug = slugify(name)
        d = self.by_slug.get(slug)
        if d and d.get("parent_id") is None:
            if not d.get("region") and region:
                d.update(rest("PATCH", "destinations", body={"region": region}, params={"id": f"eq.{d['id']}"}, prefer=REP)[0])
            return d
        if d:  # slug taken by an area -> disambiguate
            slug = f"{slug}-country"
            if slug in self.by_slug:
                return self.by_slug[slug]
        return self._create(slug, name, region, None)

    def area(self, name, country_row):
        for d in self.by_id.values():  # same name already under this country?
            if d.get("parent_id") == country_row["id"] and d["name"].lower() == name.lower():
                return d
        slug = slugify(name)
        if slug in self.by_slug:
            slug = slugify(f"{name} {country_row['name']}")
            if slug in self.by_slug:
                return self.by_slug[slug]
        return self._create(slug, name, country_row.get("region"), country_row["id"])

    def find_area(self, city, country_row):
        if not city:
            return None
        for d in self.by_id.values():
            if d.get("parent_id") == country_row["id"] and d["name"].lower() == city.lower():
                return d
        return None

    def set_cover(self, dest, url):
        if dest and url and not dest.get("cover_image_url"):
            rest("PATCH", "destinations", body={"cover_image_url": url}, params={"id": f"eq.{dest['id']}"})
            dest["cover_image_url"] = url


# ------------------------------------------------------------------ places
class Places:
    def __init__(self, dests: Destinations, geocache):
        self.dests = dests
        self.geo = geocache
        self.by_key = {}
        for r in rest_select_all("places", "id,name,destination_id,lat,lng"):
            c = dests.country_name_of(r["destination_id"]) or ""
            self.by_key.setdefault(place_key(r["name"], c), r)

    def get(self, p, region, tour_dest=None):
        country = norm_country(p.get("country"))
        key = place_key(p["name"], country)
        coords = geo_resolve(p, self.geo)
        row = self.by_key.get(key)
        if row:
            if coords and (row.get("lat"), row.get("lng")) != coords:
                rest("PATCH", "places", body={"lat": coords[0], "lng": coords[1]}, params={"id": f"eq.{row['id']}"})
                row["lat"], row["lng"] = coords
            return row
        crow = self.dests.country(country, region)
        dest = self.dests.find_area(p.get("city"), crow)
        if not dest and tour_dest and tour_dest.get("parent_id") == crow["id"]:
            dest = tour_dest   # e.g. a Sanya attraction on a tour whose destination is Hainan
        dest = dest or crow
        body = {"name": p["name"].strip(), "destination_id": dest["id"],
                "lat": coords[0] if coords else None, "lng": coords[1] if coords else None}
        row = rest("POST", "places", body=body, prefer=REP)[0]
        self.by_key[key] = row
        return row


# ------------------------------------------------------------------ helpers
AREA_ALIASES = {"danang": "Da Nang", "macao": "Macau", "sanya": "Hainan", "hobart": "Tasmania",
                "chiang mai": "Chiang Mai", "xian": "Xi'an"}
COUNTRY_LIKE_AREAS = {"hong kong": "Hong Kong", "macau": "Macau", "macao": "Macau"}


def norm_area(area, country):
    """'Chengdu & Chongqing' -> 'Chengdu'; aliases; returns (country, area)."""
    if not area:
        return country, None
    first = re.split(r"\s*(?:&|and|/|\+|·|,|x|×)\s*", area.strip())[0].strip()
    first = AREA_ALIASES.get(first.lower(), first)
    if first.lower() in COUNTRY_LIKE_AREAS:          # Macau / Hong Kong are their own destinations
        return COUNTRY_LIKE_AREAS[first.lower()], None
    if not first or (country and first.lower() == country.lower()):
        return country, None
    return country, first


DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def valid_date(s):
    if not s or not DATE_RE.match(s):
        return False
    try:
        date.fromisoformat(s)
        return True
    except ValueError:
        return False


def dep_status(note):
    n = (note or "").lower()
    if re.search(r"sold ?out|\bfull\b", n):
        return "full"
    if re.search(r"limited|few seats|last \d+ seats", n):
        return "limited"
    return "available"


def smallint(v):
    try:
        v = int(v)
        return v if 0 < v < 400 else None
    except (TypeError, ValueError):
        return None


def build_description(x):
    parts = [x.get("summary") or ""]
    if x.get("highlights"):
        parts.append("## Highlights\n" + "\n".join(f"- {h}" for h in x["highlights"]))
    return "\n\n".join(p for p in parts if p).strip() or None


def assign_slugs(items, existing):
    """items: list of (src, extraction). Deterministic slugs; full ref on collision."""
    slugs, used = {}, {}
    for s, x in sorted(items, key=lambda t: (t[0]["source"], t[0]["source_ref"])):
        base = slugify(x.get("title") or s["title"])
        key = (s["source"], s["source_ref"])
        slug = f"{base}-{s['source_ref'][:6].lower()}"
        owner = existing.get(slug)
        if slug in used or (owner and owner != key):
            slug = f"{base}-{slugify(s['source_ref'], 80)}"
        used[slug] = key
        slugs[key] = slug
    return slugs


# ------------------------------------------------------------------ main
def main(only=None):
    sources = read_json(SOURCES_JSON)
    uploads = read_json(UPLOADS_JSON, {}) or {}
    geocache = read_json(GEOCODE_JSON, {}) or {}
    items = []
    missing = []
    region_votes = {}
    for s in sources:
        x = read_json(EXTRACT / f"{s['source']}__{s['source_ref']}.json")
        if x is None:
            missing.append(s["source_ref"])
            continue
        items.append((s, x))
        c = norm_country(x.get("country"))
        region_votes.setdefault(c, Counter())[x.get("region")] += 1
    for s, x in items:  # one region per country (majority vote across tours)
        x["region"] = region_votes[norm_country(x.get("country"))].most_common(1)[0][0]
    existing = {r["slug"]: (r["source"], r["source_ref"]) for r in rest_select_all("tours", "slug,source,source_ref")}
    slugs = assign_slugs(items, existing)
    if only:
        items = [t for t in items if t[0]["source_ref"] in only]
    dests = Destinations()
    places = Places(dests, geocache)
    failures = []
    for n, (s, x) in enumerate(items, 1):
        try:
            load_tour(s, x, slugs[(s["source"], s["source_ref"])], uploads, dests, places)
        except Exception as e:  # noqa
            failures.append((s["source_ref"], str(e)[:300]))
            log(f"  FAILED {s['source']}:{s['source_ref']}: {str(e)[:300]}")
        if n % 20 == 0:
            log(f"  loaded {n}/{len(items)}")
    log(f"load done: {len(items) - len(failures)} tours ok, {len(failures)} failed, {len(missing)} without extraction")
    return failures, missing


def load_tour(s, x, slug, uploads, dests, places):
    region = x.get("region")
    country = norm_country(x.get("country")) or None
    area = (x.get("area") or "").strip() or None
    cat = s.get("category_path") or []
    # the legacy category path (GROUND TOUR > China > Hainan) helps when the LLM left area empty
    if not area and len(cat) >= 3 and country and norm_country(cat[1]).lower() == country.lower():
        area = cat[2]
    country, area = norm_area(area, country)
    dest = None
    if country:
        dest = dests.country(country, region)
        if area and area.lower() != country.lower():
            dest = dests.area(area, dest)

    # media
    images = [m for m in s["images"] if m["storage"] in uploads]
    pdfs = [m for m in s["pdfs"] if m["storage"] in uploads]
    cover = public_url(images[0]["storage"]) if images else None

    # departures
    deps, seen = [], set()
    for d in x.get("departures") or []:
        if not valid_date(d.get("date")):
            continue
        note = (d.get("price_note") or "").strip() or None
        k = (d["date"], note)
        if k in seen:
            continue
        seen.add(k)
        price = d.get("price_myr")
        price = round(float(price), 2) if isinstance(price, (int, float)) and 0 < price < 1_000_000 else None
        deps.append({"departure_date": d["date"], "price_myr": price, "price_note": note, "status": dep_status(note)})
    future = [d["price_myr"] for d in deps if d["departure_date"] >= TODAY and d["price_myr"] is not None]
    price_from = min(future) if future else None

    days = sorted(x.get("days") or [], key=lambda d: d.get("day_number") or 0)

    if s["source"] == "legacy_site":
        published = bool(images) and (bool(days) or len(s.get("description") or "") > 300)
    else:
        published = bool(days) and bool(deps)

    tour = {
        "slug": slug, "code": x.get("code"), "title": (x.get("title") or s["title"]).strip(),
        "tour_type": x.get("tour_type") or "group", "destination_id": dest["id"] if dest else None,
        "duration_days": smallint(x.get("duration_days")), "duration_nights": smallint(x.get("duration_nights")),
        "summary": x.get("summary"), "description": build_description(x),
        "highlights": x.get("highlights") or [], "inclusions": x.get("inclusions") or [],
        "exclusions": x.get("exclusions") or [], "airline": x.get("airline"), "hotel_rating": x.get("hotel_rating"),
        "price_from_myr": price_from, "cover_image_url": cover,
        "status": "published" if published else "draft",
        "source": s["source"], "source_ref": s["source_ref"],
    }
    row = rest("POST", "tours", body=tour, params={"on_conflict": "source,source_ref"}, prefer=MERGE)[0]
    tid = row["id"]

    for t in ("tour_departures", "tour_days", "tour_media"):
        rest("DELETE", t, params={"tour_id": f"eq.{tid}"})

    if deps:
        rest("POST", "tour_departures", body=[dict(d, tour_id=tid) for d in deps])

    if days:
        body, used = [], set()
        for i, d in enumerate(days, 1):
            num = d.get("day_number") if isinstance(d.get("day_number"), int) and d["day_number"] not in used else i
            while num in used:
                num += 1
            used.add(num)
            d["_num"] = num
            body.append({"tour_id": tid, "day_number": num, "title": (d.get("title") or f"Day {num}").strip(),
                         "description": d.get("description"), "meals": d.get("meals") or [], "hotel": d.get("hotel")})
        rows = rest("POST", "tour_days", body=body, prefer=REP)
        id_by_num = {r["day_number"]: r["id"] for r in rows}
        links = []
        for d in days:
            seen_p = set()
            for p in [p for p in d.get("places") or [] if keep_place(p)][:6]:
                if not p.get("country"):
                    p["country"] = country or ""
                prow = places.get(p, region, dest)
                if prow["id"] in seen_p:
                    continue
                seen_p.add(prow["id"])
                links.append({"tour_day_id": id_by_num[d["_num"]], "place_id": prow["id"], "sort_order": len(seen_p) - 1})
        if links:
            rest("POST", "tour_day_places", body=links)

    media = []
    for i, m in enumerate(images):
        media.append({"tour_id": tid, "kind": "image", "url": public_url(m["storage"]), "caption": None, "sort_order": i})
    for j, m in enumerate(pdfs):
        media.append({"tour_id": tid, "kind": "pdf", "url": public_url(m["storage"]), "caption": m.get("caption"),
                      "sort_order": len(images) + j})
    if media:
        rest("POST", "tour_media", body=media)

    dests.set_cover(dest, cover)


if __name__ == "__main__":
    import sys
    main(set(sys.argv[1:]) or None)
