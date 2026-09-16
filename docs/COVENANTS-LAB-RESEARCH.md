# Research: Covenants' laboratory-quality material vs. this repo

Reconnaissance only — no `data/seasons/covenants.yaml` was written. This
surveys `github.com/groblus/ars-magica` (an unofficial, unverified fan
transcription of multiple Ars Magica sourcebooks) for what its **Covenants**
text adds beyond `md/08-laboratory/15-laboratory-personalization-rules.md`.

## Where I looked

`groblus/ars-magica` has two corpora: `raw-md/` (raw OCR) and `reviewed/`
(cleaned up). The reviewed copy of the actual **Covenants** sourcebook is
`reviewed/Ars Magica 5e - Covenants.md` (~700KB). Its **Chapter Nine:
Laboratories** (source line ~5610–6480) is exactly the chapter our core
file's footnote points at ("Covenants Chapter Nine: Laboratories"). I read
that chapter in full, plus the adjacent **Chapter Six: Vis Sources**,
**Chapter Seven: Library**, and the covenant-finance sections of the
building/expenditure chapter that touch laboratories.

This is the standard **5th-edition Covenants** book, not a "Definitive
Edition"-branded revision — there's no separate revised Covenants in that
repo. Treat all numbers below as filtered through an unverified OCR/fan
transcription; a human should sanity-check anything material before it goes
into a supplement file.

## New mechanics not already in the core file

### 1. Non-Standard Laboratory Routines — genuinely new, no core equivalent

Chapter Nine opens with sections (`The Standard Hermetic Laboratory`,
`Laboratory Equipment`, `Physical Arrangement`, `The Principles of Labwork`)
that are almost entirely flavor/restatement of what `md/08-laboratory/02-*`
already covers (500 sq ft, 10ft ceiling, 5 pounds, 2 seasons, Magic Theory 3
minimum). But one subsection, **Non-Standard Laboratory Routines**, is a
mechanic that doesn't exist anywhere in this repo's `md/08-laboratory/`: a
maga can choose to work off-hours for a Lab Total bonus that season, at a
cost. Routines stack unless noted, and (with one exception) can be freely
combined:

