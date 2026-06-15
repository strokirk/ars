// M1 domain tests: cost formulas, trait resolution, V&F + characteristics budgets,
// and the mutation accept/reject policy. Runs on the real data/*.json.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadRules } from "../src/data/load-node.ts";
import { artXp, abilityXp, charCost, affinityXp } from "../src/domain/costs.ts";
import { newCharacter } from "../src/domain/character.ts";
import { applyHouse } from "../src/domain/houses.ts";
import { computeBudgets } from "../src/domain/budgets.ts";
import { deriveModifiers, confidenceScore } from "../src/domain/modifiers.ts";
import { validate, isLegal } from "../src/domain/validate.ts";
import { addAbility, addSpell, addTrait, setArt, setCharacteristic, setConcept, setNativeLanguage } from "../src/domain/mutations.ts";
import { magusTitle } from "../src/cli/sheet.ts";
import { parseArgs } from "../src/cli/args.ts";
import { deriveModifiers as _dm } from "../src/domain/modifiers.ts";
import { spellLabTotal } from "../src/domain/labtotal.ts";
import type { Character } from "../src/domain/character.ts";

const rules = loadRules();

test("Art xp follows n(n+1)/2", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 10].map(artXp), [1, 3, 6, 10, 15, 21, 55]);
});

test("Ability xp follows 5·n(n+1)/2", () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(abilityXp), [5, 15, 30, 50, 75]);
});

test("Characteristic point cost is symmetric", () => {
  assert.deepEqual([1, 2, 3].map(charCost), [1, 3, 6]);
  assert.deepEqual([-1, -2, -3].map(charCost), [-1, -3, -6]);
  assert.equal(charCost(0), 0);
});

test("Affinity makes 55 raw xp reach Art 12", () => {
  // 55 real xp * 1.5 = 82.5 effective; Art 12 needs 78, Art 13 needs 91.
  assert.ok(affinityXp(artXp(12)) <= 55);
  assert.ok(affinityXp(artXp(13)) > 55);
});

test("resolveTrait: friendly Puissant/Affinity map to templates + param", () => {
  const p = rules.resolveTrait("Puissant Ignem");
  assert.ok(p.ok && p.trait.canonical === "Puissant Art" && p.trait.param === "Ignem");
  const a = rules.resolveTrait("Affinity with Ignem");
  assert.ok(a.ok && a.trait.canonical === "Affinity with Art" && a.trait.param === "Ignem");
});

test("resolveTrait: exact name carries size/category/points", () => {
  const r = rules.resolveTrait("Necessary Condition");
  assert.ok(r.ok);
  assert.equal(r.trait.size, "Major");
  assert.equal(r.trait.row.category, "Hermetic");
  assert.equal(r.trait.points, 3);
});

test("resolveTrait: unknown name errors", () => {
  const r = rules.resolveTrait("Definitely Not A Virtue");
  assert.equal(r.ok, false);
});

// Build a fresh Flambeau and apply the universal + house free benefits.
function freshMarcus(): Character {
  const ch = newCharacter({ name: "Marcus", house: "Flambeau", favoredTechnique: "Creo", favoredForm: "Ignem", focus: "fire" });
  for (const n of ["The Gift", "Hermetic Magus"]) {
    const r = rules.resolveTrait(n);
    if (r.ok) ch.virtues.push({ name: r.trait.canonical, display: r.trait.display, size: r.trait.size, category: r.trait.row.category, points: 0, free: true });
  }
  const app = applyHouse("Flambeau", { puissant: "Ignem" }, rules, { favoredTechnique: "Creo", favoredForm: "Ignem" });
  ch.virtues.push(...app.virtues);
  return ch;
}

test("new Flambeau grants free Puissant Ignem and the two universal Virtues", () => {
  const ch = freshMarcus();
  const free = ch.virtues.filter((v) => v.free).map((v) => v.display);
  assert.ok(free.includes("The Gift"));
  assert.ok(free.includes("Hermetic Magus"));
  assert.ok(free.includes("Puissant Ignem"));
  // Free benefits never count toward the balance.
  assert.equal(computeBudgets(ch).virtuesFlaws.virtuePoints, 0);
});

