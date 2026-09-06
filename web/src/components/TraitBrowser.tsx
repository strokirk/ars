import type { ComponentChildren } from "preact";
import { useMemo, useState } from "preact/hooks";
import { rules } from "../engine.ts";
import { queryTraits, traitCategories, type TraitQuery, type TraitSort } from "../lib/queries.ts";
import type { VirtueFlawRow } from "../../../chargen/src/data/types.ts";
import { FilterBar, type ActiveFilter, type SortOption } from "./ui/FilterBar.tsx";
import { ChipGroup } from "./ui/ChipGroup.tsx";
import { OptionList, OptionRow, MoreRows, useVisibleCount } from "./ui/OptionList.tsx";
import { TraitBadge, CategoryIcon } from "./ui/TraitBadge.tsx";

const SIZES = ["Minor", "Major"] as const;
const SORTS: SortOption<TraitSort>[] = [
  { value: "name", label: "Sort: A → Z" },
  { value: "name-desc", label: "Sort: Z → A" },
  { value: "size", label: "Sort: Size" },
  { value: "category", label: "Sort: Category" },
  { value: "random", label: "Sort: Random" },
];

// Virtues read green and Flaws red, the polarity the budget meters use.
const ACCENT = { Virtue: "#3f7d4f", Flaw: "#a8331f" } as const;

const newSeed = () => Math.floor(Math.random() * 0x7fffffff) + 1;

/**
 * Browsable Virtue & Flaw list. Standalone in the reference library; `filter` lets
 * a caller (the creator) narrow it to what a character may actually take, and
 * `action` adds a per-row button. Pass `kind` to drive the Virtue/Flaw choice from
 * outside (the library's tabs do) — otherwise the browser shows its own switch.
 */
export function TraitBrowser({
  filter, action, pageSize = 60, kind: kindProp, initialKind = "Virtue",
}: {
  filter?: (r: VirtueFlawRow) => boolean;
  action?: (r: VirtueFlawRow) => ComponentChildren;
  pageSize?: number;
  kind?: "Virtue" | "Flaw";
  initialKind?: "Virtue" | "Flaw";
}) {
  const [ownKind, setOwnKind] = useState<"Virtue" | "Flaw">(initialKind);
  const kind = kindProp ?? ownKind;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [size, setSize] = useState<"" | (typeof SIZES)[number]>("");
  const [sort, setSort] = useState<TraitSort>("name");
  const [seed, setSeed] = useState(newSeed);

  const pool = useMemo(
    () => queryTraits(rules.virtuesFlaws, { kind }).filter((r) => !filter || filter(r)),
    [kind, filter],
  );
  const categories = useMemo(() => traitCategories(pool), [pool]);
  const matches = useMemo(
    () => queryTraits(pool, {
      category: category || undefined,
      size: (size || undefined) as TraitQuery["size"],
      search: search || undefined,
      sort, seed,
    }),
    [pool, category, size, search, sort, seed],
  );
  const { visible, hidden, showMore, showAll } = useVisibleCount(matches, pageSize);

  const active: ActiveFilter[] = [
    category && { label: category, clear: () => setCategory("") },
    size && { label: size, clear: () => setSize("") },
  ].filter(Boolean) as ActiveFilter[];

  const clearAll = () => { setSearch(""); setCategory(""); setSize(""); };
  const noun = kind.toLowerCase();

  return (
    <div class="browser">
      <FilterBar
        search={search} onSearch={setSearch} placeholder={`Search ${noun}s by name or effect…`}
        sort={sort} sorts={SORTS} onSort={setSort}
        onShuffle={sort === "random" ? () => setSeed(newSeed()) : undefined}
        active={active} onClear={clearAll}
        lead={kindProp ? undefined : (
          <span class="chips kindswitch">
            <button class={`chip-toggle virtue ${kind === "Virtue" ? "on" : ""}`} onClick={() => { setOwnKind("Virtue"); setCategory(""); }}>Virtues</button>
            <button class={`chip-toggle flaw ${kind === "Flaw" ? "on" : ""}`} onClick={() => { setOwnKind("Flaw"); setCategory(""); }}>Flaws</button>
          </span>
        )}
        summary={
          <>
            {matches.length} {noun}{matches.length === 1 ? "" : "s"}
            {hidden > 0 && ` · showing ${visible.length}`}
          </>
        }
      >
        <div class="artfilter" role="group" aria-label="Filter by category">
          <button class={`chip-toggle ${category === "" ? "on" : ""}`} onClick={() => setCategory("")}>All categories</button>
          {categories.map((c) => (
            <button class={`chip-toggle ${category === c ? "on" : ""}`} key={c} onClick={() => setCategory(category === c ? "" : c)}>
              <CategoryIcon category={c} /> {c}
            </button>
          ))}
        </div>
        <ChipGroup options={SIZES} value={size} onChange={(v) => setSize(v)} allLabel="Any size" />
      </FilterBar>

      <OptionList empty={`No ${noun}s match these filters.`}>
        {visible.map((r) => (
          <OptionRow
            key={r.name}
            title={r.name}
            accent={ACCENT[r.kind as keyof typeof ACCENT]}
            badge={<TraitBadge kind={r.kind} size={r.size} category={r.category} />}
            meta={r.categories.length > 1 ? r.categories.join(" · ") : r.category}
            description={r.description}
            action={action?.(r)}
          />
        ))}
      </OptionList>
      <MoreRows hidden={hidden} pageSize={pageSize} onMore={showMore} onAll={showAll} />
    </div>
  );
}
