import type { ComponentChildren } from "preact";
import { useMemo, useState } from "preact/hooks";
import { CircleCheck } from "lucide-preact";
import { rules, type Character, type Op } from "../engine.ts";
import type { BudgetLine } from "../../../chargen/src/domain/budgets.ts";
import { deriveModifiers } from "../../../chargen/src/domain/modifiers.ts";
import type { Stage } from "../../../chargen/src/domain/glossary.ts";
import {
  ABILITY_TYPES, abilityCost, abilityMax, abilityOptions, specialtyHints, typeLabel, xpToNext,
  type AbilityOption, type AbilityTypeFilter,
} from "../lib/abilities.ts";
import { FilterBar, type ActiveFilter } from "./ui/FilterBar.tsx";
import { ChipGroup } from "./ui/ChipGroup.tsx";
import { FilterGroup } from "./ui/FilterGroup.tsx";
import { OptionList, OptionRow } from "./ui/OptionList.tsx";
import { MeterPill } from "./BudgetBar.tsx";
import { Collapsible } from "./ui/Collapsible.tsx";
import { Stepper } from "./ui/Stepper.tsx";
import { Button } from "./ui/Button.tsx";

interface Props {
  ch: Character;
  update: (ops: Op[]) => void;
  stage: Stage;
  /** Section heading — the picker owns the whole stage block. */
  title: string;
  /** The teaching line under the heading. */
  hint: ComponentChildren;
  /** The xp pool this stage spends from, metered in the heading. */
  budget: BudgetLine;
  /** Ability names to flag `Recommended` and float to the top of the list. */
  recommended?: readonly string[];
  /** Collapse the section behind a summary once its xp pool is fully spent. */
  collapsible?: boolean;
  /** Extra controls rendered right under the hint (e.g. Later-life's years input). */
  extra?: ComponentChildren;
}

/** Blocked rows keep their place in the list but lose the row's colour cue. */
const BLOCKED_ACCENT = "var(--line)";

/**
 * One stage's worth of Abilities: what's taken (with the cost of the next point
 * spelled out) and a searchable, type-filtered list of everything the stage allows
 * — recommended picks first, and what it refuses shown with the reason rather than
 * hidden, unless the player asks to hide it.
 */
