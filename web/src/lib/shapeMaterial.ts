// The Shape & Material Bonuses reference: which material or shape adds a bonus to
// an enchantment whose effect matches its free text (Ch.8, Arcane Discovery), and
// how much. Generated from the Markdown table by tools/extract_shape_material.py —
// never hand-edited (same pattern as data/guidelines.json + lib/guidelines.ts).
//
// Pure data + pure functions — no UI, no engine state, so it unit-tests directly.
import raw from "../../../data/shape_material.json";

export interface ShapeMaterialBonus {
  value: number | null;
  effect: string;
  /** Set when `effect` is exactly a Technique or Form name — e.g. "Corpus". */
  art?: string;
}

export interface ShapeMaterialEntry {
  item: string;
  bonuses: ShapeMaterialBonus[];
}

export const SHAPE_MATERIAL: ShapeMaterialEntry[] = raw as ShapeMaterialEntry[];

export type ShapeMaterialSort = "name" | "name-desc";

const norm = (s: string) => s.trim().toLowerCase();

/** Filter by item name or any bonus's effect text; sort alphabetically either way. */
export function queryShapeMaterial(
  all: readonly ShapeMaterialEntry[],
  { search, sort = "name" }: { search?: string; sort?: ShapeMaterialSort } = {},
): ShapeMaterialEntry[] {
  const s = search ? norm(search) : undefined;
  const rows = all
    .filter(
      (e) => !s || norm(e.item).includes(s) || e.bonuses.some((b) => norm(b.effect).includes(s)),
    )
    .slice()
    .sort((a, b) => a.item.localeCompare(b.item));
  return sort === "name-desc" ? rows.reverse() : rows;
}

/** "+3 controlling movement · +3 Corpus" — the line a row shows at a glance. */
export function bonusSummary(bonuses: readonly ShapeMaterialBonus[]): string {
  return bonuses.map((b) => (b.value === null ? b.effect : `+${b.value} ${b.effect}`)).join(" · ");
}
