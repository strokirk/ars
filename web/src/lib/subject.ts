// A downtime "subject" — the numbers a totals formula reads. Deliberately not a
// `chargen` Character: the downtime planner must work with no character at all
// (a concept, a what-if, a house-ruled NPC), so a plain bag of numbers is the
// primitive case, and a roster/draft character is just a prefill (fromCharacter).
import type { Character } from "../../../chargen/src/domain/character.ts";
import type { Art, Characteristic } from "../../../chargen/src/domain/glossary.ts";
import { abilityTotals } from "../../../chargen/src/domain/budgets.ts";
import { deriveModifiers } from "../../../chargen/src/domain/modifiers.ts";

export interface Subject {
  name: string;
  age?: number;
  characteristics: Partial<Record<Characteristic, number>>;
  abilities: Record<string, number>; // keyed by ability name, case-insensitive lookup
  arts: Partial<Record<Art, number>>;
  virtues: string[];
}

export const BLANK_SUBJECT: Subject = {
  name: "Manual entry",
  characteristics: {},
  abilities: {},
  arts: {},
  virtues: [],
};

export function fromCharacter(ch: Character): Subject {
  const abilities: Record<string, number> = {};
  for (const t of abilityTotals(ch, deriveModifiers(ch))) abilities[t.name] = t.score;
  return {
    name: ch.name,
    age: ch.age,
    characteristics: ch.characteristics,
    abilities,
    arts: ch.arts,
    virtues: [...ch.virtues.map((v) => v.name), ...ch.flaws.map((f) => f.name)],
  };
}

export function abilityScore(s: Subject, name: string): number {
  const key = Object.keys(s.abilities).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? s.abilities[key]! : 0;
}
