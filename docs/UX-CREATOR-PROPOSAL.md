# Creator UX proposal — Abilities, Arts & Spells, Sheet

> **Status (2026-09-25): implemented** — P1–P10 and both bugs landed on `main`
> (9f96f7f … 44cfec1). Left open: a covenant-wide `<datalist>` of names for P2, and a
> manual Mastery bonus before any Virtue opens that pool.

Walkthrough on 2026-09-25: a new magus of House Merinita, 1280×900 viewport, headless
Chromium against `pnpm dev`. The goals are **clarity** and **compactness**. A magus touches
roughly 30 Abilities, 15 Arts and a dozen spells across four xp pools, so every pixel spent
on chrome is a pixel the player has to scroll past.

## What we saw

### Step 4 — Abilities

| # | Observation | Why it hurts |
|---|---|---|
| A1 | The page is **14,171 px** tall before anything is picked (8,700 px with a few picks). Childhood, Later life and Apprenticeship each render their *full* option list (31 + 31 + 57 rows) with two-line descriptions. | The same list appears three times. The taken Abilities, which are the actual character, are buried between walls of options. |
| A2 | `(Area) Lore` says **"Name it…"** instead of Add. Clicking it opens a panel *above* the list, out of view (the input was at y=704 while the clicked row was at y=928). Focus stays on the button because `autofocus` doesn't fire on a re-render. | You click, nothing visibly happens, and you have to hunt for the form. |
| A3 | Once named ("Provense Lore"), a typo **can't be fixed**: the taken row has no rename. The only fix is remove and re-add, which loses the score and specialty. | A dead end for a one-letter mistake. |
| A4 | The specialty is a small `linkish` link ("add specialty" / "spec: politics"). Editing opens a full-width input row under the Ability, prefilled, with no Cancel and no Escape. The rules' suggested specialties sit only in the placeholder. | The primary action is hard to find, and the suggestions disappear as soon as you type. |
| A5 | Later life: Brawl 1→6 lets you go straight past the age cap. The only signal is grey text reading "+1 = 35 xp (past the usual age cap)", plus a warning at the very bottom of the page. The stage's done-check turns **green while 35 xp overspent**, because `complete` is `spent >= cap`. | The warning sits far from the thing that caused it, and the green tick says the opposite. |
| A6 | Athletics taken in Childhood *and* in Later life produces **two separate rows at score 1** (5 xp + 5 xp). They are never combined. The sheet prints "Athletics 1 / Athletics 1". By the rules, 10 xp in one Ability is score 1 with 5/10 toward score 2. | Wrong result on the sheet, and it wastes xp. |
| A7 | **Bonus xp** is the last thing on a 14k-px page, collapsed, inside the same beige `.why` callout as the teaching text. Adding +15 and −5 works, but the pool meters only change in the tiny bottom bar. | Easy to miss completely. The colour reads as "help text", not "controls". |
| A8 | **Notes on this step** is a collapsed callout at the bottom (8 notes, closed by default), styled like the Bonus-xp box. Messages are CLI-flavoured: "Use `set native-language <lang>`." Nothing in them links to the field that fixes them. | Errors are hidden by default, and they tell the player to type a CLI command in a web app. |
| A9 | Back/Next are two pills with no separation from the content, followed by a sticky budget bar in ~12 px text ("Childhood 10/55 · Later life 110/75…"). The overspend is marked only by red text. | The single most important number, xp left, is the smallest text on the page. |
| A10 | The step's intro says "Set your age…" but the paragraph under it says age "isn't set directly". "spend 45 xp on childhood" ignores bonuses (55 after the bonuses above). Native Language sits in its own large field with two explanatory paragraphs. | Contradictory, and costs a lot of height. |
| A11 | Descriptions show raw Markdown: "`_Specialties:_ acrobatics…`", and the trailing "(General)" is repeated from the meta line. | Noise. |
| A12 | Every `*` Ability is labelled **"needs an enabling Virtue"**, but it is never locked (see Bugs). | Contradicts itself. |

### Step 5 — Arts & Spells

| # | Observation |
|---|---|
| S1 | **42,294 px** tall. 15 full-width Art rows (~55 px each) come first, then the full 360-spell list. |
| S2 | Four stacked beige callouts: the intro, "What are Lab Total and Casting Total?", "Bonus xp", and "4 notes on this step". They look identical, so the eye learns to skip all four, including the errors. |
| S3 | Nearly every spell says **"Learn ⚠"** (Lab Total 3 with no Arts yet), in the same filled style as a clean "Learn". A warning on 355 of 360 rows carries no information. |
| S4 | Mandatory Magic Theory / Latin / Parma errors are repeated here, but you can't fix them on this page. |
| S5 | Nothing reflects House Merinita (no Faerie Magic hint, no Muto/Herbam/Animal emphasis), even though Abilities recommends picks. |

