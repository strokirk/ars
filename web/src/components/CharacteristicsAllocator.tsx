import { CHARACTERISTICS, CHARACTERISTIC_NAMES } from "../../../chargen/src/domain/glossary.ts";
import { charCost } from "../../../chargen/src/domain/costs.ts";
import type { Character, Op } from "../engine.ts";

const HINT: Partial<Record<(typeof CHARACTERISTICS)[number], string>> = {
  Int: "Lab & Arts (magi)",
  Sta: "spellcasting, wounds",
  Pre: "leading, impressing",
  Com: "writing, persuading",
};

export function CharacteristicsAllocator({ ch, update }: { ch: Character; update: (ops: Op[]) => void }) {
  const set = (name: string, value: number) => {
    const v = Math.max(-3, Math.min(3, value));
    update([{ op: "char", name, value: v }]);
  };
  return (
    <div>
      {CHARACTERISTICS.map((c) => {
        const v = ch.characteristics[c] ?? 0;
        const cost = charCost(v);
        return (
          <div class="char-row" key={c}>
            <span class="nm">
              {CHARACTERISTIC_NAMES[c]} <small>{c}{HINT[c] ? ` · ${HINT[c]}` : ""}</small>
            </span>
            <span class="stepper">
              <button type="button" aria-label={`decrease ${c}`} disabled={v <= -3} onClick={() => set(c, v - 1)}>−</button>
              <span class="val">{v > 0 ? `+${v}` : v}</span>
              <button type="button" aria-label={`increase ${c}`} disabled={v >= 3} onClick={() => set(c, v + 1)}>+</button>
            </span>
            <span class="cost">{cost === 0 ? "—" : cost > 0 ? `${cost} pt` : `+${-cost} back`}</span>
          </div>
        );
      })}
    </div>
  );
}
