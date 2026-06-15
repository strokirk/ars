// Batch path tests: applyOps accept/reject semantics, the order-safe chars map,
// the one-shot build spec, notes, meta, and the HTML sheet. These cover the
// LLM-facing surface added on top of the M1–M5 domain.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadRules } from "../src/data/load-node.ts";
import { createMagus } from "../src/domain/create.ts";
import { applyOps, type Op } from "../src/domain/operations.ts";
import { setNotes, setMeta } from "../src/domain/mutations.ts";
import { validate, isLegal } from "../src/domain/validate.ts";
import { computeBudgets } from "../src/domain/budgets.ts";
import { specToBuild, type BuildSpec } from "../src/cli/spec.ts";
import { renderSheetHtml } from "../src/cli/sheet-html.ts";

const rules = loadRules();
const fresh = () => createMagus({ name: "Marcus", house: "Flambeau", favoredTechnique: "Creo", favoredForm: "Ignem", focus: "fire", puissant: "Ignem" }, rules).character;

test("applyOps: a legal batch applies all ops and saves", () => {
  const r = applyOps(fresh(), [
    { op: "chars", values: { Int: 3, Sta: 1, Per: 1, Str: -1 } },
    { op: "virtue", name: "Affinity with Ignem" },
    { op: "flaw", name: "Necessary Condition" },
  ], rules);
  assert.equal(r.saved, true);
  assert.equal(r.results.every((x) => x.ok), true);
  assert.equal(computeBudgets(r.character).characteristics.spent, 7);
});

test("applyOps: chars map is order-safe (transient overflow is not rejected)", () => {
  // Int+3 (6) then Per+1 (7) then Com+1 (8, transient) then Str−1 → net 7.
  const r = applyOps(fresh(), [{ op: "chars", values: { Int: 3, Per: 1, Com: 1, Str: -1 } }], rules);
  assert.equal(r.saved, true);
  assert.equal(computeBudgets(r.character).characteristics.spent, 7);
});

test("applyOps: a chars map that truly overspends is rejected (not saved)", () => {
  const r = applyOps(fresh(), [{ op: "chars", values: { Int: 3, Sta: 3 } }], rules); // 12 > 7
  assert.equal(r.saved, false);
  assert.match(r.results[0]!.rejected ?? "", /overspent/i);
});

test("applyOps: reports every rejection together and saves nothing", () => {
  const r = applyOps(fresh(), [
    { op: "virtue", name: "Affinity with Ignem" },           // ok
    { op: "virtue", name: "Definitely Not A Virtue" },        // unknown
    { op: "ability", name: "Awareness", score: 2, stage: "nope" }, // bad stage
  ], rules);
  assert.equal(r.saved, false);
  assert.equal(r.results[0]!.ok, true);
  assert.equal(r.results[1]!.ok, false);
  assert.equal(r.results[2]!.ok, false);
  assert.match(r.results[2]!.rejected ?? "", /stage/i);
});

test("applyOps: --force overrides a cap violation and saves", () => {
  const forced = applyOps(fresh(), [{ op: "chars", values: { Int: 3, Sta: 3 } }], rules, { force: true });
  assert.equal(forced.saved, true);
});

const MARCUS_SPEC: BuildSpec = {
  name: "Marcus", house: "Flambeau", concept: "vengeful fire mage",
  favoredTechnique: "Creo", favoredForm: "Ignem", focus: "fire", puissant: "Ignem",
  notes: "## Goals\n- Avenge his master",
  characteristics: { Int: 3, Sta: 1, Per: 1, Str: -1 },
  virtues: ["Affinity with Ignem", "Self-Confident", "Cautious Sorcerer"],
  flaws: ["Necessary Condition"],
  nativeLanguage: "German",
  abilities: [
    { name: "Awareness", score: 2, stage: "childhood", specialty: "alertness" },
    { name: "Athletics", score: 2, stage: "childhood" },
    { name: "Brawl", score: 1, stage: "childhood" },
    { name: "Stealth", score: 1, stage: "childhood" },
    { name: "Swim", score: 1, stage: "childhood" },
    { name: "Charm", score: 3, stage: "later-life" },
    { name: "Folk Ken", score: 2, stage: "later-life" },
    { name: "Guile", score: 2, stage: "later-life" },
    { name: "Bargain", score: 2, stage: "later-life" },
    { name: "Latin", score: 4, stage: "apprenticeship", type: "Academic" },
    { name: "Magic Theory", score: 3, stage: "apprenticeship", type: "Arcane" },
    { name: "Parma Magica", score: 1, stage: "apprenticeship", type: "Arcane" },
    { name: "Artes Liberales", score: 1, stage: "apprenticeship", type: "Academic" },
    { name: "Penetration", score: 3, stage: "apprenticeship", type: "Arcane" },
    { name: "Concentration", score: 2, stage: "apprenticeship" },
  ],
  arts: { Ignem: 10, Creo: 6, Rego: 4, Vim: 4 },
  spells: ["Pilum of Fire", "Palm of Flame", "Heat of the Searing Forge"],
};

test("build: a full spec produces a legal magus in one shot", () => {
  const { opts, ops } = specToBuild(MARCUS_SPEC);
  const created = createMagus(opts, rules);
  const r = applyOps(created.character, ops, rules);
  assert.equal(r.saved, true, JSON.stringify(r.results.filter((x) => !x.ok), null, 2));
  assert.equal(isLegal(validate(r.character)), true);
  assert.equal(r.character.notes.includes("Avenge his master"), true);
  assert.equal(r.character.concept, "vengeful fire mage");
});

test("setNotes: set then append concatenates with a blank line", () => {
  let ch = fresh();
  ch = setNotes(ch, "First.").character;
  ch = setNotes(ch, "Second.", "append").character;
  assert.equal(ch.notes, "First.\n\nSecond.");
  ch = setNotes(ch, "Reset.").character;
  assert.equal(ch.notes, "Reset.");
});

test("setMeta: sets multiple scalar fields; rejects sub-Gauntlet age", () => {
  const ch = fresh();
  const ok = setMeta(ch, { concept: "x", age: 35, confidence: 2 });
  assert.equal(ok.ok, true);
  assert.equal(ok.character.age, 35);
  assert.equal(ok.character.confidence, 2);
  const bad = setMeta(ch, { age: 20 });
  assert.equal(bad.ok, false);
  assert.match(bad.rejected ?? "", /Gauntlet/i);
});

test("renderSheetHtml: includes sections, escapes HTML, renders notes markdown", () => {
  const { opts, ops } = specToBuild({ ...MARCUS_SPEC, notes: "## Plan\n- step <one> & **two**" });
  const ch = applyOps(createMagus(opts, rules).character, ops, rules).character;
  const html = renderSheetHtml(ch);
  assert.match(html, /<!doctype html>/i);
  for (const s of ["Characteristics", "Virtues", "Arts", "Spells Known", "Notes"]) assert.ok(html.includes(s), `missing ${s}`);
  assert.ok(html.includes("Pilum of Fire"));
  assert.ok(html.includes("<strong>two</strong>"), "bold notes rendered");
  assert.ok(html.includes("&lt;one&gt;"), "angle brackets escaped");
  assert.ok(!html.includes("<one>"), "raw tag not leaked");
});