test("adding Puissant Ignem again is rejected (duplicates the free benefit)", () => {
  const ch = freshMarcus();
  const r = rules.resolveTrait("Puissant Ignem");
  assert.ok(r.ok);
  const res = addTrait(ch, "Virtue", r.trait);
  assert.equal(res.ok, false);
  assert.match(res.rejected ?? "", /free benefit/i);
});

test("characteristic overspend is rejected, within-budget is accepted", () => {
  let ch = freshMarcus();
  ch = setCharacteristic(ch, "Int", 3, false).character; // 6 pts
  const over = setCharacteristic(ch, "Com", 2, false);   // +3 -> 9 > 7
  assert.equal(over.ok, false);
  const ok = setCharacteristic(ch, "Sta", 1, false);     // 7 pts exactly
  assert.equal(ok.ok, true);
  assert.equal(computeBudgets(ok.character).characteristics.spent, 7);
});

test("a balanced 3=3 build passes stages 1-2 (no V&F or char errors)", () => {
  let ch = freshMarcus();
  // Order so the running total never transiently exceeds 7 (the tool rejects that).
  for (const [c, v] of [["Str", -1], ["Int", 3], ["Sta", 1], ["Per", 1]] as const) {
    const res = setCharacteristic(ch, c, v, false);
    assert.ok(res.ok, `set ${c} ${v}`);
    ch = res.character;
  }
  for (const name of ["Necessary Condition", "Affinity with Ignem", "Self-Confident", "Cautious Sorcerer"]) {
    const r = rules.resolveTrait(name);
    assert.ok(r.ok, `resolve ${name}`);
    ch = addTrait(ch, name === "Necessary Condition" ? "Flaw" : "Virtue", r.trait).character;
  }
  const b = computeBudgets(ch);
  assert.equal(b.characteristics.spent, 7);
  assert.equal(b.virtuesFlaws.balanced, true);
  assert.equal(b.virtuesFlaws.hermeticFlaws >= 1, true);
  // Stage 1-2 specific issues should be absent; later-stage errors still present.
  const issues = validate(ch);
  assert.equal(issues.some((i) => i.budget === "characteristics" && i.level === "error"), false);
  assert.equal(issues.some((i) => i.code === "vf-balance"), false);
  assert.equal(issues.some((i) => i.code === "need-herm-flaw"), false);
  assert.equal(isLegal(issues), false); // childhood/apprenticeship still incomplete
});

test("resolveAbility: exact, Latin alias, and Lore template", () => {
  const aw = rules.resolveAbility("Awareness");
  assert.ok(aw.ok && aw.ability.type === "General");
  const latin = rules.resolveAbility("Latin");
  assert.ok(latin.ok && latin.ability.type === "Academic" && latin.ability.name === "Latin");
  const lore = rules.resolveAbility("Order of Hermes Lore");
  assert.ok(lore.ok && lore.ability.type === "General" && lore.ability.baseName === "(Area) Lore");
});

test("childhood: General abilities count toward the 45-xp pool", () => {
  let ch = freshMarcus();
  ch = setNativeLanguage(ch, "German").character;
  ch = addAbility(ch, { name: "Awareness", type: "General", restricted: false }, 2, "childhood", "alertness").character;
  ch = addAbility(ch, { name: "Athletics", type: "General", restricted: false }, 2, "childhood", undefined).character;
  assert.equal(computeBudgets(ch).childhood.spent, 30); // 15 + 15
  assert.equal(computeBudgets(ch).childhood.nativeLanguageSet, true);
});

test("childhood: an Academic ability is rejected", () => {
  let ch = setNativeLanguage(freshMarcus(), "German").character;
  const res = addAbility(ch, { name: "Latin", type: "Academic", restricted: false }, 1, "childhood", undefined);
  assert.equal(res.ok, false);
  assert.match(res.rejected ?? "", /childhood/i);
});

