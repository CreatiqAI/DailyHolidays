"""Step 1b: copy downloaded media into Supabase Storage (bucket tour-media, upsert).
Uploaded paths are remembered in scripts/.cache/uploads.json so reruns skip them."""
from __future__ import annotations

import mimetypes
import threading
from concurrent.futures import ThreadPoolExecutor

from lib import FILES, SOURCES_JSON, UPLOADS_JSON, log, read_json, storage_upload, write_json

WORKERS = 4
_lock = threading.Lock()


def main(only=None, force=False):
    sources = read_json(SOURCES_JSON)
    if only:
        sources = [s for s in sources if s["source_ref"] in only]
    done = read_json(UPLOADS_JSON, {}) or {}
    jobs = []
    for s in sources:
        for m in s["images"] + s["pdfs"]:
            local = FILES / m["local"]
            if m.get("bad") or not local.exists():
                continue
            key = m["storage"]
            if not force and done.get(key, {}).get("size") == local.stat().st_size:
                continue
            jobs.append((key, local))
    log(f"upload: {len(jobs)} files to upload")
    failures = []

    def run(job):
        key, local = job
        ctype = "application/pdf" if key.endswith(".pdf") else (mimetypes.guess_type(key)[0] or "image/jpeg")
        try:
            url = storage_upload(key, local.read_bytes(), ctype)
            with _lock:
                done[key] = {"url": url, "size": local.stat().st_size}
                write_json(UPLOADS_JSON, done)
        except Exception as e:  # noqa
            failures.append((key, str(e)[:200]))
            log("  upload FAILED", key, str(e)[:200])

    with ThreadPoolExecutor(WORKERS) as ex:
        for i, _ in enumerate(ex.map(run, jobs), 1):
            if i % 50 == 0:
                log(f"  {i}/{len(jobs)}")
    log(f"upload done; failures: {len(failures)}")
    return failures


if __name__ == "__main__":
    import sys
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    main(set(args) or None, force="--force" in sys.argv)
