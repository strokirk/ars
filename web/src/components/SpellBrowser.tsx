import type { ComponentChildren } from "preact";
import { useMemo, useState } from "preact/hooks";
import { rules } from "../engine.ts";
import { querySpells, type SpellQuery, type SpellSort } from "../lib/queries.ts";
import { TECHNIQUES, FORMS, ART_ABBR } from "../../../chargen/src/domain/glossary.ts";
import type { SpellRow } from "../../../chargen/src/data/types.ts";
import { SearchField } from "./ui/SearchField.tsx";
import { ChipGroup } from "./ui/ChipGroup.tsx";
import { OptionList, OptionRow } from "./ui/OptionList.tsx";

const MAX_LEVELS = [10, 15, 20, 25, 30, 35, 40, 50];
const SORTS: { value: SpellSort; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "level", label: "Level ↑" },
  { value: "level-desc", label: "Level ↓" },
  { value: "art", label: "Technique/Form" },
];

/**
 * Browsable, filterable spell list. Used both inside the magus creator (where
 * `labTotalOf` enables the Lab Total column and the "within reach" filter, and
 * `action` renders the Learn button) and standalone in the reference library.
 */
export function SpellBrowser({
  labTotalOf, action, limit = 80,
}: {
  labTotalOf?: (s: SpellRow) => number;
  action?: (s: SpellRow) => ComponentChildren;
  limit?: number;
}) {
  const [search, setSearch] = useState("");
  const [technique, setTechnique] = useState<string>("");
  const [form, setForm] = useState<string>("");
  const [maxLevel, setMaxLevel] = useState<number | "">("");
  const [ritual, setRitual] = useState<NonNullable<SpellQuery["ritual"]>>("any");
  const [onlyReachable, setOnlyReachable] = useState(false);
  const [sort, setSort] = useState<SpellSort>("name");

  const matches = useMemo(
    () => querySpells(
      rules.spells,
      {
        search, technique, form, ritual, sort, includeGeneral: true,
        maxLevel: maxLevel === "" ? undefined : maxLevel,
        onlyReachable: onlyReachable && Boolean(labTotalOf),
      },
      labTotalOf,
    ),
    [search, technique, form, maxLevel, ritual, onlyReachable, sort, labTotalOf],
  );
  const shown = matches.slice(0, limit);

  return (
    <div>
      <SearchField value={search} onInput={setSearch} placeholder="Search spells by name or effect…">
        <select aria-label="Sort spells" style="width:auto;" value={sort} onChange={(e) => setSort((e.target as HTMLSelectElement).value as SpellSort)}>
          {SORTS.map((s) => <option value={s.value} key={s.value}>{s.label}</option>)}
        </select>
      </SearchField>

      <div class="filters">
        <ChipGroup options={TECHNIQUES} value={technique as never} onChange={(v) => setTechnique(v)} allLabel="All Techniques" />
        <ChipGroup options={FORMS} value={form as never} onChange={(v) => setForm(v)} allLabel="All Forms" />
        <div class="chips">
          <select aria-label="Maximum level" style="width:auto;" value={String(maxLevel)} onChange={(e) => {
            const v = (e.target as HTMLSelectElement).value;
            setMaxLevel(v === "" ? "" : Number(v));
          }}>
            <option value="">Any level</option>
            {MAX_LEVELS.map((l) => <option value={l} key={l}>Level ≤ {l}</option>)}
          </select>
          <button class={`chip-toggle ${ritual === "exclude" ? "on" : ""}`} onClick={() => setRitual(ritual === "exclude" ? "any" : "exclude")}>Formulaic only</button>
          <button class={`chip-toggle ${ritual === "only" ? "on" : ""}`} onClick={() => setRitual(ritual === "only" ? "any" : "only")}>Rituals only</button>
          {labTotalOf && (
            <button class={`chip-toggle ${onlyReachable ? "on" : ""}`} onClick={() => setOnlyReachable(!onlyReachable)} title="Hide spells whose level exceeds your Lab Total">
              Within my Lab Total
            </button>
          )}
        </div>
      </div>

      <p class="note" style="margin:.5rem 0;">
        {matches.length} spell{matches.length === 1 ? "" : "s"}
        {matches.length > shown.length && ` · showing the first ${shown.length}`}
      </p>

      <OptionList empty="No spells match these filters.">
        {shown.map((s) => (
          <OptionRow
            key={s.name}
            title={s.name}
            meta={spellMeta(s, labTotalOf)}
            description={s.description}
            action={action?.(s)}
          />
        ))}
      </OptionList>
    </div>
  );
}

/** "CrIg 20 · Voice/Diam/Ind · ritual · LabTotal 25" */
export function spellMeta(s: SpellRow, labTotalOf?: (s: SpellRow) => number): string {
  const parts = [
    `${s.tech_abbr}${s.form_abbr} ${s.is_general ? "Gen" : s.level}`,
    [s.range, s.duration, s.target].filter(Boolean).join("/"),
  ];
  if (s.requisites.length) parts.push(`req ${s.requisites.map((r) => ART_ABBR[r as never] ?? r).join(", ")}`);
  if (s.is_ritual) parts.push("ritual");
  if (s.damage !== null) parts.push(`+${s.damage} dmg`);
  if (labTotalOf) parts.push(`LabTotal ${labTotalOf(s)}`);
  return parts.filter(Boolean).join(" · ");
}
