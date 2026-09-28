"""Step 2: structured extraction with OpenAI Chat Completions (json_schema, strict).

Input per tour: cleaned `pdftotext -layout` text (+ the PDF itself as a file part so the
model can read fare tables / pages whose embedded fonts pdftotext cannot decode),
plus title / category path / web description for legacy products.
Results cached in scripts/.cache/extract/<source>__<ref>.json (skipped on rerun)."""
from __future__ import annotations

import base64
import json
import re
import threading
from concurrent.futures import ThreadPoolExecutor

from lib import (EXTRACT, FILES, OPENAI_KEY, SOURCES_JSON, TEXT, TODAY, USAGE_JSON,
                 HttpError, http, log, read_json, write_json)

MODEL = "gpt-5.4-mini"
REASONING = "low"
WORKERS = 4
MAX_TEXT_CHARS = 18000
MAX_PDF_BYTES = 20 * 1024 * 1024

S = {"type": "string"}
NS = {"type": ["string", "null"]}
NI = {"type": ["integer", "null"]}


def obj(props):
    return {"type": "object", "additionalProperties": False, "properties": props, "required": list(props)}


SCHEMA = obj({
    "title": S,
    "code": NS,
    "tour_type": {"type": "string", "enum": ["group", "ground", "cruise", "malaysia", "other"]},
    "country": S,
    "area": NS,
    "region": {"type": "string", "enum": ["Asia", "Europe", "Middle East", "Africa", "Oceania", "Americas", "Malaysia"]},
    "duration_days": NI,
    "duration_nights": NI,
    "summary": S,
    "highlights": {"type": "array", "items": S},
    "inclusions": {"type": "array", "items": S},
    "exclusions": {"type": "array", "items": S},
    "airline": NS,
    "hotel_rating": NS,
    "departures": {"type": "array", "items": obj({
        "date": S,
        "price_myr": {"type": ["number", "null"]},
        "price_note": NS,
    })},
    "days": {"type": "array", "items": obj({
        "day_number": {"type": "integer"},
        "title": S,
        "description": S,
        "meals": {"type": "array", "items": {"type": "string", "enum": ["Breakfast", "Lunch", "Dinner"]}},
        "hotel": NS,
        "places": {"type": "array", "items": obj({
            "name": S,
            "local_name": NS,
            "city": NS,
            "country": S,
        })},
    })},
})

SYSTEM = f"""You extract structured tour data for Daily Holidays Sdn Bhd, a Malaysian travel agency (prices in Malaysian Ringgit, RM/MYR).
Today is {TODAY}. Return JSON matching the schema. Write every field in clear, natural English (translate Chinese). Never invent facts.

Rules:
- title: clean marketing title like "5D4N Voyage Hainan" or "4D3N Bangkok & Pattaya". Drop prefixes such as "Ground-", "GROUND -", tour codes, dates and "(PDF)". Fix typos and mojibake.
- code: the operator tour code if present (e.g. "5DCY3", "GA-THBP"), else null.
- tour_type: category "GROUND TOUR" or a title starting with "Ground" -> "ground" (land-only package, no flights); a cruise -> "cruise"; a tour inside Malaysia or category "Malaysia Tour" -> "malaysia"; a fully escorted group tour with flights -> "group"; a generic country overview page with no concrete package -> "other".
- country: the main country visited, common English short name (e.g. "China", "Japan", "South Korea", "Taiwan", "Hong Kong", "Macau", "Thailand", "Vietnam", "Australia", "New Zealand", "Turkey", "United States", "United Kingdom", "United Arab Emirates"). For a multi-country tour use the country where most days are spent.
- area: the main city / province / island (e.g. "Hainan", "Bangkok", "Hokkaido", "Perth"), or null if the tour covers the whole country or several unrelated areas.
- region: one of the enum values. Middle East includes Turkey, Iran, UAE, Jordan, Saudi Arabia; Egypt, Morocco and South Africa -> Africa. Central Asia (Kazakhstan) and Russia (Lake Baikal) -> Asia.
- duration_days / duration_nights: integers (e.g. "5D4N" -> 5 and 4), null if unknown.
- summary: 1-2 sentence engaging marketing summary.
- highlights: 3-6 short phrases (the best attractions/experiences).
- inclusions / exclusions: short bullet phrases from the source (fare includes / excludes, compulsory fees, tipping, insurance...). [] if not stated.
- airline: airline name(s) for the flights (e.g. "Batik Air (OD)", "Firefly (FY) / Batik Air (OD)"), null if none.
- hotel_rating: e.g. "Local 4*", "4* + 5*", null if unknown.
- departures: one row per specific departure DATE listed in the source. Dates often lack a year: infer it from the document's validity period / "Updated" date and month order (a season listed SEP..MAR runs into the next year; a document updated in 2026 with dates JAN-MAR after OCT-DEC means JAN-MAR of 2027). Format YYYY-MM-DD.
  price_myr = per-person tour fare in RM for that date (a number, no currency). Read fare tables carefully: each date row maps to the price on the same row of the table (use the attached PDF pages to check the table alignment). If a price is per couple / per room or a promotion (e.g. "Buy 1 Free 1"), put the price as printed and explain in price_note (e.g. "Buy 1 Free 1, RM 2599 per couple"). If one date has two prices (e.g. normal and promo) output two rows with different price_note. Otherwise price_note = null.
  If the source only gives a validity period / daily departures / price by group size (no specific dates), return departures = []. Never invent dates or prices.
- days: the day-by-day itinerary. title like "Kuala Lumpur - Haikou - Sanya"; description: 2-5 sentences in English; meals from the meal codes (B/L/D, 早/午/晚; "MOB"/"機上用餐"/"own expense"/"自理" are NOT included meals); hotel name or city if stated, else null.
  places: up to 6 real, named tourist attractions / landmarks / scenic spots visited that day (NOT hotels, airports, restaurants, shops, shopping stops or generic words like "city tour"). name = the well-known English name (e.g. "Nanshan Cultural Tourism Zone", "Wat Arun"); local_name = the name in the local language/script if the source gives it or it is well known (e.g. "南山文化旅游区"), else null; city = the city/area it is in; country = its country.
  If there is no day-by-day itinerary, days = [].
"""


