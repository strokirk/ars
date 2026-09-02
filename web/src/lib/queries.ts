// Pure query/sort helpers over the rules rows. `RulesData.filter*` handles the simple
// equality cases; these add the things the browsing UIs need (level ranges, ritual
// flag, Lab Total reachability, ordering) and stay free of any UI or engine state so
// they can be unit-tested directly.
import type { SpellRow, VirtueFlawRow } from "../../../chargen/src/data/types.ts";
import { TECHNIQUES, FORMS } from "../../../chargen/src/domain/glossary.ts";
import { artPair, canonicalRange, canonicalDuration, canonicalTarget } from "./arts.ts";

const norm = (s: string) => s.trim().toLowerCase();

// ── spells ───────────────────────────────────────────────────────────────────

export type SpellSort = "name" | "level" | "level-desc" | "art";

export interface SpellQuery {
  search?: string;
  technique?: string;
  form?: string;
  /** Canonical abbreviations (see lib/arts.ts) — the raw data spells these several ways. */
  range?: string;
  duration?: string;
  target?: string;
  minLevel?: number;
  maxLevel?: number;
  /** "any" (default) keeps both; otherwise restrict to rituals or to formulaic. */
  ritual?: "any" | "only" | "exclude";
  /** General-level spells have level === null; excluded unless this is true. */
  includeGeneral?: boolean;
  /** Keep only spells whose level is within the character's Lab Total. */
  onlyReachable?: boolean;
  sort?: SpellSort;
}

const TECH_ORDER = new Map(TECHNIQUES.map((t, i) => [t, i]));
const FORM_ORDER = new Map(FORMS.map((f, i) => [f, i]));

/**
 * Filter and order the spell list. `labTotalOf` is required only when
 * `onlyReachable` is set; it returns the character's Lab Total for that spell.
 */
export function querySpells(
  all: readonly SpellRow[],
  q: SpellQuery = {},
  labTotalOf?: (s: SpellRow) => number,
): SpellRow[] {
  const s = q.search ? norm(q.search) : undefined;
  const out = all.filter((sp) => {
    if (sp.is_general && !q.includeGeneral) return false;
    if (q.technique && norm(sp.technique) !== norm(q.technique)) return false;
    if (q.form && norm(sp.form) !== norm(q.form)) return false;
    if (q.range && canonicalRange(sp.range) !== q.range) return false;
    if (q.duration && canonicalDuration(sp.duration) !== q.duration) return false;
    if (q.target && canonicalTarget(sp.target) !== q.target) return false;
    if (q.ritual === "only" && !sp.is_ritual) return false;
    if (q.ritual === "exclude" && sp.is_ritual) return false;
    // Level bounds never apply to General spells (level === null), which are only
    // present at all when includeGeneral asked for them.
    if (sp.level !== null) {
      if (q.minLevel !== undefined && sp.level < q.minLevel) return false;
      if (q.maxLevel !== undefined && sp.level > q.maxLevel) return false;
      if (q.onlyReachable && labTotalOf && sp.level > labTotalOf(sp)) return false;
    }
    if (s && !norm(sp.name).includes(s) && !norm(sp.description).includes(s)) return false;
    return true;
  });
  return sortSpells(out, q.sort ?? "name");
}

export function sortSpells(rows: SpellRow[], sort: SpellSort): SpellRow[] {
  const byName = (a: SpellRow, b: SpellRow) => a.name.localeCompare(b.name);
  // General spells sort last in level orders — they have no fixed level.
  const lvl = (s: SpellRow) => (s.level === null ? Number.POSITIVE_INFINITY : s.level);
  const out = rows.slice();
  if (sort === "level") return out.sort((a, b) => lvl(a) - lvl(b) || byName(a, b));
  if (sort === "level-desc") {
    const d = (s: SpellRow) => (s.level === null ? Number.NEGATIVE_INFINITY : s.level);
    return out.sort((a, b) => d(b) - d(a) || byName(a, b));
  }
  if (sort === "art") {
    return out.sort(
      (a, b) =>
        (TECH_ORDER.get(a.technique as never) ?? 99) - (TECH_ORDER.get(b.technique as never) ?? 99) ||
        (FORM_ORDER.get(a.form as never) ?? 99) - (FORM_ORDER.get(b.form as never) ?? 99) ||
        lvl(a) - lvl(b) ||
        byName(a, b),
    );
  }
  return out.sort(byName);
}

