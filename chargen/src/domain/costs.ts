// Pure cost formulas from the rulebook. No state, fully unit-testable.

/** xp to raise an Art from 0 to score n: n(n+1)/2.  (1→1, 2→3, 3→6, 4→10, 5→15, 10→55) */
export function artXp(n: number): number {
  if (n < 0) throw new RangeError(`Art score cannot be negative: ${n}`);
  return (n * (n + 1)) / 2;
}

/** xp to raise an Ability from 0 to score n: 5·n(n+1)/2.  (1→5, 2→15, 3→30, 4→50, 5→75) */
export function abilityXp(n: number): number {
  if (n < 0) throw new RangeError(`Ability score cannot be negative: ${n}`);
  return 5 * ((n * (n + 1)) / 2);
}

/**
 * Net characteristic points spent to set a Characteristic to `value` (from 0):
 * +1→1, +2→3, +3→6 (and the mirror image gives points back for negatives).
 */
export function charCost(value: number): number {
  const v = Math.abs(value);
  const magnitude = (v * (v + 1)) / 2;
  return Math.sign(value) * magnitude;
}

/**
 * Real xp to reach a score when an Affinity applies: the xp you spend counts for
 * 150%, so the real cost is the raw cost divided by 1.5 (rounded up).
 */
export function affinityXp(rawXp: number): number {
  return Math.ceil((rawXp * 2) / 3);
}