def clean_text(t: str) -> str:
    m = re.search(r"TERMS\s*(?:&|AND)\s*CONDITIONS", t, re.I)
    if m and m.start() > 800:
        t = t[:m.start()]
    lines = []
    for line in t.splitlines():
        s = line.strip()
        if not s:
            if lines and lines[-1] == "":
                continue
            lines.append("")
            continue
        bad = s.count("�")
        if bad >= 2 or (bad and bad / len(s) > 0.05):
            continue  # undecodable font glyphs
        if re.search(r"Jalan SJ6|enquiry@dailyholidays|6127 0508", s):
            continue
        lines.append(re.sub(r" {4,}", "    ", line.rstrip()))
    return "\n".join(lines).strip()[:MAX_TEXT_CHARS]


def cache_path(src):
    return EXTRACT / f"{src['source']}__{src['source_ref']}.json"


_usage_lock = threading.Lock()


def add_usage(u):
    with _usage_lock:
        tot = read_json(USAGE_JSON, {}) or {}
        for k in ("prompt_tokens", "completion_tokens", "total_tokens"):
            tot[k] = tot.get(k, 0) + (u.get(k) or 0)
        tot["cached_prompt_tokens"] = tot.get("cached_prompt_tokens", 0) + ((u.get("prompt_tokens_details") or {}).get("cached_tokens") or 0)
        tot["reasoning_tokens"] = tot.get("reasoning_tokens", 0) + ((u.get("completion_tokens_details") or {}).get("reasoning_tokens") or 0)
        tot["requests"] = tot.get("requests", 0) + 1
        write_json(USAGE_JSON, tot)


def build_messages(src):
    parts = []
    meta = [f"Source: {'old company website product page' if src['source'] == 'legacy_site' else 'company Google Drive brochure'}"]
    if src["source"] == "legacy_site":
        meta.append(f"Web page title: {src['title']}")
        meta.append(f"Website category path: {' > '.join(src['category_path']) or '(none)'}")
        if src.get("description"):
            meta.append("Web page description text:\n" + src["description"][:6000])
    else:
        meta.append(f"File name: {src['title']}")
    texts = []
    for rel in src.get("texts") or []:
        texts.append(clean_text((TEXT / rel).read_text(encoding="utf-8", errors="replace")))
    if texts:
        meta.append("PDF itinerary text (pdftotext -layout; some Chinese lines may be missing because of font encoding — the PDF is attached too):\n" + "\n\n".join(texts))
    elif src["source"] == "legacy_site":
        meta.append("(No PDF itinerary for this product — extract what you can from the web page text only.)")
    parts.append({"type": "text", "text": "\n\n".join(meta)})
    for m in src["pdfs"]:
        p = FILES / m["local"]
        if m.get("bad") or not p.exists() or p.stat().st_size > MAX_PDF_BYTES:
            continue
        b64 = base64.b64encode(p.read_bytes()).decode()
        parts.append({"type": "file", "file": {"filename": p.name if p.name.isascii() else "itinerary.pdf",
                                               "file_data": f"data:application/pdf;base64,{b64}"}})
    return [{"role": "system", "content": SYSTEM}, {"role": "user", "content": parts}]


def extract_one(src, force=False):
    cp = cache_path(src)
    if cp.exists() and not force:
        return read_json(cp), False
    body = {
        "model": MODEL,
        "messages": build_messages(src),
        "reasoning_effort": REASONING,
        "response_format": {"type": "json_schema", "json_schema": {"name": "tour", "strict": True, "schema": SCHEMA}},
    }
    _, _, raw = http("POST", "https://api.openai.com/v1/chat/completions", data=body,
                     headers={"Authorization": f"Bearer {OPENAI_KEY}"}, timeout=600, retries=5)
    resp = json.loads(raw)
    add_usage(resp.get("usage") or {})
    choice = resp["choices"][0]
    if choice["message"].get("refusal"):
        raise RuntimeError("refusal: " + choice["message"]["refusal"])
    data = json.loads(choice["message"]["content"])
    data["_meta"] = {"model": resp.get("model"), "usage": resp.get("usage"), "finish_reason": choice.get("finish_reason")}
    write_json(cp, data)
    return data, True


def main(only=None, force=False):
    sources = read_json(SOURCES_JSON)
    if only:
        sources = [s for s in sources if s["source_ref"] in only]
    todo = [s for s in sources if force or not cache_path(s).exists()]
    log(f"extract: {len(sources)} sources, {len(todo)} need OpenAI")
    failures = []

    def run(s):
        try:
            d, fresh = extract_one(s, force)
            if fresh:
                u = d["_meta"]["usage"] or {}
                log(f"  ok {s['source']}:{s['source_ref']} '{d['title']}' days={len(d['days'])} deps={len(d['departures'])} tok={u.get('prompt_tokens')}/{u.get('completion_tokens')}")
        except Exception as e:  # noqa
            failures.append((s["source_ref"], str(e)[:300]))
            log(f"  FAILED {s['source']}:{s['source_ref']}: {str(e)[:300]}")

    with ThreadPoolExecutor(WORKERS) as ex:
        list(ex.map(run, todo))
    log("usage totals:", read_json(USAGE_JSON, {}))
    return failures


if __name__ == "__main__":
    import sys
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    main(set(args) or None, force="--force" in sys.argv)
