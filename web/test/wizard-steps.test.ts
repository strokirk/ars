import { describe, expect, test } from "vitest";
import { stepsFor, metersFor } from "../src/lib/wizard-steps.ts";
import { computeBudgets } from "../../chargen/src/domain/budgets.ts";
import { rules } from "../src/rules.ts";
import { createGrog, createMagus } from "../../chargen/src/domain/create.ts";

describe("stepsFor", () => {
  test("only magi get the Arts & Spells step", () => {
    expect(stepsFor("magus").map((s) => s.key)).toContain("arts");
    expect(stepsFor("grog").map((s) => s.key)).not.toContain("arts");
    expect(stepsFor("companion").map((s) => s.key)).not.toContain("arts");
  });

  test("every kind starts at Concept and ends at Review", () => {
    for (const kind of ["grog", "companion", "magus"] as const) {
      const keys = stepsFor(kind).map((s) => s.key);
      expect(keys[0]).toBe("concept");
      expect(keys.at(-1)).toBe("review");
    }
  });

  test("only magi budget apprenticeship xp on the Abilities step", () => {
    const abilities = (k: "grog" | "magus") => stepsFor(k).find((s) => s.key === "abilities")!;
    expect(abilities("magus").budgets).toContain("apprenticeship");
    expect(abilities("grog").budgets).not.toContain("apprenticeship");
  });

  test("the teaching blurb is kind-specific", () => {
    const why = (k: "grog" | "companion" | "magus") => stepsFor(k).find((s) => s.key === "virtues")!.why;
    expect(why("grog")).not.toBe(why("companion"));
    expect(why("magus")).toMatch(/Hermetic/);
  });
});

describe("metersFor", () => {
  const grogBudgets = computeBudgets(createGrog({ name: "Otto" }).character);
  const magusBudgets = computeBudgets(createMagus({ name: "Marcus", house: "Bonisagus" }, rules).character);

  test("Review and Concept show no meters", () => {
    for (const key of ["concept", "review"] as const) {
      const step = stepsFor("grog").find((s) => s.key === key)!;
      expect(metersFor(step, grogBudgets)).toEqual([]);
    }
  });

  test("the Virtues step reports the balance, not a raw ratio", () => {
    const step = stepsFor("grog").find((s) => s.key === "virtues")!;
    const [meter] = metersFor(step, grogBudgets);
    expect(meter!.label).toBe("Virtues/Flaws");
    expect(meter!.text).toMatch(/^V \d+ [=≠] F \d+ \(≤\d+\)$/);
  });

  test("the magus Arts step meters both xp and spell levels", () => {
    const step = stepsFor("magus").find((s) => s.key === "arts")!;
    expect(metersFor(step, magusBudgets).map((m) => m.label)).toEqual(["Apprenticeship", "Spells"]);
  });
});
