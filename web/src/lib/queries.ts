// Pure query/sort helpers over the rules rows. `RulesData.filter*` handles the simple
// equality cases; these add the things the browsing UIs need (level ranges, ritual
// flag, Lab Total reachability, ordering) and stay free of any UI or engine state so
// they can be unit-tested directly.
import type { SpellRow, VirtueFlawRow } from "../../../chargen/src/data/types.ts";
import { TECHNIQUES, FORMS } from "../../../chargen/src/domain/glossary.ts";

const norm = (s: string) => s.trim().toLowerCase();

// ── spells ───────────────────────────────────────────────────────────────────

export type SpellSort = "name" | "level" | "level-desc" | "art";

export interface SpellQuery {
  search?: string;
  technique?: string;
  form?: string;
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
