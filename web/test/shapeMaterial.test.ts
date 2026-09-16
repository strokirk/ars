import { describe, it, expect } from "vitest";
import {
  SHAPE_MATERIAL, queryShapeMaterial, bonusSummary,
} from "../src/lib/shapeMaterial.ts";

describe("the generated Shape & Material JSON", () => {
  it("has a few hundred rows and no duplicate item names", () => {
    expect(SHAPE_MATERIAL.length).toBeGreaterThan(200);
    const names = SHAPE_MATERIAL.map((e) => e.item.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it("every row has at least one bonus", () => {
    expect(SHAPE_MATERIAL.every((e) => e.bonuses.length > 0)).toBe(true);
  });

  it("resolves a known entry with its bonuses (the book's own example)", () => {
    const amber = SHAPE_MATERIAL.find((e) => e.item === "Amber");
    expect(amber).toBeDefined();
    expect(amber!.bonuses).toEqual([
      { value: 3, effect: "controlling movement" },
      { value: 3, effect: "Corpus", art: "Corpus" },
    ]);
  });

  it("tags a bonus whose effect text is exactly a Form or Technique name", () => {
    const almond = SHAPE_MATERIAL.find((e) => e.item === "Almond Wood")!;
    // "Creo Herbam" is an Art pair, not a single Art name, so it is untagged.
    expect(almond.bonuses[0]!.art).toBeUndefined();
    const amber = SHAPE_MATERIAL.find((e) => e.item === "Amber")!;
    expect(amber.bonuses.find((b) => b.effect === "Corpus")!.art).toBe("Corpus");
  });
});

describe("queryShapeMaterial", () => {
  it("matches on the item name", () => {
    const rows = queryShapeMaterial(SHAPE_MATERIAL, { search: "amber" });
    expect(rows.map((r) => r.item)).toContain("Amber");
  });

  it("matches on bonus effect text too, not just the item name", () => {
    const rows = queryShapeMaterial(SHAPE_MATERIAL, { search: "controlling movement" });
    expect(rows.some((r) => r.item === "Amber")).toBe(true);
    expect(rows.every((r) =>
      r.item.toLowerCase().includes("controlling movement") ||
      r.bonuses.some((b) => b.effect.toLowerCase().includes("controlling movement")),
    )).toBe(true);
  });

  it("sorts alphabetically by item, ascending or descending", () => {
    const asc = queryShapeMaterial(SHAPE_MATERIAL, { sort: "name" }).map((r) => r.item);
    const desc = queryShapeMaterial(SHAPE_MATERIAL, { sort: "name-desc" }).map((r) => r.item);
    expect(asc).toEqual([...asc].sort((a, b) => a.localeCompare(b)));
    expect(desc).toEqual([...asc].reverse());
  });
});

describe("bonusSummary", () => {
  it("joins each bonus as +value effect", () => {
    const amber = SHAPE_MATERIAL.find((e) => e.item === "Amber")!;
    expect(bonusSummary(amber.bonuses)).toBe("+3 controlling movement · +3 Corpus");
  });
});
