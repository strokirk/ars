// Grog & companion character-type rules: the kind-aware budgets and validation added
// alongside the magus engine. Builds through the same applyOps path the web app uses.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadRules } from "../src/data/load-node.ts";
import { createGrog, createCompanion } from "../src/domain/create.ts";
import { applyOps, type Op } from "../src/domain/operations.ts";
import { computeBudgets } from "../src/domain/budgets.ts";
import { validate, isLegal } from "../src/domain/validate.ts";

const rules = loadRules();
const codes = (ch: Parameters<typeof validate>[0]) => new Set(validate(ch).map((i) => i.code));
// First trait in a category that needs no parameter and has a concrete size — so a
// bare `{op:"virtue"|"flaw", name}` resolves and actually lands.
const pickSimple = (f: Parameters<typeof rules.filterVirtuesFlaws>[0]) =>
  rules.filterVirtuesFlaws(f).find((v) => !rules.paramKind(v.name) && v.size !== "Major or Minor")!;
const build = (kind: "grog" | "companion", ops: Op[]) => {
  const base = (kind === "grog" ? createGrog : createCompanion)({ name: "Test" }).character;
  return applyOps(base, ops, rules, { force: true }).character;
};

// Seven points of Characteristics + a Native Language + a Social Status is the minimum
// legal skeleton shared by grogs and companions (childhood/later-life under-spend is
// only advisory, never blocking).
const SKELETON: Op[] = [
  { op: "chars", values: { Str: 2, Sta: 1, Dex: 1, Per: 1, Com: 1 } },
  { op: "native-language", value: "German" },
  { op: "virtue", name: "Covenfolk" },
];

test("a minimal grog (7 Characteristics + Native Language + Social Status) is legal", () => {
  const ch = build("grog", SKELETON);
  assert.equal(ch.kind, "grog");
  assert.deepEqual(validate(ch).filter((i) => i.level === "error"), [], "no blocking errors");
  assert.ok(isLegal(validate(ch)));
});

test("grog without a Social Status is flagged", () => {
  const ch = build("grog", [
    { op: "chars", values: { Str: 2, Sta: 1, Dex: 1, Per: 1, Com: 1 } },
    { op: "native-language", value: "German" },
  ]);
  assert.ok(codes(ch).has("social-status"));
});

test("grog may not take The Gift, Major V/F, or Story Flaws", () => {
  const gifted = build("grog", [...SKELETON, { op: "virtue", name: "The Gift" }]);
  assert.ok(codes(gifted).has("gift-forbidden"), "The Gift forbidden");

  const major = build("grog", [...SKELETON, { op: "virtue", name: "Wealthy" }]);
  assert.ok(codes(major).has("major-forbidden"), "Major Virtue forbidden");

  // A Story Flaw (find any) must trip story-forbidden for a grog.
  const story = pickSimple({ kind: "Flaw", category: "Story" });
  const withStory = build("grog", [...SKELETON, { op: "flaw", name: story.name }]);
  assert.ok(codes(withStory).has("story-forbidden"), `Story Flaw "${story.name}" forbidden`);
});

test("grog Flaw points are capped at 3", () => {
  // Four 1-point Minor Flaws = 4 points, over the grog limit of 3.
  const minorFlaws = rules
    .filterVirtuesFlaws({ kind: "Flaw", size: "Minor", category: "Personality" })
    .filter((f) => !rules.paramKind(f.name) && f.size === "Minor")
    .slice(0, 4);
  const ops: Op[] = [...SKELETON, ...minorFlaws.map((f) => ({ op: "flaw", name: f.name }) as Op)];
  const ch = build("grog", ops);
  assert.equal(computeBudgets(ch).virtuesFlaws.cap, 3);
  assert.ok(codes(ch).has("flaw-cap"));
});

test("a minimal companion is legal and its Flaw cap is 10", () => {
  const ch = build("companion", SKELETON);
  assert.equal(ch.kind, "companion");
  assert.equal(computeBudgets(ch).virtuesFlaws.cap, 10);
  assert.ok(isLegal(validate(ch)));
});

test("a non-Gifted companion may not take Hermetic Virtues", () => {
  const herm = pickSimple({ kind: "Virtue", category: "Hermetic", size: "Minor" });
  const ch = build("companion", [...SKELETON, { op: "virtue", name: herm.name }]);
  assert.ok(codes(ch).has("hermetic-forbidden"), `Hermetic Virtue "${herm.name}" forbidden without The Gift`);
});

test("companion does NOT require The Gift, Hermetic Magus, a Hermetic Flaw, or apprenticeship minimums", () => {
  const set = codes(build("companion", SKELETON));
  for (const c of ["missing-free", "need-herm-flaw", "min-parma", "min-magic-theory", "min-latin", "appr-under"]) {
    assert.ok(!set.has(c), `companion should not report ${c}`);
  }
});

test("Wealthy raises a companion's later-life xp rate to 20/year", () => {
  const ch = build("companion", [...SKELETON, { op: "virtue", name: "Wealthy" }]);
  // 5 default later-life years × 20 = 100 (vs the normal 75).
  assert.equal(computeBudgets(ch).laterLife.cap, ch.laterLifeYears * 20);
});
