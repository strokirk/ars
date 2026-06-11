# Ars Magica reference + queryable rules database

This directory holds the **Ars Magica: Definitive Edition** rulebook as Markdown,
plus a generated SQLite database for fast, structured querying. There is no
application here — it's a knowledge base for answering rules questions.

## Layout

| Path | What it is |
|---|---|
| `md/` | The rulebook, one folder per chapter (`md/README.md` is the index). Source of truth. |
| `md/09-spells/` | Chapter 9 — spell lists and per-Technique/Form guideline tables. |
| `md/04-virtues-and-flaws/12-general.md` | All Virtues & Flaws (consolidated entry list). |
| `md/05-abilities/05-ability-list.md` | All Abilities. |
| `skills/hermetic-magic.md` | Self-contained spellcasting-rules reference (casting totals, ranges/durations/targets, penetration, certamen). Read this first for adjudication. |
| `tools/` | Extraction + build scripts (Python stdlib only). |
| `data/` | Generated artifacts: canonical JSON + `spells.db`. See `data/SCHEMA.md`. |

## The rules database (`data/spells.db`)

A single SQLite file (FTS5-enabled) with four tables and matching full-text
indexes — **prefer it over `grep`/`awk` for anything structured** (level ranges,
Technique/Form filters, damage, ritual flag, virtue category/size, ability type):

- `spells` (336) · `guidelines` (578) · `virtues_flaws` (622) · `abilities` (74)
- FTS: `spells_fts`, `guidelines_fts`, `virtues_flaws_fts`, `abilities_fts`

Full schema and copy-paste example queries live in **`data/SCHEMA.md`** — read it
before querying.

```sh
# Examples
sqlite3 -header -column data/spells.db \
  "SELECT name,form,level,damage FROM spells WHERE damage IS NOT NULL AND level<=25 ORDER BY damage DESC;"
sqlite3 -header -column data/spells.db \
  "SELECT name,size,category FROM virtues_flaws WHERE kind='Virtue' AND category='Hermetic' AND size='Minor';"
```

When the question is prose/conceptual ("how does Twilight work"), read the Markdown
or `skills/hermetic-magic.md`. When it's a lookup or filter over many entries, query
the database.

## Regenerating after editing the Markdown

The DB and JSON are **generated** — never edit them by hand. After changing any
source `.md`, rebuild:

```sh
./tools/build.sh        # extract.py + extract_traits.py -> JSON, then build.py -> spells.db
```

Pipeline: `tools/extract.py` (spells + guidelines) and `tools/extract_traits.py`
(virtues/flaws + abilities) parse Markdown into `data/*.json`; `tools/build.py`
rebuilds `data/spells.db` from that JSON (drops and recreates — idempotent).

The parsers are deliberately tolerant of the source's OCR noise: anything they
can't parse is captured raw and surfaced in the build's **parse report** rather
than dropped. If you edit the spell Markdown, watch that report (missing R/D/T or
design lines, spells with no Technique/Form) for regressions.

## Gotchas worth knowing

- **Technique/Form come from the `### <Tech> <Form>` section headers, not
  filenames.** Files like `14-creo-mentem-spells.md` contain multiple Technique
  sections (e.g. The Call to Slumber is *Rego* Mentem, not Creo). Trust the DB.
- ~382 looks like the spell count from raw header greps, but the real total is
  **336** — the rest are headers inside Guidelines sections or skipped front-matter.
- General-level spells have `level = NULL` / `is_general = 1`.
- A handful of spells legitimately lack a `(design)` line (General/reference spells
  such as Aegis of the Hearth); 3 abilities lack a `type` (cross-reference stubs).
  These are expected, not parse failures.
