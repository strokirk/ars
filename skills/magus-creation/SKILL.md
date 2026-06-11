---
name: magus-creation
description: Create a complete, rules-legal Ars Magica (Definitive Edition) Hermetic magus character from a concept. Use when asked to build, generate, or stat up a magus (mage/wizard) player character.
---

# Creating a Hermetic Magus (Ars Magica, Definitive Edition)

Use the **`chargen` CLI** (`chargen/bin/chargen`) to build the character. It tracks
the five creation budgets, rejects illegal picks with a reason, and exports the
sheet. You compose the concept; the tool guarantees legality. Prefer it to hand-
tracking xp.

## The fast path (compose once, let the tool check)

1. **Learn the input shape** — one call prints the whole vocabulary + enums:
   ```sh
   chargen schema
   ```
2. **Look up picks you're unsure of** (optional) — the tool reads the rules data:
   ```sh
   chargen options flaws --category Hermetic --random 3
   chargen options spells --tech Creo --form Ignem --max-level 25
   chargen options virtues --describe "Affinity with Art"
   ```
3. **Build the whole magus in one call** from a JSON spec (a single object
   mirroring the finished character — see `chargen schema` for every field):
   ```sh
   chargen build '{ "name":"Marcus","house":"Flambeau","concept":"vengeful fire mage",
     "favoredTechnique":"Creo","favoredForm":"Ignem","focus":"fire","puissant":"Ignem",
     "characteristics":{"Int":3,"Sta":1,"Per":1,"Str":-1},
     "virtues":["Affinity with Ignem","Self-Confident","Cautious Sorcerer"],
     "flaws":["Necessary Condition"], "nativeLanguage":"German",
     "abilities":[{"name":"Magic Theory","score":3,"stage":"apprenticeship"}, ...],
     "arts":{"Ignem":10,"Creo":6}, "spells":["Pilum of Fire"],
     "notes":"## Goals\n- Avenge his master\n## Interpretation\n..." }' \
     --char characters/marcus.json --out characters/marcus.md --format both
   ```
   The tool applies the free House benefits, validates everything, and **reports
   every illegal pick at once** (overspent budget, unknown name, wrong stage, a
   spell over its Lab Total). Nothing saves unless the whole thing is legal — read
   the rejections, fix the spec, and re-run. Pass big specs via `--file spec.json`
   or stdin instead of an inline string.
4. **Confirm and finish:**
   ```sh
   chargen check                       # full legality checklist (exit 0 = legal)
   ```

For a large or experienced magus you can also iterate stage by stage: `chargen new`,
then one `chargen apply '[ ...ops... ]'` per budget, with `chargen status` between
for reasoned next steps. Use `chargen add/set/remove` for one-off tweaks and
`chargen notes --append` to grow the description.

## Save the output

Unless the user says "just show me", save to `characters/<name-kebab>.md` (and
`.html` if useful) — that's what `--out … --format both` does. Always also give the
user a short chat summary and the file path. Put fluff, goals, and interpretation in
the spec's `notes` field (Markdown); it renders into both sheets.

## The numbers the tool enforces (know them to compose a good first draft)

- **Characteristics:** net **7 points**. Cost +1→1, +2→3, +3→6; negatives refund the
  same. Eight: Int, Per, Str, Sta, Pre, Com, Dex, Qik (range −3..+3). Favor **Int**
  (every Lab Total) and non-negative **Sta** (casting).
- **Virtues & Flaws:** ≤ **10 Flaw points**, and **Virtue points = Flaw points**
  (Major 3 / Minor 1). Free & off-budget: **The Gift**, **Hermetic Magus**, the House
  benefit — the tool adds these automatically. Need **≥1 Hermetic Flaw**; ≤5 Minor
  Flaws; ≤1 Major Hermetic Virtue; ≤1 Story Flaw; ≤2 Personality Flaws (≤1 Major).
- **xp to reach score *n* from 0:** Art `n(n+1)/2` (1→1,2→3,3→6,5→15,10→55); Ability
  `5·n(n+1)/2` (1→5,2→15,3→30,4→50,5→75).
- **Ability max by age:** <30→5, 30–35→6, 36–40→7, 41–45→8, 46+→9.
- **Childhood:** Native Language at 5 (a spoken vernacular — **never Latin**) **+ 45
  xp** on General abilities only.
- **Later life:** default **5 yrs × 15 = 75 xp**, General abilities only.
- **Apprenticeship:** **240 xp** on Arts + any abilities (incl. Academic/Arcane/
  Martial), **and 120 levels of spells**. Mandatory: **Parma Magica ≥1, Magic Theory
  ≥1, Latin ≥1** (keep Parma at 1 for a fresh Gauntlet). Split a Technique and a Form.
- **Lab Total (spell-learning cap):** Technique + Form + Int + Magic Theory + aura(3),
  + Puissant (+3), + Magical Focus (lowest applicable Art again) if in-focus, halved
  for a Deficient Art; requisites use the **lowest** applicable Technique/Form. Every
  known spell's level must be ≤ this. The tool computes and checks it per spell.

The House free benefit is applied for you from `--house` (+ `--puissant` where the
House offers a choice). For an older magus, raise `age` and `laterLifeYears` in the
spec. The tool's `chargen check` is the authority — when it prints LEGAL, you're done.
