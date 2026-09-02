import { describe, expect, test } from "vitest";
import { encodeCharacter, decodeCharacter } from "../src/store.ts";
import { rules } from "../src/rules.ts";
import { createMagus } from "../../chargen/src/domain/create.ts";

describe("share-link codec", () => {
  test("round-trips a character", () => {
    const ch = createMagus({ name: "Corvus", house: "Tytalus" }, rules).character;
    ch.concept = "A contrarian who tests everyone — even friends.";
    const back = decodeCharacter(encodeCharacter(ch));
    expect(back).toEqual(ch);
  });

  test("survives non-ASCII names (multi-byte UTF-8)", () => {
    const ch = createMagus({ name: "Bjørn Þorvaldsson ᛗ", house: "Bjornaer" }, rules).character;
    expect(decodeCharacter(encodeCharacter(ch))?.name).toBe("Bjørn Þorvaldsson ᛗ");
  });

  test("emits URL-safe base64 with no padding", () => {
    const encoded = encodeCharacter(createMagus({ name: "Marcus", house: "Bonisagus" }, rules).character);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  test("returns null for corrupt input rather than throwing", () => {
    expect(decodeCharacter("not-valid-base64!!")).toBeNull();
    expect(decodeCharacter("")).toBeNull();
  });
});
