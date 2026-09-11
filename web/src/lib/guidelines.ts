// The spell-guideline reference model: the generated effect rows (data/guidelines.json)
// merged with the hand-maintained per-book metadata (data/guidelines/*.yaml), plus the
// level arithmetic both the reference and the designer run on.
//
// Pure data + pure functions — no UI, no engine state, so it unit-tests directly.
import raw from "../../../data/guidelines.json";

// @rollup/plugin-yaml parses these at build time; the app ships no YAML parser.
// Globbing means a supplement is added by dropping a file into data/guidelines/ —
// see that directory's README.md for the schema.
const yamlFiles = import.meta.glob<{ default: unknown }>("../../../data/guidelines/*.yaml", {
  eager: true,
});

export type ParamKind = "range" | "duration" | "target";
export type TargetKind = "object" | "container" | "sense";

export interface Book {
  key: string;
  name: string;
  abbr: string;
}

/** One rung of a Range / Duration / Target ladder. */
export interface Param {
  key: string;
  name: string;
  kind: ParamKind;
  /** Targets only: which of the three parallel ladders this rung belongs to. */
  targetKind?: TargetKind;
  magnitudes: number;
  summary: string;
  description: string;
  /** True if choosing this rung forces the spell to be cast as a Ritual. */
  ritual: boolean;
  baseSize?: string;
  notes: string[];
  book: string;
}

export interface FormInfo {
  name: string;
  baseIndividual: string;
  notes: string[];
  book: string;
}

export interface ArtNote {
  technique: string;
  form: string;
  notes: string[];
  book: string;
}

export interface Rule {
  title: string;
  text: string;
}

/** One guideline effect — what a given level buys, at Personal/Momentary/Individual. */
export interface Guideline {
  id: string;
  technique: string;
  form: string;
  level: number | null;
  isGeneral: boolean;
  effect: string;
  /** True if the guideline itself says the effect must be a Ritual. */
  ritual: boolean;
  notes: string[];
  book: string;
}

// ── loading ──────────────────────────────────────────────────────────────────

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const strs = (v: unknown): string[] => list(v).map(str).filter(Boolean);

/**
 * A guideline that spells out "must be a Ritual" in its own text. The designer needs
 * this as a flag; the text keeps it too, so the reader still sees why.
 */
const saysRitual = (effect: string): boolean => /\britual\b/i.test(effect);

function readParam(row: Record<string, unknown>, kind: ParamKind, book: string): Param | null {
  const key = str(row.key);
  const name = str(row.name) || key;
  if (!key) return null;
  const magnitudes = typeof row.magnitudes === "number" ? row.magnitudes : NaN;
  if (!Number.isInteger(magnitudes)) {
    throw new Error(`guidelines: ${book}/${kind} "${key}" has a non-integer magnitudes`);
  }
  const targetKind = str(row.kind) as TargetKind;
  return {
    key,
    name,
    kind,
    targetKind: kind === "target" ? (targetKind || "object") : undefined,
    magnitudes,
    summary: str(row.summary),
    description: str(row.description),
    ritual: row.ritual === true,
    baseSize: str(row.base_size) || undefined,
    notes: strs(row.notes),
    book: str(row.book) || book,
  };
}

interface Loaded {
  books: Book[];
  ranges: Param[];
  durations: Param[];
  targets: Param[];
  forms: FormInfo[];
  artNotes: ArtNote[];
  levelRules: Rule[];
  sizeRules: Rule[];
  guidelines: Guideline[];
}

/**
 * Merge every book file plus the generated effect rows into one model.
 *
 * Later books extend the core ladders: a rung whose `key` is new is appended, and one
 * that reuses a core `key` replaces it *for that book* rather than mutating core — so a
 * table running only the core book still sees the core rung.
 */
