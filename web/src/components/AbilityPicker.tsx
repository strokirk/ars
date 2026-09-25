import type { ComponentChildren } from "preact";
import { useMemo, useRef, useState } from "preact/hooks";
import { CircleCheck, TriangleAlert } from "lucide-preact";
import { rules, type Character, type Op } from "../engine.ts";
import { abilityTotals, type AbilityTotal, type BudgetLine } from "../../../chargen/src/domain/budgets.ts";
import { deriveModifiers, type Modifiers } from "../../../chargen/src/domain/modifiers.ts";
import type { AbilityPick } from "../../../chargen/src/domain/character.ts";
import type { Stage } from "../../../chargen/src/domain/glossary.ts";
import {
  ABILITY_TYPES, STAGE_LABEL, abilityMax, abilityOptions, abilityProgress, baseAbilityRow, specialtyHints, typeLabel, xpToNext, xpToPrev,
  type AbilityOption, type AbilityTypeFilter,
} from "../lib/abilities.ts";
import { FilterBar, type ActiveFilter } from "./ui/FilterBar.tsx";
import { ChipGroup } from "./ui/ChipGroup.tsx";
import { FilterGroup } from "./ui/FilterGroup.tsx";
import { OptionList, OptionRow } from "./ui/OptionList.tsx";
import { MeterPill, leftText } from "./BudgetBar.tsx";
import { Stepper } from "./ui/Stepper.tsx";
import { Button } from "./ui/Button.tsx";
import { TextPrompt } from "./ui/TextPrompt.tsx";

/** One xp pool of the Abilities step. */
export interface StageSpec {
  stage: Stage;
  /** Section heading; may carry controls (Later life's years input). */
  title: ComponentChildren;
  /** The teaching line under the heading. */
  hint?: ComponentChildren;
  budget: BudgetLine;
  /** Ability names to flag `Recommended` and float to the top of the catalogue. */
  recommended?: readonly string[];
}

interface Props {
  ch: Character;
  update: (ops: Op[]) => void;
  stages: StageSpec[];
}

/** Blocked rows keep their place in the list but lose the row's colour cue. */
const BLOCKED_ACCENT = "var(--line)";

/**
 * The character's Abilities, one section per xp pool, each with its meter and a
 * "+ Add" button that opens the one shared catalogue in a side drawer.
 */
export function AbilityPicker({ ch, update, stages }: Props) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>(stages[0]!.stage);
  const mods = deriveModifiers(ch);
  const totals = new Map(abilityTotals(ch, mods).map((t) => [t.name.toLowerCase(), t]));
  return (
    <>
      {stages.map((s) => {
        const complete = s.budget.spent === s.budget.cap;
        return (
          <section class="stage" key={s.stage}>
            <header class="stage-head">
              <CircleCheck class={`stage-check ${complete ? "done" : ""}`} size={18} aria-hidden="true" />
              <h3>{s.title}</h3>
              <MeterPill meter={{ ...s.budget, label: "", text: `${s.budget.spent}/${s.budget.cap} xp`, note: leftText(s.budget) }} />
              <Button size="small" variant="brand" appearance="outlined" class="stage-add" onClick={() => { setStage(s.stage); setOpen(true); }}>
                + Add
              </Button>
            </header>
            {s.hint && <p class="note stage-hint">{s.hint}</p>}
            <div class="taken-rows">
              {ch.abilities.filter((a) => a.stage === s.stage).map((a) => (
                <TakenAbility key={a.name} ch={ch} a={a} total={totals.get(a.name.toLowerCase())!} mods={mods} update={update} />
              ))}
            </div>
          </section>
        );
      })}
      <AbilityCatalog ch={ch} update={update} stages={stages} stage={stage} setStage={setStage} open={open} setOpen={setOpen} />
    </>
  );
}

/**
 * One stage's spend on an Ability: rename (named ones), specialty tag, remove, and a
 * stepper showing the *combined* score across stages, whose ± spends or refunds this
 * stage's xp one point at a time.
 */
