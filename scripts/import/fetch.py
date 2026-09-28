"""Step 1a: collect sources (legacy scrape + public Drive folder), download originals,
run pdftotext, write scripts/.cache/sources.json.

Drive is only READ (public embedded folder view + uc?export=download)."""
from __future__ import annotations

from pathlib import Path
import html
import re
import subprocess
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor

from lib import (FILES, ROOT, SOURCES_JSON, TEXT, clean_filename, http, log,
                 read_json, safe_key, write_json)

DRIVE_FOLDER = "1uzaEcXoIpet8J8r6YuG0rlQMiKgNNEJg"
PRODUCTS = ROOT / "scrape" / "products.json"
POLITE_DELAY = 0.5   # seconds between requests per worker
# the scrape stripped the query string; npcdn only serves the original with the site's md5id
NPCDN_SITE_MD5 = "65b22292b232047ac742de249504db02"
WORKERS = 2          # <=2 concurrent downloads


# ------------------------------------------------------------ drive listing
def list_drive(folder_id, prefix="", seen=None):
    seen = seen if seen is not None else set()
    if folder_id in seen:
        return []
    seen.add(folder_id)
    _, _, raw = http("GET", f"https://drive.google.com/embeddedfolderview?id={folder_id}")
    page = raw.decode("utf-8", "replace")
    out = []
    # each entry: <a href="..."> ... <div class="flip-entry-title">NAME</div>
    # tokens in document order: a link (file or folder) followed by its title
    tok = re.compile(r'href="https://drive\.google\.com/(?:file/d/([\w-]+)|drive/folders/([\w-]+))'
                     r'|flip-entry-title">([^<]*)<')
    pending = None
    entries = []
    for m in tok.finditer(page):
        if m.group(1) or m.group(2):
            pending = ("file", m.group(1)) if m.group(1) else ("folder", m.group(2))
        elif pending:
            entries.append((pending[0], pending[1], html.unescape(m.group(3)).strip()))
            pending = None
    for kind, fid, name in entries:
        if kind == "file":
            out.append({"id": fid, "name": name, "folder": prefix})
        else:
            time.sleep(POLITE_DELAY)
            out += list_drive(fid, f"{prefix}{name}/", seen)
    return out


def drive_download(file_id) -> bytes:
    url = f"https://drive.google.com/uc?export=download&id={file_id}"
    _, hdrs, body = http("GET", url, timeout=300)
    ctype = hdrs.get("Content-Type", "")
    if "text/html" in ctype and not body.startswith(b"%PDF"):
        # large-file virus-scan interstitial: follow its download form
        page = body.decode("utf-8", "replace")
        m = re.search(r'<form[^>]+action="([^"]+)"', page)
        inputs = dict(re.findall(r'<input[^>]+name="([^"]+)"[^>]+value="([^"]*)"', page))
        if m:
            action = html.unescape(m.group(1))
        else:
            tok = re.search(r"confirm=([0-9A-Za-z_-]+)", page)
            if not tok:
                raise RuntimeError(f"drive: unexpected HTML for {file_id}")
            action = "https://drive.google.com/uc"
            inputs = {"id": file_id, "export": "download", "confirm": tok.group(1)}
        url2 = action + "?" + urllib.parse.urlencode(inputs)
        _, hdrs, body = http("GET", url2, timeout=600)
    return body


# ------------------------------------------------------------ download helpers
def fetch_to(url, dest, getter=None):
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    body = getter() if getter else http("GET", url, timeout=300)[2]
    tmp = dest.with_suffix(dest.suffix + ".part")
    tmp.write_bytes(body)
    tmp.replace(dest)
    time.sleep(POLITE_DELAY)
    return dest


def pdf_text(pdf_path, txt_path):
    if txt_path.exists():
        return txt_path
    txt_path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["pdftotext", "-layout", "-enc", "UTF-8", str(pdf_path), str(txt_path)],
                   check=True, capture_output=True)
    return txt_path


def fix_url(u):
    """Percent-encode non-ASCII characters (UTF-8). '�C' is a GBK en dash the scrape mangled."""
    u = u.replace("�C", "–")
    return urllib.parse.quote(u, safe=":/?&=%()+~!$,;*'@#[]")


def img_ext(url):
    ext = url.rsplit("?", 1)[0].rsplit(".", 1)[-1].lower()
    return {"jpeg": "jpg"}.get(ext, ext) if ext in ("jpg", "jpeg", "png", "gif", "webp") else "jpg"