### Sheet

| # | Observation |
|---|---|
| H1 | The issue callout lists 11 items *above* the character, each with a "Dismiss" link. You can dismiss an **error** (e.g. "Native Language not set"), and the header count simply drops ("11 issues" → "8 issues"). Dismissing hard errors lets you hide the fact that the character is illegal. |
| H2 | The "Dismissed:" line truncates messages at the first `.`, `:` or `—`, which splits "Native Language not set (mandatory, score 5 for 75 xp)" mid-thought. The line wraps into an unreadable run-on of `restore` links. |
| H3 | Issues don't link to the step that fixes them, even though the button says "open it in the editor to finish". |
| H4 | "Warping Score starts at 1 point: Merinita initiation" is shown as a ⚠ warning. It's a fact about the character, not a problem to fix. |
| H5 | Duplicate "Athletics 1" rows (see A6). "Faerie Magic" appears both in *Free* Virtues and as *Granted* Ability 1, which is correct but unlabelled. |

## Bugs found on the way

- **`*` doesn't mean "needs a Virtue".** The rulebook (`md/05-abilities/02-abilities-with-no-score.md`)
  says an asterisked Ability *can't be used untrained* (no score = no roll). The extractor stores
  it as `restricted`, and the picker and `validate()` both read it as "needs an enabling Virtue".
  That's why Legerdemain, Judaic Lore and Chirurgy (General, `*`) said they needed a Virtue but
  were never locked. Locking is by *type*, and General is always open. Fix: relabel it
  "can't be used untrained" and drop the bogus `ability-restricted` warning.
- **Summon Animals, Whistle Up The Wind and Embitterment had no type.** Their entries in
  `05-ability-list.md` point to chapter 7 and omit the "(Supernatural)" trailer, so they read
  General. `04-abilities-by-type.md` lists all three as Supernatural. Fix it in the source
  Markdown so the rebuild picks it up. With the type set, they lock like any other Supernatural
  Ability.

## Proposals

Ordered by value per effort. Web Awesome 3.12 ships everything named here (`dialog`,
`drawer`, `popover`, `tab-group`, `number-input`, `badge`, `tag`, `callout`, `tooltip`,
`details`); only `button`, `button-group`, `select` and `option` are registered today.

### P1 — One picker per step, not per stage (A1, S1)

Split the step into **"Your Abilities"** (the character) and **"Add an Ability"** (the catalogue).

- Show *one* list of taken Abilities, grouped by stage with a small stage header and its own
  meter: `Childhood 10/55 · Later life 110/75 ⚠ · Apprenticeship 0/240`.
- Put the catalogue in a **`<wa-drawer>`** (side sheet on desktop, bottom sheet on mobile),
  opened by a per-stage "+ Add" button. The drawer knows which stage it's adding to, and a
  `<wa-radio-group>` at the top lets you switch stage without closing it. Its search keeps
  focus, so you can type, press Enter to add the top hit, and keep typing.
- Descriptions collapse to one line in the catalogue (tap to expand). They aren't shown at all
  in the taken list; a `<wa-tooltip>` on the name covers it.

Expected result: the Abilities step drops from ~14k px to about one screen plus the taken rows.

### P2 — Name placeholders inline, and allow renaming (A2, A3)

- Label the button **"Add"** like every other row. For a template row, replace the row in place
  with an input (`autofocus` via a ref + `focus()` in an effect, not the attribute), plus the
  template's `choices` as `<wa-tag>`s and a native **`<datalist>`** of names already used
  elsewhere in the covenant. Enter adds; Escape cancels.
- Make the taken row's **name editable** for template-derived Abilities: click the name to get
  an input, Enter saves (`op: "rename"`), and score and specialty carry over. That is one new op
  in `mutations.ts`.

### P3 — Specialty as a chip, with suggestions (A4)

- Render the specialty as a `<wa-tag>` next to the name ("politics ×"), or as a ghost
  "+ specialty" tag when empty.
- Clicking opens a **`<wa-popover>`** anchored to the tag: a text input plus the rules'
  `specialtyHints()` as clickable tags. Enter or a click saves; Escape or clicking outside cancels.
  No layout shift, and the suggestions stay visible while typing.

