import { describe, expect, test } from "vitest";
import {
  abilityCost, abilityMax, abilityOptions, abilityTemplate, specialtyHints, typeLabel, xpToNext,
} from "../src/lib/abilities.ts";
import { rules } from "../src/rules.ts";
import { apply } from "../src/engine.ts";
import { deriveModifiers } from "../../chargen/src/domain/modifiers.ts";
import { createCompanion, createGrog, createMagus } from "../../chargen/src/domain/create.ts";

const grog = createGrog({ name: "Otto" }).character;
const companion = createCompanion({ name: "Aldous" }).character;
const magus = createMagus({ name: "Marcus", house: "Bonisagus" }, rules).character;
const mods = deriveModifiers(grog);

const find = (rows: ReturnType<typeof abilityOptions>, name: string) => {
  const o = rows.find((r) => r.row.name === name);
  if (!o) throw new Error(`${name} missing from the options: ${rows.length} rows`);
  return o;
};

describe("xp arithmetic", () => {
  test("total cost follows the 5·n(n+1)/2 ladder", () => {
    expect([1, 2, 3, 4, 5].map((n) => abilityCost("Athletics", n, mods))).toEqual([5, 15, 30, 50, 75]);
  });

  test("the next point costs more the higher you go", () => {
    expect([0, 1, 2, 3, 4].map((n) => xpToNext("Athletics", n, mods))).toEqual([5, 10, 15, 20, 25]);
  });

  test("an Affinity discounts both the total and the next point", () => {
    const gifted = apply(companion, [{ op: "virtue", name: "Affinity with Ability", param: "Athletics" }]);
    const m = deriveModifiers(gifted);
    expect(m.affinityAbility.has("Athletics")).toBe(true);
    expect(abilityCost("Athletics", 4, m)).toBe(34); // ceil(50 × 2/3)
    expect(xpToNext("Athletics", 4, m)).toBe(50 - 34); // 75 → 50 after the discount
  });
});

describe("abilityMax", () => {
  test("follows the age ladder", () => {
    expect(abilityMax({ ...grog, age: 25 }, "Athletics", mods)).toBe(5);
    expect(abilityMax({ ...grog, age: 33 }, "Athletics", mods)).toBe(6);
    expect(abilityMax({ ...grog, age: 50 }, "Athletics", mods)).toBe(9);
  });

  test("an Affinity buys two more, matching what validate() allows", () => {
    const gifted = apply(companion, [{ op: "virtue", name: "Affinity with Ability", param: "Athletics" }]);
    const m = deriveModifiers(gifted);
    expect(abilityMax(gifted, "Athletics", m)).toBe(abilityMax(gifted, "Awareness", m) + 2);
  });
});

describe("abilityOptions", () => {
  test("childhood locks every non-General Ability, with the reason", () => {
    const opts = abilityOptions(rules.abilities, grog, "childhood");
    expect(find(opts, "Athletics").blocked).toBeUndefined();
    expect(find(opts, "Single Weapon").blocked).toMatch(/childhood/i);
    expect(find(opts, "Artes Liberales").blocked).toBeTruthy();
  });

  test("blocked rows sort below everything takeable", () => {
    const opts = abilityOptions(rules.abilities, grog, "childhood");
    const firstBlocked = opts.findIndex((o) => o.blocked);
    expect(firstBlocked).toBeGreaterThan(0);
    expect(opts.slice(firstBlocked).every((o) => o.blocked)).toBe(true);
  });

  test("later life unlocks Martial Abilities once a Virtue enables them", () => {
    expect(find(abilityOptions(rules.abilities, grog, "later-life"), "Single Weapon").blocked).toBeTruthy();
    const warrior = apply(grog, [{ op: "virtue", name: "Warrior" }]);
    expect(find(abilityOptions(rules.abilities, warrior, "later-life"), "Single Weapon").blocked).toBeUndefined();
  });

  test("apprenticeship opens Arcane but still gates Supernatural", () => {
    const opts = abilityOptions(rules.abilities, magus, "apprenticeship");
    expect(find(opts, "Magic Theory").blocked).toBeUndefined();
    expect(find(opts, "Second Sight").blocked).toMatch(/Supernatural/i);
  });

  test("flags what is already taken, here and in another stage", () => {
    const ch = apply(grog, [{ op: "ability", name: "Awareness", score: 2, stage: "childhood" }]);
    expect(find(abilityOptions(rules.abilities, ch, "childhood"), "Awareness").taken).toBe(2);
    const later = find(abilityOptions(rules.abilities, ch, "later-life"), "Awareness");
    expect(later.taken).toBeUndefined();
    expect(later.elsewhere).toEqual(["Childhood"]);
  });

  test("House-granted Abilities read as granted, not as spent xp", () => {
    const bjornaer = createMagus({ name: "Ursa", house: "Bjornaer" }, rules).character;
    const granted = bjornaer.abilities.filter((a) => a.stage === "free");
    expect(granted.length).toBeGreaterThan(0);
    const o = find(abilityOptions(rules.abilities, bjornaer, "apprenticeship"), granted[0]!.name);
    expect(o.elsewhere).toEqual(["Granted"]);
  });

  test("search matches name and description; the type filter narrows", () => {
    expect(abilityOptions(rules.abilities, grog, "childhood", { search: "swim" }).map((o) => o.row.name))
      .toContain("Swim");
    const martial = abilityOptions(rules.abilities, grog, "later-life", { type: "Martial" });
    expect(martial.length).toBeGreaterThan(0);
    expect(martial.every((o) => typeLabel(o.row.type) === "Martial")).toBe(true);
  });
});

describe("placeholder rows", () => {
  test("the rulebook's shapes are recognised and build a concrete name", () => {
    expect(abilityTemplate("(Area) Lore")!.build("Provence")).toBe("Provence Lore");
    expect(abilityTemplate("Craft (Type)")!.build("Pottery")).toBe("Craft Pottery");
    expect(abilityTemplate("Profession (Type)")!.build("Scribe")).toBe("Profession Scribe");
    expect(abilityTemplate("(Dead Language)")!.build("Latin")).toBe("Latin");
  });

  test("parentheses that are prose are left alone", () => {
    expect(abilityTemplate("Chirurgy (kie-RUHR-gee)")).toBeUndefined();
    expect(abilityTemplate("Enchanting (Ability)")).toBeUndefined();
    expect(abilityTemplate("Athletics")).toBeUndefined();
  });

  test("every built name resolves in the engine, keeping its type", () => {
    for (const [row, param] of [["(Area) Lore", "Provence"], ["Craft (Type)", "Pottery"], ["(Dead Language)", "Latin"]] as const) {
      const name = abilityTemplate(row)!.build(param);
      const res = rules.resolveAbility(name, rules.ability(row)!.type ?? undefined);
      expect(res.ok, `${name} did not resolve`).toBe(true);
    }
  });

  test("specialty hints come off the row as a list", () => {
    expect(specialtyHints(rules.ability("Athletics")!)).toContain("jumping");
    expect(specialtyHints(rules.ability("Corpse Magic")!)).toEqual([]);
  });
});
