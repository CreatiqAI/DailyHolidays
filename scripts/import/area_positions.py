"""Place each area's map pin by geocoding the area's own name (e.g. "Hunan, China").

The import first positioned areas at the average of their tours' stops, which a single far-away stop
can drag off. A name lookup is accepted only when it lands in the right country and within MAX_KM of
where the area's tours actually go; otherwise the stop average is kept and the area is listed for review.
Run: python area_positions.py [--dry-run]"""
from __future__ import annotations

import json
import math
import re
import sys
import time
import urllib.parse

from lib import http, log, rest, rest_select_all
from places import country_matches

UA = "DailyHolidaysImporter/1.0 (+http://www.dailyholidays.com.my)"
MAX_KM = 600


def km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))


def lookup(q):
    time.sleep(1.1)  # Nominatim policy: at most 1 request per second
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(
        {"format": "json", "limit": 3, "q": q, "accept-language": "en"})
    _, _, raw = http("GET", url, headers={"User-Agent": UA}, timeout=60, retries=3)
    return json.loads(raw)


def main(dry=False):
    dests = rest_select_all("destinations", "id,name,parent_id,lat,lng")
    countries = {d["id"]: d for d in dests if not d["parent_id"]}
    areas = [d for d in dests if d["parent_id"] and d["parent_id"] in countries]
    review = []
    for a in sorted(areas, key=lambda d: (countries[d["parent_id"]]["name"], d["name"])):
        country = countries[a["parent_id"]]["name"]
        name = re.split(r"\s+(?:and|&)\s+", a["name"])[0]  # "Macau and Zhuhai" -> "Macau"
        hit = next((r for r in lookup(f"{name}, {country}") if country_matches(r.get("display_name", ""), country)), None)
        old = (a["lat"], a["lng"]) if a["lat"] is not None else None
        if not hit:
            review.append((country, a["name"], "no name match; kept stop average"))
            continue
        new = (float(hit["lat"]), float(hit["lon"]))
        dist = km(old, new) if old else 0
        if old and dist > MAX_KM:
            review.append((country, a["name"], f"name match is {dist:.0f} km from its tours ({hit['display_name'][:60]}); kept stop average"))
            continue
        if not dry:
            rest("PATCH", "destinations", body={"lat": new[0], "lng": new[1]}, params={"id": f"eq.{a['id']}"})
        log(f"{country:<22} {a['name']:<26} moved {dist:6.0f} km  -> {hit['display_name'][:70]}")
    log(f"{len(areas) - len(review)} areas placed by name, {len(review)} kept for review:")
    for r in review:
        log("  REVIEW", " / ".join(r))


if __name__ == "__main__":
    main(dry="--dry-run" in sys.argv)