| Routine | Lab Total bonus | Cost |
|---|---|---|
| Early Riser (can't combine with Nocturnal) | +1 | Loses a Long-Term Fatigue level and +1 botch die every night |
| Nocturnal | +2 | –1 Living Conditions for any year it's used at least once; Fatigue/botch penalty every day |
| Addled | +3 | Needs a "vice" (drugs, faerie wine, self-cast spells); +1 Warping Point per 2 seasons, +3 botch dice that season, and a Stamina + vice-Personality-Trait roll to avoid worse penalties when stopping |
| Overtime (the three Overtime tiers are mutually exclusive with each other) | +3 | –1 Living Conditions/year used, +1 Warping per 4 seasons, –3 Wound Recovery, capped at Winded Fatigue, +1 botch die |
| Double Overtime | +6 | –2 Living Conditions + extra Aging roll/year used, +1 Warping per 2 seasons, –6 Wound Recovery, capped at Weary Fatigue, +2 botch dice |
| Triple Overtime | +9 | –3 Living Conditions, extra Aging roll *and* Warping Point every such season, –9 Wound Recovery, capped at Tired Fatigue, +3 botch dice, no rest days at all |

Working *fewer* than the standard 10 hours/day simply loses 10% of the
season's Lab/Advancement Total per hour short — no routine needed. This
whole section is a solid, self-contained, implementable ruleset that's
completely absent from the core repo.

### 2. A much wider Laboratory Virtues & Flaws list

The core file's own footnote ("The Covenants supplement includes a wider
range of Virtues and Flaws… expanding on those given here") is accurate:
Covenants' Chapter Nine has roughly **75 additional lab Virtues/Flaws**
beyond the ~53 already in `15-laboratory-personalization-rules.md`. The
category system, point costs (Major=3/Minor=1/Free=0), space-budget rule
(`Size + Refinement` ≥ Virtue points − Flaw points), and construction-time
rules (1 season/Minor, 2 seasons/Major) are all identical to the core
file — only the list of specific entries is longer. New entries, by
category (all figures are Characteristic/Specialization adjustments, same
shorthand as the core file: Cr/In/Mu/Pe/Re + An/Aq/Au/Co/He/Ig/Im/Me/Te/Vi):

**Structure — new Virtues**
| Name | Tier | Effect |
|---|---|---|
| Auspicious Shape | Minor | +1 Aesthetics, +1 Vi (lab shaped as hexagon/pentagram etc.) |
| Spacious | Minor | +2 Safety, +1 Aesthetics |
| Well Insulated | Minor | +1 Safety, +1 Aesthetics (quiet/soundproofed) |
| Defenses | Free | +1 Aesthetics |
| Elevated | Free | +1 Aesthetics, +1 Au (4+ floors up) |
| Grand Entrance | Free | +2 Aesthetics |
| Idyllic Surroundings | Free | +2 Health, +1 Aesthetics, 1pt terrain-appropriate Specialization |
| Mountaintop | Free | –1 Safety, +1 Upkeep, +2 Aesthetics, +2 Au |
| Studio | Free | +1 to +3 Aesthetics (display room for prized items) |

**Structure — new Flaws**
| Name | Tier | Effect |
|---|---|---|
| Disguised | Free | –1 Aesthetics |
| Exposed | Free | –1 Safety, +1 Upkeep, –2 Health, –1 Aesthetics, +1 Au |
| Uneven Floor | Free | –1 Safety, –1 Health, –1 Aesthetics, +1 Mu or Te |
| Vile Surroundings | Free | –2 Health, –1 Aesthetics, 1pt terrain-appropriate Specialization |
| Vulnerable | Free | –1 Aesthetics |
| Awkward Shape | Minor | –2 Safety, –1 Aesthetics |
| Diminutive | Minor | For normal-Size occupants: –1 General Quality, –2 Safety, –1 Health, –1 Aesthetics |
| Heinous Architecture | Minor | –1 General Quality, –2 Safety, +1 Warping, –2 Aesthetics |
| Poorly Insulated | Minor | –1 Safety, –1 Aesthetics |
| Outdoors | Major | Not housed in a building at all: –1 General Quality, +2 Upkeep, –1 Safety, –2 Health, –3 Aesthetics |

**Outfittings — new Virtues**
| Name | Tier | Effect |
|---|---|---|
| Palatial | Major | +1 General Quality, +3 Upkeep, +2 Health, +4 Aesthetics, +2 Teaching + 1pt any other Specialization |
| Excessive Heating | Minor | +2 Upkeep, –1 Safety, +2 Ig |
| Excessive Lighting | Minor | +2 Upkeep, +2 Im |
| Menagerie | Minor | +1 Upkeep, –1 Safety, –1 Aesthetics, +2 An |
| Opulent | Minor | +1 Upkeep, +1 Health, +2 Aesthetics, +1 Teaching |
| Pot Plants | Minor | +1 Upkeep, +1 Aesthetics, +1 He |
| Slaves | Minor | +1 Upkeep, –1 Safety, –1 Aesthetics, +2 Co or Me |
| Superior Decoration | Minor | +1 Upkeep, +2 Aesthetics, +1 Im |
| Superior Heating | Minor | +1 Upkeep, +1 Health, +1 Aesthetics, +1 Ig |
| Superior Lighting | Minor | +1 Upkeep, +1 Aesthetics, +1 Texts, +1 Im |
| Precious Ingredients | Free | +1 General Quality, +2 Upkeep, +1 Longevity Rituals |
| Priceless Ingredients | Free | +2 General Quality, +4 Upkeep, +2 Longevity Rituals |
| Superior Equipment | Free | +1 General Quality, +2 Upkeep, +1 Safety, +1 Vis Extraction (needs Craft 6+ craftsman if made in-house) |
| Superior Tools | Free | +1 Upkeep, +1 Safety, +1 Items (same craftsman requirement) |

**Outfittings — new Flaws**
| Name | Tier | Effect |
|---|---|---|
| Damp | Free | +1 Upkeep, –1 Health, –1 Aesthetics, +1 Aq |
| Decaying | Free | –1 General Quality, –1 Upkeep, –1 Safety, –1 Aesthetics, +2 Pe |
| Dirty | Free | –1 Health, –2 Aesthetics, +1 Pe |
| Gaudy | Free | +1 Upkeep, –1 Aesthetics, +1 Im |
| Inferior Equipment | Free | –1 General Quality, –1 Upkeep |
| Inferior Tools | Free | –1 Upkeep, –1 Safety |
| Infested | Free | –1 Safety, –1 Aesthetics, +1 An or He |
| Lousy Ingredients | Free | –1 General Quality, –1 Upkeep |
| Defective Heating | Minor | –1 General Quality, –1 Upkeep, –1 Health, –1 Aesthetics |
| Defective Lighting | Minor | –1 General Quality, –1 Upkeep, –1 Safety, –1 Aesthetics |
| Hovel | Major | –1 General Quality, –2 Upkeep, –2 Safety, –3 Health, –4 Aesthetics |

**Supernatural — new Virtues**
| Name | Tier | Effect |
|---|---|---|
| Greater Horde | Major | +2 General Quality, +1 Upkeep, +(creature Int) Safety, +2 Aesthetics, 2pt Re/Art Specialization |
| Gateway | Minor | –1 Safety, +1 Aesthetics, 1pt Re/Art Specialization (lab sits at a regio/faerie/Mercere-portal gateway) |
| Lesser Horde | Minor | +1 General Quality, +1 Upkeep, +1 Safety, +1 Aesthetics, 1pt Re/Art Specialization |
| Airborne | Free | +1 Upkeep, –2 Safety, +2 Warping, +1 Health, +4 Aesthetics, +1 Experimentation, +4 Au |
| Boundless | Free | +2 Warping; Size effectively unlimited |
| Faerie Ingredients | Free | +1 General Quality, –1 Upkeep, +1 Warping, +1 Experimentation, 1pt Specialization |
| Flawless Equipment | Free | +2 General Quality, +2 Upkeep (or –1 if supernaturally self-maintaining), +2 Vis Extraction |
| Flawless Tools | Free | +1 Upkeep (or –1 if supernaturally self-maintaining), +2 Items |
| Ice Cavern | Free | +1 Upkeep, +1 Warping, –2 Health (unless cold-immune), +2 Aesthetics, +2 Re or Te |
| Invisible | Free | +1 Warping, halve Aesthetics (after other mods), +2 Im |
| Magical Heating / Magical Lighting | Free | As Superior/Excessive Heating or Lighting, but no space/Upkeep cost |
| Preserved | Free | –1 Upkeep, +1 Warping, +2 Health, +1 Aesthetics, +1 Cr |
| Relocation | Free | +1 Warping if permanent, +1 Experimentation (lab can be magically relocated) |
| Sentient | Free | +1 Warping, +1 Experimentation, +1 Me |
| Shrouded | Free | +1 Warping, halve Aesthetics after other mods |
| Site of Legend | Free | Ad hoc Characteristic/Specialization adjustments per the legend |

**Supernatural — new Flaws**
| Name | Tier | Effect |
|---|---|---|
| Afire | Minor | +1 Upkeep, –3 Safety, +2 Warping, +2 Aesthetics, +1 Experimentation, +3 Ig; some activity categories impossible |
| Chaotic | Minor | –2 Safety, +1 Warping, +1 Experimentation, +2 Mu or Re |
| Cursed | Minor | Ad hoc penalties, usually to Safety |
| Degenerative | Minor | +2 Upkeep, –1 Safety, +1 Warping, –2 Health, –1 Aesthetics, +2 Pe |
| Gremlins | Minor | –3 Safety, +1 Warping, –1 Aesthetics, +1 Experimentation, 1pt Art Specialization |
| Labyrinth | Minor | –1 Safety, –1 Health, –2 Aesthetics, +2 Me or Vi |
| Lair | Minor | –1 Safety, +1 Warping, 1pt Art Specialization |
| Precarious\* (repeatable) | Minor | –1 Safety, 1pt Art Specialization, per instance |
| Sacrifices | Minor | +2 Upkeep, –1 Safety, +1 Warping, –1 Health, –3 Aesthetics, 2pt Technique/An Specialization |
| Thoroughfare | Minor | –1 Safety |
| Underwater | Minor | +2 Safety, +1 Warping, –2 Aesthetics, +1 Experimentation, +4 Aq; some activities impossible |
| Living | Minor | –2 Safety, +2 Warping, 3pt Art Specialization(s) |
| Mental Construct | Major | Whole lab is a mental construct (Cr Me Ritual); Size capped at caster's Intelligence; –5 Upkeep, +2 Warping, –2 Aesthetics, +3 Me; blocks familiar-bonding/item-enchanting/Longevity Rituals/teaching/(probably) vis extraction |

Two sidebars carry mechanics worth noting alongside the list:

- **Taking Over a Laboratory**: inheriting/moving into someone else's lab
  (Refinement > 0, not a transient spare lab) costs a season of
  "familiarization" — treated as a Refinement-increase season (same
  Highly Organized/Spotless/Hidden Defect roll chances), except the new
  Refinement is capped at `min(old Refinement, new owner's Magic Theory − 3)`.
  If that's lower than before, excess Virtues are lost. A secret
  Perception + Magic Theory roll (EF = 3× old Refinement) risks picking up
  the Predecessor Flaw (and Hidden Defect on a botch).
- **Moving a Laboratory**: packing takes a season, transit costs two years'
  worth of maintenance (breakage), and reassembly takes two more seasons —
  the deterrent to "just build a better lab" is these costs, not a hard rule
  against moving.

### 3. Laboratory Upkeep cost-saving via craftsmen (covenant finance)

Not in the core file at all (which just says "see Chapter 6: Covenants" for
non-zero-Upkeep build costs and stops there). Covenants' yearly-expenditure
rules let specific rare craftsmen — **glass-blower, goldsmith, silversmith,
lapidary, mechanic, toolmaker** — offset a covenant's total Laboratories
Upkeep expenditure, capped at 20% per craft: a common craftsman saves
`1 + floor(Craft/2)` pounds/year, a rare craftsman saves `Craft` pounds/year.
The base formula for total Laboratories cost itself (1 pound/year per 10
points of Upkeep across all labs) and the lab-construction cost (1 pound per
2 points of the lab) match what the core file already states almost
verbatim, so those two numbers are overlap, not new — only the
craftsman-cost-saving mechanic is new.

## Overlap — already fully covered by the core file, don't re-research

- **All eight Laboratory Characteristics** (Size, Refinement, General
  Quality, Upkeep, Safety, Warping, Health, Aesthetics), their formulas, and
  the worked Darius/Helvius/Lutisse examples — word-for-word the same
  mechanics as Covenants Chapter Nine (the core Definitive Edition file is
  clearly sourced from this chapter, lightly re-edited).
- **Laboratory Specializations** (2 activity + 4 Art, of which ≤2
  Techniques) — identical rules and identical list of activity types
  (Experimentation, Familiar, Items, Longevity Rituals, Spells, Teaching,
  Texts, Vis Extraction).
- **~53 Virtues/Flaws already in the core file** — same names, same point
  costs, same Characteristic/Specialization numbers as in Covenants (see the
  new-entries tables above for what's *not* duplicated).
- **Laboratory Features** (Altar, Forge, Desk, Summoning Circle, etc.) — the
  ~30-entry list and each Feature's associated Specializations are identical
  between the two texts.
- **Magic Items for Laboratories** — the "10 levels per Specialization
  point / 20 levels per Characteristic point" conversion rule, and the
  "duplicate an existing Virtue/Flaw vs. new arithmetic" branching logic,
  are identical. Covenants adds four illustrative example items (Bookstand
  of Hespera, Crown of Hermes, Prodigious Plant Pot, Tireless Servant) and
  three example lab-maintenance spells (Resolute Mind of the Tireless
  Researcher, Laboratory of Bonisagus, Gleam of the Freshly-Polished Glass,
  Ambulatory Laboratory) — flavor illustrations of the existing rule, not
  new mechanics, so not worth transcribing.
- **Build Point Cost for Starting Laboratories** (50 BP/spare lab, Size×20,
  10 BP/Minor Virtue, 20 BP/Major Virtue) — identical, down to the worked
  example numbers.
- **Assistants** — Covenants' own "Assistant" and "Familiar" lab-Virtue
  entries explicitly say they're "a restatement of the existing bonus given
  in ArM5" (the core rulebook's Help in the Laboratory rules, i.e.
  `md/08-laboratory/09-help-in-the-laboratory.md`, already in this repo).
  There is no additional Covenants-specific assistant mechanic to add — the
  only "new" thing is that a Gifted assistant can be purchased as a
  *structural* lab Virtue (a fixed General Quality bonus) rather than
  negotiated fresh each season, which is a bookkeeping convenience, not new
  math.
- **"Lab level"** — there's no separate numeric "level" stat for labs in
  either book; Size/Refinement/Upkeep (and their Build Point costs) are the
  whole system, and that system is already in the core file. The closest
  thing to a distinct "level" concept is the enchanted-item angle (a lab's
  physical size caps how large an item you can enchant in it — "even one
  factor of 10 makes an item too large to fit in a standard Hermetic
  laboratory"), but that's core `md/08-laboratory/04-enchantments.md`
  material, not something Covenants adds to.

I also checked Chapter Six (Vis Sources) and Chapter Seven (Library) for
lab-quality-adjacent material; neither has anything beyond what's already
captured by the existing Vis Source lab-Virtue and the Assistant/Servant
lab-Virtues. Library chapter content (book production, resonances,
librarian duties) doesn't feed into Lab Totals or lab Virtues/Flaws at all.

## Recommendation

There's enough distinct, clearly-sourced material to justify a
`data/seasons/covenants.yaml` — the Non-Standard Laboratory Routines system
in particular is a clean, closed-form set of `Lab Total` modifiers that fits
the existing `totals`/`activities` schema well (each routine is basically a
fixed-value term, similar to `{kind: fixed, value: N}`, with side-effects
that would need to stay in prose/`detail` per the "what's deliberately not
modelled" convention). The expanded Virtue/Flaw list is real but is *data
for the character sheet*, not new arithmetic — it would need a place to
live more than a new engine feature (the existing lab Virtue/Flaw modeling,
if any exists yet in `chargen`, should be checked before assuming this maps
cleanly).

The caveats: this is a single unverified fan transcription, the OCR quality
of the raw corpus is uneven (I used the "reviewed" cleaned copy, which
looked internally consistent and had no obvious garbling in the sections
read), and it's a straight 5th-edition Covenants text rather than anything
carrying a "Definitive Edition" imprint — a human should confirm licensing
and cross-check a sample of the numbers above against a physical/PDF copy
before committing them to a supplement file.
