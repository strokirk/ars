import { useMemo, useState } from "preact/hooks";
import { rules, type Character, type Op } from "../engine.ts";
import { abilityXp, affinityXp } from "../../../chargen/src/domain/costs.ts";
import { ageAbilityMax } from "../../../chargen/src/domain/budgets.ts";
import { deriveModifiers } from "../../../chargen/src/domain/modifiers.ts";
import type { Stage } from "../../../chargen/src/domain/glossary.ts";
import { SearchField } from "./ui/SearchField.tsx";
import { OptionList, OptionRow } from "./ui/OptionList.tsx";
import { Stepper } from "./ui/Stepper.tsx";

interface Props {
  ch: Character;
  update: (ops: Op[]) => void;
  stage: Stage;
  /** Quick-add chips. When omitted, a free search box is shown. */
  suggestions?: string[];
  /** Show the search box even alongside suggestion chips (apprenticeship). */
  searchable?: boolean;
}

export function AbilityPicker({ ch, update, stage, suggestions, searchable }: Props) {
  const [query, setQuery] = useState("");
  const mods = deriveModifiers(ch);
  const max = ageAbilityMax(ch.age);
  const taken = ch.abilities.filter((a) => a.stage === stage);
  const takenNames = new Set(taken.map((a) => a.name.toLowerCase()));

  const setScore = (name: string, score: number, type?: string | null) => {
    if (score < 1) { update([{ op: "remove", kind: "ability", name }]); return; }
    update([{ op: "ability", name, score, stage, type: type ?? undefined }]);
  };

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return rules.filterAbilities({ search: q }).slice(0, 30);
  }, [query]);

  const xpOf = (name: string, score: number) => {
    const raw = abilityXp(score);
    return mods.affinityAbility.has(name) ? affinityXp(raw) : raw;
  };

  return (
    <div>
      {taken.length > 0 && (
        <div style="margin-bottom:.8rem;">
          {taken.map((a) => (
            <div class="char-row" key={a.name}>
              <span class="nm">{a.name}<small>{a.type ?? "General"} · {xpOf(a.name, a.score)} xp</small></span>
              <Stepper value={a.score} min={1} max={max} label={a.name} onChange={(v) => setScore(a.name, v, a.type)} />
              <button class="btn btn-sm btn-ghost" onClick={() => update([{ op: "remove", kind: "ability", name: a.name }])}>remove</button>
            </div>
          ))}
        </div>
      )}

      {suggestions && (
        <div class="chips" style="margin-bottom:.6rem;">
          {suggestions.filter((s) => !takenNames.has(s.toLowerCase())).map((s) => (
            <button class="chip-toggle" key={s} onClick={() => { const row = rules.ability(s); setScore(s, 1, row?.type); }}>+ {s}</button>
          ))}
        </div>
      )}
      {(!suggestions || searchable) && (
        <>
          <SearchField value={query} onInput={setQuery} placeholder="Search abilities to add…" />
          {query.trim() && (
            <OptionList empty="No abilities match.">
              {results.map((r) => (
                <OptionRow
                  key={r.name}
                  title={r.name}
                  meta={`${r.type ?? "General"}${r.restricted ? " · needs Virtue" : ""}`}
                  description={r.description}
                  action={
                    <button class="btn btn-sm btn-primary" disabled={takenNames.has(r.name.toLowerCase())} onClick={() => setScore(r.name, 1, r.type)}>Add</button>
                  }
                />
              ))}
            </OptionList>
          )}
        </>
      )}
    </div>
  );
}
