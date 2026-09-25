import type { ComponentChildren } from "preact";
import { useMemo, useState } from "preact/hooks";
import { rules } from "../engine.ts";
import {
  querySpells,
  groupSpells,
  type SpellQuery,
  type SpellSort,
  type SpellGroupBy,
} from "../lib/queries.ts";
import {
  RANGES,
  DURATIONS,
  TARGETS,
  RANGE_NAME,
  DURATION_NAME,
  TARGET_NAME,
  TECHNIQUE_COLOR,
} from "../lib/arts.ts";
import {
  TECHNIQUES,
  FORMS,
  ART_ABBR,
  type Technique,
} from "../../../chargen/src/domain/glossary.ts";
import type { SpellRow } from "../../../chargen/src/data/types.ts";
import {
  FilterBar,
  type ActiveFilter,
  type SortOption,
} from "./ui/FilterBar.tsx";
import { Select } from "./ui/Select.tsx";
import { OptionList, OptionRow } from "./ui/OptionList.tsx";
import { ArtBadge, FormIcon } from "./ui/ArtBadge.tsx";
import { Button } from "./ui/Button.tsx";
import { ChipGroup } from "./ui/ChipGroup.tsx";
import { FilterGroup } from "./ui/FilterGroup.tsx";

const MAX_LEVELS = [5, 10, 15, 20, 25, 30, 35, 40, 50];
const SORTS: SortOption<SpellSort>[] = [
  { value: "name", label: "Sort: A → Z" },
  { value: "name-desc", label: "Sort: Z → A" },
  { value: "level", label: "Sort: Level ↑" },
  { value: "level-desc", label: "Sort: Level ↓" },
  { value: "art", label: "Sort: Arts" },
  { value: "damage", label: "Sort: Damage ↓" },
  { value: "random", label: "Sort: Random" },
];
const GROUPS: { value: SpellGroupBy; label: string }[] = [
  { value: "none", label: "None" },
  { value: "technique", label: "Technique" },
  { value: "form", label: "Form" },
  { value: "art", label: "Tech + Form" },
  { value: "level", label: "Level" },
];
const RITUAL_OPTS = ["exclude", "only"] as const;

const newSeed = () => Math.floor(Math.random() * 0x7fffffff) + 1;

/**
 * Browsable, filterable spell list. Used inside the magus creator (where
 * `labTotalOf` enables the Lab Total column and the "within reach" filter, and
 * `action` renders the Learn button) and standalone in the reference library.
 */
