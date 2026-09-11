import { describe, it, expect } from "vitest";
import {
  BOOKS, RANGE_LADDER, DURATION_LADDER, TARGET_LADDER, GUIDELINES, ART_NOTES, FORM_INFO,
  LEVEL_RULES, SIZE_RULES, TARGET_KINDS,
  levelRung, rungLevel, addMagnitudes, magnitudeOf, designSpell, findParam,
  queryGuidelines, groupByArt, groupGuidelines, artNotesFor, formInfo, paramsOf,
} from "../src/lib/guidelines.ts";

const TECHNIQUES = ["Creo", "Intellego", "Muto", "Perdo", "Rego"];
const FORMS = [
  "Animal", "Aquam", "Auram", "Corpus", "Herbam",
  "Ignem", "Imaginem", "Mentem", "Terram", "Vim",
];

const param = (kind: Parameters<typeof paramsOf>[0], key: string) => {
  const p = findParam(kind, key);
  if (!p) throw new Error(`missing ${kind} ${key}`);
  return p;
};

describe("the YAML loads", () => {
  it("registers the core book", () => {
    expect(BOOKS.map((b) => b.key)).toContain("core");
    expect(BOOKS.every((b) => b.name && b.abbr)).toBe(true);
  });

  it("has no duplicate book keys", () => {
    expect(new Set(BOOKS.map((b) => b.key)).size).toBe(BOOKS.length);
  });

  it("carries every rung of all three ladders", () => {
    expect(RANGE_LADDER.map((p) => p.key)).toEqual(["Per", "Touch", "Eye", "Voice", "Sight", "Arc"]);
    expect(DURATION_LADDER.map((p) => p.key)).toEqual(
      ["Mom", "Conc", "Diam", "Sun", "Ring", "Moon", "Year"],
    );
    // The three Target ladders run in parallel, so keys repeat across kinds only.
    expect(TARGET_LADDER.filter((p) => p.targetKind === "object").map((p) => p.key))
      .toEqual(["Ind", "Part", "Group"]);
    expect(TARGET_LADDER.filter((p) => p.targetKind === "container").map((p) => p.key))
      .toEqual(["Circle", "Room", "Str", "Bound"]);
    expect(TARGET_LADDER.filter((p) => p.targetKind === "sense").map((p) => p.key))
      .toEqual(["Taste", "Touch", "Smell", "Hearing", "Vision"]);
  });

  it("matches the rulebook's magnitude table", () => {
    expect(param("range", "Per").magnitudes).toBe(0);
    expect(param("range", "Touch").magnitudes).toBe(1);
    expect(param("range", "Eye").magnitudes).toBe(1);
    expect(param("range", "Voice").magnitudes).toBe(2);
    expect(param("range", "Sight").magnitudes).toBe(3);
    expect(param("range", "Arc").magnitudes).toBe(4);
    expect(param("duration", "Mom").magnitudes).toBe(0);
    expect(param("duration", "Conc").magnitudes).toBe(1);
    expect(param("duration", "Sun").magnitudes).toBe(2);
    expect(param("duration", "Ring").magnitudes).toBe(2);
    expect(param("duration", "Year").magnitudes).toBe(4);
    expect(param("target", "Bound").magnitudes).toBe(4);
    expect(param("target", "Vision").magnitudes).toBe(4);
  });

  it("flags only Year and Boundary as Ritual-forcing", () => {
    const forced = [...DURATION_LADDER, ...TARGET_LADDER].filter((p) => p.ritual).map((p) => p.key);
    expect(forced.sort()).toEqual(["Bound", "Year"]);
  });

  it("gives every rung a summary and a description", () => {
    for (const p of [...RANGE_LADDER, ...DURATION_LADDER, ...TARGET_LADDER]) {
      expect(p.summary, `${p.kind} ${p.key} summary`).not.toBe("");
      expect(p.description.length, `${p.kind} ${p.key} description`).toBeGreaterThan(40);
    }
  });

  it("describes every Form's base Individual", () => {
    expect(FORM_INFO.map((f) => f.name)).toEqual(FORMS);
    for (const f of FORM_INFO) expect(f.baseIndividual.length, f.name).toBeGreaterThan(20);
  });

  it("carries notes for all 50 Technique+Form pairs", () => {
    for (const t of TECHNIQUES) {
      for (const f of FORMS) {
        expect(artNotesFor(t, f).length, `${t} ${f}`).toBeGreaterThan(0);
      }
    }
    expect(ART_NOTES.length).toBeGreaterThanOrEqual(50);
  });

  it("carries the level and size rules", () => {
    expect(LEVEL_RULES.length).toBeGreaterThan(0);
    expect(SIZE_RULES.length).toBeGreaterThan(0);
  });

  it("labels the three Target ladders", () => {
    expect(TARGET_KINDS.map((k) => k.key)).toEqual(["object", "container", "sense"]);
  });

  it("stamps the book onto every entry", () => {
    const keys = new Set(BOOKS.map((b) => b.key));
    for (const p of [...RANGE_LADDER, ...DURATION_LADDER, ...TARGET_LADDER]) {
      expect(keys.has(p.book), `${p.kind} ${p.key}`).toBe(true);
    }
  });
});

