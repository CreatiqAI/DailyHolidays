"""Print import statistics from the database + OpenAI usage totals."""
from __future__ import annotations

from collections import Counter

from lib import TODAY, USAGE_JSON, read_json, rest_select_all

# USD per 1M tokens for the extraction model (approximate; adjust if pricing differs)
PRICE_IN, PRICE_CACHED, PRICE_OUT = 0.75, 0.075, 4.50


def main():
    tours = rest_select_all("tours", "id,slug,source,status,tour_type,price_from_myr,cover_image_url,destination_id")
    deps = rest_select_all("tour_departures", "tour_id,departure_date")
    days = rest_select_all("tour_days", "id,tour_id")
    links = rest_select_all("tour_day_places", "tour_day_id,place_id")
    places = rest_select_all("places", "id,lat")
    media = rest_select_all("tour_media", "kind")
    dests = rest_select_all("destinations", "id,parent_id")

    print(f"tours: {len(tours)}")
    for f in ("source", "status", "tour_type"):
        print(f"  by {f}:", dict(Counter(t[f] for t in tours)))
    print("  by source/status:", dict(Counter(f"{t['source']}/{t['status']}" for t in tours)))
    print(f"  with cover image: {sum(1 for t in tours if t['cover_image_url'])}, with price_from: {sum(1 for t in tours if t['price_from_myr'])}, without destination: {sum(1 for t in tours if not t['destination_id'])}")
    fut = [d for d in deps if d["departure_date"] >= TODAY]
    print(f"departures: {len(deps)} (future: {len(fut)}, tours with future departures: {len({d['tour_id'] for d in fut})})")
    print(f"days: {len(days)} (tours with days: {len({d['tour_id'] for d in days})})")
    geo = sum(1 for p in places if p["lat"] is not None)
    print(f"places: {len(places)}, geocoded {geo} ({100 * geo / max(1, len(places)):.0f}%), day-place links: {len(links)}")
    print(f"media: {dict(Counter(m['kind'] for m in media))}")
    print(f"destinations: {len(dests)} (countries {sum(1 for d in dests if not d['parent_id'])}, areas {sum(1 for d in dests if d['parent_id'])})")

    u = read_json(USAGE_JSON, {}) or {}
    if u:
        cached = u.get("cached_prompt_tokens", 0)
        cost = ((u["prompt_tokens"] - cached) * PRICE_IN + cached * PRICE_CACHED + u["completion_tokens"] * PRICE_OUT) / 1e6
        print(f"openai: {u.get('requests')} requests, prompt {u['prompt_tokens']:,} (cached {cached:,}), "
              f"completion {u['completion_tokens']:,} (reasoning {u.get('reasoning_tokens', 0):,}) ~ ${cost:.2f} (approx.)")

    # demo candidates: published, future departures, days with places
    day_tour = {d["id"]: d["tour_id"] for d in days}
    linked = Counter(day_tour[l["tour_day_id"]] for l in links if l["tour_day_id"] in day_tour)
    futt = Counter(d["tour_id"] for d in fut)
    good = sorted((t for t in tours if t["status"] == "published" and futt[t["id"]] and linked[t["id"]]),
                  key=lambda t: (-futt[t["id"]], -linked[t["id"]]))
    print("demo candidates (future deps, place links):")
    for t in good[:8]:
        print(f"  {t['slug']}  ({futt[t['id']]}, {linked[t['id']]})")


if __name__ == "__main__":
    main()
