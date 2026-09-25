import { useMemo, useState } from "preact/hooks";
import { rules, charKind, type Character, type Op } from "../engine.ts";
import { isTraitSelectable } from "../lib/eligibility.ts";
import { queryTraits, traitCategories } from "../lib/queries.ts";
import { ARTS, TECHNIQUES, FORMS } from "../../../chargen/src/domain/glossary.ts";
import type { VirtueFlawRow } from "../../../chargen/src/data/types.ts";
import { SearchField } from "./ui/SearchField.tsx";
import { ChipGroup } from "./ui/ChipGroup.tsx";
import { OptionList, OptionRow } from "./ui/OptionList.tsx";
import { Select } from "./ui/Select.tsx";
import { Button } from "./ui/Button.tsx";

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

  // Both kinds together, whichever tab is open for browsing — reviewing what you
  // already have shouldn't depend on which pool you're currently adding from.
  const takenAll = [
    ...ch.virtues.filter((v) => !v.free).map((v) => ({ ...v, kind: "Virtue" as const })),
    ...ch.flaws.filter((f) => !f.free).map((f) => ({ ...f, kind: "Flaw" as const })),
  ];

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
        <Button size="small" appearance={mode === "Virtue" ? "accent" : "outlined"} color="var(--ok)" onClick={() => { setMode("Virtue"); setCat(""); setActive(null); }}>Virtues</Button>
        <Button size="small" appearance={mode === "Flaw" ? "accent" : "outlined"} color="var(--err)" onClick={() => { setMode("Flaw"); setCat(""); setActive(null); }}>Flaws</Button>
      </div>

      {takenAll.length > 0 && (
        <ul class="trait-list">
          {takenAll.map((t) => (
            <li key={`${t.kind}-${t.display}`}>
              <details class={`trait-row ${t.kind.toLowerCase()}`}>
                <summary>
                  <span class="tr-name">{t.display}</span>
                  {t.size !== "Free" && <span class="tr-meta">{t.size}</span>}
                  <button
                    class="x" title="remove"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); update([{ op: "remove", kind: t.kind === "Virtue" ? "virtue" : "flaw", name: t.display }]); }}
                  >×</button>
                </summary>
                <p class="tr-desc">{rules.virtueFlawRow(t.name)?.description ?? "No description available."}</p>
              </details>
            </li>
          ))}
        </ul>
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
                <Select
                  label={paramLabel(rules.paramKind(active.name)!)} value={param} onChange={setParam}
                  placeholder="Choose…"
                  options={paramOptions(rules.paramKind(active.name))!.map((o) => ({ value: o, label: o }))}
                />
              ) : (
                <input type="text" value={param} placeholder="e.g. fire, or an Ability name" onInput={(e) => setParam((e.target as HTMLInputElement).value)} />
              )}
            </div>
          )}
          {active.size === "Major or Minor" && !grog && (
            <div class="field">
              <label>Size</label>
              <div class="chips">
                <Button size="small" appearance={size === "Minor" ? "accent" : "outlined"} onClick={() => setSize("Minor")}>Minor (1 pt)</Button>
                <Button size="small" appearance={size === "Major" ? "accent" : "outlined"} onClick={() => setSize("Major")}>Major (3 pts)</Button>
              </div>
            </div>
          )}
          <div class="navrow">
            <Button variant="brand" appearance="accent" onClick={confirm}>Add</Button>
            <Button appearance="plain" onClick={() => setActive(null)}>Cancel</Button>
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
            action={<Button size="small" variant="brand" appearance="accent" onClick={() => begin(r)}>Add</Button>}
          />
        ))}
      </OptionList>
    </div>
  );
}

function paramLabel(kind: NonNullable<ReturnType<typeof rules.paramKind>>): string {
  return kind === "art" ? "Art" : kind === "technique" ? "Technique" : kind === "form" ? "Form" : kind === "ability" ? "Ability" : "Specify";
}
