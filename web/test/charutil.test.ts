import { describe, expect, test } from "vitest";
import { title, firstSentence, specLine, kindLabel } from "../src/charutil.ts";
import { rules } from "../src/rules.ts";
import { createGrog, createMagus } from "../../chargen/src/domain/create.ts";
import { apply } from "../src/engine.ts";

const grog = () => createGrog({ name: "Otto" }).character;
const magus = (name: string, house: "Flambeau" | "Tytalus" = "Flambeau") =>
  createMagus({ name, house }, rules).character;

describe("title", () => {
  test("appends the House for a magus", () => {
    expect(title(magus("Marcus"))).toBe("Marcus of House Flambeau");
  });

  test("does not repeat a House already carried in the name", () => {
    expect(title(magus("Corvus of Tytalus", "Tytalus"))).toBe("Corvus of Tytalus");
  });

  test("falls back to Unnamed", () => {
    const ch = grog();
    ch.name = "";
    expect(title(ch)).toBe("Unnamed");
  });
});

describe("firstSentence", () => {
  test("stops at the first terminator", () => {
    expect(firstSentence("A gruff sergeant. He drinks too much.")).toBe("A gruff sergeant.");
  });

  test("returns the whole string when there is no terminator", () => {
    expect(firstSentence("no terminator here")).toBe("no terminator here");
  });

  test("truncates with an ellipsis past the max", () => {
    const out = firstSentence("x".repeat(50), 20);
    expect(out).toHaveLength(20);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("specLine", () => {
  test("summarises a magus by House, Arts and focus", () => {
    const ch = magus("Marcus");
    ch.favoredTechnique = "Creo";
    ch.favoredForm = "Ignem";
    ch.focus = "fire";
    expect(specLine(ch)).toBe("House Flambeau · CrIg · focus: fire");
  });

  test("uses the Social Status for non-magi", () => {
    const ch = apply(grog(), [{ op: "virtue", name: "Covenfolk" }]);
    expect(specLine(ch)).toBe("Covenfolk");
  });

  test("is empty for a character with no Social Status yet", () => {
    expect(specLine(grog())).toBe("");
  });
});

test("kindLabel names the character kind", () => {
  expect(kindLabel(grog())).toBe("Grog");
  expect(kindLabel(magus("Marcus"))).toBe("Magus");
});
