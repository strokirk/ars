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
```

## How it works

- `src/rules.ts` builds the pure `RulesData` engine from the bundled `data/*.json`.
- `src/engine.ts` wraps the chargen domain: every edit goes through `applyOps` with
  `force:true`, so picks always land and the engine's `validate()` issues become the
  teaching feedback. Final "legal" is gated on `isLegal()`.
- `src/pages/Wizard.tsx` drives a per-`kind` stepper (Concept → Characteristics →
  Virtues & Flaws → Abilities → [Arts & Spells, magi] → Personality → Review) with live
  budget meters; `src/steps.tsx` + `src/components/*` are the step bodies and pickers.
- Drafts autosave to `localStorage` (`src/store.ts`); finished sheets reuse the chargen
  HTML/Markdown renderers and can be exported (MD/JSON/print) or shared via a base64
  URL hash (`#/c/<data>`).

Deployment is configured in the repo-root `netlify.toml` (Netlify runs `npm run build`
here and publishes `dist/`). The whole repo must be checked out because this app
imports `../chargen` and `../data` at build time.
