import { useState } from "preact/hooks";
import type { Character, Op } from "../engine.ts";
import type { XpPool } from "../../../chargen/src/domain/character.ts";
import { VIRTUE_XP } from "../../../chargen/src/domain/modifiers.ts";
import { Collapsible } from "./ui/Collapsible.tsx";
import { Select } from "./ui/Select.tsx";
import { Button } from "./ui/Button.tsx";

const POOL_LABEL: Record<XpPool, string> = {
  childhood: "Childhood xp",
  "later-life": "Later-life xp",
  apprenticeship: "Apprenticeship xp",
  spells: "Spell levels",
  mastery: "Mastery xp",
};

/**
 * What tops up these pools: Virtue grants (read-only — they follow the Virtue) and
 * the player's own +/- adjustments, with a form to add one. For anything the rules
 * engine doesn't model, or a troupe's house rule.
 */
export function BonusXp({ ch, update, pools }: { ch: Character; update: (ops: Op[]) => void; pools: readonly XpPool[] }) {
  const [pool, setPool] = useState<XpPool>(pools[0]!);
  const [xp, setXp] = useState(10);
  const [note, setNote] = useState("");
  const virtueGrants = ch.virtues
    .flatMap((v) => (VIRTUE_XP[v.name] ?? []).map((g) => ({ ...g, source: v.display })))
    .filter((g) => pools.includes(g.pool));
  const manual = (ch.xpBonuses ?? []).map((b, i) => ({ ...b, i })).filter((b) => pools.includes(b.pool));
  const setBonuses = (xpBonuses: Character["xpBonuses"]) => update([{ op: "meta", fields: { xpBonuses } }]);
  const sign = (n: number) => (n > 0 ? `+${n}` : String(n));

  return (
    <Collapsible
      class="why" open={false}
      summary={<strong>Bonus xp{virtueGrants.length + manual.length ? ` (${virtueGrants.length + manual.length})` : ""}</strong>}
    >
      <ul class="bonus-list">
        {virtueGrants.map((g, i) => (
          <li key={`v${i}`}>
            <b>{sign(g.xp)}</b> {POOL_LABEL[g.pool]} — {g.source}
            {g.only && <span class="note"> ({g.only.label} only)</span>}
          </li>
        ))}
        {manual.map((b) => (
          <li key={`m${b.i}`}>
            <b>{sign(b.xp)}</b> {POOL_LABEL[b.pool]} — {b.note || "Bonus"}
            <button class="x" title="remove" onClick={() => setBonuses((ch.xpBonuses ?? []).filter((_, j) => j !== b.i))}>×</button>
          </li>
        ))}
        {virtueGrants.length + manual.length === 0 && <li class="note">None yet — Virtues like Warrior or Mastered Spells add here.</li>}
      </ul>
      <div class="bonus-form">
        {pools.length > 1 && (
          <Select label="Pool" value={pool} onChange={(v) => setPool(v as XpPool)} options={pools.map((p) => ({ value: p, label: POOL_LABEL[p] }))} />
        )}
        <input type="number" aria-label="Bonus amount" value={xp} onInput={(e) => setXp(Number((e.target as HTMLInputElement).value))} />
        <input type="text" aria-label="Reason" value={note} placeholder="Reason, e.g. house rule" onInput={(e) => setNote((e.target as HTMLInputElement).value)} />
        <Button
          size="small" variant="brand" appearance="accent" disabled={!xp}
          onClick={() => { setBonuses([...(ch.xpBonuses ?? []), { pool, xp, note: note.trim() }]); setNote(""); }}
        >Add</Button>
      </div>
      <p class="note">Negative amounts take xp away.</p>
    </Collapsible>
  );
}
