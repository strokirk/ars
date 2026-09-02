import { describe, expect, test } from "vitest";
import { querySpells, queryTraits, sortSpells, traitCategories } from "../src/lib/queries.ts";
import type { SpellRow, VirtueFlawRow } from "../../chargen/src/data/types.ts";

function spell(p: Partial<SpellRow> & { name: string }): SpellRow {
  return {
    technique: "Creo", form: "Ignem", tech_abbr: "Cr", form_abbr: "Ig",
    level: 10, is_general: false, is_ritual: false,
    range: "Voice", duration: "Diameter", target: "Individual",
    requisites: [], damage: null, design_raw: null, description: "",
    source_file: "x.md", source_line: 1, ...p,
  };
}

const SPELLS: SpellRow[] = [
  spell({ name: "Ball of Abysmal Flame", level: 35, description: "A ball of fire." }),
  spell({ name: "Pilum of Fire", level: 20 }),
  spell({ name: "Lamp Without Flame", level: 10 }),
  spell({ name: "Wizard's Vigil", level: null, is_general: true }),
  spell({ name: "Incantation of Lightning", technique: "Creo", form: "Auram", level: 35, is_ritual: true }),
  spell({ name: "Bind Wound", technique: "Creo", form: "Corpus", level: 20 }),
  spell({ name: "Wind of Mundane Silence", technique: "Perdo", form: "Vim", level: 30 }),
];

describe("querySpells", () => {
  test("excludes General spells unless asked", () => {
    expect(querySpells(SPELLS).map((s) => s.name)).not.toContain("Wizard's Vigil");
    expect(querySpells(SPELLS, { includeGeneral: true }).map((s) => s.name)).toContain("Wizard's Vigil");
  });

  test("filters by Technique and Form, case-insensitively", () => {
    expect(querySpells(SPELLS, { technique: "perdo" }).map((s) => s.name)).toEqual(["Wind of Mundane Silence"]);
    expect(querySpells(SPELLS, { form: "Ignem" })).toHaveLength(3);
  });

  test("applies level bounds", () => {
    expect(querySpells(SPELLS, { minLevel: 20, maxLevel: 30 }).map((s) => s.name).sort())
      .toEqual(["Bind Wound", "Pilum of Fire", "Wind of Mundane Silence"]);
  });

  test("level bounds never exclude a General spell that was asked for", () => {
    // General spells have no fixed level, so a range filter must not silently drop them.
    const out = querySpells(SPELLS, { includeGeneral: true, maxLevel: 5 });
    expect(out.map((s) => s.name)).toEqual(["Wizard's Vigil"]);
  });

  test("filters rituals in both directions", () => {
    expect(querySpells(SPELLS, { ritual: "only" }).map((s) => s.name)).toEqual(["Incantation of Lightning"]);
    expect(querySpells(SPELLS, { ritual: "exclude" }).map((s) => s.name)).not.toContain("Incantation of Lightning");
  });

  test("searches name and description", () => {
    expect(querySpells(SPELLS, { search: "pilum" }).map((s) => s.name)).toEqual(["Pilum of Fire"]);
    expect(querySpells(SPELLS, { search: "ball of fire" }).map((s) => s.name)).toEqual(["Ball of Abysmal Flame"]);
  });

  test("onlyReachable drops spells above the Lab Total", () => {
    const out = querySpells(SPELLS, { onlyReachable: true, form: "Ignem" }, () => 20);
    expect(out.map((s) => s.name)).toEqual(["Lamp Without Flame", "Pilum of Fire"]);
  });

  test("onlyReachable without a Lab Total function is a no-op rather than empty", () => {
    expect(querySpells(SPELLS, { onlyReachable: true })).toHaveLength(6);
  });
});

describe("sortSpells", () => {
  test("orders by level ascending with General last", () => {
    const out = sortSpells(SPELLS, "level").map((s) => s.name);
    expect(out[0]).toBe("Lamp Without Flame");
    expect(out.at(-1)).toBe("Wizard's Vigil");
  });

  test("orders by Technique then Form in canonical Art order", () => {
    const out = sortSpells(SPELLS, "art").map((s) => `${s.technique} ${s.form}`);
    // Creo before Perdo; within Creo, Auram/Corpus/Ignem alphabetical per FORMS.
    expect(out[0]).toBe("Creo Auram");
    expect(out.at(-1)).toBe("Perdo Vim");
  });

  test("breaks ties by name", () => {
    const out = sortSpells(SPELLS, "level-desc").map((s) => s.name);
    expect(out.slice(0, 2)).toEqual(["Ball of Abysmal Flame", "Incantation of Lightning"]);
  });
});

function trait(p: Partial<VirtueFlawRow> & { name: string }): VirtueFlawRow {
  return {
    kind: "Virtue", size: "Minor", category: "General", categories: ["General"],
    tainted: false, cost_raw: "", description: "", source_file: "x.md", source_line: 1, ...p,
  };
}

const TRAITS: VirtueFlawRow[] = [
  trait({ name: "Puissant Art", category: "Hermetic", categories: ["Hermetic"] }),
  trait({ name: "Wealthy", size: "Major", category: "General", description: "You are rich." }),
  trait({ name: "Poor", kind: "Flaw", category: "General" }),
  trait({ name: "Ambitious", kind: "Flaw", size: "Major or Minor", category: "Personality", categories: ["Personality"] }),
];

describe("queryTraits", () => {
  test("filters by kind and sorts by name", () => {
    expect(queryTraits(TRAITS, { kind: "Flaw" }).map((t) => t.name)).toEqual(["Ambitious", "Poor"]);
  });

  test('"Major or Minor" rows match either size filter', () => {
    expect(queryTraits(TRAITS, { size: "Major" }).map((t) => t.name)).toEqual(["Ambitious", "Wealthy"]);
    expect(queryTraits(TRAITS, { size: "Minor" }).map((t) => t.name)).toContain("Ambitious");
  });

  test("matches secondary categories, not just the primary one", () => {
    expect(queryTraits(TRAITS, { category: "personality" }).map((t) => t.name)).toEqual(["Ambitious"]);
  });

  test("searches descriptions", () => {
    expect(queryTraits(TRAITS, { search: "rich" }).map((t) => t.name)).toEqual(["Wealthy"]);
  });
});

test("traitCategories lists distinct categories sorted", () => {
  expect(traitCategories(TRAITS)).toEqual(["General", "Hermetic", "Personality"]);
});
