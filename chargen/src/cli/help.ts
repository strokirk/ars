// Help text. `schema` (not this) is what an agent should read to drive the tool —
// it prints the full op/spec vocabulary in one call. This help orients a human and
// points there.

export const TOP_HELP = `chargen — build a rules-legal Ars Magica (Definitive Ed.) Hermetic magus.
State lives in a character JSON file (--char, default ./character.json). Every edit
re-validates and prints the five-budget ledger.

FASTEST PATH (one call) — describe the whole magus, the tool checks it:
  chargen schema                       # learn the build-spec + op vocabulary
  chargen build '{ "name":"Marcus","house":"Flambeau","concept":"vengeful fire mage",
    "favoredTechnique":"Creo","favoredForm":"Ignem","focus":"fire","puissant":"Ignem",
    "characteristics":{"Int":3,"Sta":1,"Per":1,"Str":-1},
    "virtues":["Affinity with Ignem","Self-Confident","Cautious Sorcerer"],
    "flaws":["Necessary Condition"], "nativeLanguage":"German",
    "abilities":[{"name":"Magic Theory","score":3,"stage":"apprenticeship"}, ...],
    "arts":{"Ignem":10,"Creo":6}, "spells":["Pilum of Fire"],
    "notes":"## Goals\\n..." }' --out characters/marcus.md --format both
  chargen check                        # full legality checklist (exit 1 if illegal)

  build/apply accept JSON as an argument, via --file <path|->, or on stdin. Rejected
  picks are reported together; nothing saves unless every pick is legal (or --force).

THE FIVE BUDGETS (the tool enforces all of this)
  1. Characteristics — net 7 pts (+1=1,+2=3,+3=6; negatives give pts back).
  2. Virtues & Flaws — ≤10 Flaw pts; Virtue pts MUST equal Flaw pts. Free & off-budget:
     The Gift, Hermetic Magus, the House benefit. Need ≥1 Hermetic Flaw; ≤5 Minor Flaws.
  3. Childhood — 45 xp on General abilities + Native Language at 5 (a vernacular, never Latin).
  4. Later life — 75 xp (5 yrs × 15), General abilities only.
  5. Apprenticeship — 240 xp on Arts + abilities, AND 120 levels of spells (each spell's
     level ≤ its Lab Total = Technique + Form + Int + Magic Theory + aura, +mods).

STAGE-BY-STAGE (when you prefer to iterate)
  chargen new "Marcus" --house Flambeau --puissant Ignem   # free House benefits
  chargen apply '[{"op":"chars","values":{"Int":3,"Sta":1,"Per":1,"Str":-1}}]'
  chargen status                       # ledger + reasoned next steps
  chargen apply '[{"op":"virtue","name":"Affinity with Ignem"}, {"op":"flaw","name":"Necessary Condition"}]'
  ...one apply per stage...
  chargen export --out characters/marcus.md --format both

COMMANDS
  schema                      print the build-spec + op vocabulary (read this first)
  build <json>                create + validate a whole magus in one call
  apply <json-array>          apply a batch of ops to an existing character
  new <name> --house <H>      create an empty character (free House benefits only)
  status                      five-budget dashboard + reasoned next steps
  options <what> [filters]    list legal picks (virtues|flaws|abilities|spells|
                              characteristics|houses); --random N for suggestions
  set <what> ...              one-off: char / art / native-language / concept / age / …
  add <what> ...              one-off: virtue / flaw / ability / spell / personality
  remove <what> <name>        undo a pick
  notes --set|--append|--file freeform Markdown (fluff, goals, interpretation)
  check                       run the full legality checklist (exit 1 if illegal)
  export [--out <path>]       write the sheet (--format md|html|both)

GLOBAL FLAGS   --char <path>   --data-dir <path>   --json   --force
Run \`chargen <command> --help\` for per-command detail.`;

