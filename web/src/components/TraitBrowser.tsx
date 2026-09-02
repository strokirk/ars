import type { ComponentChildren } from "preact";
import { useMemo, useState } from "preact/hooks";
import { rules } from "../engine.ts";
import { queryTraits, traitCategories, type TraitQuery } from "../lib/queries.ts";
import type { VirtueFlawRow } from "../../../chargen/src/data/types.ts";
import { SearchField } from "./ui/SearchField.tsx";
import { ChipGroup } from "./ui/ChipGroup.tsx";
import { OptionList, OptionRow } from "./ui/OptionList.tsx";

const SIZES = ["Minor", "Major"] as const;

/**
 * Browsable Virtue & Flaw list. Standalone in the reference library; `filter` lets
 * a caller (the creator) narrow it to what a character may actually take, and
 * `action` adds a per-row button.
 */
export function TraitBrowser({
  filter, action, limit = 80, initialKind = "Virtue",
}: {
  filter?: (r: VirtueFlawRow) => boolean;
  action?: (r: VirtueFlawRow) => ComponentChildren;
  limit?: number;
  initialKind?: "Virtue" | "Flaw";
}) {
  const [kind, setKind] = useState<"Virtue" | "Flaw">(initialKind);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [size, setSize] = useState<"" | (typeof SIZES)[number]>("");

  const pool = useMemo(
    () => queryTraits(rules.virtuesFlaws, { kind }).filter((r) => !filter || filter(r)),
    [kind, filter],
  );
  const categories = useMemo(() => traitCategories(pool), [pool]);
  const matches = useMemo(
    () => queryTraits(pool, { category: category || undefined, size: (size || undefined) as TraitQuery["size"], search: search || undefined }),
    [pool, category, size, search],
  );
  const shown = matches.slice(0, limit);

  return (
    <div>
      <div class="chips" style="margin-bottom:.7rem;">
        <button class={`chip-toggle ${kind === "Virtue" ? "on" : ""}`} onClick={() => { setKind("Virtue"); setCategory(""); }}>Virtues</button>
        <button class={`chip-toggle ${kind === "Flaw" ? "on" : ""}`} onClick={() => { setKind("Flaw"); setCategory(""); }}>Flaws</button>
      </div>

      <SearchField value={search} onInput={setSearch} placeholder={`Search ${kind.toLowerCase()}s by name or effect…`} />

      <div class="filters">
        <ChipGroup options={categories} value={category} onChange={setCategory} allLabel="All categories" />
        <ChipGroup options={SIZES} value={size} onChange={(v) => setSize(v)} allLabel="Any size" />
      </div>

      <p class="note" style="margin:.5rem 0;">
        {matches.length} {kind.toLowerCase()}{matches.length === 1 ? "" : "s"}
        {matches.length > shown.length && ` · showing the first ${shown.length}`}
      </p>

      <OptionList empty={`No ${kind.toLowerCase()}s match these filters.`}>
        {shown.map((r) => (
          <OptionRow
            key={r.name}
            title={r.name}
            meta={[r.size, r.category].filter(Boolean).join(" · ")}
            description={r.description}
            action={action?.(r)}
          />
        ))}
      </OptionList>
    </div>
  );
}
