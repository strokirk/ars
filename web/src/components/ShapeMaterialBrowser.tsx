import { useMemo, useState } from "preact/hooks";
import {
  SHAPE_MATERIAL, queryShapeMaterial, bonusSummary, type ShapeMaterialSort,
} from "../lib/shapeMaterial.ts";
import { FilterBar, type SortOption } from "./ui/FilterBar.tsx";
import { OptionList, OptionRow } from "./ui/OptionList.tsx";

const SORTS: SortOption<ShapeMaterialSort>[] = [
  { value: "name", label: "Sort: A → Z" },
  { value: "name-desc", label: "Sort: Z → A" },
];

/**
 * Browse the Shape & Material Bonuses table (Ch.8, Arcane Discovery): which
 * material or shape adds a bonus to an enchantment whose effect matches its
 * free text, and how much. Reference only — matching an effect against the
 * text, and the Magic Theory cap, are still a judgment call (see the downtime
 * planner's "Open & invest in a device" and "Make a charged item" activities).
 */
export function ShapeMaterialBrowser() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<ShapeMaterialSort>("name");

  const matches = useMemo(
    () => queryShapeMaterial(SHAPE_MATERIAL, { search, sort }),
    [search, sort],
  );

  return (
    <div class="browser">
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Search materials, shapes or effects…"
        sort={sort}
        sorts={SORTS}
        onSort={setSort}
        summary={
          <>
            {matches.length} item{matches.length === 1 ? "" : "s"}
          </>
        }
      />

      <OptionList empty="No materials or shapes match that search.">
        {matches.map((e) => (
          <OptionRow
            key={e.item}
            title={e.item}
            meta={`${e.bonuses.length} bonus${e.bonuses.length === 1 ? "" : "es"}`}
            description={bonusSummary(e.bonuses)}
          />
        ))}
      </OptionList>
    </div>
  );
}
