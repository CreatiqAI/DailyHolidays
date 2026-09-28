"""Place helpers shared by geocode.py and load.py: normalisation, filtering, dedupe keys."""
from __future__ import annotations

import re

COUNTRY_ALIASES = {
    "usa": "United States", "us": "United States", "united states of america": "United States",
    "america": "United States", "korea": "South Korea", "republic of korea": "South Korea",
    "türkiye": "Turkey", "turkiye": "Turkey", "uae": "United Arab Emirates", "macao": "Macau",
    "uk": "United Kingdom", "great britain": "United Kingdom", "england": "United Kingdom",
    "holland": "Netherlands", "the netherlands": "Netherlands", "netherland": "Netherlands",
    "czechia": "Czech Republic", "viet nam": "Vietnam", "burma": "Myanmar",
    "hong kong sar": "Hong Kong", "macau sar": "Macau", "russian federation": "Russia",
}

# how Nominatim (accept-language=en) spells some countries in display_name
NOMINATIM_COUNTRY = {
    "Turkey": ["türkiye", "turkey"], "Macau": ["macau", "macao"], "Hong Kong": ["hong kong"],
    "Taiwan": ["taiwan"], "Czech Republic": ["czechia", "czech republic"],
    "United States": ["united states"], "South Korea": ["south korea", "korea"],
}

NOT_A_PLACE = re.compile(
    r"\b(airport|hotel|restaurant|shop|shops|supermarket|store|outlet|duty[- ]free|"
    r"factory|showroom|souvenir|buffet|lunch|dinner|breakfast|terminal building)\b", re.I)


def norm_country(c: str | None) -> str:
    c = (c or "").strip()
    return COUNTRY_ALIASES.get(c.lower(), c)


def keep_place(p: dict) -> bool:
    name = (p.get("name") or "").strip()
    return bool(name) and len(name) <= 120 and not NOT_A_PLACE.search(name)


def place_key(name: str, country: str) -> str:
    """Dedupe key: lower(name) + country, ignoring '&'/'and' and punctuation differences."""
    n = name.strip().lower().replace("&", " and ")
    n = re.sub(r"[^\w]+", " ", n).strip()
    return f"{n}|{norm_country(country).lower()}"


def geocode_queries(p: dict) -> list[str]:
    name, city, country = p["name"].strip(), (p.get("city") or "").strip(), norm_country(p.get("country"))
    qs = []
    if city and city.lower() != name.lower():
        qs.append(f"{name}, {city}, {country}")
    qs.append(f"{name}, {country}")
    ln = (p.get("local_name") or "").strip()
    if ln and len(ln) >= 3 and ln.lower() != name.lower():
        qs.append(f"{ln}, {country}")
    return qs


def country_matches(display_name: str, country: str) -> bool:
    dn = (display_name or "").lower()
    names = NOMINATIM_COUNTRY.get(country, [country.lower()])
    return any(n in dn for n in names)
