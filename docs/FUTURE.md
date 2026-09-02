# Future plans

Ideas worth doing, deliberately not started yet. Keep this honest: delete an entry
when it ships, and add the reason when something is dropped.

## Auto-create a grog with the Chrome built-in LanguageModel API

**Status:** not started — noted 2026-09-02, deferred out of the session that added
the reference library.

Chrome ships an on-device model behind `window.LanguageModel` (Gemini Nano, the
Prompt API). It needs no key, no backend and no network round-trip, which fits this
app exactly: the whole site is static, and a grog is the cheapest character to
generate — a name, a one-line concept, an age, three Minor Virtues balanced against
three Minor Flaws, a handful of Abilities, and a couple of Personality Traits.

The shape it should take:

- A **"Surprise me"** button on the grog creator (and on the Home create tile),
  never a replacement for the wizard. The user always lands in the normal editor
  with a filled-in draft they can edit.
- Generate a *concept*, not a sheet. Ask the model for freeform character fiction
  plus a shortlist of trait/ability **names**, then run every pick through the
  existing `applyOps` + `validate()` path. The engine stays the only thing that
  decides what is legal — the model must not be trusted to do arithmetic or to
  respect budgets, and anything it names that fails `rules.resolveTrait` /
  `rules.resolveAbility` is dropped rather than force-created.
- Constrain the output with the API's JSON schema support (`responseConstraint`),
  and seed the prompt with the actual legal option names from `rules` so it picks
  from the real list instead of inventing plausible-sounding Ars Magica terms.
- Iterate: generate → validate → feed the remaining `Issue[]` back for one or two
  repair passes → give up gracefully and hand over whatever is legal so far.

Things to get right:

- **Availability.** `LanguageModel.availability()` returns unavailable /
  downloadable / downloading / available. The button must be hidden (not broken)
  in Safari, Firefox, and any Chrome without the model — this is a progressive
  enhancement on a static site, so no fallback service.
- **First-run download.** The model is a multi-GB download on first use; surface
  `monitor`'s `downloadprogress` rather than appearing to hang.
- **Session cost.** Create one `LanguageModel` session per generation and destroy
  it; don't hold one open for the life of the page.
- **Testability.** Put the prompt/parse/repair loop in `web/src/lib/` behind an
  injectable model interface so it can be unit-tested with a stub, keeping the
  vitest suite free of any browser-model dependency.

## Smaller ideas

- **Abilities in the Library.** The reference browser covers spells and Virtues &
  Flaws; abilities have the same row shape and would be a third tab for very
  little code.
- **Guidelines in the Library.** `data/guidelines.json` (578 rows) is bundled for
  the engine but never surfaced — a per-Technique/Form guideline browser would
  help players design spells rather than only pick them.
- **Draft management on Home.** Rename, duplicate, and import-from-JSON; today a
  draft can only be resumed, viewed, or deleted.
- **Dark mode.** `styles.css` is a single light palette driven by custom
  properties, so a `prefers-color-scheme` block plus a manual toggle is mostly a
  matter of redefining the tokens.
