// Golden end-to-end build: drives the full Marcus character through the public
// domain mutations (what the CLI commands call) and asserts the result is legal
// and exports the expected sheet. Mirrors the mock transcript in the plan.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadRules } from "../src/data/rules.ts";
import { newCharacter, type Character } from "../src/domain/character.ts";
import { applyHouse } from "../src/domain/houses.ts";
import {
  addAbility, addSpell, addTrait, setArt, setCharacteristic, setNativeLanguage,
  type MutationResult,
} from "../src/domain/mutations.ts";
import { validate, isLegal } from "../src/domain/validate.ts";
import { renderSheet } from "../src/cli/sheet.ts";
import type { Stage } from "../src/domain/glossary.ts";

const rules = loadRules();

function step(prev: Character, result: MutationResult): Character {
  assert.ok(result.ok, `step rejected: ${result.rejected}`);
  return result.character;
}

function trait(ch: Character, kind: "Virtue" | "Flaw", name: string): Character {
  const r = rules.resolveTrait(name);
  assert.ok(r.ok, `resolve ${name}`);
  return step(ch, addTrait(ch, kind, r.trait));
}
function ability(ch: Character, name: string, score: number, stage: Stage, type: string): Character {
  const r = rules.resolveAbility(name, type);
  assert.ok(r.ok, `resolve ability ${name}`);
  return step(ch, addAbility(ch, r.ability, score, stage, undefined));
}
function spell(ch: Character, name: string): Character {
  const s = rules.spell(name);
  assert.ok(s, `spell ${name}`);
  return step(ch, addSpell(ch, s!));
}

test("full Marcus build is legal and exports a complete sheet", () => {
  let ch = newCharacter({ name: "Marcus", house: "Flambeau", concept: "vengeful fire mage", favoredTechnique: "Creo", favoredForm: "Ignem", focus: "fire" });
  for (const n of ["The Gift", "Hermetic Magus"]) {
    const r = rules.resolveTrait(n);
    if (r.ok) ch.virtues.push({ name: r.trait.canonical, display: r.trait.display, size: r.trait.size, category: r.trait.row.category, points: 0, free: true });
  }
  ch.virtues.push(...applyHouse("Flambeau", { puissant: "Ignem" }, rules, { favoredTechnique: "Creo", favoredForm: "Ignem" }).virtues);

  // Stage 1: Characteristics (ordered to never transiently exceed 7).
  for (const [c, v] of [["Str", -1], ["Int", 3], ["Sta", 1], ["Per", 1]] as const) ch = step(ch, setCharacteristic(ch, c, v));

  // Stage 2: Virtues & Flaws (balanced 3 = 3, ≥1 Hermetic Flaw).
  ch = trait(ch, "Flaw", "Necessary Condition");        // Major Hermetic = 3
  ch = trait(ch, "Virtue", "Affinity with Ignem");      // Minor = 1
  ch = trait(ch, "Virtue", "Self-Confident");           // Minor = 1
  ch = trait(ch, "Virtue", "Cautious Sorcerer");        // Minor = 1

  // Stage 3: Childhood (Native Language 5 + 45 xp).
  ch = step(ch, setNativeLanguage(ch, "German"));
  ch = ability(ch, "Awareness", 2, "childhood", "General");
  ch = ability(ch, "Athletics", 2, "childhood", "General");
  ch = ability(ch, "Brawl", 1, "childhood", "General");
  ch = ability(ch, "Stealth", 1, "childhood", "General");
  ch = ability(ch, "Swim", 1, "childhood", "General");

  // Stage 4: Later life (75 xp, General only).
  ch = ability(ch, "Charm", 3, "later-life", "General");
  ch = ability(ch, "Folk Ken", 2, "later-life", "General");
  ch = ability(ch, "Guile", 2, "later-life", "General");
  ch = ability(ch, "Bargain", 2, "later-life", "General");

  // Stage 5: Apprenticeship — Abilities, Arts, Spells.
  ch = ability(ch, "Latin", 4, "apprenticeship", "Academic");
  ch = ability(ch, "Magic Theory", 3, "apprenticeship", "Arcane");
  ch = ability(ch, "Parma Magica", 1, "apprenticeship", "Arcane");
  ch = ability(ch, "Artes Liberales", 1, "apprenticeship", "Academic");
  ch = ability(ch, "Penetration", 3, "apprenticeship", "Arcane");
  ch = ability(ch, "Concentration", 2, "apprenticeship", "General");
  ch = step(ch, setArt(ch, "Ignem", 10));
  ch = step(ch, setArt(ch, "Creo", 6));
  ch = step(ch, setArt(ch, "Rego", 4));
  ch = step(ch, setArt(ch, "Vim", 4));
  ch = spell(ch, "Pilum of Fire");
  ch = spell(ch, "Palm of Flame");
  ch = spell(ch, "Heat of the Searing Forge");

  const issues = validate(ch);
  const errors = issues.filter((i) => i.level === "error");
  assert.deepEqual(errors, [], `unexpected errors: ${JSON.stringify(errors, null, 2)}`);
  assert.equal(isLegal(issues), true);

  const sheet = renderSheet(ch);
  for (const section of ["# Marcus of House Flambeau", "## Characteristics", "## Virtues & Flaws", "## Arts", "## Spells Known"]) {
    assert.ok(sheet.includes(section), `sheet missing ${section}`);
  }
  assert.ok(sheet.includes("Pilum of Fire (CrIg 20)"));
  assert.ok(sheet.includes("Native Language: German 5"));
});