export function AbilityPicker({ ch, update, stage, title, hint, budget, recommended, collapsible, extra }: Props) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<AbilityTypeFilter | "">("");
  /** Locked rows (the stage's own refusals) default hidden — a full list is
   *  useful, but not at the cost of scrolling past 50 "Locked" rows to reach
   *  the ones worth taking. One tap brings them back, with their reason. */
  const [showLocked, setShowLocked] = useState(false);
  /** The placeholder row awaiting its specific name ("(Area) Lore" → "Provence Lore"). */
  const [pending, setPending] = useState<AbilityOption | null>(null);
  const [param, setParam] = useState("");
  /** Name of the taken Ability whose specialty is being edited, plus the draft. */
  const [editing, setEditing] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState("");

  const mods = deriveModifiers(ch);
  const taken = ch.abilities.filter((a) => a.stage === stage);
  const left = budget.cap - budget.spent;

  const setScore = (name: string, score: number, type?: string | null, spec?: string) => {
    if (score < 1) { update([{ op: "remove", kind: "ability", name }]); return; }
    update([{ op: "ability", name, score, stage, type: type ?? undefined, specialty: spec }]);
  };

  /** Placeholder rows need naming first; everything else lands on one tap. */
  const begin = (o: AbilityOption) => {
    if (!o.template) { setScore(o.row.name, 1, o.row.type); return; }
    setPending(o);
    setParam("");
  };
  const confirm = () => {
    if (!pending?.template || !param.trim()) return;
    setScore(pending.template.build(param.trim()), 1, pending.row.type);
    setPending(null);
  };

  const options = useMemo(
    () => abilityOptions(rules.abilities, ch, stage, { search: query, type: typeFilter, onlyAvailable: !showLocked, recommended }),
    [ch, stage, query, typeFilter, showLocked, recommended],
  );

  const complete = budget.spent >= budget.cap;
  const header = (
    <header class="stage-head">
      {collapsible && <CircleCheck class={`stage-check ${complete ? "done" : ""}`} size={18} aria-hidden="true" />}
      <h3>{title}</h3>
      <MeterPill
        meter={{
          label: "", spent: budget.spent, cap: budget.cap, over: budget.over, full: budget.full,
          text: `${budget.spent}/${budget.cap} xp`,
          note: left > 0 ? `${left} left` : left < 0 ? `${-left} over` : "all spent",
        }}
      />
    </header>
  );

  const body = (
    <>
      <p class="note stage-hint">{hint}</p>
      {extra}

      {taken.length > 0 && (
        <div class="taken-rows">
          {taken.map((a) => {
            const max = abilityMax(ch, a.name, mods);
            const next = xpToNext(a.name, a.score, mods);
            const row = rules.ability(a.name);
            return (
              <div key={a.name}>
                <div class="char-row">
                  <span class="nm">
                    {a.name}
                    <small>
                      {typeLabel(a.type)} · {abilityCost(a.name, a.score, mods)} xp
                      {mods.affinityAbility.has(a.name) && " · Affinity"}
                      {" · "}
                      <button
                        class="linkish"
                        onClick={() => { setEditing(editing === a.name ? null : a.name); setSpecialty(a.specialty ?? ""); }}
                      >
                        {a.specialty ? `spec: ${a.specialty}` : "add specialty"}
                      </button>
                    </small>
                  </span>
                  <span class="cost">+1 = {next} xp{a.score >= max ? " (past the usual age cap)" : ""}</span>
                  <Stepper
                    value={a.score} min={1} label={a.name}
                    onChange={(v) => setScore(a.name, v, a.type, a.specialty)}
                  />
                  <Button size="small" appearance="plain" onClick={() => update([{ op: "remove", kind: "ability", name: a.name }])}>remove</Button>
                </div>
                {editing === a.name && (
                  <div class="spec-edit">
                    <input
                      type="text" value={specialty} autofocus
                      aria-label={`Specialty for ${a.name}`}
                      placeholder={row && specialtyHints(row).length ? `e.g. ${specialtyHints(row).slice(0, 3).join(", ")}` : "a narrow application"}
                      onInput={(e) => setSpecialty((e.target as HTMLInputElement).value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { setScore(a.name, a.score, a.type, specialty.trim()); setEditing(null); } }}
                    />
                    <Button size="small" variant="brand" appearance="accent" onClick={() => { setScore(a.name, a.score, a.type, specialty.trim()); setEditing(null); }}>Save</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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

      {pending?.template && (
        <div class="panel name-it">
          <strong>{pending.row.name}</strong>
          <div class="field" style="margin-top:.6rem;">
            <label>{pending.template.label}</label>
            <input
              type="text" value={param} autofocus
              aria-label={pending.template.label}
              placeholder={pending.template.placeholder}
              onInput={(e) => setParam((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => { if (e.key === "Enter") confirm(); }}
            />
            {pending.template.choices && (
              <div class="chips" style="margin-top:.4rem;">
                {pending.template.choices.map((c) => (
                  <Button size="small" appearance={param === c ? "accent" : "outlined"} variant="brand" key={c} onClick={() => setParam(c)}>{c}</Button>
                ))}
              </div>
            )}
          </div>
          <div class="navrow">
            <Button variant="brand" appearance="accent" disabled={!param.trim()} onClick={confirm}>Add</Button>
            <Button appearance="plain" onClick={() => setPending(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <OptionList empty="No abilities match.">
        {options.map((o) => (
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
                onClick={() => begin(o)}
              >
                {o.taken !== undefined ? "Added" : o.blocked ? "Add ⚠" : o.template ? "Name it…" : "Add"}
              </Button>
            }
          />
        ))}
      </OptionList>
    </>
  );

  return (
    <section class="stage">
      {collapsible
        ? <Collapsible summary={header} open={!complete}>{body}</Collapsible>
        : <>{header}{body}</>}
    </section>
  );
}

/** The row's facts line: type, where it's already spoken for, and any gating.
 *  A blocked row leads with the reason — which names the type itself, so the
 *  bare type would only repeat it. */
function metaOf(o: AbilityOption): string {
  const bits = [o.blocked ?? typeLabel(o.row.type)];
  if (o.taken !== undefined) bits.push(`already here at ${o.taken}`);
  if (o.elsewhere) bits.push(`already in ${o.elsewhere.join(", ")}`);
  if (!o.blocked && o.row.restricted) bits.push("needs an enabling Virtue");
  return bits.join(" · ");
}