### P4 — Merge cross-stage xp into one Ability (A6, H5)

The engine stores one row per (Ability, stage), each with its own *score*. By the rules, xp
accumulates, so the score comes from **total** xp. Proposal:

- Store **xp** per stage row, not score, and derive the score from the sum (a small `abilityScoreFromXp()`
  beside `abilityXp()` in `costs.ts`).
- In the taken list, show one row per Ability: `Athletics 1 (10/15)`, with per-stage xp as
  small segments (`Ch 5 · LL 5`). `+`/`−` spend or refund at the stage currently selected.
- The sheet then prints each Ability once.

This is the only proposal that changes the data model, so it gets its own commit, migration and
test coverage (existing saved drafts convert score → xp on load).

### P5 — Put warnings where they happen (A5, A8, S2, S3)

- **Inline:** past the age cap, the score gets a `<wa-badge variant="warning">` and the `+`
  button gets `maxHint` (the Stepper already supports it but nobody passes it). Overspend turns
  the stage meter red and **clears the done tick** (`complete` = `spent === cap`).
- **Step notes:** move them to the **top** of the step as a `<wa-callout variant="danger">` for
  errors (open by default), with warnings summarised as a count on the step pip. Each issue gets
  a "Go" link: issues already carry `budget`, which maps to a step (and to a stage section on
  Abilities).
- **Spells:** "Learn" stays clean. Show the warning only when the spell is *above* its Lab Total,
  and even then as a small ⚠ on the meta line, not on the button.
- Rewrite CLI-flavoured issue text for the web: drop "Use `set …`" from messages, or give
  `Issue` an optional `hint` the CLI appends and the web ignores.

### P6 — A real budget header, not a footer (A9)

Replace the sticky footer with a sticky **header strip** under the step pips: one
`<wa-progress-bar>` per pool with the label and "N left" in body-size text, red when over.
Back/Next move into the same strip on the right (or stay at the bottom with a divider above).
One sticky element instead of two.

### P7 — Separate "controls" from "teaching" visually (A7, S2)

- Keep the beige `.why` callout for teaching text only, and let it be dismissed once per step
  (localStorage — per-viewer convenience, per CLAUDE.md).
- **Bonus xp** moves next to the meters: a "±" button on each pool opens a small
  `<wa-dialog>` listing Virtue grants and manual adjustments for *that* pool, with a
  `<wa-number-input>` (±) and a reason field. The pool's meter shows the bonus inline
  (`55 = 45 + 15 − 5`).
- "What are Lab Total and Casting Total?" becomes a `?` `<wa-tooltip>` / popover next to the
  Lab Total figure.

### P8 — Compact Arts grid (S1)

Lay the 15 Arts out as a two-column grid on desktop (Techniques | Forms), one line per Art:
`Creo  [−] 0 [+]  0 xp`. Or replace `Stepper` with `<wa-number-input>`, which natively
supports ± buttons and typing a number directly. Typing "8" beats clicking + eight times. About
600 px becomes ~300 px.

### P9 — Trim the preamble (A10, A11)

- Fold the age paragraph into the Later-life header: `Later life · [5] yrs × 15 xp → age 25`,
  using `<wa-number-input>` for the years.
- Put Native Language in the same compact row as the granted Abilities (`Native language [____] 5`).
- Fix the intro text: age is derived, and the childhood number should come from the budget
  (bonus included).
- Strip `_Specialties:_ …` and the trailing `(Type)` from descriptions at render time, or better,
  in `extract_traits.py`, since `specialties` and `type` are already their own columns.

### P10 — Sheet notes (H1–H4)

- **Errors can't be dismissed**, only warnings. An error is a rules fact; "accept and stop
  flagging" is what a warning is for.
- The dismissed list becomes a `<wa-details>` "3 dismissed" with one line per item (full message
  plus a restore icon button).
- Each issue gets an **"Edit"** link to the step that owns its budget.
- Add an `info` level for facts like the starting Warping Score: shown on the sheet
  as a plain line, not counted as an issue.

## Suggested order

1. Bugs (fixed right after this proposal): `*` meaning, Supernatural types.
2. P5 + P10: warnings in place, errors not dismissable. Small, high clarity gain.
3. P2 + P3: naming, renaming and specialties. Removes the dead ends.
4. P1 + P6: one picker per step in a drawer, budget header. The big compactness win.
5. P4: xp-based Ability rows. Model change, its own commit with a draft migration.
6. P7, P8, P9: polish.
