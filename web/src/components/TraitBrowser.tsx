import type { ComponentChildren } from "preact";
import { useMemo, useState } from "preact/hooks";
import { rules } from "../engine.ts";
import {
  queryTraits,
  traitCategories,
  type TraitQuery,
  type TraitSort,
} from "../lib/queries.ts";
import type { VirtueFlawRow } from "../../../chargen/src/data/types.ts";
import {
  FilterBar,
  type ActiveFilter,
  type SortOption,
} from "./ui/FilterBar.tsx";
import { ChipGroup } from "./ui/ChipGroup.tsx";
import { OptionList, OptionRow } from "./ui/OptionList.tsx";
import { TraitBadge } from "./ui/TraitBadge.tsx";
import { Select } from "./ui/Select.tsx";

const SIZES = ["Minor", "Major"] as const;
const KINDS = ["Virtue", "Flaw"] as const;
type KindFilter = (typeof KINDS)[number] | "";
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
 * a caller (the creator) narrow it to what a character may actually take, `action`
 * adds a per-row button and `tag` a note beside the badge. Pass `kind` to drive the
 * Virtue/Flaw choice from outside (the library's tabs do) — otherwise it's one more
 * filter group, and both kinds list together until narrowed.
 */
export function TraitBrowser({
  filter,
  action,
  tag,
  kind: kindProp,
  initialKind = "",
}: {
  filter?: (r: VirtueFlawRow) => boolean;
  action?: (r: VirtueFlawRow) => ComponentChildren;
  tag?: (r: VirtueFlawRow) => ComponentChildren;
  kind?: "Virtue" | "Flaw";
  initialKind?: KindFilter;
}) {
  const [ownKind, setOwnKind] = useState<KindFilter>(initialKind);
  const kind = kindProp ?? ownKind;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [size, setSize] = useState<"" | (typeof SIZES)[number]>("");
  const [sort, setSort] = useState<TraitSort>("name");
  const [seed, setSeed] = useState(newSeed);

  const pool = useMemo(
    () =>
      queryTraits(rules.virtuesFlaws, { kind: kind || undefined }).filter(
        (r) => !filter || filter(r),
      ),
    [kind, filter],
  );
  const categories = useMemo(() => traitCategories(pool), [pool]);
  const matches = useMemo(
    () =>
      queryTraits(pool, {
        category: category || undefined,
        size: (size || undefined) as TraitQuery["size"],
        search: search || undefined,
        sort,
        seed,
      }),
    [pool, category, size, search, sort, seed],
  );
  const active: ActiveFilter[] = [
    !kindProp && ownKind && { label: `${ownKind}s`, clear: () => setOwnKind("") },
    category && { label: category, clear: () => setCategory("") },
    size && { label: size, clear: () => setSize("") },
  ].filter(Boolean) as ActiveFilter[];

  const clearAll = () => {
    setSearch("");
    if (!kindProp) setOwnKind("");
    setCategory("");
    setSize("");
  };
  const noun = kind ? `${kind.toLowerCase()}s` : "virtues & flaws";

  return (
    <div class="browser">
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder={`Search ${noun} by name or effect…`}
        sort={sort}
        sorts={SORTS}
        onSort={setSort}
        onShuffle={sort === "random" ? () => setSeed(newSeed()) : undefined}
        active={active}
        onClear={clearAll}
        summary={<>{matches.length} {matches.length === 1 && kind ? kind.toLowerCase() : noun}</>}
      >
        <div class="chips-row">
        {!kindProp && (
          <ChipGroup
            options={KINDS}
            value={ownKind}
            onChange={(v) => { setOwnKind(v); setCategory(""); }}
            allLabel="Both"
            labelOf={(k) => `${k}s`}
          />
        )}
        <ChipGroup
          options={SIZES}
          value={size}
          onChange={(v) => setSize(v)}
          allLabel="Any size"
        />
          <Select
            label="Category"
            pill
            active={category !== ""}
            value={category}
            onChange={setCategory}
            options={[{ value: "", label: "All categories" }, ...categories.map((c) => ({ value: c, label: c }))]}
          />
        </div>
      </FilterBar>

      <OptionList empty={`No ${noun} match these filters.`}>
        {matches.map((r) => (
          <OptionRow
            key={r.name}
            title={r.name}
            accent={ACCENT[r.kind as keyof typeof ACCENT]}
            badge={
              <>
                <TraitBadge kind={r.kind} size={r.size} category={r.category} />
                {tag?.(r)}
              </>
            }
            meta={
              r.categories.length > 1 ? r.categories.join(" · ") : r.category
            }
            description={r.description}
            action={action?.(r)}
          />
        ))}
      </OptionList>
    </div>
  );
}
