#!/usr/bin/env python3
"""Extract Ars Magica Chapter-9 spells and guideline tables into JSON.

Walks md/09-spells/*.md (content files only), derives Technique + Form from the
`### <Tech> <Form> (Spells|Guidelines)` section headers, and emits:
  data/spells.json      one record per spell entry
  data/guidelines.json  one record per (technique, form, level, effect) row

Stdlib only. Tolerant of the source's OCR noise: unparseable fields are captured
raw and surfaced in a parse report rather than crashing or being dropped.
"""
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPELLS_DIR = ROOT / "md" / "09-spells"
DATA = ROOT / "data"

TECHNIQUES = {"Creo": "Cr", "Intellego": "In", "Muto": "Mu", "Perdo": "Pe", "Rego": "Re"}
FORMS = {
    "Animal": "An", "Aquam": "Aq", "Auram": "Au", "Corpus": "Co", "Herbam": "He",
    "Ignem": "Ig", "Imaginem": "Im", "Mentem": "Me", "Terram": "Te", "Vim": "Vi",
}

SECTION_RE = re.compile(
    r"^###\s+(%s)\s+(%s)\s+(Spells|Guidelines)\s*$"
    % ("|".join(TECHNIQUES), "|".join(FORMS))
)
LEVEL_RE = re.compile(r"^####\s+(?:LEVEL\s+(\d+)|GENERAL)\s*$", re.IGNORECASE)
HEADER_RE = re.compile(r"^(#{2,6})\s+(.*?)\s*$")
RDT_RE = re.compile(r"^R:\s*(?P<r>.+?)[,.\s]+D:\s*(?P<d>.+?)[,.\s]+T:\s*(?P<t>.+?)\s*$")
REQ_RE = re.compile(r"^Req:\s*(.+?)\s*$")
DAMAGE_RE = re.compile(r"\+(\d+)\s+damage")