function load(files: Record<string, { default: unknown }>, effectRows: unknown[]): Loaded {
  const out: Loaded = {
    books: [], ranges: [], durations: [], targets: [], forms: [],
    artNotes: [], levelRules: [], sizeRules: [], guidelines: [],
  };

  // Sorted so the bundle order (which glob does not promise) never changes the output.
  for (const path of Object.keys(files).sort()) {
    const doc = (files[path]!.default ?? {}) as Record<string, unknown>;
    const bookRow = (doc.book ?? {}) as Record<string, unknown>;
    const key = str(bookRow.key) || path.replace(/^.*\/|\.yaml$/g, "");
    if (out.books.some((b) => b.key === key)) {
      throw new Error(`guidelines: two files declare book "${key}"`);
    }
    out.books.push({ key, name: str(bookRow.name) || key, abbr: str(bookRow.abbr) || key });

    const params = (field: string, kind: ParamKind, into: Param[]) => {
      const seen = new Set<string>();
      for (const row of list(doc[field])) {
        const p = readParam(row as Record<string, unknown>, kind, key);
        if (!p) continue;
        if (seen.has(p.key)) throw new Error(`guidelines: ${key} repeats ${kind} "${p.key}"`);
        seen.add(p.key);
        into.push(p);
      }
    };
    params("ranges", "range", out.ranges);
    params("durations", "duration", out.durations);
    params("targets", "target", out.targets);

    for (const row of list(doc.forms) as Record<string, unknown>[]) {
      if (!str(row.name)) continue;
      out.forms.push({
        name: str(row.name),
        baseIndividual: str(row.base_individual),
        notes: strs(row.notes),
        book: str(row.book) || key,
      });
    }
    for (const row of list(doc.art_notes) as Record<string, unknown>[]) {
      const notes = strs(row.notes);
      if (!notes.length) continue;
      out.artNotes.push({
        technique: str(row.technique),
        form: str(row.form),
        notes,
        book: str(row.book) || key,
      });
    }
    const rules = (field: string, into: Rule[]) => {
      for (const row of list(doc[field]) as Record<string, unknown>[]) {
        if (str(row.text)) into.push({ title: str(row.title), text: str(row.text) });
      }
    };
    rules("level_rules", out.levelRules);
    rules("size_rules", out.sizeRules);

    // Effect rows for a book whose Markdown this repo does not carry.
    for (const row of list(doc.guidelines) as Record<string, unknown>[]) {
      const effect = str(row.effect);
      if (!effect) continue;
      const level = typeof row.level === "number" ? row.level : null;
      out.guidelines.push({
        id: `${key}:${out.guidelines.length}`,
        technique: str(row.technique),
        form: str(row.form),
        level,
        isGeneral: level === null,
        effect,
        ritual: row.ritual === true || saysRitual(effect),
        notes: strs(row.notes),
        book: key,
      });
    }
  }

  // The core book's effects are generated from the Markdown, not written by hand.
  const generated = effectRows as {
    technique: string; form: string; level: number | null; is_general: boolean; effect: string;
  }[];
  out.guidelines.unshift(
    ...generated.map((g, i) => ({
      id: `core:md:${i}`,
      technique: g.technique,
      form: g.form,
      level: g.level,
      isGeneral: g.is_general,
      effect: g.effect,
      ritual: saysRitual(g.effect),
      notes: [],
      book: "core",
    })),
  );
  return out;
}

const data = load(yamlFiles, raw as unknown[]);

export const BOOKS: Book[] = data.books;
export const RANGE_LADDER: Param[] = data.ranges;
export const DURATION_LADDER: Param[] = data.durations;
export const TARGET_LADDER: Param[] = data.targets;
export const FORM_INFO: FormInfo[] = data.forms;
export const ART_NOTES: ArtNote[] = data.artNotes;
export const LEVEL_RULES: Rule[] = data.levelRules;
export const SIZE_RULES: Rule[] = data.sizeRules;
export const GUIDELINES: Guideline[] = data.guidelines;

export const bookOf = (key: string): Book | undefined => BOOKS.find((b) => b.key === key);

export const paramsOf = (kind: ParamKind): Param[] =>
  kind === "range" ? RANGE_LADDER : kind === "duration" ? DURATION_LADDER : TARGET_LADDER;

/** The three parallel Target ladders, in the order the rulebook prints them. */
export const TARGET_KINDS: { key: TargetKind; label: string; blurb: string }[] = [
  { key: "object", label: "Object", blurb: "The thing itself — one, a piece of one, or many." },
  { key: "container", label: "Container", blurb: "A space that must actually exist around the things affected." },
  { key: "sense", label: "Sense", blurb: "Intellego's magical senses, from Taste up to Vision." },
];

export const findParam = (kind: ParamKind, key: string, book?: string): Param | undefined => {
  const rows = paramsOf(kind).filter((p) => p.key === key);
  // A supplement's rung wins for a table running that supplement; core is the fallback.
  return (book && rows.find((p) => p.book === book)) || rows[0];
};

/** Notes attached to one Technique+Form pair, across every book in play. */
export const artNotesFor = (technique: string, form: string): ArtNote[] =>
  ART_NOTES.filter((n) => n.technique === technique && n.form === form);

export const formInfo = (form: string): FormInfo | undefined =>
  FORM_INFO.find((f) => f.name === form);

// ── level arithmetic ─────────────────────────────────────────────────────────
// Spell levels do not run 1..n; they run 1,2,3,4,5,10,15,20,... because "below level 5,
// adding a magnitude only adds one level". Treating that ladder as a list of rungs makes
// every step exact and reversible, where `level + 5 * magnitudes` silently goes wrong at
// the bottom (the rulebook's own example takes level 15 down five magnitudes to 2, not
// to -10).

