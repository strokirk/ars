// The Markdown importer (sheet-import.ts) should round-trip exactly what
// renderSheet() exports: render → parse → render again must reproduce the same
// text, for a magus, a companion, and a grog (the three kinds the sheet varies on).
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadRules } from "../src/data/load-node.ts";
import { abilityXp } from "../src/domain/costs.ts";
import { newCharacter, type Character } from "../src/domain/character.ts";
import { applyHouse } from "../src/domain/houses.ts";
import {
  addAbility, addSpell, addTrait, addPersonality, setArt, setCharacteristic,
  setNativeLanguage, setNotes, setMeta, type MutationResult,
} from "../src/domain/mutations.ts";
import { renderSheet } from "../src/cli/sheet.ts";
import { parseSheetMarkdown } from "../src/cli/sheet-import.ts";
import type { Stage } from "../src/domain/glossary.ts";

const rules = loadRules();

function step(prev: Character, result: MutationResult): Character {
  assert.ok(result.ok, `step rejected: ${result.rejected}`);
  return result.character;
}
function trait(ch: Character, kind: "Virtue" | "Flaw", name: string, param?: string): Character {
  const r = rules.resolveTrait(name, param);
  assert.ok(r.ok, `resolve ${name}: ${!r.ok && r.error}`);
  return step(ch, addTrait(ch, kind, r.trait));
}
function ability(ch: Character, name: string, score: number, stage: Stage, type: string, specialty?: string): Character {
  const r = rules.resolveAbility(name, type);
  assert.ok(r.ok, `resolve ability ${name}`);
  return step(ch, addAbility(ch, r.ability, abilityXp(score), stage, specialty));
}
function spell(ch: Character, name: string): Character {
  const s = rules.spell(name);
  assert.ok(s, `spell ${name}`);
  return step(ch, addSpell(ch, s!));
}

/** render → parse → render again must be byte-identical, and free of warnings. */
function assertRoundTrips(ch: Character) {
  const before = renderSheet(ch);
  const { character: reimported, warnings } = parseSheetMarkdown(before, rules);
  assert.deepEqual(warnings, []);
  const after = renderSheet(reimported);
  assert.equal(after, before);
}

test("a full magus (House benefit, Puissant, a parameterized Focus, all four Ability stages, Arts, spells, personality) round-trips", () => {
  let ch = newCharacter({ name: "Marcus", house: "Flambeau", concept: "vengeful fire mage" });
  for (const n of ["The Gift", "Hermetic Magus"]) {
    const r = rules.resolveTrait(n);
    if (r.ok) ch.virtues.push({ name: r.trait.canonical, display: r.trait.display, param: r.trait.param, size: r.trait.size, category: r.trait.row.category, points: 0, free: true });
  }
  ch.virtues.push(...applyHouse("Flambeau", { puissant: "Ignem" }, rules).virtues);

  for (const [c, v] of [["Str", -1], ["Int", 3], ["Sta", 1], ["Per", 1]] as const) ch = step(ch, setCharacteristic(ch, c, v));

  ch = trait(ch, "Flaw", "Necessary Condition");
  ch = trait(ch, "Virtue", "Affinity with Ignem");
  ch = trait(ch, "Virtue", "Self-Confident");
  // Exercises the "Name (param)" display form (friendlyName doesn't special-case
  // Magical Focus the way it does Puissant/Affinity/Deficient).
  ch = trait(ch, "Virtue", "Minor Magical Focus", "fire");

  ch = step(ch, setNativeLanguage(ch, "German"));
  ch = ability(ch, "Awareness", 2, "childhood", "General", "alertness");
  ch = ability(ch, "Athletics", 2, "childhood", "General");

  ch = ability(ch, "Charm", 3, "later-life", "General");
  ch = ability(ch, "Folk Ken", 2, "later-life", "General");
  ch = ability(ch, "Athletics", 1, "later-life", "General"); // a second stage's xp on the same Ability
  assert.match(renderSheet(ch), /^- Athletics 2 · childhood 15 xp, later-life 5 xp$/m);

  ch = ability(ch, "Latin", 4, "apprenticeship", "Academic");
  ch = ability(ch, "Magic Theory", 3, "apprenticeship", "Arcane");
  ch = ability(ch, "Parma Magica", 1, "apprenticeship", "Arcane");
  ch = step(ch, setArt(ch, "Ignem", 10));
  ch = step(ch, setArt(ch, "Creo", 6));
  ch = spell(ch, "Pilum of Fire");
  ch = spell(ch, "Palm of Flame");

  ch = step(ch, addPersonality(ch, "Brave", 3));
  ch = step(ch, addPersonality(ch, "Proud", -1));
  ch = step(ch, setMeta(ch, { reputation: "Fire-mad", confidence: 2, laterLifeYears: 7 }));
  ch = step(ch, setNotes(ch, "## Goals\n- Avenge his master"));

  assertRoundTrips(ch);
});

