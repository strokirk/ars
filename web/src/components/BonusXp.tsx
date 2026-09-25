import { useState } from "preact/hooks";
import type { Character, Op } from "../engine.ts";
import type { XpPool } from "../../../chargen/src/domain/character.ts";
import { VIRTUE_XP } from "../../../chargen/src/domain/modifiers.ts";
import { Button } from "./ui/Button.tsx";

const POOL_LABEL: Record<XpPool, string> = {
  childhood: "Childhood xp",
  "later-life": "Later-life xp",
  apprenticeship: "Apprenticeship xp",
  spells: "Spell levels",
  mastery: "Mastery xp",
};

const sign = (n: number) => (n > 0 ? `+${n}` : String(n));

/**
 * What tops up one pool, shown by its meter in the budget strip: the net bonus
 * inline (tooltip `55 = 45 + 15 − 5`) and a "±" button opening a dialog with the
 * Virtue grants (read-only — they follow the Virtue) and the player's own
 * adjustments, with a form to add one. For anything the rules engine doesn't
 * model, or a troupe's house rule.
 */
export function BonusXp({ ch, update, pool, cap }: { ch: Character; update: (ops: Op[]) => void; pool: XpPool; cap: number }) {
  const [open, setOpen] = useState(false);
  const [xp, setXp] = useState(10);
  const [note, setNote] = useState("");
  const virtueGrants = ch.virtues
    .flatMap((v) => (VIRTUE_XP[v.name] ?? []).map((g) => ({ ...g, source: v.display })))
    .filter((g) => g.pool === pool);
  const manual = (ch.xpBonuses ?? []).map((b, i) => ({ ...b, i })).filter((b) => b.pool === pool);
  const setBonuses = (xpBonuses: Character["xpBonuses"]) => update([{ op: "meta", fields: { xpBonuses } }]);
  const all = [...virtueGrants, ...manual];
  const total = all.reduce((s, g) => s + g.xp, 0);
  const sum = `${cap} = ${cap - total} ${all.map((g) => `${g.xp < 0 ? "−" : "+"} ${Math.abs(g.xp)}`).join(" ")}`;

  return (
    <span class="pool-bonus">
      {all.length > 0 && <small title={sum}>{sign(total)}</small>}
      <Button size="small" appearance="plain" class="pm" title={`Bonus ${POOL_LABEL[pool]}`} onClick={() => setOpen(true)}>±</Button>
      <wa-dialog
        label={`Bonus ${POOL_LABEL[pool]}`} open={open} light-dismiss
        onwa-hide={(e: Event) => { if (e.target === e.currentTarget) setOpen(false); }}
      >
        <ul class="bonus-list">
          {virtueGrants.map((g, i) => (
            <li key={`v${i}`}>
              <b>{sign(g.xp)}</b> {g.source}
              {g.only && <span class="note"> ({g.only.label} only)</span>}
            </li>
          ))}
          {manual.map((b) => (
            <li key={`m${b.i}`}>
              <b>{sign(b.xp)}</b> {b.note || "Bonus"}
              <button class="x" title="remove" onClick={() => setBonuses((ch.xpBonuses ?? []).filter((_, j) => j !== b.i))}>×</button>
            </li>
          ))}
          {all.length === 0 && <li class="note">None yet — Virtues like Warrior or Mastered Spells add here.</li>}
        </ul>
        {all.length > 0 && <p class="note">{sum}</p>}
        <div class="bonus-form">
          <input type="number" aria-label="Bonus amount" value={xp} onInput={(e) => setXp(Number((e.target as HTMLInputElement).value))} />
          <input type="text" aria-label="Reason" value={note} placeholder="Reason, e.g. house rule" onInput={(e) => setNote((e.target as HTMLInputElement).value)} />
          <Button
            size="small" variant="brand" appearance="accent" disabled={!xp}
            onClick={() => { setBonuses([...(ch.xpBonuses ?? []), { pool, xp, note: note.trim() }]); setNote(""); }}
          >Add</Button>
        </div>
        <p class="note">Negative amounts take xp away.</p>
      </wa-dialog>
    </span>
  );
}
