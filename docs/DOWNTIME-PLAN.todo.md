# Downtime planner — plan

A season-by-season planner for what a character (or a whole covenant) does
between adventures: lab work, writing and copying books, study, teaching,
practice, covenant service. The laboratory is the first and richest category,
not a separate tool — `#/lab` is a preset lens onto the same page.

**Status:** planning done across several rounds of discussion; UI scaffold
being built non-functional first, then wired to real data/logic. This file is
the working spec + checklist; keep it honest as work lands (check items off,
don't rewrite history).

## Why the lab isn't its own thing

A magus's season is a single slot, and lab work is one of several things that
can fill it. Building "lab helper" as an island means duplicating the
season/subject/total/house-rule machinery the moment writing or teaching gets
added. So the root abstraction is **the season**, and "Laboratory" is a
category filter over the same activity list, the same total-header pattern,
and the same plan grid.

## Core model

### Subject — works without a character

The planner must work with **no character at all** (a fresh concept, a
what-if, a house-ruled campaign). So it runs on a `Subject`, a plain bag of
numbers — never a `chargen` `Character` directly:

```ts
interface Subject {
  name: string;
  characteristics: Partial<Record<Characteristic, number>>;
  abilities: Record<string, number>;      // by ability name
  arts: Partial<Record<Art, number>>;
  virtues: string[];                       // gates locked activities
  source: "roster" | "draft" | "manual";
}
```

`fromCharacter(ch): Subject` is a one-way adapter (`web/src/lib/`). Loading a
roster magus is just a prefill you can then freely edit — "Marcus, but with
Creo 15" is a supported question without touching his sheet. Manual entry is
the *primitive* case, not a degraded fallback: only the fields the current
total/activity actually reads get an input row.

### Totals — the generalization of "Lab Total"

Every seasonal activity runs on some total (Lab Total, Teaching Total, Book
Quality, Source Quality, a flat practice value…). All of them are a sum over a
small closed set of term kinds:

```yaml
totals:
  - key: lab
    name: Lab Total
    terms:
      - {kind: art, role: technique}   # activity supplies which Art
      - {kind: art, role: form}
      - {kind: characteristic, of: Int}
      - {kind: ability, of: Magic Theory}
      - {kind: aura}
  - key: teaching
    name: Teaching Total
    terms:
      - {kind: characteristic, of: Com}
      - {kind: ability, of: Teaching}
      - {kind: fixed, value: 3}
```

Term kinds are enumerated in code (`characteristic`, `ability`, `art`, `aura`,
`fixed`, `input`) — six variants, closed set. Everything else — which terms,
in what order, what an activity's total is — is data. A supplement adding a
new total (a Mystery Cult's Enigmatic Wisdom total, say) is a YAML entry, not
a code change.

### Activities & work — multi-season duration is a first-class field

An activity names its total and a **`work`** shape describing how effort
accrues across seasons — this is what answers "how long does this take":

| `work.kind`  | means                                    | example |
|---|---|---|
| `gated`      | total must clear a threshold; done in N seasons once it does | invent a spell (usually 1 season, blocked below the level) |
| `accumulate` | total contributes points/season toward a goal | inventing an item, opening it for enchantment |
| `repeatable` | total ÷ N per season, no goal, keeps yielding | vis extraction, drawing charges |
| `fixed`      | a fixed season count that yields something with its own quality | writing a tractatus, copying a book |

```yaml
activities:
  - key: invest-device
    name: Open a device for enchantment / invest an effect
    category: lab
    total: lab
    work: {kind: accumulate, unit: level, per_season: {divisor: 2}}
    tags: [enchanting]
  - key: invent-spell
    name: Invent a spell
    category: lab
    total: lab
    work: {kind: gated, need: goal, seasons: 1}
    tags: [spells]
  - key: extract-vis
    name: Extract vis from the aura
    category: lab
    total: lab
    work: {kind: repeatable, per_season: {divisor: 10}, cap: aura}
    tags: [vis-extraction]
  - key: write-tractatus
    name: Write a tractatus
    category: write
    total: book-quality
    work: {kind: fixed, seasons: 1}
```

Duration arithmetic lives in the YAML (`divisor`, `seasons`), not hardcoded in
TypeScript — a troupe house-ruling enchantment seasons, or a supplement
changing how summae are written, edits a file. Code owns only the four
`work.kind` variants and the "is this gated activity currently blocked"
check — which must say so plainly (needed total vs. current total), never
silently quote a duration for something impossible.

### Projects — the unit multi-season work actually plans around

A season doesn't *hold* an activity outcome directly; it **contributes to a
project**:

```ts
interface Project {
  id: string;
  activityKey: string;
  subjectId: string;
  inputs: Record<string, number>;   // aura override, chosen effect level, etc.
  goal?: number;                    // target level/points for accumulate/gated
}
interface Season {
  year: number;
  season: "Spring" | "Summer" | "Autumn" | "Winter";
  subjectId: string;
  projectId: string | null;         // null = unassigned (exposure only)
}
```

`seasonsNeeded(project, totals)` is a pure function, which makes both
directions of planning free:
- **Forward:** "I want this. How many seasons?"
- **Backward:** "I have 4 seasons before the Tribunal. What finishes?"

Interruption (an adventure mid-project) is just an unassigned season in the
middle — progress is a reduce over whichever seasons got assigned, so nothing
extra has to model "paused."

### House rules — two tiers, no new machinery

1. **Ad-hoc, per-table adjustments** — a "+ Add adjustment" row (label, value,
   scope: this activity / this category / everything), persisted per subject
   in localStorage. Covers "our library is worth +3."
2. **Table-wide rule files** — `data/seasons/house.yaml` with its own `book:`
   header, picked up by the existing glob with zero code change, tagged and
   filterable in the UI exactly like a published supplement.

### Extension seam (why `data/seasons/*.yaml`, one file per book)

Same mechanism as `data/guidelines/*.yaml`: glob at build time, a `key`
matching an existing total/activity **replaces** it for that book, a new
`key` is appended, every row is book-tagged and filterable. A supplement that
only adds activities on existing totals is pure data. One with new arithmetic
needs a new `work.kind` or `term.kind` — a small, deliberate, closed set, not
a YAML expression language nobody can debug.

```
data/seasons/
  README.md          same tone/shape as data/guidelines/README.md
  core.yaml           book: {key: core}      — totals + core activities
  covenants.yaml       lab quality, Refinement, Upkeep…
  hoh-mc.yaml           Verditius runes, Mystery init scripts…
  house.yaml            this troupe's table rules (gitignored or committed, TBD)
```

## Relationship to a future advancement tool

They compose in opposite directions and stay decoupled:

```
        ┌──────────────────┐                    ┌──────────────────┐
   ┌───▶│ Downtime planner │──── Gains ────────▶│ Advancement tool │───┐
   │    │  seasons → stuff │   xp, spells,      │  stuff → sheet   │   │
   │    └──────────────────┘   books, vis,      └──────────────────┘   │
   │             ▲             items, aging            │               │
   │             │                                     ▼               │
   │         Subject  ◀───────────── Subject' ─────────┘               │
   │             │                                                     │
   └─────────────┴──── next block of seasons ◀──────────────────────────┘

            both render rule text from  data/seasons/*.yaml
                            │
                            ▼
              Library: "Seasons & Advancement" tab
```

Three things this costs *now*, kept cheap by doing them up front:

1. **`Gains` is typed, not prose.** `{xp: [...], items: [...], vis: n,
   books: [...]}` — a plan summary the advancement tool can consume directly.
2. **`Subject` round-trips.** Advancement is (eventually) a pure
   `apply(subject, gains): Subject` in `chargen/src/domain/` — the planner
   doesn't call it in v1, but the types must permit it.
3. **Aging/warping/Twilight are out of scope here.** The planner *flags*
   them (e.g. "Nth season since your last Longevity Ritual") and never
   computes them — that's advancement's rules engine, not this one's.

Shared reference text (what a summa's worth is, how vis extraction works)
lives once, in `data/seasons/*.yaml`, rendered by a Library
**"Seasons & Advancement"** tab that both tools deep-link into.

## UI shape

### Routes

```
#/downtime            planner, all categories
#/downtime/:who        roster slug | draft id | (nothing = manual)
#/lab                  → same page, Lab category preselected
#/lab/:who
```

Home gets a tile; `SheetView` and roster sheets get a "Plan downtime" /
"Take to the lab" link. The spell designer cross-links in ("can I invent
this?" → lab, preloaded).

### Browse mode

Sticky total header (retitles to whatever total the selected activity runs
on) → input rows for just the terms that total needs, plus ad-hoc
adjustments → category chips → activity list (`FilterBar` + `OptionList`,
each row's meta is the *computed outcome*, live against the header) → a
`CopyBox` season summary.

### Plan mode

A season grid (columns = seasons, one row per subject), with a project
spanning the columns it's assigned to as a bar; a project list showing
progress/blocked state; a rolled-up gains summary across the visible range.
Clicking a grid cell drops into browse mode scoped to that season.

## Reused as-is (no forks)

`FilterBar`, `OptionList`/`OptionRow`, `Stepper`, `Button`, `Select`,
`ArtBadge`, `CopyBox`, `SpellBrowser` (already has `labTotalOf` + "within
reach" filtering), `roster.ts`, `store.ts` drafts, the guidelines YAML-glob
pattern verbatim.

## Phasing / checklist

- [x] Plan written up (this file)
- [ ] **UI scaffold, non-functional** — routes, page shell, mode toggle,
      subject picker (real roster + manual), sticky total header (static),
      input rows, category chips, activity list (demo data), plan-mode grid
      (demo data), CopyBox summary. *Ship this first for polish review.*
- [ ] `Subject` type + `fromCharacter()` adapter (`web/src/lib/`)
- [ ] Totals engine: term kinds, `data/seasons/core.yaml` totals section,
      `totalFor(subject, totalKey, overrides): {value, breakdown}`
- [ ] Wire the sticky header + input rows to the totals engine (still
      single-activity, no project/duration yet) — `#/lab` becomes a real
      Lab Total calculator with house-rule adjustments
- [ ] `data/seasons/core.yaml` activities (lab category) + `work.kind`:
      `gated`, `repeatable` — ActivityBrowser outcomes go live
- [ ] Project model + `seasonsNeeded()` + `accumulate` work kind — multi-season
      lab work (invented items) plans correctly
- [ ] Second category: write/study/teach activities, `fixed` work kind,
      `Gains` typed output — proves the totals registry isn't lab-only
- [ ] Second book file (`covenants.yaml`) — proves the glob needs no code
      change; do this early, before more depends on the seam
- [ ] Plan-mode grid wired to real projects/seasons (from demo → live)
- [ ] Library "Seasons & Advancement" tab, rendering `data/seasons/*.yaml`
      reference prose
- [ ] `docs/FUTURE.md`: covenant-wide multi-subject planning, aging/Twilight
      flags, Original Research, advancement tool itself