export function SpellBrowser({
  labTotalOf,
  action,
}: {
  labTotalOf?: (s: SpellRow) => number;
  action?: (s: SpellRow) => ComponentChildren;
}) {
  const [search, setSearch] = useState("");
  const [technique, setTechnique] = useState("");
  const [form, setForm] = useState("");
  const [range, setRange] = useState("");
  const [duration, setDuration] = useState("");
  const [target, setTarget] = useState("");
  const [maxLevel, setMaxLevel] = useState<number | "">("");
  const [ritual, setRitual] =
    useState<NonNullable<SpellQuery["ritual"]>>("any");
  const [onlyReachable, setOnlyReachable] = useState(false);
  const [sort, setSort] = useState<SpellSort>("name");
  const [groupBy, setGroupBy] = useState<SpellGroupBy>("none");
  const [seed, setSeed] = useState(newSeed);

  const matches = useMemo(
    () =>
      querySpells(
        rules.spells,
        {
          search,
          technique,
          form,
          range,
          duration,
          target,
          ritual,
          sort,
          seed,
          includeGeneral: true,
          maxLevel: maxLevel === "" ? undefined : maxLevel,
          onlyReachable: onlyReachable && Boolean(labTotalOf),
        },
        labTotalOf,
      ),
    [
      search,
      technique,
      form,
      range,
      duration,
      target,
      maxLevel,
      ritual,
      onlyReachable,
      sort,
      seed,
      labTotalOf,
    ],
  );
  const groups = useMemo(
    () => groupSpells(matches, groupBy),
    [matches, groupBy],
  );

  const active: ActiveFilter[] = [
    technique && { label: technique, clear: () => setTechnique("") },
    form && { label: form, clear: () => setForm("") },
    range && { label: RANGE_NAME[range] ?? range, clear: () => setRange("") },
    duration && {
      label: DURATION_NAME[duration] ?? duration,
      clear: () => setDuration(""),
    },
    target && {
      label: TARGET_NAME[target] ?? target,
      clear: () => setTarget(""),
    },
    maxLevel !== "" && {
      label: `Level ≤ ${maxLevel}`,
      clear: () => setMaxLevel(""),
    },
    ritual !== "any" && {
      label: ritual === "only" ? "Rituals only" : "Formulaic only",
      clear: () => setRitual("any"),
    },
    onlyReachable && {
      label: "Within my Lab Total",
      clear: () => setOnlyReachable(false),
    },
  ].filter(Boolean) as ActiveFilter[];

  const clearAll = () => {
    setSearch("");
    setTechnique("");
    setForm("");
    setRange("");
    setDuration("");
    setTarget("");
    setMaxLevel("");
    setRitual("any");
    setOnlyReachable(false);
  };

  return (
    <div class="browser">
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Search spells by name or effect…"
        sort={sort}
        sorts={SORTS}
        onSort={setSort}
        onShuffle={sort === "random" ? () => setSeed(newSeed()) : undefined}
        active={active}
        onClear={clearAll}
        summary={
          <>
            {matches.length} spell{matches.length === 1 ? "" : "s"}
          </>
        }
      >
        {/* Techniques carry the colour, Forms the icon — the same language as the rows. */}
        <div class="fgroups">
          <FilterGroup label="Technique">
            <ChipGroup
              options={TECHNIQUES}
              value={technique as Technique | ""}
              onChange={setTechnique}
              colorOf={(t) => TECHNIQUE_COLOR[t]}
              titleOf={(t) => t}
            />
          </FilterGroup>
          <FilterGroup label="Form">
            <Select
              label="Form"
              pill
              active={form !== ""}
              value={form}
              onChange={setForm}
              options={[
                { value: "", label: "All" },
                ...FORMS.map((f) => ({ value: f, label: f, icon: <FormIcon form={f} size={14} /> })),
              ]}
            />
          </FilterGroup>
          <FilterGroup label="Kind">
            <ChipGroup
              options={RITUAL_OPTS}
              value={ritual === "any" ? "" : ritual}
              onChange={(v) => setRitual(v || "any")}
              labelOf={(v) => (v === "only" ? "Rituals" : "Formulaic")}
            />
          </FilterGroup>
        </div>
        <div class="fgroups">
          <FilterGroup label="Range">
            <Picker label="Range" value={range} onChange={setRange} options={RANGES} names={RANGE_NAME} />
          </FilterGroup>
          <FilterGroup label="Duration">
            <Picker label="Duration" value={duration} onChange={setDuration} options={DURATIONS} names={DURATION_NAME} />
          </FilterGroup>
          <FilterGroup label="Target">
            <Picker label="Target" value={target} onChange={setTarget} options={TARGETS} names={TARGET_NAME} />
          </FilterGroup>
          <FilterGroup label="Level">
            <Select
              label="Maximum level"
              pill
              active={maxLevel !== ""}
              value={String(maxLevel)}
              options={[
                { value: "", label: "Any" },
                ...MAX_LEVELS.map((l) => ({ value: String(l), label: `≤ ${l}` })),
              ]}
              onChange={(v) => setMaxLevel(v === "" ? "" : Number(v))}
            />
          </FilterGroup>
        </div>
        <div class="fgroups">
          <FilterGroup label="Group by">
            <Select
              label="Group spells"
              pill
              active={groupBy !== "none"}
              value={groupBy}
              options={GROUPS}
              onChange={(v) => setGroupBy(v as SpellGroupBy)}
            />
          </FilterGroup>
          {labTotalOf && (
            <FilterGroup label="Lab Total">
              <Button
                class="quiet"
                size="small"
                variant="brand"
                appearance={onlyReachable ? "filled-outlined" : "outlined"}
                pressed={onlyReachable}
                onClick={() => setOnlyReachable(!onlyReachable)}
                title="Hide spells whose level exceeds your Lab Total"
              >
                Within my Lab Total
              </Button>
            </FilterGroup>
          )}
        </div>
      </FilterBar>

      <OptionList empty="No spells match these filters.">
        {groups.flatMap((g) => [
          g.label ? (
            <li
              class="group-head"
              key={`h-${g.key}`}
              style={
                groupColor(g.label)
                  ? `--tech:${groupColor(g.label)}`
                  : undefined
              }
            >
              {groupColor(g.label) && <i class="swatch" />}
              {g.label} <span class="n">{g.rows.length}</span>
            </li>
          ) : null,
          ...g.rows.map((s) => (
            <OptionRow
              key={s.name}
              title={s.name}
              accent={TECHNIQUE_COLOR[s.technique as Technique]}
              badge={
                <ArtBadge
                  technique={s.technique}
                  form={s.form}
                  level={s.is_general ? "Gen" : s.level}
                />
              }
              meta={spellMeta(s, labTotalOf)}
              description={s.description}
              action={action?.(s)}
            />
          )),
        ])}
      </OptionList>
    </div>
  );
}

/** Group headings for Technique/Tech+Form groupings take that Technique's colour. */
function groupColor(label: string): string | undefined {
  return TECHNIQUE_COLOR[label.split(" ")[0] as Technique];
}

function Picker({
  label,
  value,
  onChange,
  options,
  names,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  names: Record<string, string>;
}) {
  return (
    <Select
      label={label}
      pill
      active={Boolean(value)}
      value={value}
      onChange={onChange}
      options={[
        { value: "", label: "Any" },
        ...options.map((o) => ({ value: o, label: names[o] ?? o })),
      ]}
    />
  );
}

/** The non-Art half of a row's meta line: "Voice/Diam/Ind · ritual · +10 dmg". */
export function spellMeta(
  s: SpellRow,
  labTotalOf?: (s: SpellRow) => number,
): string {
  const parts = [[s.range, s.duration, s.target].filter(Boolean).join("/")];
  if (s.requisites.length)
    parts.push(
      `req ${s.requisites.map((r) => ART_ABBR[r as never] ?? r).join(", ")}`,
    );
  if (s.is_ritual) parts.push("ritual");
  if (s.damage !== null) parts.push(`+${s.damage} damage`);
  if (labTotalOf) {
    const lt = labTotalOf(s);
    parts.push(`Lab Total ${lt}${(s.level ?? 0) > lt ? " ⚠" : ""}`);
  }
  return parts.filter(Boolean).join(" · ");
}
