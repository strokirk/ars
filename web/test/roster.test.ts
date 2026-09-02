import { describe, expect, test } from "vitest";
import { buildRoster, roster, rosterEntry } from "../src/lib/roster.ts";
import type { Character } from "../../chargen/src/domain/character.ts";

const stub = (name: string) => ({ name }) as Character;

describe("buildRoster", () => {
  test("slugs names and sorts alphabetically", () => {
    const out = buildRoster([stub("Zara the Bold"), stub("Aurelius")]);
    expect(out.map((e) => e.slug)).toEqual(["aurelius", "zara-the-bold"]);
  });

  test("disambiguates duplicate names so links never collide", () => {
    const out = buildRoster([stub("Marcus"), stub("Marcus")]);
    expect(out.map((e) => e.slug)).toEqual(["marcus", "marcus-2"]);
  });

  test("names that slug to nothing still get a usable slug", () => {
    expect(buildRoster([stub("???")])[0]!.slug).toBe("magus");
  });
});

describe("the bundled roster", () => {
  test("loads the committed characters/*.json", () => {
    expect(roster.length).toBeGreaterThan(0);
    for (const e of roster) expect(e.character.name).toBeTruthy();
  });

  test("every entry is reachable by its slug", () => {
    for (const e of roster) expect(rosterEntry(e.slug)?.character.name).toBe(e.character.name);
  });

  test("unknown slugs resolve to undefined", () => {
    expect(rosterEntry("no-such-magus")).toBeUndefined();
  });
});
