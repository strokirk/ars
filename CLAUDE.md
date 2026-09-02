# Ars Magica reference + queryable rules database

This directory holds the **Ars Magica: Definitive Edition** rulebook as Markdown,
a generated SQLite database for fast structured querying, the `chargen` rules
engine, and a static web app of step-by-step character creators built on it.

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
| `chargen/` | Pure TypeScript rules engine (`src/domain/*`) + CLI for building rules-legal **grogs, companions, and magi**. `npm test` is the regression gate. |
| `web/` | Vite + Preact static site (the deployed app): the covenant roster, the three interactive validated character creators, and the reference Library. Imports `chargen/` + `data/*.json` directly. |
| `docs/FUTURE.md` | Planned-but-not-started work (incl. the Chrome LanguageModel auto-grog experiment). |

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

## The character creators (`chargen/` engine + `web/` app)

`chargen/src/domain/*` is a **pure, I/O-free** rules engine (budgets, validation,
mutations) keyed off a character's `kind` (`grog | companion | magus`); the same
engine backs both the CLI and the browser. `web/` is a Vite + Preact static site that
imports the engine and `data/*.json` directly (no backend) and drives a multi-step,
validated, mobile-first creator for each kind, plus the covenant roster (each member's
sheet at `#/roster/:slug`), a standalone spell + Virtue/Flaw Library at `#/library`,
draft save/resume (localStorage), inline copyable Markdown/JSON export, print, and
shareable links.

`web/src/lib/*` holds the app's own pure logic (queries, roster slugs, trait
eligibility, wizard steps) and `web/src/components/ui/*` the shared primitives —
**put new logic in `lib/` and new markup patterns in `ui/` rather than inlining
either in a page or picker.** The two browsers (`SpellBrowser`, `TraitBrowser`) are
deliberately shared between the creator and the Library; give them an `action` prop
to make rows actionable rather than forking a second copy.

```sh
cd web && npm install && npm run dev     # local dev server
cd web && npm run build                  # static build → web/dist (what Netlify publishes)
cd web && npm test                       # web regression gate (vitest)
cd chargen && npm test                   # engine regression gate (run after any domain/ change)
```

Netlify (`netlify.toml`) builds `web/` on deploy. The whole repo must be checked out
because `web/` imports `../chargen` and `../data` at build time. **The pure
`RulesData` class lives in `chargen/src/data/rules.ts`; the Node-only file loader is
`load-node.ts` — keep `node:*` imports out of `rules.ts` so it stays browser-safe.**

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

## Push straight to main

Do not create feature branches or hold changes for review. As soon as a
change is in a good state (typecheck passes, build succeeds), commit it
and push straight to `main`.

## Commit eagerly

Commit working increments as soon as they pass validation, rather than
batching changes. Sessions run against a usage quota and can get cut off
mid-task — uncommitted or unpushed work at that point is lost.

Each pushed commit must still be coherent and functional: typecheck clean,
build succeeding. Don't commit broken code, and don't sit on finished work
waiting to bundle it with something later.
