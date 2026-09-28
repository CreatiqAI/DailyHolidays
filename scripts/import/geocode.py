"""Step 4a: geocode extracted places with Nominatim (<=1 request/second, cached).

Cache: scripts/.cache/geocode.json  {query: {"lat":..,"lng":..,"display_name":..} | null}
Query order per place: "<name>, <city>, <country>" -> "<name>, <country>" -> "<local_name>, <country>".
A hit is only accepted when its display_name is in the expected country and, when the
place has a city that geocodes, it lies within MAX_KM of that city."""
from __future__ import annotations

import json
import math
import time
import urllib.parse

from lib import EXTRACT, GEOCODE_JSON, HttpError, http, log, read_json, write_json
from places import country_matches, geocode_queries, keep_place, norm_country, place_key

UA = "DailyHolidaysImporter/1.0 (+http://www.dailyholidays.com.my)"
MIN_INTERVAL = 1.1  # seconds between requests (policy: max 1/s)
MAX_KM = 250
_last = [0.0]


def nominatim(q):
    wait = _last[0] + MIN_INTERVAL - time.time()
    if wait > 0:
        time.sleep(wait)
    _last[0] = time.time()   # spacing measured between request starts (sequential => <=1 req/s)
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(
        {"format": "json", "limit": 1, "q": q, "accept-language": "en"})
    _, _, raw = http("GET", url, headers={"User-Agent": UA}, timeout=60, retries=3)
    res = json.loads(raw)
    if not res:
        return None
    r = res[0]
    return {"lat": float(r["lat"]), "lng": float(r["lon"]), "display_name": r.get("display_name")}


def km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a["lat"], a["lng"], b["lat"], b["lng"]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


def city_query(p):
    city = (p.get("city") or "").strip()
    return f"{city}, {norm_country(p.get('country'))}" if city else None


def acceptable(p, q, hit, cache):
    if not hit or not country_matches(hit.get("display_name"), norm_country(p.get("country"))):
        return False
    cq = city_query(p)
    if cq and q != cq:
        c = cache.get(cq)
        if c and km(hit, c) > MAX_KM:
            return False
    return True


def resolve(p, cache):
    """Return (lat, lng) or None using cache only."""
    for q in geocode_queries(p):
        hit = cache.get(q)
        if acceptable(p, q, hit, cache):
            return hit["lat"], hit["lng"]
    return None


def cached_lookup(q, cache, counter):
    if q in cache:
        return cache[q]
    try:
        hit = nominatim(q)
    except HttpError as e:
        log("  nominatim error", q, str(e)[:120])
        return None
    cache[q] = hit
    counter[0] += 1
    if counter[0] % 20 == 0:
        write_json(GEOCODE_JSON, cache)
    return hit


def collect_places():
    out = {}
    for f in sorted(EXTRACT.glob("*.json")):
        d = read_json(f)
        for day in d.get("days") or []:
            for p in day.get("places") or []:
                if keep_place(p):
                    out.setdefault(place_key(p["name"], p["country"]), p)
    return out


def main():
    cache = read_json(GEOCODE_JSON, {}) or {}
    places = collect_places()
    log(f"geocode: {len(places)} unique places; {len(cache)} cached queries")
    counter = [0]
    for i, p in enumerate(places.values(), 1):
        if resolve(p, cache):
            continue
        cq = city_query(p)
        for q in geocode_queries(p):
            hit = cached_lookup(q, cache, counter)
            if hit and cq and q != cq:
                cached_lookup(cq, cache, counter)   # needed for the distance check
            if acceptable(p, q, hit, cache):
                break
        if i % 100 == 0:
            log(f"  {i}/{len(places)} (requests so far {counter[0]})")
    write_json(GEOCODE_JSON, cache)
    found = sum(1 for p in places.values() if resolve(p, cache))
    log(f"geocode done: {found}/{len(places)} places have coordinates ({counter[0]} new requests)")


if __name__ == "__main__":
    main()