test("a nameless magus still separates the House from the (empty) name", () => {
  const ch = newCharacter({ name: "", house: "Flambeau" });
  ch.virtues.push(...applyHouse("Flambeau", { puissant: "Ignem" }, rules).virtues);

  const before = renderSheet(ch);
  assert.ok(before.startsWith("#  of House Flambeau\n"));
  const { character: reimported, warnings } = parseSheetMarkdown(before, rules);
  assert.deepEqual(warnings, []);
  assert.equal(reimported.name, "");
  assert.equal(reimported.house, "Flambeau");
  assert.equal(renderSheet(reimported), before);
});

test("a companion (no House/Arts, but Confidence) round-trips, and is inferred as a companion", () => {
  let ch = newCharacter({ name: "Otto", kind: "companion", concept: "a hedge knight" });
  ch = trait(ch, "Virtue", "Covenfolk");
  ch = trait(ch, "Flaw", "Poor");
  ch = step(ch, setNativeLanguage(ch, "French"));
  ch = ability(ch, "Single Weapon", 3, "later-life", "Martial");
  ch = step(ch, addPersonality(ch, "Loyal", 3));

  const before = renderSheet(ch);
  const { character: reimported, warnings } = parseSheetMarkdown(before, rules);
  assert.deepEqual(warnings, []);
  assert.equal(reimported.kind, "companion");
  assert.equal(renderSheet(reimported), before);
});

test("a grog (no Confidence) round-trips, and is inferred as a grog", () => {
  let ch = newCharacter({ name: "Wilhelm", kind: "grog", concept: "a covenant turb sergeant" });
  ch = trait(ch, "Virtue", "Covenfolk");
  ch = step(ch, setNativeLanguage(ch, "German"));
  ch = ability(ch, "Brawl", 2, "childhood", "General");
  ch = ability(ch, "Single Weapon", 3, "later-life", "Martial");
  ch = step(ch, addPersonality(ch, "Loyal", 3));
  ch = step(ch, addPersonality(ch, "Brave", 3));

  const before = renderSheet(ch);
  const { character: reimported, warnings } = parseSheetMarkdown(before, rules);
  assert.deepEqual(warnings, []);
  assert.equal(reimported.kind, "grog");
  assert.equal(renderSheet(reimported), before);
});

test("the explicit **Type:** line wins over shape-based inference, and older exports still infer", () => {
  const ch = newCharacter({ name: "Otto", kind: "companion" });
  const md = renderSheet(ch);
  assert.match(md, /^\*\*Type:\*\* Companion$/m);
  // A hand-edited sheet that dropped Confidence would otherwise read as a grog.
  const edited = md.replace(" / Confidence", "");
  assert.equal(parseSheetMarkdown(edited, rules).character.kind, "companion");
  assert.equal(parseSheetMarkdown(md.replace(/^\*\*Type:\*\*.*\n/m, ""), rules).character.kind, "companion");
});

test("an older export (one line per stage, a score per entry) imports as xp with the same scores", () => {
  const md = renderSheet(newCharacter({ name: "Otto", kind: "companion" }))
    .replace(/## Abilities\n—/, "## Abilities\nChildhood: Athletics 2 (running), Awareness 1\nLater life: Charm 3");
  const { character, warnings } = parseSheetMarkdown(md, rules);
  assert.deepEqual(warnings, []);
  assert.deepEqual(character.abilities.map((a) => [a.name, a.xp, a.stage, a.specialty]), [
    ["Athletics", 15, "childhood", "running"], ["Awareness", 5, "childhood", undefined], ["Charm", 30, "later-life", undefined],
  ]);
});
