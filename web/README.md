# web — the covenant roster + character creators

A static **Vite + Preact + TypeScript** app: the covenant roster plus interactive,
rules-validated, mobile-first creators for **grogs, companions, and magi**. It imports
the [`chargen`](../chargen) rules engine and the committed [`data/*.json`](../data)
directly — no backend, no server logic.

```sh
npm install
npm run dev         # local dev server (http://localhost:5173)
npm run build       # static build → dist/
npm run typecheck   # tsc --noEmit
npm test            # vitest run — the regression gate for this package
```

## How it works

- `src/rules.ts` builds the pure `RulesData` engine from the bundled `data/*.json`.
- `src/engine.ts` wraps the chargen domain: every edit goes through `applyOps` with
  `force:true`, so picks always land and the engine's `validate()` issues become the
  teaching feedback. Final "legal" is gated on `isLegal()`.
- `src/lib/*` is the app's own **pure logic** — no JSX, no engine state, all unit
  tested: `queries.ts` (spell/trait filtering, ordering, Lab Total reachability),
  `roster.ts` (committed characters keyed by slug), `eligibility.ts` (which V&F a
  kind may be offered), `wizard-steps.ts` (step sequence + budget meters).
- `src/pages/Wizard.tsx` drives a per-`kind` stepper (Concept → Characteristics →
  Virtues & Flaws → Abilities → [Arts & Spells, magi] → Personality → Review) with live
  budget meters, mapping each step key from `lib/wizard-steps.ts` to a body in
  `src/steps.tsx`.
- `src/components/ui/*` are the shared primitives (`SearchField`, `ChipGroup`,
  `OptionList`/`OptionRow`, `Stepper`, `CopyBox`); `SpellBrowser` and `TraitBrowser`
  are built on them and are used **both** inside the creator (with an `action` per
  row, and the Lab Total filter when a character is in play) and standalone in the
  Library.
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
| `#/library[/spells\|virtues]` | Reference browsers, no character needed |
| `#/c/:data` | A character shared by link |

## Tests

`npm test` runs vitest: pure logic in `src/lib` plus the share-link codec, the
router, and jsdom render tests asserting the browsers mount and their filters
actually narrow the list. Most files run on the node environment; the few that need
a DOM opt in per-file with `// @vitest-environment jsdom`.

Deployment is configured in the repo-root `netlify.toml` (Netlify runs `npm run build`
here and publishes `dist/`). The whole repo must be checked out because this app
imports `../chargen` and `../data` at build time.
