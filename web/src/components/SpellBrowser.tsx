import type { ComponentChildren } from "preact";
import { useMemo, useState } from "preact/hooks";
import { rules } from "../engine.ts";
import { querySpells, groupSpells, type SpellQuery, type SpellSort, type SpellGroupBy } from "../lib/queries.ts";
import {
  RANGES, DURATIONS, TARGETS, RANGE_NAME, DURATION_NAME, TARGET_NAME, TECHNIQUE_COLOR,
} from "../lib/arts.ts";
import { TECHNIQUES, FORMS, ART_ABBR, type Technique } from "../../../chargen/src/domain/glossary.ts";
import type { SpellRow } from "../../../chargen/src/data/types.ts";
import { FilterBar, type ActiveFilter, type SortOption } from "./ui/FilterBar.tsx";
import { OptionList, OptionRow, MoreRows, useVisibleCount } from "./ui/OptionList.tsx";
import { ArtBadge, FormIcon } from "./ui/ArtBadge.tsx";

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
  { value: "none", label: "Group: none" },
  { value: "technique", label: "Group: Technique" },
  { value: "form", label: "Group: Form" },
  { value: "art", label: "Group: Tech + Form" },
  { value: "level", label: "Group: Level" },
];

const newSeed = () => Math.floor(Math.random() * 0x7fffffff) + 1;

/**
 * Browsable, filterable spell list. Used inside the magus creator (where
 * `labTotalOf` enables the Lab Total column and the "within reach" filter, and
 * `action` renders the Learn button) and standalone in the reference library.
 */