// ── grouping ─────────────────────────────────────────────────────────────────

export type SpellGroupBy = "none" | "technique" | "form" | "art" | "level";

export interface SpellGroup {
  key: string;
  label: string;
  rows: SpellRow[];
}

const LEVEL_BANDS: { max: number; label: string }[] = [
  { max: 5, label: "Level 1–5" },
  { max: 10, label: "Level 6–10" },
  { max: 15, label: "Level 11–15" },
  { max: 20, label: "Level 16–20" },
  { max: 25, label: "Level 21–25" },
  { max: 30, label: "Level 26–30" },
  { max: 40, label: "Level 31–40" },
  { max: Infinity, label: "Level 41+" },
];

const levelBand = (s: SpellRow): string =>
  s.level === null ? "General" : LEVEL_BANDS.find((b) => s.level! <= b.max)!.label;

/**
 * Split an already-filtered, already-sorted list into labelled groups, preserving
 * the incoming row order within each group. Group order follows the canonical Art
 * order (or ascending level band) rather than first-appearance, so the headings
 * read the same whatever the sort.
 */
export function groupSpells(rows: readonly SpellRow[], by: SpellGroupBy): SpellGroup[] {
  if (by === "none") return [{ key: "all", label: "", rows: rows.slice() }];

  const groups = new Map<string, { label: string; order: number; rows: SpellRow[] }>();
  for (const s of rows) {
    const { key, label, order } = groupOf(s, by);
    let g = groups.get(key);
    if (!g) { g = { label, order, rows: [] }; groups.set(key, g); }
    g.rows.push(s);
  }
  return [...groups.entries()]
    .sort((a, b) => a[1].order - b[1].order)
    .map(([key, g]) => ({ key, label: g.label, rows: g.rows }));
}

function groupOf(s: SpellRow, by: SpellGroupBy): { key: string; label: string; order: number } {
  const t = TECHNIQUES.indexOf(s.technique as never);
  const f = FORMS.indexOf(s.form as never);
  // Unknown Arts (OCR noise) sort last rather than colliding at index -1.
  const ti = t < 0 ? TECHNIQUES.length : t;
  const fi = f < 0 ? FORMS.length : f;

  if (by === "technique") return { key: s.technique, label: s.technique, order: ti };
  if (by === "form") return { key: s.form, label: s.form, order: fi };
  if (by === "art") {
    return {
      key: artPair(s.technique, s.form),
      label: `${s.technique} ${s.form}`,
      order: ti * (FORMS.length + 1) + fi,
    };
  }
  if (s.level === null) return { key: "General", label: "General level", order: LEVEL_BANDS.length };
  const i = LEVEL_BANDS.findIndex((b) => s.level! <= b.max);
  return { key: LEVEL_BANDS[i]!.label, label: LEVEL_BANDS[i]!.label, order: i };
}

// ── virtues & flaws ──────────────────────────────────────────────────────────

export interface TraitQuery {
  search?: string;
  kind?: "Virtue" | "Flaw";
  category?: string;
  size?: "Minor" | "Major";
}

/** Filter virtues/flaws, name-sorted. "Major or Minor" rows match either size. */
export function queryTraits(all: readonly VirtueFlawRow[], q: TraitQuery = {}): VirtueFlawRow[] {
  const s = q.search ? norm(q.search) : undefined;
  return all
    .filter((r) => {
      if (q.kind && r.kind !== q.kind) return false;
      if (q.size && r.size !== q.size && r.size !== "Major or Minor") return false;
      if (q.category && norm(r.category) !== norm(q.category) && !r.categories.some((c) => norm(c) === norm(q.category!))) return false;
      if (s && !norm(r.name).includes(s) && !norm(r.description).includes(s)) return false;
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Distinct categories present in a set of rows, name-sorted. */
export function traitCategories(rows: readonly VirtueFlawRow[]): string[] {
  return [...new Set(rows.map((r) => r.category).filter(Boolean))].sort();
}
