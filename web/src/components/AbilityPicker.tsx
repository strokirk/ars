import { useMemo, useState } from "preact/hooks";
import { rules, type Character, type Op } from "../engine.ts";
import { abilityXp, affinityXp } from "../../../chargen/src/domain/costs.ts";
import { ageAbilityMax } from "../../../chargen/src/domain/budgets.ts";
import { deriveModifiers } from "../../../chargen/src/domain/modifiers.ts";
import type { Stage } from "../../../chargen/src/domain/glossary.ts";

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
              <span class="stepper">
                <button type="button" disabled={a.score <= 1} onClick={() => setScore(a.name, a.score - 1, a.type)}>−</button>
                <span class="val">{a.score}</span>
                <button type="button" disabled={a.score >= max} onClick={() => setScore(a.name, a.score + 1, a.type)}>+</button>
              </span>
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
          <div class="toolbar">
            <input type="text" placeholder="Search abilities to add…" value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
          </div>
          {query.trim() && (
            <ul class="option-list">
              {results.map((r) => (
                <li class="option" key={r.name}>
                  <div class="meta">
                    <div class="ttl">{r.name} <span class="sz">{r.type ?? "General"}{r.restricted ? " · needs Virtue" : ""}</span></div>
                    <div class="desc clamp">{r.description}</div>
                  </div>
                  <button class="btn btn-sm btn-primary" disabled={takenNames.has(r.name.toLowerCase())} onClick={() => setScore(r.name, 1, r.type)}>Add</button>
                </li>
              ))}
              {results.length === 0 && <li class="note">No matches.</li>}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
