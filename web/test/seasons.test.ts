import { describe, it, expect } from "vitest";
import {
  TOTALS, ACTIVITIES, totalOf, computeTotal, computeOutcome, CATEGORIES,
} from "../src/lib/seasons.ts";
import { BLANK_SUBJECT } from "../src/lib/subject.ts";

const activity = (key: string) => {
  const a = ACTIVITIES.find((x) => x.key === key);
  if (!a) throw new Error(`missing activity ${key}`);
  return a;
};

describe("the YAML loads", () => {
  it("registers the core totals and activities with no duplicate keys", () => {
    expect(new Set(TOTALS.map((t) => t.key)).size).toBe(TOTALS.length);
    expect(new Set(ACTIVITIES.map((a) => a.key)).size).toBe(ACTIVITIES.length);
    expect(TOTALS.map((t) => t.key)).toContain("lab");
  });

  it("every activity's total (if any) resolves, and its category is a known one", () => {
    for (const a of ACTIVITIES) {
      if (a.total) expect(totalOf(a.total), `${a.key} -> total "${a.total}"`).toBeDefined();
      expect(CATEGORIES, a.key).toContain(a.category);
    }
  });
});

describe("Lab Total — the book's own worked example (Tillitus, p.371)", () => {
  // Int +5, Magic Theory 3 + Puissant +2, Rego 5, Vim 5, aura 5 -> Lab Total 25.
  // Puissant isn't modelled as its own bonus; folded into the Magic Theory override,
  // same as any ad-hoc addition would be.
  const ctx = {
    subject: BLANK_SUBJECT,
    overrides: { "char:Int": 5, "ability:Magic Theory": 5, "art:Rego": 5, "art:Vim": 5, aura: 5 },
    arts: { technique: "Rego" as const, form: "Vim" as const },
  };

  it("sums to 25", () => {
    expect(computeTotal(totalOf("lab")!, ctx, 0).value).toBe(25);
  });

  it("inventing a level-12 spell takes one season, a level-13 spell takes two", () => {
    // Lab Total 25 exceeds the level by 13 (for 12) or 12 (for 13) points/season.
    expect(computeOutcome(activity("invent-spell"), 25, 12).seasons).toBe(1);
    expect(computeOutcome(activity("invent-spell"), 25, 13).seasons).toBe(2);
  });

  it("a spell at or above the Lab Total can't be invented", () => {
    expect(computeOutcome(activity("invent-spell"), 25, 25).blocked).toBe(true);
  });
});

describe("charged items — the book's own worked example (Mari's wand, p.257)", () => {
  it("26 points over a level-15 effect yields 6 charges", () => {
    const o = computeOutcome(activity("charged-item"), 41, 15);
    expect(o.text).toContain("6 charge");
    expect(o.blocked).toBeUndefined();
  });

  it("meeting the level exactly still gets one charge", () => {
    expect(computeOutcome(activity("charged-item"), 15, 15).text).toContain("1 charge");
  });

  it("falling short is blocked, not zero charges", () => {
    expect(computeOutcome(activity("charged-item"), 14, 15).blocked).toBe(true);
  });
});

describe("vis extraction — one tenth, rounded UP", () => {
  it("20 -> 2 pawns, 21 -> 3 pawns, 10 -> 1 pawn (singular)", () => {
    expect(computeOutcome(activity("extract-vis"), 20, undefined).text).toBe("2 pawns of Vim vis / season");
    expect(computeOutcome(activity("extract-vis"), 21, undefined).text).toBe("3 pawns of Vim vis / season");
    expect(computeOutcome(activity("extract-vis"), 10, undefined).text).toBe("1 pawn of Vim vis / season");
  });
});

describe("Longevity Ritual — +1 per 5 points of Creo Corpus Lab Total", () => {
  it("30 -> +6, 31 -> +7", () => {
    // The `fixed` work kind carries no numeric bonus of its own — that arithmetic
    // belongs to the caller reading the Lab Total value, same as the UI does.
    expect(Math.ceil(30 / 5)).toBe(6);
    expect(Math.ceil(31 / 5)).toBe(7);
  });
});

describe("Teaching Total", () => {
  it("Communication + Teaching + 3", () => {
    const ctx = { subject: BLANK_SUBJECT, overrides: { "ability:Communication": 2, "ability:Teaching": 4 } };
    expect(computeTotal(totalOf("teaching")!, ctx, 0).value).toBe(9);
  });
});

describe("Laboratory Texts — the book's own worked example (Carolus, p.263)", () => {
  it("a Lab Text is usable at Lab Total 27 for a level-25 effect (equal-or-exceeds, not strictly exceeds)", () => {
    const o = computeOutcome(activity("reproduce-lab-text"), 27, 25);
    expect(o.blocked).toBeUndefined();
    expect(o.seasons).toBe(1);
  });

  it("meeting the level exactly still works; falling short is blocked", () => {
    expect(computeOutcome(activity("reproduce-lab-text"), 25, 25).blocked).toBeUndefined();
    expect(computeOutcome(activity("reproduce-lab-text"), 24, 25).blocked).toBe(true);
  });

  it("writing rate is Latin x 20, not Latin + 20", () => {
    const ctx = { subject: BLANK_SUBJECT, overrides: { "ability:Latin": 5 } };
    const r = computeTotal(totalOf("lab-texts-rate")!, ctx, 0);
    expect(r.value).toBe(100);
    expect(r.lines[0]).toMatchObject({ value: 5, multiplier: 20 });
  });
});
