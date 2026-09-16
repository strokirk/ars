#!/usr/bin/env python3
"""Extract the Shape & Material Bonuses Table (Ch.8, Arcane Discovery) into JSON.

Walks md/08-laboratory/14-arcane-discovery.md from the
"### Shape and Material Bonuses Table" heading to the matching `</table>`,
and emits:
  data/shape_material.json  one record per material/shape, each with its
                             list of `+N <effect>` bonuses

Stdlib only. Tolerant of the source's OCR noise: a bonus line that isn't
"+N effect" is kept as a raw, unparsed entry rather than dropped, and
surfaced in the parse report (see tools/extract.py for the same idiom).
"""
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "md" / "08-laboratory" / "14-arcane-discovery.md"
DATA = ROOT / "data"

HEADING_RE = re.compile(r"^###\s+Shape and Material Bonuses Table\s*$")
BONUS_RE = re.compile(r"^\+(\d+)\s+(.+)$")

# A bonus whose effect text is exactly one of these (case-insensitive) names
# the Art it helps with, worth tagging for a future "filter by Art" UI.
TECHNIQUES = {"Creo", "Intellego", "Muto", "Perdo", "Rego"}
FORMS = {
    "Animal", "Aquam", "Auram", "Corpus", "Herbam",
    "Ignem", "Imaginem", "Mentem", "Terram", "Vim",
}
ARTS = {a.lower(): a for a in TECHNIQUES | FORMS}


def clean(text):
    """Strip HTML tags and collapse whitespace (the source word-wraps cells)."""
    text = re.sub(r"<[^>]+>", " ", text)
    text = text.replace("\\", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


class TableParser(HTMLParser):
    """Collect rows of <td>/<th> cells from a wikitable; <br> becomes a newline."""

    def __init__(self):
        super().__init__()
        self.rows = []
        self._row = None
        self._cell = None

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self._row = []
        elif tag in ("td", "th"):
            self._cell = []
        elif tag == "br" and self._cell is not None:
            self._cell.append("\n")

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self._cell is not None:
            if self._row is not None:
                self._row.append("".join(self._cell).strip())
            self._cell = None
        elif tag == "tr" and self._row is not None:
            if self._row:
                self.rows.append(self._row)
            self._row = None

    def handle_data(self, data):
        if self._cell is not None:
            self._cell.append(data)


def extract_table_block(lines):
    """The `<table>...</table>` HTML block that follows the section heading."""
    start = next((i for i, l in enumerate(lines) if HEADING_RE.match(l)), None)
    if start is None:
        sys.exit("'Shape and Material Bonuses Table' heading not found")
    table_start = next(
        (i for i in range(start, len(lines)) if lines[i].lstrip().startswith("<table")),
        None,
    )
    table_end = next(
        (i for i in range(table_start or start, len(lines)) if "</table>" in lines[i]),
        None,
    ) if table_start is not None else None
    if table_start is None or table_end is None:
        sys.exit("<table>...</table> not found after heading")
    return lines[table_start:table_end + 1]


def parse_bonus_lines(cell_text, item, report):
    bonuses = []
    for raw in cell_text.split("\n"):
        piece = clean(raw.lstrip("•"))
        if not piece:
            continue
        m = BONUS_RE.match(piece)
        if m:
            value = int(m.group(1))
            effect = m.group(2).strip().rstrip(".")
        else:
            value, effect = None, piece
            report["unparsed_bonus"].append(f"{item!r} -> {piece!r}")
        bonus = {"value": value, "effect": effect}
        art = ARTS.get(effect.lower())
        if art:
            bonus["art"] = art
        bonuses.append(bonus)
    return bonuses


def main():
    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    block = "\n".join(extract_table_block(lines))

    parser = TableParser()
    parser.feed(block)

    report = {"unparsed_bonus": [], "no_bonuses": [], "duplicate_item": []}
    items = []
    seen = set()
    for row in parser.rows:
        if len(row) < 2:
            continue
        item = clean(row[0])
        if not item:  # the header row: two empty <th> cells
            continue
        if item.lower() in seen:
            report["duplicate_item"].append(item)
            continue
        bonuses = parse_bonus_lines(row[1], item, report)
        if not bonuses:
            report["no_bonuses"].append(item)
            continue
        seen.add(item.lower())
        items.append({"item": item, "bonuses": bonuses})

    DATA.mkdir(exist_ok=True)
    (DATA / "shape_material.json").write_text(
        json.dumps(items, indent=2, ensure_ascii=False)
    )

    total_bonuses = sum(len(r["bonuses"]) for r in items)
    print(f"Parsed {len(items)} shape/material rows, {total_bonuses} bonuses")
    print("Parse report:")
    for key, label in (
        ("unparsed_bonus", "bonus lines not matching '+N effect'"),
        ("no_bonuses", "rows with no parseable bonuses"),
        ("duplicate_item", "duplicate item names (kept the first)"),
    ):
        vals = report[key]
        print(f"  {label}: {len(vals)}")
        for v in vals[:15]:
            print(f"    - {v}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