/** Position of a level on the magnitude ladder: 1..5 are rungs 1..5, then every +5. */
export function levelRung(level: number): number {
  return level <= 5 ? Math.max(1, Math.round(level)) : Math.round(level / 5) + 4;
}

/** The level at a rung — the inverse of `levelRung`. Rungs below 1 clamp to level 1. */
export function rungLevel(rung: number): number {
  if (rung <= 1) return 1;
  return rung <= 5 ? rung : (rung - 4) * 5;
}

/**
 * Move a level by `magnitudes` steps (negative steps down), honouring the compressed
 * bottom of the ladder. Level 5 − 1 magnitude is 4, not 0; level 2 + 1 is 3, not 7.
 */
export const addMagnitudes = (level: number, magnitudes: number): number =>
  rungLevel(levelRung(level) + Math.round(magnitudes));

/** Magnitude of a finished spell — level ÷ 5, rounded up, and never less than 1. */
export const magnitudeOf = (level: number): number => Math.max(1, Math.ceil(level / 5));

export interface DesignInput {
  /** Base level from the guideline. General guidelines have no level, so pick one. */
  base: number;
  range: Param;
  duration: Param;
  target: Param;
  /** Extra magnitudes for target size (see data/guidelines/README.md, size_rules). */
  size?: number;
  /** Magnitudes for requisites, complexity, or anything the troupe adds. */
  extra?: number;
  /** The guideline itself demands a Ritual. */
  guidelineRitual?: boolean;
  /** Creo effects that create something lasting must be Momentary Rituals. */
  lastingCreo?: boolean;
  technique?: string;
}

export interface DesignResult {
  level: number;
  magnitude: number;
  /** Every contribution in order, for the "why is it this level" breakdown. */
  steps: { label: string; magnitudes: number; running: number }[];
  totalMagnitudes: number;
  isRitual: boolean;
  ritualReasons: string[];
  /** Things the design breaks — a Personal container Target, a Formulaic over 50. */
  warnings: string[];
}

/**
 * Total a spell from its guideline and parameters, and say why it came out there.
 *
 * Mirrors §"Spell Design": every raised step is +1 magnitude, Ritual is forced by the
 * guideline / Duration Year / Target Boundary / a lasting Creo, and a non-Ritual spell
 * cannot exceed level 50.
 */
export function designSpell(input: DesignInput): DesignResult {
  const { base, range, duration, target, size = 0, extra = 0 } = input;
  const steps: DesignResult["steps"] = [];
  let level = Math.max(1, Math.round(base));
  steps.push({ label: "Base guideline", magnitudes: 0, running: level });

  const step = (label: string, magnitudes: number) => {
    if (!magnitudes) return;
    level = addMagnitudes(level, magnitudes);
    steps.push({ label, magnitudes, running: level });
  };
  step(`Range: ${range.name}`, range.magnitudes);
  step(`Duration: ${duration.name}`, duration.magnitudes);
  step(`Target: ${target.name}`, target.magnitudes);
  step("Target size", size);
  step("Requisites & complexity", extra);

  const ritualReasons: string[] = [];
  if (input.guidelineRitual) ritualReasons.push("the guideline requires a Ritual");
  if (duration.ritual) ritualReasons.push(`Duration ${duration.name} must be a Ritual`);
  if (target.ritual) ritualReasons.push(`Target ${target.name} must be a Ritual`);
  if (input.lastingCreo) ritualReasons.push("a Creo effect that lasts must be a Momentary Ritual");
  if (level > 50) ritualReasons.push("Formulaic and Spontaneous spells cap at level 50");

  const isRitual = ritualReasons.length > 0;
  // "Rituals are always at least level 20" — a Ritual that totals lower is cast at 20.
  if (isRitual && level < 20) {
    level = 20;
    steps.push({ label: "Rituals are at least level 20", magnitudes: 0, running: level });
  }

  const warnings: string[] = [];
  if (range.key === "Per" && target.targetKind === "container") {
    warnings.push("Personal Range cannot take a container Target (Circle, Room, Structure, Boundary).");
  }
  if (input.technique === "Intellego" && size > 0) {
    warnings.push("Intellego spells are not affected by Target size — the size magnitudes are free.");
  }
  if (target.targetKind === "sense" && input.technique && input.technique !== "Intellego") {
    warnings.push("Sense Targets are for Intellego's magical senses.");
  }

  return {
    level,
    magnitude: magnitudeOf(level),
    steps,
    totalMagnitudes: range.magnitudes + duration.magnitudes + target.magnitudes + size + extra,
    isRitual,
    ritualReasons,
    warnings,
  };
}

