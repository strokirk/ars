import { useState } from "preact/hooks";
import { Dices } from "lucide-preact";
import { roll, type RollResult } from "../lib/dice.ts";
import { Button } from "../components/ui/Button.tsx";

const face = (r: number, i: number) => (i > 0 && r === 0 ? "0 (=10)" : String(r));

function describe(r: RollResult): string {
  const { opts } = r;
  if (!opts.stress) return r.rolls[0] === 0 ? "0 counts as 10" : "";
  if (r.rolls.length > 1) return `${r.rolls.length - 1}× one — re-rolled, ×${r.multiplier}`;
  if (r.rolls[0] === 0) {
    if (!opts.botchDice) return "zero — can't botch, die is 0";
    return r.botches ? `BOTCH ×${r.botches}` : "zero — no botch, die is 0";
  }
  return "";
}

/** A stress/simple d10 roller that shows every die it threw. */
export function Dice() {
  const [modifier, setModifier] = useState(0);
  const [stress, setStress] = useState(true);
  const [botchDice, setBotchDice] = useState(1);
  const [ease, setEase] = useState("");
  const [history, setHistory] = useState<RollResult[]>([]);
  const num = (e: Event) => Number((e.target as HTMLInputElement).value);

  const go = () => {
    const r = roll({ stress, modifier, botchDice: stress ? botchDice : 0, ease: ease === "" ? undefined : Number(ease) });
    setHistory([r, ...history].slice(0, 20));
  };

  return (
    <div>
      <h1 style="color:var(--accent);"><Dices size={20} aria-hidden="true" /> Dice</h1>
      <div class="panel">
        <div class="dice-form">
          <div class="field">
            <label>Modifier</label>
            <input type="number" value={modifier} onInput={(e) => setModifier(num(e))} />
          </div>
          <div class="field">
            <label>Die</label>
            <div class="chips">
              <Button size="small" appearance={stress ? "accent" : "outlined"} variant="brand" onClick={() => setStress(true)}>Stress</Button>
              <Button size="small" appearance={!stress ? "accent" : "outlined"} variant="brand" onClick={() => setStress(false)}>Simple</Button>
            </div>
          </div>
          {stress && (
            <div class="field">
              <label>Botch dice</label>
              <input type="number" min={0} value={botchDice} onInput={(e) => setBotchDice(Math.max(0, num(e)))} />
            </div>
          )}
          <div class="field">
            <label>Ease Factor (optional)</label>
            <input type="number" value={ease} placeholder="—" onInput={(e) => setEase((e.target as HTMLInputElement).value)} />
          </div>
        </div>
        <Button variant="brand" appearance="accent" onClick={go}>Roll</Button>
      </div>

      {history.map((r, i) => (
        <div class={`panel dice-result ${r.botches ? "botch" : r.success === false ? "fail" : r.success ? "ok" : ""} ${i ? "old" : ""}`} key={history.length - i}>
          <div class="dice-total">
            <b>{r.total}</b>
            {r.success !== undefined && <span>{r.success ? `✓ vs ${r.opts.ease}` : `✗ vs ${r.opts.ease}`}</span>}
          </div>
          <div class="note">
            {r.opts.stress ? "Stress" : "Simple"} d10{r.opts.modifier ? ` ${r.opts.modifier > 0 ? "+" : "−"} ${Math.abs(r.opts.modifier)}` : ""}
            {" · rolled "}{r.rolls.map(face).join(" → ")}
            {r.botchRolls.length > 0 && <> · botch dice {r.botchRolls.join(", ")}</>}
            {describe(r) && <> · {describe(r)}</>}
            {" · die "}{r.die}
          </div>
        </div>
      ))}
    </div>
  );
}
