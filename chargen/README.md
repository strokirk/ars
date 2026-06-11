# chargen — iterative Ars Magica magus builder

A small TypeScript CLI that builds a **rules-legal Ars Magica (Definitive Edition)
Hermetic magus**. It tracks the five creation budgets, rejects illegal picks with a
reason, explains what to do next, and exports a finished sheet (Markdown + HTML).

Designed for **LLM agents**: one `schema` call teaches the whole input vocabulary, a
single `build` call creates and validates an entire character, `--json` is available
on every command, and rejected picks are reported together rather than one per round-
trip.

## Run

Requires **Node ≥ 22.18** (runs TypeScript directly via native type-stripping — no
build step). From this directory:

```sh
npm install            # dev-only deps (typescript, @types/node) — for typecheck/tests
bin/chargen schema     # learn the build-spec + op vocabulary (start here)
bin/chargen --help     # or: node src/cli/index.ts --help
```

The CLI reads the repo's committed rules data (`../data/*.json`); override with
`--data-dir <path>`. Character state is a JSON file (`--char <path>`, default
`./character.json`, **schema 2**).

### A whole character in one call

```sh
bin/chargen build '{
  "name":"Marcus","house":"Flambeau","concept":"vengeful fire mage",
  "favoredTechnique":"Creo","favoredForm":"Ignem","focus":"fire","puissant":"Ignem",
  "characteristics":{"Int":3,"Sta":1,"Per":1,"Str":-1},
  "virtues":["Affinity with Ignem","Self-Confident","Cautious Sorcerer"],
  "flaws":["Necessary Condition"], "nativeLanguage":"German",
  "abilities":[{"name":"Magic Theory","score":3,"stage":"apprenticeship"}],
  "arts":{"Ignem":10,"Creo":6}, "spells":["Pilum of Fire"],
  "notes":"## Goals\n- Avenge his master"
}' --out characters/marcus.md --format both
bin/chargen check
```

`build` applies the free House benefits, folds in every pick, validates once, and
saves only if legal (or `--force`). Pass the JSON inline, via `--file <path|->`, or on
stdin. Illegal specs print **all** problems at once; fix and re-run.

### Stage by stage (when you'd rather iterate)

```sh
bin/chargen new "Marcus" --house Flambeau --puissant Ignem
bin/chargen apply '[{"op":"chars","values":{"Int":3,"Sta":1,"Per":1,"Str":-1}}]'
bin/chargen status                       # five budgets + reasoned next steps
bin/chargen apply '[{"op":"virtue","name":"Affinity with Ignem"},
                    {"op":"flaw","name":"Necessary Condition"}]'
bin/chargen add spell "Pilum of Fire"    # one-off sugar over the same core
bin/chargen notes --append "Schemes against House Tremere."
bin/chargen export --out characters/marcus.md --format both
```

`apply` takes a JSON array of ops (one whole stage per call). `add`/`set`/`remove`
are single-op sugar; everything routes through the same validated `applyOps` core.

## Architecture (reusable core for a future web app)

```
src/
  domain/    PURE, no I/O — the reusable engine
    glossary, costs, character, houses, modifiers, budgets, ability-policy,
    labtotal, validate, mutations, create, operations, guidance
  data/      loads data/*.json into typed lookups + trait/ability resolution
  cli/       arg parsing, persistence, spec parsing, rendering, sheets (md + html),
             command handlers
test/        node:test unit tests + golden end-to-end + batch/build/html tests
```

`domain/operations.ts` (`applyOps`) is the single chokepoint: it folds an `Op[]`
into a plain serializable `Character`, validates once, and reports per-op results.
The CLI is the only part that does I/O. A web app can import `domain/` + `data/
rules.ts`, supply storage + UI, and reuse all the rules logic and the op batch.

## Develop

```sh
npm run typecheck      # tsc --noEmit
npm test               # node --test
```

The CLI is read-only against `../data` and writes only character/sheet files. The
rules data is generated from the Markdown rulebook — see `../data/SCHEMA.md` and
`../tools/build.sh`.