// ── querying ─────────────────────────────────────────────────────────────────

export type GuidelineSort = "level" | "level-desc" | "art" | "effect";

export interface GuidelineQuery {
  search?: string;
  technique?: string;
  form?: string;
  book?: string;
  minLevel?: number;
  maxLevel?: number;
  includeGeneral?: boolean;
  sort?: GuidelineSort;
}

const TECH_ORDER = ["Creo", "Intellego", "Muto", "Perdo", "Rego"];
const FORM_ORDER = [
  "Animal", "Aquam", "Auram", "Corpus", "Herbam",
  "Ignem", "Imaginem", "Mentem", "Terram", "Vim",
];
const norm = (s: string) => s.trim().toLowerCase();

/** Filter and order guideline effects. General rows sort last in level orders. */
export function queryGuidelines(
  all: readonly Guideline[],
  q: GuidelineQuery = {},
): Guideline[] {
  const s = q.search ? norm(q.search) : undefined;
  const rows = all.filter((g) => {
    if (g.isGeneral && q.includeGeneral === false) return false;
    if (q.technique && g.technique !== q.technique) return false;
    if (q.form && g.form !== q.form) return false;
    if (q.book && g.book !== q.book) return false;
    if (g.level !== null) {
      if (q.minLevel !== undefined && g.level < q.minLevel) return false;
      if (q.maxLevel !== undefined && g.level > q.maxLevel) return false;
    }
    if (s && !norm(g.effect).includes(s)) return false;
    return true;
  });

  const lvl = (g: Guideline) => (g.level === null ? Number.POSITIVE_INFINITY : g.level);
  const art = (g: Guideline) =>
    (TECH_ORDER.indexOf(g.technique) + 1 || 99) * 100 + (FORM_ORDER.indexOf(g.form) + 1 || 99);
  const byEffect = (a: Guideline, b: Guideline) => a.effect.localeCompare(b.effect);

  const sort = q.sort ?? "level";
  if (sort === "effect") return rows.sort(byEffect);
  if (sort === "art") return rows.sort((a, b) => art(a) - art(b) || lvl(a) - lvl(b) || byEffect(a, b));
  if (sort === "level-desc") {
    const d = (g: Guideline) => (g.level === null ? Number.NEGATIVE_INFINITY : g.level);
    return rows.sort((a, b) => d(b) - d(a) || art(a) - art(b));
  }
  return rows.sort((a, b) => lvl(a) - lvl(b) || art(a) - art(b) || byEffect(a, b));
}

export interface GuidelineGroup {
  key: string;
  /** Heading text; "" renders no heading. */
  label: string;
  /** Set only for Art groups, so the heading can take the Technique's colour. */
  technique?: string;
  form?: string;
  rows: Guideline[];
}

/** Split guidelines into Technique+Form blocks, in canonical Art order. */
export function groupByArt(rows: readonly Guideline[]): GuidelineGroup[] {
  const groups = new Map<string, GuidelineGroup>();
  for (const g of rows) {
    const key = `${g.technique} ${g.form}`;
    let group = groups.get(key);
    if (!group) {
      group = { key, label: key, technique: g.technique, form: g.form, rows: [] };
      groups.set(key, group);
    }
    group.rows.push(g);
  }
  return [...groups.values()].sort(
    (a, b) =>
      (TECH_ORDER.indexOf(a.technique!) + 1 || 99) - (TECH_ORDER.indexOf(b.technique!) + 1 || 99) ||
      (FORM_ORDER.indexOf(a.form!) + 1 || 99) - (FORM_ORDER.indexOf(b.form!) + 1 || 99),
  );
}

/** Split guidelines by level, General last. Ordered by level, not first appearance. */
export function groupByLevel(rows: readonly Guideline[]): GuidelineGroup[] {
  const groups = new Map<string, GuidelineGroup & { order: number }>();
  for (const g of rows) {
    const key = g.level === null ? "General" : `Level ${g.level}`;
    let group = groups.get(key);
    if (!group) {
      group = { key, label: key, order: g.level ?? Number.POSITIVE_INFINITY, rows: [] };
      groups.set(key, group);
    }
    group.rows.push(g);
  }
  return [...groups.values()].sort((a, b) => a.order - b.order);
}

/**
 * Group the way the current sort orders, so a heading always covers a run of adjacent
 * rows. Grouping by Art under a level sort is what produces a heading per row.
 */
export function groupGuidelines(rows: readonly Guideline[], sort: GuidelineSort): GuidelineGroup[] {
  if (sort === "art") return groupByArt(rows);
  if (sort === "effect") return [{ key: "all", label: "", rows: rows.slice() }];
  return groupByLevel(rows);
}
