"""Shared helpers for the Daily Holidays import pipeline (stdlib only)."""
from __future__ import annotations

import html
import json
import os
import re
import sys
import threading
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]          # project root
SCRIPTS = ROOT / "scripts"
CACHE = SCRIPTS / ".cache"
FILES = CACHE / "files"            # downloaded originals
TEXT = CACHE / "text"              # pdftotext output
EXTRACT = CACHE / "extract"        # OpenAI extraction JSON
for _d in (CACHE, FILES, TEXT, EXTRACT):
    _d.mkdir(parents=True, exist_ok=True)

SOURCES_JSON = CACHE / "sources.json"      # unified list of tours to import
UPLOADS_JSON = CACHE / "uploads.json"      # storage path -> public url (+ size)
GEOCODE_JSON = CACHE / "geocode.json"
USAGE_JSON = CACHE / "openai_usage.json"

TODAY = "2026-09-28"
BUCKET = "tour-media"

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

_print_lock = threading.Lock()


def log(*a):
    with _print_lock:
        print(time.strftime("%H:%M:%S"), *a, flush=True)


# ---------------------------------------------------------------- env
def load_env() -> dict:
    env = {}
    p = ROOT / ".env.local"
    for line in p.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        v = v.strip()
        if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
            v = v[1:-1]
        env[k.strip()] = v
    for k in list(env):
        if os.environ.get(k):
            env[k] = os.environ[k]
    return env


ENV = load_env()
SUPABASE_URL = ENV.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = ENV.get("SUPABASE_SERVICE_ROLE_KEY", "")
OPENAI_KEY = ENV.get("OPENAI_API_KEY", "")


# ---------------------------------------------------------------- json io
def read_json(p: Path, default=None):
    try:
        return json.loads(Path(p).read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default


def write_json(p: Path, data):
    p = Path(p)
    tmp = p.with_suffix(p.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    os.replace(tmp, p)


# ---------------------------------------------------------------- http
class HttpError(Exception):
    def __init__(self, status, body, url):
        super().__init__(f"HTTP {status} for {url}: {body[:500]}")
        self.status = status
        self.body = body


def http(method, url, data=None, headers=None, timeout=120, retries=4, retry_on=(429, 500, 502, 503, 504)):
    """Returns (status, headers, bytes). Retries with backoff on transient errors."""
    headers = dict(headers or {})
    headers.setdefault("User-Agent", "DailyHolidaysImporter/1.0")
    if isinstance(data, (dict, list)):
        data = json.dumps(data, ensure_ascii=False).encode("utf-8")
        headers.setdefault("Content-Type", "application/json")
    elif isinstance(data, str):
        data = data.encode("utf-8")
    delay = 2.0
    for attempt in range(retries + 1):
        req = urllib.request.Request(url, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.status, dict(r.headers), r.read()
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")
            if e.code in retry_on and attempt < retries:
                ra = e.headers.get("Retry-After")
                wait = float(ra) if ra and ra.replace(".", "").isdigit() else delay
                time.sleep(min(wait, 60))
                delay *= 2
                continue
            raise HttpError(e.code, body, url) from None
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as e:
            if attempt < retries:
                time.sleep(delay)
                delay *= 2
                continue
            raise HttpError(0, str(e), url) from None


# ---------------------------------------------------------------- supabase
def _sb_headers(extra=None):
    h = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}
    if extra:
        h.update(extra)
    return h


def rest(method, path, body=None, params=None, prefer=None):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params, safe=",.():*")
    h = _sb_headers({"Prefer": prefer} if prefer else None)
    _, _, raw = http(method, url, data=body, headers=h)
    return json.loads(raw) if raw else None


def rest_select_all(table, select="*", params=None, page=1000):
    out, offset = [], 0
    while True:
        p = dict(params or {})
        p.update({"select": select, "limit": page, "offset": offset})
        rows = rest("GET", table, params=p)
        out.extend(rows)
        if len(rows) < page:
            return out
        offset += page


def storage_upload(path: str, data: bytes, content_type: str):
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{urllib.parse.quote(path)}"
    h = _sb_headers({"Content-Type": content_type, "x-upsert": "true", "Cache-Control": "max-age=31536000"})
    http("POST", url, data=data, headers=h, timeout=300)
    return public_url(path)


def public_url(path: str) -> str:
    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{urllib.parse.quote(path)}"


# ---------------------------------------------------------------- text utils
def slugify(s: str, maxlen=60) -> str:
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    s = re.sub(r"&", " and ", s)
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    if len(s) > maxlen:
        s = s[:maxlen].rsplit("-", 1)[0]
    return s or "x"


def clean_filename(name: str) -> str:
    """'4D3N_KRABI_FREE_&amp;_EASY_GA-THKA.pdf' -> '4D3N KRABI FREE & EASY GA-THKA.pdf'"""
    name = html.unescape(urllib.parse.unquote(name))
    stem, dot, ext = name.rpartition(".")
    if not dot:
        stem, ext = name, ""
    stem = stem.replace("_", " ").replace("+", " + ")
    stem = re.sub(r"\s*\(1\)\s*$", "", stem)
    stem = re.sub(r"\s+", " ", stem).strip(" -~")
    return f"{stem}.{ext.lower()}" if ext else stem


def safe_key(name: str) -> str:
    """Storage-safe object name (ASCII letters, digits, . _ -)."""
    name = html.unescape(urllib.parse.unquote(name))
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    name = re.sub(r"[^A-Za-z0-9._-]+", "_", name).strip("_")
    return name or "file"