test("childhood: an ability above the age-25 max (5) is rejected", () => {
  const ch = setNativeLanguage(freshMarcus(), "German").character;
  const res = addAbility(ch, { name: "Awareness", type: "General", restricted: false }, 6, "childhood", undefined);
  assert.equal(res.ok, false);
  assert.match(res.rejected ?? "", /maximum/i);
});

test("later-life: General ability fills the years×15 pool; Academic is rejected", () => {
  let ch = freshMarcus();
  ch = addAbility(ch, { name: "Charm", type: "General", restricted: false }, 3, "later-life", undefined).character;
  assert.equal(computeBudgets(ch).laterLife.spent, 30);
  assert.equal(computeBudgets(ch).laterLife.cap, 75);
  const academic = addAbility(ch, { name: "Latin", type: "Academic", restricted: false }, 1, "later-life", undefined);
  assert.equal(academic.ok, false);
});

test("later-life: an enabling Virtue (Warrior) permits a Martial ability", () => {
  let ch = freshMarcus();
  const w = rules.resolveTrait("Warrior");
  assert.ok(w.ok);
  ch = addTrait(ch, "Virtue", w.trait).character;
  const res = addAbility(ch, { name: "Single Weapon", type: "Martial", restricted: false }, 1, "later-life", undefined);
  assert.equal(res.ok, true);
});

test("apprenticeship: Affinity discounts Art xp (Ignem 10 costs 37, not 55)", () => {
  let ch = freshMarcus(); // Flambeau also gives free Puissant Ignem (no xp effect)
  const aff = rules.resolveTrait("Affinity with Ignem");
  assert.ok(aff.ok);
  ch = addTrait(ch, "Virtue", aff.trait).character;
  ch = setArt(ch, "Ignem", 10).character;
  ch = setArt(ch, "Creo", 6).character; // 21 xp, no affinity
  const ap = computeBudgets(ch).apprenticeship;
  assert.equal(ap.spent, 37 + 21);
});

test("apprenticeship: overspending the 240-xp pool is rejected", () => {
  let ch = freshMarcus();
  ch = setArt(ch, "Ignem", 20).character; // 210 xp
  const over = setArt(ch, "Creo", 10); // +55 -> 265 > 240
  assert.equal(over.ok, false);
});

// A fire mage with the Arts/Int/Magic-Theory needed for Lab Totals.
function fireMage(): Character {
  let ch = freshMarcus(); // free Puissant Ignem
  ch = setCharacteristic(ch, "Int", 3, false).character;
  ch = setNativeLanguage(ch, "German").character;
  ch = addAbility(ch, { name: "Magic Theory", type: "Arcane", restricted: true }, 3, "apprenticeship", undefined).character;
  ch = setArt(ch, "Ignem", 10).character;
  ch = setArt(ch, "Creo", 6).character;
  return ch;
}

test("spellLabTotal: Cr6 + Ig10 + Int3 + MT3 + aura3 + Puissant3 = 28", () => {
  const ch = fireMage();
  const lt = spellLabTotal(ch, _dm(ch), { technique: "Creo", form: "Ignem", requisites: [] });
  assert.equal(lt.total, 28);
});

test("spellLabTotal: a requisite drags the total to the lowest applicable Art", () => {
  const ch = fireMage(); // Terram is 0
  const lt = spellLabTotal(ch, _dm(ch), { technique: "Creo", form: "Ignem", requisites: ["Terram"] });
  // lowest Form is Terram(0); total = Creo6 + Terram0 + Int3 + MT3 + aura3 = 15 (no Puissant: Ignem not used)
  assert.equal(lt.total, 15);
});

test("addSpell: within Lab Total accepted, over rejected", () => {
  const ch = fireMage();
  const pilum = rules.spell("Pilum of Fire");
  assert.ok(pilum && pilum.level === 20);
  const ok = addSpell(ch, pilum!);
  assert.equal(ok.ok, true);
  const big = rules.spell("Ball of Abysmal Flame");
  assert.ok(big && (big.level ?? 0) > 28);
  const over = addSpell(ch, big!);
  assert.equal(over.ok, false);
  assert.match(over.rejected ?? "", /Lab Total/i);
});