function TakenAbility({ ch, a, total, mods, update }: {
  ch: Character; a: AbilityPick; total: AbilityTotal; mods: Modifiers; update: (ops: Op[]) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [editingSpec, setEditingSpec] = useState(false);
  const own = rules.ability(a.name);
  const base = baseAbilityRow(rules, a.name);
  const max = abilityMax(ch, a.name, mods);
  const score = total.score;
  const specialty = total.specialty;
  const others = total.rows.filter((r) => r !== a).map((r) => `${r.xp} in ${STAGE_LABEL[r.stage]}`);
  const set = (fields: { xp?: number; specialty?: string }) =>
    update([{ op: "ability", name: a.name, xp: a.xp, stage: a.stage, type: a.type ?? undefined, ...fields }]);
  const step = (next: number) => {
    const xp = next > score ? a.xp + xpToNext(a.name, total.xp, mods) : a.xp - xpToPrev(a.name, total.xp, mods);
    update([xp > 0 ? { op: "ability", name: a.name, xp, stage: a.stage, type: a.type ?? undefined } : { op: "remove", kind: "ability", name: a.name, stage: a.stage }]);
  };

  return (
    <div class="char-row">
      <span class="nm">
        {renaming ? (
          <TextPrompt
            initial={a.name} label={`Rename ${a.name}`}
            onSave={(to) => { update([{ op: "rename", name: a.name, to, stage: a.stage }]); setRenaming(false); }}
            onCancel={() => setRenaming(false)}
          />
        ) : own ? (
          <span title={own.description}>{a.name}</span>
        ) : (
          // Only a name the player typed can be retyped; a data row's name is fixed.
          <button type="button" class="linkish ab-name" title="Rename" onClick={() => setRenaming(true)}>{a.name}</button>
        )}{" "}
        <span class="spec-anchor">
          <button type="button" class={`spec-tag ${specialty ? "" : "empty"}`} onClick={() => setEditingSpec(!editingSpec)}>
            {specialty ?? "+ specialty"}
          </button>
          {editingSpec && (
            <div class="spec-popover">
              <TextPrompt
                initial={specialty ?? ""} label={`Specialty for ${a.name}`} allowEmpty
                placeholder="a narrow application" choices={base ? specialtyHints(base) : []}
                onSave={(specialty) => { set({ specialty }); setEditingSpec(false); }}
                onCancel={() => setEditingSpec(false)}
              />
            </div>
          )}
        </span>
        <small>
          {typeLabel(a.type)} · {a.xp} xp here{others.length > 0 && ` + ${others.join(", ")}`}
          {mods.affinityAbility.has(a.name) && " · Affinity"}
        </small>
      </span>
      <span class="cost" title="xp toward the next point">{abilityProgress(a.name, total.xp, mods)} · +1 = {xpToNext(a.name, total.xp, mods)} xp</span>
      <span class="score">
        {score > max && (
          <span class="badge-tag age-cap" style="--row:var(--warn)" title={`At age ${ch.age} the usual maximum is ${max}`}>
            <TriangleAlert size={12} aria-hidden="true" /> over cap {max}
          </span>
        )}
        <Stepper
          value={score} min={0} label={a.name}
          maxHint={score >= max ? `Past ${max} is beyond the usual cap at age ${ch.age}` : undefined}
          onChange={step}
        />
      </span>
      <Button size="small" appearance="plain" onClick={() => update([{ op: "remove", kind: "ability", name: a.name, stage: a.stage }])}>remove</Button>
    </div>
  );
}

/** The catalogue of everything a stage can take, in a drawer with a stage switch. */
function AbilityCatalog({ ch, update, stages, stage, setStage, open, setOpen }: {
  ch: Character; update: (ops: Op[]) => void; stages: StageSpec[];
  stage: Stage; setStage: (s: Stage) => void; open: boolean; setOpen: (o: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<AbilityTypeFilter | "">("");
  /** Locked rows (the stage's own refusals) default hidden; one tap brings them back, with their reason. */
  const [showLocked, setShowLocked] = useState(false);
  /** The placeholder row being named in place ("(Area) Lore" → "Provence Lore"). */
  const [naming, setNaming] = useState<string | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const spec = stages.find((s) => s.stage === stage) ?? stages[0]!;
  const focusSearch = () => body.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus();

  const options = useMemo(
    () => abilityOptions(rules.abilities, ch, spec.stage, { search: query, type: typeFilter, onlyAvailable: !showLocked, recommended: spec.recommended }),
    [ch, spec, query, typeFilter, showLocked],
  );

  const addAs = (name: string, o: AbilityOption) => {
    // The first point, or the next one when another stage already paid in.
    const mods = deriveModifiers(ch);
    const had = abilityTotals(ch, mods).find((t) => t.name.toLowerCase() === name.toLowerCase())?.xp ?? 0;
    update([{ op: "ability", name, xp: xpToNext(name, had, mods), stage: spec.stage, type: o.row.type ?? undefined }]);
    setNaming(null);
    focusSearch();
  };
  const add = (o: AbilityOption) => (o.template ? setNaming(o.row.name) : addAs(o.row.name, o));

  return (
    <wa-drawer
      label="Add an Ability" open={open} class="catalog"
      onwa-hide={(e: Event) => { if (e.target === e.currentTarget) setOpen(false); }}
      onwa-after-show={(e: Event) => { if (e.target === e.currentTarget) focusSearch(); }}
    >
      <div
        ref={body}
        onKeyDown={(e) => {
          // Enter in the search box adds the top hit, so you can type, add, and keep typing.
          if (e.key !== "Enter" || !(e.target as HTMLElement).matches('input[type="search"]')) return;
          const top = options.find((o) => o.taken === undefined && !o.blocked);
          if (top) { e.preventDefault(); add(top); }
        }}
      >
        <div class="catalog-stage">
          <ChipGroup
            options={stages.map((s) => s.stage)} value={spec.stage} allLabel={null}
            labelOf={(s) => STAGE_LABEL[s]} onChange={(s) => { if (s) { setStage(s); setNaming(null); } }}
          />
          <MeterPill meter={{ ...spec.budget, label: "", text: `${spec.budget.spent}/${spec.budget.cap} xp`, note: leftText(spec.budget) }} />
        </div>
        <FilterBar
          search={query}
          onSearch={setQuery}
          placeholder="Search abilities…"
          active={[
            typeFilter && { label: typeFilter, clear: () => setTypeFilter("") },
            showLocked && { label: "Locked shown", clear: () => setShowLocked(false) },
          ].filter(Boolean) as ActiveFilter[]}
          onClear={() => { setTypeFilter(""); setShowLocked(false); }}
          summary={<>{options.length} abilities</>}
        >
          <div class="fgroups">
            <FilterGroup label="Type">
              <ChipGroup options={ABILITY_TYPES} value={typeFilter} onChange={setTypeFilter} allLabel="All" />
            </FilterGroup>
            <FilterGroup label="Unusual for this stage">
              <Button
                class="quiet" size="small" variant="brand"
                appearance={showLocked ? "filled-outlined" : "outlined"} pressed={showLocked}
                onClick={() => setShowLocked(!showLocked)}
              >
                Show locked
              </Button>
            </FilterGroup>
          </div>
        </FilterBar>

        <OptionList empty="No abilities match.">
          {options.map((o) =>
            naming === o.row.name && o.template ? (
              <li class="option naming" key={o.row.name}>
                <div class="meta">
                  <div class="ttl">{o.row.name}</div>
                  <div class="sz"><span class="facts">{o.template.label}</span></div>
                  <TextPrompt
                    label={o.template.label} placeholder={o.template.placeholder} choices={o.template.choices}
                    saveLabel="Add" onSave={(v) => addAs(o.template!.build(v), o)}
                    onCancel={() => { setNaming(null); focusSearch(); }}
                  />
                </div>
              </li>
            ) : (
              <OptionRow
                key={o.row.name}
                title={o.row.name}
                badge={o.recommended && !o.blocked ? <span class="badge-tag" style="--row:var(--ok)">Recommended</span> : undefined}
                meta={metaOf(o)}
                description={o.row.description}
                accent={o.blocked ? BLOCKED_ACCENT : undefined}
                action={
                  <Button
                    size="small" variant="brand" appearance={o.blocked ? "outlined" : "accent"}
                    disabled={o.taken !== undefined}
                    title={o.blocked ?? (o.taken !== undefined ? `Already taken here at ${o.taken}` : undefined)}
                    onClick={() => add(o)}
                  >
                    {o.taken !== undefined ? "Added" : o.blocked ? "Add ⚠" : "Add"}
                  </Button>
                }
              />
            ),
          )}
        </OptionList>
      </div>
    </wa-drawer>
  );
}

/** The row's facts line: type, where it's already spoken for, and any gating.
 *  A blocked row leads with the reason — which names the type itself, so the
 *  bare type would only repeat it. */
function metaOf(o: AbilityOption): string {
  const bits = [o.blocked ?? typeLabel(o.row.type)];
  if (o.taken !== undefined) bits.push(`already here at ${o.taken}`);
  if (o.elsewhere) bits.push(`already in ${o.elsewhere.join(", ")}`);
  if (!o.blocked && o.row.restricted) bits.push("no untrained use");
  return bits.join(" · ");
}
