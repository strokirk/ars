import { describe, expect, test } from "vitest";
import { isTraitSelectable, hasGift } from "../src/lib/eligibility.ts";
import { rules } from "../src/rules.ts";
import { apply } from "../src/engine.ts";
import { createGrog, createCompanion, createMagus } from "../../chargen/src/domain/create.ts";
import type { VirtueFlawRow } from "../../chargen/src/data/types.ts";

const grog = createGrog({ name: "Otto" }).character;
const companion = createCompanion({ name: "Aldous" }).character;
const magus = createMagus({ name: "Marcus", house: "Bonisagus" }, rules).character;
const row = (name: string): VirtueFlawRow => {
  const r = rules.virtueFlawRow(name);
  if (!r) throw new Error(`no such trait in the rules data: ${name}`);
  return r;
};

describe("isTraitSelectable", () => {
  test("grogs are Minor-only and take no Story Flaws", () => {
    const major = rules.virtuesFlaws.find((r) => r.size === "Major" && r.category !== "Hermetic")!;
    expect(isTraitSelectable(major, grog)).toBe(false);
    const story = rules.virtuesFlaws.find((r) => r.category === "Story")!;
    expect(isTraitSelectable(story, grog)).toBe(false);
  });

  test("grogs never take The Gift; companions may; magi already have it", () => {
    expect(isTraitSelectable(row("The Gift"), grog)).toBe(false);
    expect(isTraitSelectable(row("The Gift"), companion)).toBe(true);
    expect(isTraitSelectable(row("The Gift"), magus)).toBe(false);
  });

  test("Hermetic traits need The Gift for non-magi", () => {
    const hermetic = rules.virtuesFlaws.find((r) => r.category === "Hermetic")!;
    expect(isTraitSelectable(hermetic, companion)).toBe(false);
    const gifted = apply(companion, [{ op: "virtue", name: "The Gift" }]);
    expect(isTraitSelectable(hermetic, gifted)).toBe(true);
  });

  test("magi get Hermetic traits without an explicit Gift check", () => {
    const hermetic = rules.virtuesFlaws.find((r) => r.category === "Hermetic")!;
    expect(isTraitSelectable(hermetic, magus)).toBe(true);
  });
});

describe("hasGift", () => {
  test("is true for magi and false for a fresh grog", () => {
    expect(hasGift(magus)).toBe(true);
    expect(hasGift(grog)).toBe(false);
  });
});