test("Affinity with Ignem is detected as a modifier", () => {
  const ch = freshMarcus();
  const r = rules.resolveTrait("Affinity with Ignem");
  assert.ok(r.ok);
  const ch2 = addTrait(ch, "Virtue", r.trait).character;
  assert.ok(deriveModifiers(ch2).affinityArt.has("Ignem"));
});

// ── regression tests for the agent-feedback fixes ──────────────────────────────

test("Self-Confident sets Confidence Score 2 with 5 points (was stuck at default 1)", () => {
  const base = freshMarcus();
  assert.deepEqual(confidenceScore(base), { score: 1, points: 3 });
  const sc = rules.resolveTrait("Self-Confident");
  assert.ok(sc.ok);
  const ch = addTrait(base, "Virtue", sc.trait).character;
  assert.deepEqual(confidenceScore(ch), { score: 2, points: 5 });
});

test("setNativeLanguage rejects Latin (a Dead Language) but accepts a vernacular", () => {
  const ch = freshMarcus();
  const bad = setNativeLanguage(ch, "Latin");
  assert.equal(bad.ok, false);
  assert.match(bad.rejected ?? "", /Dead Language/i);
  assert.equal(setNativeLanguage(ch, "Latin", true).ok, true); // --force overrides
  assert.equal(setNativeLanguage(ch, "German").ok, true);
});

test("setConcept updates the concept field", () => {
  const r = setConcept(freshMarcus(), "scheming earth-shaper");
  assert.ok(r.ok);
  assert.equal(r.character.concept, "scheming earth-shaper");
});

test("magusTitle does not duplicate the House when the name already carries it", () => {
  assert.equal(magusTitle({ name: "Corvus of Tytalus", house: "Tytalus" } as Character), "Corvus of Tytalus");
  assert.equal(magusTitle({ name: "Marcus", house: "Flambeau" } as Character), "Marcus of House Flambeau");
});

test("parseArgs: --describe consumes its value (was a boolean flag, breaking lookups)", () => {
  const { positionals, flags } = parseArgs(["options", "virtues", "--describe", "Affinity with Art"]);
  assert.equal(flags.describe, "Affinity with Art");
  assert.deepEqual(positionals, ["options", "virtues"]);
});

test("Puissant Magic Theory adds +2 to the Lab Total (was ignored)", () => {
  let ch = newCharacter({ name: "Konst", house: "Bonisagus" });
  // Free Bonisagus-style benefit: Puissant Magic Theory.
  const p = rules.resolveTrait("Puissant Magic Theory");
  assert.ok(p.ok && p.trait.canonical === "Puissant Ability" && p.trait.param === "Magic Theory");
  ch.virtues.push({ name: p.trait.canonical, display: p.trait.display, param: p.trait.param, size: p.trait.size, category: p.trait.row.category, points: 0, free: true });
  ch = setCharacteristic(ch, "Int", 3, false).character;
  ch = addAbility(ch, { name: "Magic Theory", type: "Arcane", restricted: true }, 3, "apprenticeship", undefined).character;
  ch = setArt(ch, "Intellego", 5).character;
  ch = setArt(ch, "Vim", 5).character;
  // InVi: Int3 + Vi5 + In5 + (MT3 + Puissant2) + aura3 = 21
  const lt = spellLabTotal(ch, deriveModifiers(ch), { technique: "Intellego", form: "Vim", requisites: [] });
  assert.equal(lt.magicTheory, 5);
  assert.equal(lt.total, 21);
});

test("data: Creo Terram and Creo Mentem spells are extracted (were silently dropped)", () => {
  assert.ok(rules.spell("Wall of Protecting Stone"), "Creo Terram spell present");
  assert.ok(rules.spell("Gift of Reason"), "Creo Mentem spell present");
  const wall = rules.spell("Conjuring the Mystic Tower");
  assert.ok(wall && wall.technique === "Creo" && wall.form === "Terram");
});