# ------------------------------------------------------------ main
def drive_photos(file_id):
    """Curated photos for a Drive tour (see drive_photos.json); copied into the cache so upload.py picks them up."""
    import json
    import shutil
    here = Path(__file__).resolve().parent
    names = json.loads((here / "drive_photos.json").read_text(encoding="utf-8")).get(file_id, [])
    out = []
    for name in names:
        local = f"drive/photos/{name}.jpg"
        (FILES / local).parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(here / "drive_photos" / f"{name}.jpg", FILES / local)
        out.append({"url": None, "local": local, "storage": local})
    return out


def build_sources():
    sources = []
    products = read_json(PRODUCTS)
    for p in products:
        pid = str(p["id"])
        images = []
        for n, u in enumerate(p.get("gallery") or [], 1):
            ext = img_ext(u)
            if "cdn1.npcdn.net/image/" in u and "?" not in u:
                u = f"{u}?md5id={NPCDN_SITE_MD5}"
            images.append({"url": u, "local": f"legacy/{pid}/{n}.{ext}", "storage": f"legacy/{pid}/{n}.{ext}"})
        pdfs = []
        for u in p.get("pdfs") or []:
            fname = html.unescape(urllib.parse.unquote(u.rsplit("/", 1)[-1])).replace("�C", "–")
            key = safe_key(fname)
            if not key.lower().endswith(".pdf"):
                key += ".pdf"
            pdfs.append({"url": fix_url(u), "local": f"legacy/{pid}/{key}", "storage": f"legacy/{pid}/{key}",
                         "caption": clean_filename(fname)})
        sources.append({
            "source": "legacy_site", "source_ref": pid, "title": p.get("title") or "",
            "category_path": p.get("category_path") or [], "description": p.get("description") or "",
            "page_url": p.get("url"), "images": images, "pdfs": pdfs,
        })
    log("listing Drive folder", DRIVE_FOLDER)
    for f in list_drive(DRIVE_FOLDER):
        if not f["name"].lower().endswith(".pdf"):
            log("  skip non-pdf drive file", f["id"], f["name"])
            continue
        sources.append({
            "source": "drive", "source_ref": f["id"], "title": f["name"], "category_path": [f["folder"].strip("/")] if f["folder"] else [],
            "description": "", "page_url": f"https://drive.google.com/file/d/{f['id']}/view",
            "images": drive_photos(f["id"]),
            "pdfs": [{"url": f["id"], "local": f"drive/{f['id']}.pdf", "storage": f"drive/{f['id']}.pdf",
                      "caption": clean_filename(re.sub(r"\s+", " ", f["name"]))}],
        })
    return sources


def download_all(sources):
    jobs = []
    for s in sources:
        for m in s["images"]:
            jobs.append((m["url"], FILES / m["local"], None))
        for m in s["pdfs"]:
            getter = (lambda fid=m["url"]: drive_download(fid)) if s["source"] == "drive" else None
            jobs.append((m["url"], FILES / m["local"], getter))
    todo = [j for j in jobs if not (j[1].exists() and j[1].stat().st_size > 0)]
    log(f"downloads: {len(jobs)} total, {len(todo)} to fetch")
    errors = []

    def run(j):
        try:
            fetch_to(*j)
        except Exception as e:  # noqa
            errors.append((j[0], str(e)[:200]))
            log("  download FAILED", j[0], str(e)[:200])

    with ThreadPoolExecutor(WORKERS) as ex:
        for i, _ in enumerate(ex.map(run, todo), 1):
            if i % 25 == 0:
                log(f"  {i}/{len(todo)}")
    return errors


def extract_texts(sources):
    for s in sources:
        parts = []
        for m in s["pdfs"]:
            pdf = FILES / m["local"]
            if not pdf.exists():
                continue
            head = pdf.read_bytes()[:5]
            if head != b"%PDF-":
                log("  not a PDF:", m["local"])
                m["bad"] = True
                continue
            txt = pdf_text(pdf, TEXT / (m["local"] + ".txt"))
            parts.append(str(txt.relative_to(TEXT)))
        s["texts"] = parts


def main(only=None):
    sources = build_sources()
    if only:
        sources = [s for s in sources if s["source_ref"] in only]
    errors = download_all(sources)
    extract_texts(sources)
    if only:  # merge into the existing full list
        full = {(s["source"], s["source_ref"]): s for s in (read_json(SOURCES_JSON) or [])}
        for s in sources:
            full[(s["source"], s["source_ref"])] = s
        sources = list(full.values())
    write_json(SOURCES_JSON, sources)
    log(f"sources.json: {len(sources)} tours; download errors: {len(errors)}")
    return errors


if __name__ == "__main__":
    import sys
    main(set(sys.argv[1:]) or None)