describe("guideline effects", () => {
  it("covers all 50 Technique/Form pairs", () => {
    const pairs = new Set(GUIDELINES.map((g) => `${g.technique} ${g.form}`));
    for (const t of TECHNIQUES) for (const f of FORMS) expect(pairs.has(`${t} ${f}`), `${t} ${f}`).toBe(true);
  });

  it("has unique ids", () => {
    expect(new Set(GUIDELINES.map((g) => g.id)).size).toBe(GUIDELINES.length);
  });

  it("marks General guidelines with a null level", () => {
    for (const g of GUIDELINES) expect(g.isGeneral).toBe(g.level === null);
    expect(GUIDELINES.some((g) => g.isGeneral)).toBe(true);
  });

  it("filters by Art, level and text", () => {
    const rows = queryGuidelines(GUIDELINES, { technique: "Creo", form: "Ignem", maxLevel: 10 });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((g) => g.technique === "Creo" && g.form === "Ignem")).toBe(true);
    expect(rows.every((g) => g.level === null || g.level <= 10)).toBe(true);
    const hit = queryGuidelines(GUIDELINES, { search: "heal" });
    expect(hit.every((g) => /heal/i.test(g.effect))).toBe(true);
    expect(hit.length).toBeGreaterThan(0);
  });

  it("can drop General rows", () => {
    expect(queryGuidelines(GUIDELINES, { includeGeneral: false }).some((g) => g.isGeneral)).toBe(false);
  });

  it("sorts by level with General last", () => {
    const rows = queryGuidelines(GUIDELINES, { technique: "Perdo", form: "Corpus", sort: "level" });
    const levels = rows.map((g) => g.level);
    const graded = levels.filter((l): l is number => l !== null);
    expect(graded).toEqual([...graded].sort((a, b) => a - b));
    if (levels.includes(null)) expect(levels[levels.length - 1]).toBe(null);
  });

  it("groups into Technique+Form blocks in canonical Art order", () => {
    const groups = groupByArt(queryGuidelines(GUIDELINES, { form: "Ignem" }));
    expect(groups.map((g) => g.technique)).toEqual(TECHNIQUES);
  });

  it("finds the Form's sizing note", () => {
    expect(formInfo("Corpus")?.baseIndividual).toMatch(/adult human/i);
    expect(formInfo("Nonesuch")).toBeUndefined();
  });
});

describe("the magnitude ladder", () => {
  it("compresses below level 5", () => {
    expect([1, 2, 3, 4, 5, 10, 15, 20, 25].map(levelRung)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map(rungLevel)).toEqual([1, 2, 3, 4, 5, 10, 15, 20, 25]);
  });

  it("steps the way the rulebook says", () => {
    expect(addMagnitudes(5, -1)).toBe(4);   // "one magnitude lower than level 5 is level 4"
    expect(addMagnitudes(2, 1)).toBe(3);    // "one magnitude higher than level 2 is level 3"
    expect(addMagnitudes(10, 1)).toBe(15);
    expect(addMagnitudes(15, -2)).toBe(5);
    expect(addMagnitudes(15, -5)).toBe(2);  // the worked example's second variant
  });

  it("never drops below level 1", () => {
    expect(addMagnitudes(1, -5)).toBe(1);
  });

  it("is reversible", () => {
    for (const level of [1, 3, 5, 10, 25, 50]) {
      for (const n of [1, 2, 3, 4]) {
        expect(addMagnitudes(addMagnitudes(level, n), -n)).toBe(level);
      }
    }
  });

  it("computes magnitude as level / 5 rounded up", () => {
    expect([1, 5, 6, 10, 21, 50].map(magnitudeOf)).toEqual([1, 1, 2, 2, 5, 10]);
  });
});

