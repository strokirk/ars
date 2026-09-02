import { useMemo, useState } from "preact/hooks";
import { rules, charKind, type Character, type Op } from "../engine.ts";
import { isTraitSelectable } from "../lib/eligibility.ts";
import { queryTraits, traitCategories } from "../lib/queries.ts";
import { ARTS, TECHNIQUES, FORMS } from "../../../chargen/src/domain/glossary.ts";
import type { VirtueFlawRow } from "../../../chargen/src/data/types.ts";
import { SearchField } from "./ui/SearchField.tsx";
import { ChipGroup } from "./ui/ChipGroup.tsx";
import { OptionList, OptionRow } from "./ui/OptionList.tsx";

type Mode = "Virtue" | "Flaw";

function paramOptions(kind: ReturnType<typeof rules.paramKind>): readonly string[] | null {
  if (kind === "art") return ARTS;
  if (kind === "technique") return TECHNIQUES;
  if (kind === "form") return FORMS;
  return null; // text / ability → free input
}

export function TraitPicker({ ch, update }: { ch: Character; update: (ops: Op[]) => void }) {
  const [mode, setMode] = useState<Mode>("Virtue");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");
  const [active, setActive] = useState<VirtueFlawRow | null>(null);
  const [param, setParam] = useState("");
  const [size, setSize] = useState<"Minor" | "Major">("Minor");

  const grog = charKind(ch) === "grog";

  const pool = useMemo(
    () => queryTraits(rules.virtuesFlaws, { kind: mode }).filter((r) => isTraitSelectable(r, ch)),
    [mode, ch.kind, ch.virtues.length],
  );
  const categories = useMemo(() => traitCategories(pool), [pool]);
  const results = useMemo(
    () => queryTraits(pool, { category: cat || undefined, search: query.trim() || undefined }).slice(0, 60),
    [pool, cat, query],
  );

  const taken = mode === "Virtue" ? ch.virtues : ch.flaws;

  function begin(row: VirtueFlawRow) {
    const needsParam = rules.paramKind(row.name);
    const needsSize = row.size === "Major or Minor";
    if (!needsParam && !needsSize) {
      update([{ op: mode === "Virtue" ? "virtue" : "flaw", name: row.name }]);
      return;
    }
    setActive(row);
    setParam("");
    setSize(grog ? "Minor" : row.size === "Major" ? "Major" : "Minor");
  }

  function confirm() {
    if (!active) return;
    const needsParam = rules.paramKind(active.name);
    const needsSize = active.size === "Major or Minor";
    if (needsParam && !param.trim()) return;
    const op: Op = { op: mode === "Virtue" ? "virtue" : "flaw", name: active.name };
    if (needsParam) (op as { param?: string }).param = param.trim();
    if (needsSize) (op as { size?: "Minor" | "Major" }).size = grog ? "Minor" : size;
    update([op]);
    setActive(null);
  }

  return (
    <div>
      <div class="chips" style="margin-bottom:.7rem;">
        <button class={`chip-toggle ${mode === "Virtue" ? "on" : ""}`} onClick={() => { setMode("Virtue"); setCat(""); setActive(null); }}>Virtues</button>
        <button class={`chip-toggle ${mode === "Flaw" ? "on" : ""}`} onClick={() => { setMode("Flaw"); setCat(""); setActive(null); }}>Flaws</button>
      </div>

      {taken.filter((t) => !t.free).length > 0 && (
        <div class="taken">
          {taken.filter((t) => !t.free).map((t) => (
            <span class={`taken-chip ${mode === "Virtue" ? "virtue" : "flaw"}`} key={t.display}>
              {t.display}{t.size !== "Free" ? ` (${t.size === "Major" ? "Maj" : "Min"})` : ""}
              <button class="x" title="remove" onClick={() => update([{ op: "remove", kind: mode === "Virtue" ? "virtue" : "flaw", name: t.display }])}>×</button>
            </span>
          ))}
        </div>
      )}

      <SearchField value={query} onInput={setQuery} placeholder={`Search ${mode.toLowerCase()}s…`} />
      <div class="filters">
        <ChipGroup options={categories} value={cat} onChange={setCat} allLabel="All" />
      </div>

      {active && (
        <div class="panel" style="margin-bottom:.8rem;">
          <strong>{active.name}</strong>
          {rules.paramKind(active.name) && (
            <div class="field" style="margin-top:.6rem;">
              <label>{paramLabel(rules.paramKind(active.name)!)}</label>
              {paramOptions(rules.paramKind(active.name)) ? (
                <select value={param} onChange={(e) => setParam((e.target as HTMLSelectElement).value)}>
                  <option value="">Choose…</option>
                  {paramOptions(rules.paramKind(active.name))!.map((o) => <option value={o} key={o}>{o}</option>)}
                </select>
              ) : (
                <input type="text" value={param} placeholder="e.g. fire, or an Ability name" onInput={(e) => setParam((e.target as HTMLInputElement).value)} />
              )}
            </div>
          )}
          {active.size === "Major or Minor" && !grog && (
            <div class="field">
              <label>Size</label>
              <div class="chips">
                <button class={`chip-toggle ${size === "Minor" ? "on" : ""}`} onClick={() => setSize("Minor")}>Minor (1 pt)</button>
                <button class={`chip-toggle ${size === "Major" ? "on" : ""}`} onClick={() => setSize("Major")}>Major (3 pts)</button>
              </div>
            </div>
          )}
          <div class="navrow">
            <button class="btn btn-primary" onClick={confirm}>Add</button>
            <button class="btn btn-ghost" onClick={() => setActive(null)}>Cancel</button>
          </div>
        </div>
      )}

      <OptionList empty={`No ${mode.toLowerCase()}s match.`}>
        {results.map((r) => (
          <OptionRow
            key={r.name}
            title={r.name}
            meta={[r.size, r.category].filter(Boolean).join(" · ")}
            description={r.description}
            action={<button class="btn btn-sm btn-primary" onClick={() => begin(r)}>Add</button>}
          />
        ))}
      </OptionList>
    </div>
  );
}

function paramLabel(kind: NonNullable<ReturnType<typeof rules.paramKind>>): string {
  return kind === "art" ? "Art" : kind === "technique" ? "Technique" : kind === "form" ? "Form" : kind === "ability" ? "Ability" : "Specify";
}
