import { expect, test } from "vitest";
import { roll } from "../src/lib/dice.ts";

const script = (...faces: number[]) => () => faces.shift()!;
const stress = { stress: true, modifier: 9, botchDice: 2 };

test("the rulebook's worked examples", () => {
  expect(roll(stress, script(6)).total).toBe(15);
  const chain = roll(stress, script(1, 1, 5));
  expect([chain.rolls, chain.multiplier, chain.total]).toEqual([[1, 1, 5], 4, 29]);
  expect(roll(stress, script(1, 0)).die).toBe(20); // a re-rolled zero counts as ten
  expect(roll(stress, script(0, 3, 7)).total).toBe(9); // zero, no botch
  const botch = roll({ ...stress, modifier: -2 }, script(0, 0, 0));
  expect([botch.botches, botch.total]).toEqual([2, -2]);
  expect(roll({ ...stress, botchDice: 0 }, script(0)).botchRolls).toEqual([]);
});

test("simple die: zero is ten, one is one; ease factor", () => {
  const simple = { stress: false, modifier: 2, botchDice: 0 };
  expect(roll(simple, script(0)).total).toBe(12);
  expect(roll(simple, script(1)).total).toBe(3);
  expect(roll({ ...simple, ease: 6 }, script(4)).success).toBe(true);
  expect(roll({ ...simple, ease: 6 }, script(3)).success).toBe(false);
});
