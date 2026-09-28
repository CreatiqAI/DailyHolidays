#!/usr/bin/env bash
# Full import: sources -> storage -> OpenAI extraction -> geocoding -> database.
# Every step is cached under scripts/.cache/ and safe to re-run.
# Usage: bash scripts/import/run_all.sh [source_ref ...]   (no args = everything)
set -euo pipefail
cd "$(dirname "$0")"
export PYTHONIOENCODING=utf-8
python fetch.py "$@"
python upload.py "$@"
python extract.py "$@"
python geocode.py
python load.py "$@"
python report.py