def clean(text):
    """Strip markdown line-break backslashes and HTML tags; collapse whitespace."""
    text = re.sub(r"<[^>]+>", " ", text)
    text = text.replace("\\", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


class TableParser(HTMLParser):
    """Collect rows of <td> cells from a wikitable; <br> becomes a newline."""

    def __init__(self):
        super().__init__()
        self.rows = []
        self._row = None
        self._cell = None
        self._buf = []

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


def parse_guideline_table(block, technique, form, source_file, base_line):
    parser = TableParser()
    parser.feed(block)
    out = []
    for row in parser.rows:
        if len(row) < 2:
            continue
        lvl_raw, effect_raw = row[0].strip(), row[1]
        if lvl_raw.lower() in ("level", ""):  # header row
            continue
        is_general = not lvl_raw.isdigit()
        level = int(lvl_raw) if lvl_raw.isdigit() else None
        for piece in effect_raw.split("\n"):
            piece = piece.lstrip("•").strip()
            piece = clean(piece)
            if not piece:
                continue
            out.append({
                "technique": technique, "form": form,
                "level": level, "is_general": is_general,
                "effect": piece,
                "source_file": source_file, "source_line": base_line,
            })
    return out


def parse_spell(name, body_lines, ctx, source_file, source_line, report):
    """ctx = (technique, form). body_lines = raw lines after the header."""
    technique, form = ctx
    rdt_line = req_line = design_raw = None
    desc_parts = []
    for raw in body_lines:
        line = raw.rstrip()
        stripped = line.rstrip("\\").strip()
        if rdt_line is None and stripped.startswith("R:"):
            rdt_line = stripped
            continue
        if req_line is None and stripped.startswith("Req:"):
            m = REQ_RE.match(stripped)
            req_line = m.group(1).rstrip("\\").strip() if m else stripped
            continue
        if design_raw is None and stripped.startswith("("):
            design_raw = stripped
            continue
        desc_parts.append(line)

    rng = dur = tgt = None
    if rdt_line:
        m = RDT_RE.match(rdt_line)
        if m:
            rng = m.group("r").strip()
            dur = m.group("d").strip().rstrip(".")
            tgt = m.group("t").strip()
            # peel a trailing ", Ritual" off the target field
            tgt = re.split(r",\s*Ritual", tgt)[0].strip().rstrip(".")
        else:
            report["bad_rdt"].append(f"{source_file}:{source_line} {name!r} -> {rdt_line!r}")
    else:
        report["no_rdt"].append(f"{source_file}:{source_line} {name!r}")

    requisites = []
    if req_line:
        requisites = [r.strip() for r in re.split(r"[,/]", req_line) if r.strip()]

    is_ritual = bool(
        (rdt_line and re.search(r"\bRitual\b", rdt_line))
        or (design_raw and re.search(r"\bRitual\b", design_raw))
    )

    description = clean("\n".join(desc_parts))
    dmg_m = DAMAGE_RE.search(description)
    damage = int(dmg_m.group(1)) if dmg_m else None

    if design_raw is None:
        report["no_design"].append(f"{source_file}:{source_line} {name!r}")

    return {
        "name": name,
        "technique": technique,
        "form": form,
        "tech_abbr": TECHNIQUES[technique],
        "form_abbr": FORMS[form],
        "range": rng, "duration": dur, "target": tgt,
        "is_ritual": is_ritual,
        "requisites": requisites,
        "damage": damage,
        "design_raw": design_raw,
        "description": description,
        "source_file": source_file,
        "source_line": source_line,
    }


def parse_file(path, spells, guidelines, report):
    rel = path.name
    lines = path.read_text(encoding="utf-8").splitlines()
    ctx = None             # (technique, form)
    section_type = None    # "Spells" | "Guidelines"
    level = None
    is_general_level = False
    i = 0
    n = len(lines)
    while i < n:
        line = lines[i]
        sec = SECTION_RE.match(line)
        if sec:
            ctx = (sec.group(1), sec.group(2))
            section_type = sec.group(3)
            i += 1
            continue
        lvl = LEVEL_RE.match(line)
        if lvl:
            if lvl.group(1):
                level, is_general_level = int(lvl.group(1)), False
            else:
                level, is_general_level = None, True
            i += 1
            continue
        # guideline table inside a Guidelines section
        if section_type == "Guidelines" and ctx and line.lstrip().startswith("<table"):
            block = [line]
            j = i + 1
            while j < n and "</table>" not in lines[j]:
                block.append(lines[j]); j += 1
            if j < n:
                block.append(lines[j])
            guidelines.extend(
                parse_guideline_table("\n".join(block), ctx[0], ctx[1], rel, i + 1)
            )
            i = j + 1
            continue

        hdr = HEADER_RE.match(line)
        if hdr and len(hdr.group(1)) >= 4 and not LEVEL_RE.match(line):
            # a #### or ##### header that is not LEVEL/GENERAL = a spell name
            name = hdr.group(2).strip()
            if not name or name.upper().startswith(("LEVEL", "GENERAL")):
                i += 1
                continue
            if section_type == "Spells" and ctx:
                body = []
                j = i + 1
                while j < n and not HEADER_RE.match(lines[j]):
                    body.append(lines[j]); j += 1
                spell = parse_spell(name, body, ctx, rel, i + 1, report)
                spell["level"] = level
                spell["is_general"] = is_general_level
                spells.append(spell)
                i = j
                continue
        i += 1


def main():
    skip_prefixes = ("00", "01", "02", "03")
    files = sorted(
        p for p in SPELLS_DIR.glob("*.md")
        if not p.name[:2] in skip_prefixes
    )
    spells, guidelines = [], []
    report = {"bad_rdt": [], "no_rdt": [], "no_design": []}
    for path in files:
        parse_file(path, spells, guidelines, report)

    DATA.mkdir(exist_ok=True)
    (DATA / "spells.json").write_text(json.dumps(spells, indent=2, ensure_ascii=False))
    (DATA / "guidelines.json").write_text(json.dumps(guidelines, indent=2, ensure_ascii=False))

    print(f"Parsed {len(files)} files")
    print(f"  spells:     {len(spells)}")
    print(f"  guidelines: {len(guidelines)}")
    missing_tf = [s for s in spells if not s["technique"] or not s["form"]]
    print(f"  spells missing technique/form: {len(missing_tf)}")
    print("Parse report:")
    for key, label in (("no_rdt", "missing R/D/T line"),
                       ("bad_rdt", "unparseable R/D/T line"),
                       ("no_design", "missing (design) line")):
        items = report[key]
        print(f"  {label}: {len(items)}")
        for it in items[:15]:
            print(f"    - {it}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
