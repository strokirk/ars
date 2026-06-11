#!/usr/bin/env python3
"""Extract Virtues & Flaws (Ch.4) and Abilities (Ch.5) into JSON.

Emits:
  data/virtues_flaws.json   from md/04-virtues-and-flaws/12-general.md
  data/abilities.json       from md/05-abilities/05-ability-list.md

Both source files have a single consistent format (see below). Stdlib only;
tolerant of OCR noise (entries are captured raw rather than dropped).
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
VF_FILE = ROOT / "md" / "04-virtues-and-flaws" / "12-general.md"
ABIL_FILE = ROOT / "md" / "05-abilities" / "05-ability-list.md"

# ---- Virtues & Flaws ----------------------------------------------------------
# Entries are `#### Name` under a `# Virtues` or `# Flaws` section. The first
# non-empty line after the header is the cost line, e.g. "Minor, Hermetic".
SIZE_RE = re.compile(r"\b(Minor or Major|Major or Minor|Minor|Major|Free)\b", re.I)
# Checked as substrings of the cost line (specific phrases before generic ones).
CATEGORIES = [
    "Social Status", "Mythic Companion", "Hermetic", "Supernatural",
    "Personality", "Story", "General", "Special",
]


def clean(text):
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)   # markdown links -> label
    text = re.sub(r"<[^>]+>", " ", text)
    text = text.replace("\\", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def parse_cost(line):
    size = None
    m = SIZE_RE.search(line)   # size may lead or trail, e.g. "General, Minor"
    if m:
        s = m.group(1).lower()
        size = "Major or Minor" if " or " in s else s.capitalize()
    low = line.lower()
    cats = [c for c in CATEGORIES if c.lower() in low]
    if not cats and "supernatura" in low:          # OCR: "Supernatura"
        cats = ["Supernatural"]
    tainted = "tainted" in low
    return size, cats, tainted


def parse_virtues_flaws():
    lines = VF_FILE.read_text(encoding="utf-8").splitlines()
    out = []
    kind = None
    i, n = 0, len(lines)
    while i < n:
        line = lines[i].rstrip()
        if re.match(r"^# Virtues\s*$", line):
            kind = "Virtue"; i += 1; continue
        if re.match(r"^# Flaws\s*$", line):
            kind = "Flaw"; i += 1; continue
        if re.match(r"^####(?!#)\s", line) and kind:
            name = clean(line[4:])
            # gather body until the next entry (#### but not #####) or # section.
            # `#####` sidebars stay inside the entry's description.
            body, j = [], i + 1
            while j < n and not (re.match(r"^####(?!#)\s", lines[j])
                                 or re.match(r"^#\s", lines[j])):
                body.append(lines[j]); j += 1
            nonempty = [b for b in body if b.strip()]
            cost_raw = nonempty[0].strip() if nonempty else ""
            size, cats, tainted = parse_cost(cost_raw)
            # entries with neither a size nor a category on the first line are
            # boxed sidebars (e.g. "Potent Magic And Potent Spells"), not traits.
            if not size and not cats:
                i = j
                continue
            # description = everything after the cost line
            desc = nonempty[1:] if size else nonempty
            out.append({
                "name": name, "kind": kind,
                "size": size,
                "category": cats[0] if cats else None,
                "categories": cats,
                "tainted": tainted,
                "cost_raw": cost_raw,
                "description": clean(" ".join(desc)),
                "source_file": VF_FILE.name,
                "source_line": i + 1,
            })
            i = j
            continue
        i += 1
    return out


# ---- Abilities ----------------------------------------------------------------
# Entries are `**Name:** description ... _Specialties:_ ... (Type)`. Handles both
# `**Name:**` (colon inside) and `**Name**:` (colon outside), and names ending in
# `\*` (which marks abilities that need a Virtue). Inline bold like
# `**COMPLEX ... ROLL: ...**` is rejected (internal colon / no description).
ABIL_START_RE = re.compile(r"^\*\*(?P<inner>.+?)\*\*\s*:?\s*(?P<rest>.*)$")
ABIL_TYPES = {"General", "Academic", "Arcane", "Martial", "Supernatural"}
TYPE_RE = re.compile(r"\(([A-Za-z][A-Za-z ]+?)\)")
SPEC_RE = re.compile(r"_Specialties?:?_\s*:?\s*(.+?)(?:\((?:General|Academic|Arcane|Martial|Supernatural)\)|$)")


def _ability_head(line):
    """Return (name, restricted, rest) if `line` heads an ability entry, else None."""
    m = ABIL_START_RE.match(line.rstrip())
    if not m:
        return None
    inner = m.group("inner").strip()
    name_part = inner[:-1].rstrip() if inner.endswith(":") else inner
    rest = m.group("rest").strip()
    if not rest or ":" in name_part or len(name_part) > 60:
        return None
    restricted = name_part.endswith("\\*") or name_part.endswith("*")
    name = clean(name_part.rstrip("*").rstrip("\\")).strip()
    return name, restricted, rest


def parse_abilities():
    lines = ABIL_FILE.read_text(encoding="utf-8").splitlines()
    out = []
    i, n = 0, len(lines)
    while i < n:
        head = _ability_head(lines[i])
        if not head:
            i += 1
            continue
        name, restricted, rest = head
        body = [rest]
        j = i + 1
        while j < n and not _ability_head(lines[j]):
            body.append(lines[j]); j += 1
        block = "\n".join(body)
        # type = last parenthesized known type in the block
        atype = None
        for cand in TYPE_RE.findall(block):
            if cand.strip() in ABIL_TYPES:
                atype = cand.strip()
        spec = None
        sm = SPEC_RE.search(block.replace("\n", " "))
        if sm:
            spec = clean(sm.group(1)).rstrip(". ")
        out.append({
            "name": name,
            "type": atype,
            "restricted": restricted,
            "specialties": spec,
            "description": clean(block),
            "source_file": ABIL_FILE.name,
            "source_line": i + 1,
        })
        i = j
    return out


def main():
    vf = parse_virtues_flaws()
    abil = parse_abilities()
    DATA.mkdir(exist_ok=True)
    (DATA / "virtues_flaws.json").write_text(json.dumps(vf, indent=2, ensure_ascii=False))
    (DATA / "abilities.json").write_text(json.dumps(abil, indent=2, ensure_ascii=False))

    print(f"  virtues_flaws: {len(vf)} "
          f"({sum(1 for x in vf if x['kind']=='Virtue')} virtues, "
          f"{sum(1 for x in vf if x['kind']=='Flaw')} flaws)")
    print(f"  abilities:     {len(abil)}")
    no_size = [x["name"] for x in vf if not x["size"]]
    no_cat = [x["name"] for x in vf if not x["category"]]
    no_type = [x["name"] for x in abil if not x["type"]]
    print(f"  V/F missing size: {len(no_size)}  missing category: {len(no_cat)}")
    for nm in no_size[:10]:
        print(f"    - no size: {nm!r}")
    print(f"  abilities missing type: {len(no_type)}")
    for nm in no_type[:10]:
        print(f"    - no type: {nm!r}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
