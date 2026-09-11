import { describe, it, expect, beforeEach } from "vitest";
import { GUIDELINES, TARGET_LADDER, findParam } from "../src/lib/guidelines.ts";
import {
  design, BLANK, update, reset, guidelineOf, pickGuideline, setBaseRung, baseRung,
  setParam, paramFor, resultOf, statLine,
  type Design,
} from "../src/lib/design-store.ts";

const find = (technique: string, form: string, level: number | null) => {
  const g = GUIDELINES.find((x) => x.technique === technique && x.form === form && x.level === level);
  if (!g) throw new Error(`no ${technique} ${form} guideline at ${level}`);
  return g;
};
const p = (kind: "range" | "duration" | "target", key: string) => findParam(kind, key)!;
/** Targets share key names across the three ladders, so pick off the right one. */
const target = (targetKind: string, key: string) =>
  TARGET_LADDER.find((t) => t.targetKind === targetKind && t.key === key)!;

let d: Design;
beforeEach(() => { d = { ...BLANK }; });

describe("the designer's working state", () => {
  it("starts blank, with nothing to total", () => {
    expect(guidelineOf(d)).toBeUndefined();
    expect(resultOf(d)).toBeNull();
  });

  it("starts every ladder at its bottom rung, where guidelines are quoted", () => {
    expect(statLine(d)).toBe("R: Personal, D: Momentary, T: Individual");
  });

  it("takes the guideline's own level as the base", () => {
    const g = find("Creo", "Ignem", 10);
    expect(pickGuideline(d, g).base).toBe(10);
  });

  it("keeps the parameters already chosen when the effect changes", () => {
    d = setParam(d, "range", p("range", "Voice"));
    d = setParam(d, "duration", p("duration", "Sun"));
    d = pickGuideline(d, find("Perdo", "Corpus", 15));
    expect(statLine(d)).toBe("R: Voice, D: Sun, T: Individual");
    expect(d.base).toBe(15);
  });

  it("leaves the base alone for a General guideline, which has no level", () => {
    const general = GUIDELINES.find((g) => g.isGeneral)!;
    d = { ...d, base: 25 };
    expect(pickGuideline(d, general).base).toBe(25);
  });

  it("steps the base by magnitudes, not by a flat five", () => {
    d = { ...d, base: 5 };
    expect(setBaseRung(d, baseRung(d) - 1).base).toBe(4);
    expect(setBaseRung(d, baseRung(d) + 1).base).toBe(10);
    d = { ...d, base: 2 };
    expect(setBaseRung(d, baseRung(d) + 1).base).toBe(3);
  });

  it("disambiguates the Target ladders, which share key names", () => {
    // "Touch" is a Range, and also a sense Target — the kind has to settle it.
    d = setParam(d, "target", target("sense", "Touch"));
    expect(d.targetKind).toBe("sense");
    expect(paramFor(d, "target").targetKind).toBe("sense");
    expect(paramFor(d, "target").magnitudes).toBe(1);
    // The Range ladder is untouched by that.
    expect(paramFor(d, "range").name).toBe("Personal");
  });

  it("falls back to Individual if a target key has no rung on its ladder", () => {
    d = { ...d, targetKey: "Bound", targetKind: "sense" };
    expect(paramFor(d, "target").name).toBe("Individual");
  });
});

describe("totalling a design", () => {
  it("leaves a guideline at its own level when nothing is paid for", () => {
    d = pickGuideline(d, find("Creo", "Ignem", 10));
    expect(resultOf(d)!.level).toBe(10);
    expect(resultOf(d)!.isRitual).toBe(false);
  });

  it("adds a magnitude per step up each ladder", () => {
    d = pickGuideline(d, find("Creo", "Ignem", 10));
    d = setParam(d, "range", p("range", "Voice"));   // +2
    d = setParam(d, "duration", p("duration", "Sun")); // +2
    expect(resultOf(d)!.level).toBe(30);
    expect(resultOf(d)!.totalMagnitudes).toBe(4);
  });

  it("adjusting one part leaves the rest in place", () => {
    d = pickGuideline(d, find("Creo", "Ignem", 10));
    d = setParam(d, "range", p("range", "Voice"));
    const before = resultOf(d)!.level;
    d = setParam(d, "duration", p("duration", "Diam")); // +1
    expect(resultOf(d)!.level).toBe(before + 5);
    d = setParam(d, "duration", p("duration", "Mom")); // back down
    expect(resultOf(d)!.level).toBe(before);
  });

  it("counts size and complexity magnitudes", () => {
    d = pickGuideline(d, find("Creo", "Ignem", 10));
    expect(resultOf({ ...d, size: 2 })!.level).toBe(20);
    expect(resultOf({ ...d, size: 2, extra: 1 })!.level).toBe(25);
  });

  it("forces a Ritual and floors it at 20 for Duration Year", () => {
    d = pickGuideline(d, find("Creo", "Ignem", 1));
    d = setParam(d, "duration", p("duration", "Year"));
    const r = resultOf(d)!;
    expect(r.isRitual).toBe(true);
    expect(r.level).toBe(20);
  });

  it("flags a lasting Creo as a Ritual", () => {
    d = pickGuideline(d, find("Creo", "Ignem", 10));
    expect(resultOf({ ...d, lastingCreo: true })!.isRitual).toBe(true);
    expect(resultOf(d)!.isRitual).toBe(false);
  });

  it("clears the lasting-Creo flag when a different effect is chosen", () => {
    d = { ...pickGuideline(d, find("Creo", "Ignem", 10)), lastingCreo: true };
    d = pickGuideline(d, find("Perdo", "Corpus", 15));
    expect(d.lastingCreo).toBe(false);
  });

  it("reports the arithmetic in the order it was applied", () => {
    d = pickGuideline(d, find("Creo", "Ignem", 10));
    d = setParam(d, "range", p("range", "Touch"));
    const labels = resultOf(d)!.steps.map((s) => s.label);
    expect(labels).toEqual(["Base guideline", "Range: Touch"]);
    expect(resultOf(d)!.steps.at(-1)!.running).toBe(15);
  });

  it("writes a stat line the way the rulebook does", () => {
    d = setParam(d, "range", p("range", "Voice"));
    d = setParam(d, "target", p("target", "Group"));
    expect(statLine(d)).toBe("R: Voice, D: Momentary, T: Group");
  });

  it("the shared signal carries a design between tabs", () => {
    design.value = pickGuideline({ ...BLANK }, find("Creo", "Ignem", 10));
    expect(guidelineOf(design.value)!.level).toBe(10);
    reset();
    expect(guidelineOf(design.value)).toBeUndefined();
  });

  it("update() reads the current design, so back-to-back changes both land", () => {
    reset();
    update((cur) => pickGuideline(cur, find("Creo", "Ignem", 10)));
    // Two presses before any re-render: a handler closing over the rendered design
    // would compute both from base 10 and lose the first.
    update((cur) => setBaseRung(cur, baseRung(cur) + 1));
    update((cur) => setBaseRung(cur, baseRung(cur) + 1));
    expect(design.value.base).toBe(20);
    reset();
  });
});