export const COMMAND_HELP: Record<string, string> = {
  schema: `chargen schema [--json]
  Print the complete build-spec and op vocabulary plus the enums (houses, Arts,
  Characteristics, stages). One call gives an agent everything needed to emit a
  \`build\` or \`apply\` payload — read this instead of the per-command help.`,

  build: `chargen build '<json>'  [--out <path> --format md|html|both] [--force]
  Create and validate a whole magus in one call. The JSON spec (a single object
  mirroring a finished character) may be passed as the argument, via --file <path>
  (use --file - for stdin), or piped on stdin. Applies the free House benefits, folds
  in every pick, validates once, and saves only if legal (or --force). With --out it
  also writes the sheet. See \`chargen schema\` for the spec shape.

  chargen build '{"name":"Marcus","house":"Flambeau","characteristics":{"Int":3,...},
    "virtues":["Affinity with Ignem"],"flaws":["Necessary Condition"], ...}' \\
    --out characters/marcus.md --format both`,

  apply: `chargen apply '<json>'  [--force]
  Apply a batch of ops to the loaded character. Accepts a JSON array of ops (or an
  object { "ops": [...] }) as the argument, via --file <path|->, or on stdin. Every
  op is applied in order; rejected ops are reported together and the batch is NOT
  saved unless all apply (or --force overrides cap violations). Ideal for driving one
  whole stage per call. See \`chargen schema\` for the op shapes.

  chargen apply '[{"op":"ability","name":"Awareness","score":2,"stage":"childhood"},
                  {"op":"ability","name":"Athletics","score":2,"stage":"childhood"}]'`,

  new: `chargen new <name> --house <House> [options]
  Create ./character.json (or --char <path>) with only the free, off-budget grants
  (The Gift, Hermetic Magus, the House benefit). Use \`build\` to fill it in one call,
  or \`apply\`/\`add\`/\`set\` to iterate.

  --house <House>         Bjornaer Bonisagus Criamon Ex Miscellanea Flambeau Guernicus
                          Jerbiton Mercere Merinita Tremere Tytalus Verditius
  --concept "<text>"      --notes "<markdown>"   --focus "<text>"   --age <n>
  --technique <Tech>      --form <Form>
  --puissant <choice>     Bonisagus: Magic Theory|Intrigue · Flambeau: Perdo|Ignem ·
                          Mercere: Creo|Muto`,

  status: `chargen status
  Show the five budgets (▢ open · ⚠ needs attention · ✓ done) and reasoned guidance on
  what to do next. Add --json for structured output.`,

  options: `chargen options <what> [filters]
  List legal picks from the rules data. <what> is one of:
    virtues | flaws   --category <C> --size Minor|Major --search <text> --describe <name> --random <N>
    abilities         --type General|Academic|Arcane|Martial|Supernatural --stage <stage>
                      --describe <name> --search <text> --random <N>
    spells            --tech <Tech> --form <Form> --max-level <N> --range <R> --learnable
                      --describe <name> --search <text> --random <N>
    characteristics | houses`,

  set: `chargen set <what> ...    (one-off sugar; for many at once use \`apply\`)
  set char <Characteristic> <value −3..+3>
  set art <Art> <score>
  set native-language <language>     spoken vernacular, never Latin (= score 5)
  set concept "<text>" · set focus "<text>" · set reputation "<text>"
  set technique <Tech> · set form <Form>
  set age <n> · set later-life-years <n> · set confidence <n>`,

  add: `chargen add <what> ...    (one-off sugar; for many at once use \`apply\`)
  add virtue <name> [--param X] [--size Minor|Major] [--free]
  add flaw   <name> [--param X] [--size Minor|Major] [--free]
       Friendly parameterized names work: "Puissant Ignem", "Affinity with Ignem",
       "Deficient Ignem". Or the template + --param ("Minor Magical Focus" --param fire).
  add ability <name> <score> --stage childhood|later-life|apprenticeship [--specialty X] [--type T]
  add spell <name> [--aura N] [--focus]
  add personality <trait> <value −3..+3>`,

  remove: `chargen remove <what> <name>
  Undo a pick. <what> is virtue | flaw | ability | spell. Budgets recompute.`,

  notes: `chargen notes (--set "<markdown>" | --append "<markdown>" | --file <path|->)
  Set or append the character's freeform Markdown notes — fluff, goals, interpretation,
  GM notes. Off-budget; rendered in both the Markdown and HTML sheets.`,

  check: `chargen check
  Run the full legality checklist. Prints every error/warning; exits 1 if any error
  remains (gate with: chargen check && chargen export).`,

  export: `chargen export [--out <path>] [--format md|html|both]
  Render the finished sheet. Default Markdown to stdout; --out writes a file (extension
  inferred/added per format). --format both writes <path>.md and <path>.html. --json
  emits the raw character object instead.`,
};