describe("designSpell", () => {
  const build = (over: Partial<Parameters<typeof designSpell>[0]> = {}) =>
    designSpell({
      base: 15,
      range: param("range", "Per"),
      duration: param("duration", "Mom"),
      target: param("target", "Ind"),
      ...over,
    });

  it("leaves a base guideline alone at Personal/Momentary/Individual", () => {
    const r = build();
    expect(r.level).toBe(15);
    expect(r.totalMagnitudes).toBe(0);
    expect(r.isRitual).toBe(false);
  });

  it("reproduces the rulebook's worked example", () => {
    // "a level 15 spell with Range Voice, Duration Sun, Target Group" recast as
    // Sight / Moon / Room is level 25 (+1 Range, +1 Duration, +0 Target).
    const voiceSunGroup = designSpell({
      base: 1,
      range: param("range", "Voice"),
      duration: param("duration", "Sun"),
      target: param("target", "Group"),
    });
    // 1 -> +6 magnitudes -> rung 7 -> level 15.
    expect(voiceSunGroup.level).toBe(15);

    const sightMoonRoom = designSpell({
      base: 1,
      range: param("range", "Sight"),
      duration: param("duration", "Moon"),
      target: param("target", "Room"),
    });
    expect(sightMoonRoom.level).toBe(25);

    // "Range Personal, Duration Concentration, Target Individual would be level 2"
    const stripped = designSpell({
      base: 1,
      range: param("range", "Per"),
      duration: param("duration", "Conc"),
      target: param("target", "Ind"),
    });
    expect(stripped.level).toBe(2);
  });

  it("shows every contribution in order", () => {
    const r = build({ range: param("range", "Voice"), duration: param("duration", "Sun"), extra: 1 });
    expect(r.steps.map((s) => s.label)).toEqual([
      "Base guideline", "Range: Voice", "Duration: Sun", "Requisites & complexity",
    ]);
    expect(r.steps.at(-1)!.running).toBe(r.level);
    expect(r.totalMagnitudes).toBe(5);
    expect(r.level).toBe(40);
  });

  it("forces a Ritual for Duration Year and Target Boundary", () => {
    const year = build({ duration: param("duration", "Year") });
    expect(year.isRitual).toBe(true);
    expect(year.ritualReasons.join(" ")).toMatch(/Year/);

    const bound = build({ target: param("target", "Bound") });
    expect(bound.isRitual).toBe(true);
    expect(bound.ritualReasons.join(" ")).toMatch(/Boundary/);
  });

  it("raises a low Ritual to level 20", () => {
    const r = build({ base: 2, duration: param("duration", "Year") });
    expect(r.isRitual).toBe(true);
    expect(r.level).toBe(20);
    expect(r.steps.at(-1)!.label).toMatch(/at least level 20/);
  });

  it("makes anything over level 50 a Ritual", () => {
    const r = build({ base: 50, extra: 1 });
    expect(r.level).toBe(55);
    expect(r.isRitual).toBe(true);
    expect(r.ritualReasons.join(" ")).toMatch(/cap at level 50/);
  });

  it("carries the guideline's own Ritual requirement", () => {
    expect(build({ guidelineRitual: true }).isRitual).toBe(true);
    expect(build({ lastingCreo: true }).ritualReasons.join(" ")).toMatch(/Creo/);
  });

  it("warns about a Personal container Target", () => {
    const r = build({ range: param("range", "Per"), target: param("target", "Room") });
    expect(r.warnings.join(" ")).toMatch(/container Target/);
  });

  it("warns that Intellego ignores Target size", () => {
    const r = build({ technique: "Intellego", size: 2 });
    expect(r.warnings.join(" ")).toMatch(/not affected by Target size/);
  });

  it("counts size and extra magnitudes into the level", () => {
    expect(build({ base: 10, size: 1 }).level).toBe(15);
    expect(build({ base: 10, size: 1, extra: 2 }).level).toBe(25);
  });
});

describe("grouping follows the sort", () => {
  it("groups by Art when sorted by Art", () => {
    const rows = queryGuidelines(GUIDELINES, { form: "Ignem", sort: "art" });
    const groups = groupGuidelines(rows, "art");
    expect(groups.map((g) => g.label)).toEqual(TECHNIQUES.map((t) => `${t} Ignem`));
    expect(groups.every((g) => g.technique && g.form)).toBe(true);
  });

  it("groups by level when sorted by level, so a heading covers adjacent rows", () => {
    const rows = queryGuidelines(GUIDELINES, { form: "Ignem", sort: "level" });
    const groups = groupGuidelines(rows, "level");
    // Every group holds a contiguous run — grouping by Art here would split the list
    // into a heading per row.
    expect(groups.length).toBeLessThan(rows.length / 2);
    expect(groups.every((g) => g.technique === undefined)).toBe(true);
    expect(groups.at(-1)!.label).toBe("General");
    const levels = groups.filter((g) => g.label !== "General").map((g) => Number(g.label.split(" ")[1]));
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
  });

  it("drops headings entirely for an alphabetical sort", () => {
    const groups = groupGuidelines(queryGuidelines(GUIDELINES, { sort: "effect" }), "effect");
    expect(groups).toHaveLength(1);
    expect(groups[0]!.label).toBe("");
  });

  it("never splits a sorted list into more groups than it has rows", () => {
    for (const sort of ["art", "level", "level-desc", "effect"] as const) {
      const rows = queryGuidelines(GUIDELINES, { technique: "Rego", sort });
      expect(groupGuidelines(rows, sort).flatMap((g) => g.rows)).toHaveLength(rows.length);
    }
  });
});
