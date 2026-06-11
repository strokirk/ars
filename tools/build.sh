#!/usr/bin/env bash
# Regenerate the spell data: parse Markdown -> JSON -> SQLite (+FTS5).
# Single command to run after editing md/09-spells/*.md.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 tools/extract.py
python3 tools/extract_traits.py
python3 tools/build.py
