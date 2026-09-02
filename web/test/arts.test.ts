import { describe, expect, test } from "vitest";
import {
  artPair, TECHNIQUE_COLOR, FORM_ICON, techniqueColor, formIcon,
  canonicalRange, canonicalDuration, canonicalTarget, RANGES, DURATIONS, TARGETS,
} from "../src/lib/arts.ts";
import { rules } from "../src/rules.ts";
import { TECHNIQUES, FORMS } from "../../chargen/src/domain/glossary.ts";

describe("artPair", () => {
  test("keeps the rulebook's mixed case", () => {
    // The bug this fixes: uppercasing "PeAn" to "PEAN" loses the word boundary.
    expect(artPair("Perdo", "Animal")).toBe("PeAn");
    expect(artPair("Creo", "Ignem")).toBe("CrIg");
    expect(artPair("Intellego", "Imaginem")).toBe("InIm");
  });

  test("falls back to two letters for unrecognised Arts", () => {
    expect(artPair("Nonsense", "Ignem")).toBe("NoIg");
  });
});

describe("the Art visual language", () => {
  test("every Technique has a distinct colour", () => {
    const colors = TECHNIQUES.map((t) => TECHNIQUE_COLOR[t]);
    expect(new Set(colors).size).toBe(TECHNIQUES.length);
    for (const c of colors) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
  });

  test("every Form has a distinct icon", () => {
    const icons = FORMS.map((f) => FORM_ICON[f]);
    expect(new Set(icons).size).toBe(FORMS.length);
  });

  test("colour is a Technique property and icons a Form property", () => {
    expect(techniqueColor("Creo")).toBeDefined();
    expect(techniqueColor("Ignem")).toBeUndefined();
    expect(formIcon("Ignem")).toBe("Flame");
    expect(formIcon("Creo")).toBeUndefined();
  });
});

describe("canonicalising the noisy R/D/T fields", () => {
  test("folds long spellings onto their abbreviation", () => {
    expect(canonicalDuration("Momentary")).toBe("Mom");
    expect(canonicalDuration("Diameter")).toBe("Diam");
    expect(canonicalTarget("Individual")).toBe("Ind");
    expect(canonicalRange("Touch")).toBe("Touch");
  });

  test("recovers the one OCR slip in the data", () => {
    expect(canonicalRange("Eve")).toBe("Eye");
  });

  test("takes the leading term of a compound value", () => {
    expect(canonicalTarget("Ind Reg: Terram")).toBe("Ind");
    expect(canonicalDuration("Sun & Year")).toBe("Sun");
  });

  test("is case-insensitive and returns '' for anything unrecognised", () => {
    expect(canonicalRange("voice")).toBe("Voice");
    expect(canonicalTarget("")).toBe("");
    expect(canonicalTarget("???")).toBe("");
  });

  test("covers every value present in the real spell data", () => {
    // A new unmapped spelling would silently vanish from the filter dropdowns.
    const unmapped = rules.spells.filter(
      (s) => !canonicalRange(s.range) || !canonicalDuration(s.duration) || !canonicalTarget(s.target),
    );
    expect(unmapped.map((s) => `${s.name}: ${s.range}/${s.duration}/${s.target}`)).toEqual([]);
  });

  test("every canonical key has a display name", () => {
    for (const [table, fn] of [[RANGES, canonicalRange], [DURATIONS, canonicalDuration], [TARGETS, canonicalTarget]] as const) {
      for (const key of table) expect(fn(key)).toBe(key);
    }
  });
});
