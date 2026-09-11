# web — the covenant roster + character creators

A static **Vite + Preact + TypeScript** app: the covenant roster plus interactive,
rules-validated, mobile-first creators for **grogs, companions, and magi**. It imports
the [`chargen`](../chargen) rules engine and the committed [`data/*.json`](../data)
directly — no backend, no server logic.

## Features

One line each, in the order they appear in the app:

- **Covenant roster** (`#/`) — every committed member as a card, each opening a full
  read-only sheet at `#/roster/:slug`.
- **Grog creator** — the quick build: a covenant soldier or servant, minor by the rules.
- **Companion creator** — an important non-magus, built on the companion budgets.
- **Magus creator** — the full five-budget build, with House, Arts, and spell selection.
- **Live validation** — every step shows budget meters and the engine's own issues as
  you go; "Save" is gated on the character actually being legal.
- **Spell Library** (`#/library/spells`) — all 347 spells, filterable by Technique,
  Form, Range/Duration/Target, level, and ritual, groupable and sortable.
- **Guideline reference** (`#/library/guidelines`) — all 613 guideline effects for the
  50 Technique+Form pairs, each group leading with the rules notes and base Individual
  that qualify it.
- **R / D / T reference** (`#/library/parameters`) — the Range, Duration and Target
  ladders in the rulebook's own grid, magnitudes down the side, every rung opening its
  full rules text, plus the level and target-size arithmetic.
- **Spell designer** (`#/library/design`) — pick a guideline and pay for it: jump to any
  rung of any ladder, boost or lower the base effect, add size and complexity
  magnitudes, and watch the level and its arithmetic re-read as you go. Ritual status
  is derived, and says why.
- **Virtue & Flaw Library** (`#/library/virtues`, `#/library/flaws`) — all 622 entries,
  filtered by category and size.
- **Draft save & resume** — builds autosave to `localStorage` and reopen from the home
  page; nothing leaves the browser.
- **Export, print, share** — Markdown and JSON open inline with a copy button (no
  surprise downloads), sheets print cleanly, and a finished character travels as a
  base64 URL hash.
- **Mobile-first** — every view works at phone width; the app is a static bundle with
  no network calls after load.

```sh
pnpm install
pnpm dev            # local dev server (http://localhost:5173)
pnpm build          # static build → dist/
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest run — the regression gate for this package
```

## How it works

- `src/rules.ts` builds the pure `RulesData` engine from the bundled `data/*.json`.
- `src/engine.ts` wraps the chargen domain: every edit goes through `applyOps` with
  `force:true`, so picks always land and the engine's `validate()` issues become the
  teaching feedback. Final "legal" is gated on `isLegal()`.
- `src/lib/*` is the app's own **pure logic** — no JSX, no engine state, all unit
  tested: `queries.ts` (spell/trait filtering, ordering, Lab Total reachability),
  `roster.ts` (committed characters keyed by slug), `eligibility.ts` (which V&F a
  kind may be offered), `wizard-steps.ts` (step sequence + budget meters),
  `guidelines.ts` (the guideline model and the spell-level arithmetic),
  `design-store.ts` (the designer's working state).
- `src/pages/Wizard.tsx` drives a per-`kind` stepper (Concept → Characteristics →
  Virtues & Flaws → Abilities → [Arts & Spells, magi] → Personality → Review) with live
  budget meters, mapping each step key from `lib/wizard-steps.ts` to a body in
  `src/steps.tsx`.
- `src/components/ui/*` are the shared primitives (`SearchField`, `ChipGroup`,
  `OptionList`/`OptionRow`, `Stepper`, `CopyBox`); `SpellBrowser` and `TraitBrowser`
  are built on them and are used **both** inside the creator (with an `action` per
  row, and the Lab Total filter when a character is in play) and standalone in the
  Library. `GuidelineBrowser` follows the same pattern and doubles as the designer's
  effect picker.
- **Guideline data comes from YAML.** The effect rows are generated from the Markdown
  into `data/guidelines.json`, and the prose around them — the R/D/T ladders and their
  magnitude costs, each Form's base Individual, the per-Technique-and-Form notes —
  lives in [`data/guidelines/*.yaml`](../data/guidelines/README.md), parsed at build
  time by `@rollup/plugin-yaml` so the app ships no YAML parser. One file per book,
  globbed rather than registered: a supplement is added by dropping in another
  `*.yaml` with its own `book:` header, with no code change.
- Spell levels run 1,2,3,4,5,10,15,… so a magnitude is a step along that ladder, not a
  flat +5. `lib/guidelines.ts` models it as rungs; `designSpell()` totals a spell and
  reports every contribution, and the tests pin it to the rulebook's worked example.
- Drafts autosave to `localStorage` (`src/store.ts`); finished sheets reuse the chargen
  HTML/Markdown renderers. Markdown/JSON exports open **inline** with a copy button
  rather than downloading, and a sheet can be printed or shared via a base64 URL hash.

## Routes

| Route | What it shows |
|---|---|
| `#/` | Roster, create tiles, saved drafts |
| `#/new/:kind`, `#/edit/:id` | The creation wizard |
| `#/sheet/:id` | A draft's finished sheet |
| `#/roster/:slug` | A committed covenant member's sheet (read-only, copyable) |
| `#/library[/spells\|guidelines\|parameters\|design\|virtues\|flaws]` | Reference browsers, the R/D/T ladders and the spell designer — no character needed |
| `#/c/:data` | A character shared by link |

## Package manager

**pnpm only.** `packageManager` in `package.json` pins the version. Adding an npm
lockfile alongside `pnpm-lock.yaml` produces a half-migrated `node_modules` where
the app and `lucide-preact` resolve *different* copies of preact — every icon then
throws `Cannot read properties of undefined (reading 'context')` from `useContext`.
`vite.config.ts` dedupes preact and `test/preact-instance.test.ts` fails loudly if
it happens again. After any install trouble: `rm -rf node_modules/.vite` (the dep
cache pins the broken module graph).

## Tests

`pnpm test` runs vitest: pure logic in `src/lib` plus the share-link codec, the
router, and jsdom render tests asserting the browsers mount and their filters
actually narrow the list. Most files run on the node environment; the few that need
a DOM opt in per-file with `// @vitest-environment jsdom`.

Deployment is configured in the repo-root `netlify.toml` (Netlify runs
`pnpm install --frozen-lockfile && pnpm run build` here and publishes `dist/`). The whole repo must be checked out because this app
imports `../chargen` and `../data` at build time.
