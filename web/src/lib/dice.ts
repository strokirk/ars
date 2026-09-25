// Ars Magica die rolls (md/01-introduction/05-die-rolls.md). Pure: pass a d10 that
// returns 0–9 to script a roll in tests.

export interface RollOpts {
  stress: boolean;
  modifier: number;
  /** Stress only. 0 = this roll can't botch. */
  botchDice: number;
  ease?: number;
}

export interface RollResult {
  opts: RollOpts;
  /** Every face rolled on the main die, in order (a stress 1 chains re-rolls). */
  rolls: number[];
  /** ×2 per chained 1. */
  multiplier: number;
  /** The die's contribution before the modifier. */
  die: number;
  /** Faces of the botch dice, when a stress 0 called for them. */
  botchRolls: number[];
  botches: number;
  total: number;
  /** Only when an Ease Factor was given. */
  success?: boolean;
}

const d10 = () => Math.floor(Math.random() * 10);

export function roll(opts: RollOpts, die: () => number = d10): RollResult {
  const rolls = [die()];
  let multiplier = 1;
  let value: number;
  const botchRolls: number[] = [];
  const first = rolls[0]!;

  if (!opts.stress) value = first === 0 ? 10 : first;
  else if (first === 1) {
    let r = 1;
    while (r === 1) { multiplier *= 2; r = die(); rolls.push(r); }
    value = (r === 0 ? 10 : r) * multiplier;
  } else if (first === 0) {
    value = 0;
    for (let i = 0; i < opts.botchDice; i++) botchRolls.push(die());
  } else value = first;

  const botches = botchRolls.filter((r) => r === 0).length;
  const total = botches ? Math.min(0, opts.modifier) : value + opts.modifier;
  return {
    opts, rolls, multiplier, die: value, botchRolls, botches, total,
    success: opts.ease === undefined ? undefined : !botches && total >= opts.ease,
  };
}
