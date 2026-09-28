"""One-off data cleanup: fold duplicate/overlapping areas into the right destination.
Moves tours and places, then deletes the emptied area. Safe to re-run (skips what is already merged).
The same rules live in load.py (AREA_ALIASES / COUNTRY_WIDE_AREAS) so a re-import stays consistent."""
from lib import log, rest

# (country, area to remove) -> (country, target area or None for the country itself)
MERGES = [
    (("China", "Zhangjiajie"), ("China", "Hunan")),
    (("Thailand", "Chiang Mai and Chiang Rai"), ("Thailand", "Chiang Mai")),
    (("United Arab Emirates", "7 Emirates"), ("United Arab Emirates", None)),
    (("United States", "United States of America"), ("United States", None)),
]


def find(country, area):
    c = rest("GET", "destinations", params={"name": f"eq.{country}", "parent_id": "is.null", "select": "id,name"})
    if not c:
        return None
    if area is None:
        return c[0]
    a = rest("GET", "destinations", params={"name": f"eq.{area}", "parent_id": f"eq.{c[0]['id']}", "select": "id,name"})
    return a[0] if a else None


for (sc, sa), (tc, ta) in MERGES:
    src, dst = find(sc, sa), find(tc, ta)
    if not src:
        log(f"skip {sc}/{sa}: already merged")
        continue
    if not dst:
        log(f"skip {sc}/{sa}: target {tc}/{ta} not found")
        continue
    moved = rest("PATCH", "tours", body={"destination_id": dst["id"]}, params={"destination_id": f"eq.{src['id']}"}, prefer="return=representation")
    places = rest("PATCH", "places", body={"destination_id": dst["id"]}, params={"destination_id": f"eq.{src['id']}"}, prefer="return=representation")
    rest("DELETE", "destinations", params={"id": f"eq.{src['id']}"})
    log(f"merged {sc}/{sa} -> {tc}/{ta or '(country)'}: {len(moved)} tours, {len(places)} places")
