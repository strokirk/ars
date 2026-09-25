import { useCallback, useState } from "preact/hooks";
import { rules, charKind, type Character, type Op } from "../engine.ts";
import { isTraitSelectable } from "../lib/eligibility.ts";
import { ARTS, TECHNIQUES, FORMS } from "../../../chargen/src/domain/glossary.ts";
import type { VirtueFlawRow } from "../../../chargen/src/data/types.ts";
import { TraitBrowser } from "./TraitBrowser.tsx";
import { TraitBadge } from "./ui/TraitBadge.tsx";
import { Select } from "./ui/Select.tsx";
import { Button } from "./ui/Button.tsx";

function paramOptions(kind: ReturnType<typeof rules.paramKind>): readonly string[] | null {
  if (kind === "art") return ARTS;
  if (kind === "technique") return TECHNIQUES;
  if (kind === "form") return FORMS;
  return null; // text / ability → free input
}

export function TraitPicker({ ch, update }: { ch: Character; update: (ops: Op[]) => void }) {
  const [active, setActive] = useState<VirtueFlawRow | null>(null);
  const [param, setParam] = useState("");
  const [size, setSize] = useState<"Minor" | "Major">("Minor");

  const grog = charKind(ch) === "grog";
  const selectable = useCallback((r: VirtueFlawRow) => isTraitSelectable(r, ch), [ch.kind, ch.virtues.length]);

  // Both kinds together — reviewing what you already have shouldn't depend on
  // which pool you're currently browsing.
  const takenAll = [
    ...ch.virtues.filter((v) => !v.free).map((v) => ({ ...v, kind: "Virtue" as const })),
    ...ch.flaws.filter((f) => !f.free).map((f) => ({ ...f, kind: "Flaw" as const })),
  ];
  const timesTaken = (r: VirtueFlawRow) =>
    (r.kind === "Virtue" ? ch.virtues : ch.flaws).filter((t) => t.name === r.name).length;

  const opOf = (row: VirtueFlawRow): Op => ({ op: row.kind === "Virtue" ? "virtue" : "flaw", name: row.name });

  function begin(row: VirtueFlawRow) {
    const needsParam = rules.paramKind(row.name);
    const needsSize = row.size === "Major or Minor";
    if (!needsParam && !needsSize) {
      update([opOf(row)]);
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
    const op = opOf(active);
    if (needsParam) (op as { param?: string }).param = param.trim();
    if (needsSize) (op as { size?: "Minor" | "Major" }).size = grog ? "Minor" : size;
    update([op]);
    setActive(null);
  }

  return (
    <div>
      {takenAll.length > 0 && (
        <ul class="trait-list">
          {takenAll.map((t, i) => (
            <li key={`${t.kind}-${t.display}-${i}`}>
              <details class={`trait-row ${t.kind.toLowerCase()}`}>
                <summary>
                  <TraitBadge kind={t.kind} size={t.size} category={t.category} />
                  <span class="tr-name">{t.display}</span>
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

      <TraitBrowser
        filter={selectable}
        tag={(r) => {
          const n = timesTaken(r);
          if (!n) return null;
          // Parameterized repeatables (Puissant Art) are only fine again with a new parameter.
          const fine = r.repeatable || rules.paramKind(r.name);
          return <span class={`taken-tag ${fine ? "" : "warn"}`}>taken ×{n}{fine ? "" : " — not repeatable"}</span>;
        }}
        action={(r) => {
          const n = timesTaken(r);
          const fine = r.repeatable || rules.paramKind(r.name);
          return (
            <Button
              size="small" variant="brand" appearance={n && !fine ? "outlined" : "accent"}
              title={n && !fine ? `Already taken ${n}× — the rules don't say it can be taken more than once` : undefined}
              onClick={() => begin(r)}
            >
              {n ? (fine ? "Add another" : "Add again ⚠") : "Add"}
            </Button>
          );
        }}
      />
    </div>
  );
}

function paramLabel(kind: NonNullable<ReturnType<typeof rules.paramKind>>): string {
  return kind === "art" ? "Art" : kind === "technique" ? "Technique" : kind === "form" ? "Form" : kind === "ability" ? "Ability" : "Specify";
}