export function SpellBrowser({
  labTotalOf, action, pageSize = 60,
}: {
  labTotalOf?: (s: SpellRow) => number;
  action?: (s: SpellRow) => ComponentChildren;
  /** How many rows to reveal at a time; the rest are a click away, never cut off. */
  pageSize?: number;
}) {
  const [search, setSearch] = useState("");
  const [technique, setTechnique] = useState("");
  const [form, setForm] = useState("");
  const [range, setRange] = useState("");
  const [duration, setDuration] = useState("");
  const [target, setTarget] = useState("");
  const [maxLevel, setMaxLevel] = useState<number | "">("");
  const [ritual, setRitual] = useState<NonNullable<SpellQuery["ritual"]>>("any");
  const [onlyReachable, setOnlyReachable] = useState(false);
  const [sort, setSort] = useState<SpellSort>("name");
  const [groupBy, setGroupBy] = useState<SpellGroupBy>("none");
  const [seed, setSeed] = useState(newSeed);

  const matches = useMemo(
    () => querySpells(
      rules.spells,
      {
        search, technique, form, range, duration, target, ritual, sort, seed, includeGeneral: true,
        maxLevel: maxLevel === "" ? undefined : maxLevel,
        onlyReachable: onlyReachable && Boolean(labTotalOf),
      },
      labTotalOf,
    ),
    [search, technique, form, range, duration, target, maxLevel, ritual, onlyReachable, sort, seed, labTotalOf],
  );
  const { visible, hidden, showMore, showAll } = useVisibleCount(matches, pageSize);
  const groups = useMemo(() => groupSpells(visible, groupBy), [visible, groupBy]);

  const active: ActiveFilter[] = [
    technique && { label: technique, clear: () => setTechnique("") },
    form && { label: form, clear: () => setForm("") },
    range && { label: RANGE_NAME[range] ?? range, clear: () => setRange("") },
    duration && { label: DURATION_NAME[duration] ?? duration, clear: () => setDuration("") },
    target && { label: TARGET_NAME[target] ?? target, clear: () => setTarget("") },
    maxLevel !== "" && { label: `Level ≤ ${maxLevel}`, clear: () => setMaxLevel("") },
    ritual !== "any" && { label: ritual === "only" ? "Rituals only" : "Formulaic only", clear: () => setRitual("any") },
    onlyReachable && { label: "Within my Lab Total", clear: () => setOnlyReachable(false) },
  ].filter(Boolean) as ActiveFilter[];

  const clearAll = () => {
    setSearch(""); setTechnique(""); setForm(""); setRange(""); setDuration(""); setTarget("");
    setMaxLevel(""); setRitual("any"); setOnlyReachable(false);
  };

  return (
    <div class="browser">
      <FilterBar
        search={search} onSearch={setSearch} placeholder="Search spells by name or effect…"
        sort={sort} sorts={SORTS} onSort={setSort}
        onShuffle={sort === "random" ? () => setSeed(newSeed()) : undefined}
        active={active} onClear={clearAll}
        summary={
          <>
            {matches.length} spell{matches.length === 1 ? "" : "s"}
            {hidden > 0 && ` · showing ${visible.length}`}
          </>
        }
      >
        {/* Techniques carry the colour, Forms the icon — the same language as the rows. */}
        <div class="artfilter" role="group" aria-label="Filter by Technique">
          <button class={`chip-toggle ${technique === "" ? "on" : ""}`} onClick={() => setTechnique("")}>All Techniques</button>
          {TECHNIQUES.map((t) => (
            <button
              key={t}
              class={`chip-toggle tech ${technique === t ? "on" : ""}`}
              style={`--tech:${TECHNIQUE_COLOR[t as Technique]}`}
              title={t}
              onClick={() => setTechnique(technique === t ? "" : t)}
            >
              <span class="ab">{ART_ABBR[t]}</span> {t}
            </button>
          ))}
        </div>
        <div class="artfilter" role="group" aria-label="Filter by Form">
          <button class={`chip-toggle ${form === "" ? "on" : ""}`} onClick={() => setForm("")}>All Forms</button>
          {FORMS.map((f) => (
            <button key={f} class={`chip-toggle ${form === f ? "on" : ""}`} title={f} onClick={() => setForm(form === f ? "" : f)}>
              <FormIcon form={f} size={14} /> {f}
            </button>
          ))}
        </div>
        <div class="chips">
          <Picker label="Range" value={range} onChange={setRange} options={RANGES} names={RANGE_NAME} />
          <Picker label="Duration" value={duration} onChange={setDuration} options={DURATIONS} names={DURATION_NAME} />
          <Picker label="Target" value={target} onChange={setTarget} options={TARGETS} names={TARGET_NAME} />
          <select aria-label="Maximum level" class={`pill-select ${maxLevel === "" ? "" : "on"}`} value={String(maxLevel)} onChange={(e) => {
            const v = (e.target as HTMLSelectElement).value;
            setMaxLevel(v === "" ? "" : Number(v));
          }}>
            <option value="">Any level</option>
            {MAX_LEVELS.map((l) => <option value={l} key={l}>Level ≤ {l}</option>)}
          </select>
          <select aria-label="Group spells" class={`pill-select ${groupBy === "none" ? "" : "on"}`} value={groupBy} onChange={(e) => setGroupBy((e.target as HTMLSelectElement).value as SpellGroupBy)}>
            {GROUPS.map((g) => <option value={g.value} key={g.value}>{g.label}</option>)}
          </select>
        </div>
        <div class="chips">
          <button class={`chip-toggle ${ritual === "exclude" ? "on" : ""}`} onClick={() => setRitual(ritual === "exclude" ? "any" : "exclude")}>Formulaic only</button>
          <button class={`chip-toggle ${ritual === "only" ? "on" : ""}`} onClick={() => setRitual(ritual === "only" ? "any" : "only")}>Rituals only</button>
          {labTotalOf && (
            <button class={`chip-toggle ${onlyReachable ? "on" : ""}`} onClick={() => setOnlyReachable(!onlyReachable)} title="Hide spells whose level exceeds your Lab Total">
              Within my Lab Total
            </button>
          )}
        </div>
      </FilterBar>

      <OptionList empty="No spells match these filters.">
        {groups.flatMap((g) => [
          g.label ? (
            <li class="group-head" key={`h-${g.key}`} style={groupColor(g.label) ? `--tech:${groupColor(g.label)}` : undefined}>
              {groupColor(g.label) && <i class="swatch" />}
              {g.label} <span class="n">{g.rows.length}</span>
            </li>
          ) : null,
          ...g.rows.map((s) => (
            <OptionRow
              key={s.name}
              title={s.name}
              accent={TECHNIQUE_COLOR[s.technique as Technique]}
              badge={<ArtBadge technique={s.technique} form={s.form} level={s.is_general ? "Gen" : s.level} />}
              meta={spellMeta(s, labTotalOf)}
              description={s.description}
              action={action?.(s)}
            />
          )),
        ])}
      </OptionList>
      <MoreRows hidden={hidden} pageSize={pageSize} onMore={showMore} onAll={showAll} />
    </div>
  );
}

/** Group headings for Technique/Tech+Form groupings take that Technique's colour. */
function groupColor(label: string): string | undefined {
  return TECHNIQUE_COLOR[label.split(" ")[0] as Technique];
}

function Picker({
  label, value, onChange, options, names,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  names: Record<string, string>;
}) {
  return (
    <select aria-label={label} class={`pill-select ${value ? "on" : ""}`} value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value)}>
      <option value="">Any {label.toLowerCase()}</option>
      {options.map((o) => <option value={o} key={o}>{names[o] ?? o}</option>)}
    </select>
  );
}

/** The non-Art half of a row's meta line: "Voice/Diam/Ind · ritual · +10 dmg". */
export function spellMeta(s: SpellRow, labTotalOf?: (s: SpellRow) => number): string {
  const parts = [[s.range, s.duration, s.target].filter(Boolean).join("/")];
  if (s.requisites.length) parts.push(`req ${s.requisites.map((r) => ART_ABBR[r as never] ?? r).join(", ")}`);
  if (s.is_ritual) parts.push("ritual");
  if (s.damage !== null) parts.push(`+${s.damage} damage`);
  if (labTotalOf) parts.push(`Lab Total ${labTotalOf(s)}`);
  return parts.filter(Boolean).join(" · ");
}
