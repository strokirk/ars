// The twelve Hermetic Houses and the free, off-budget benefit each grants at
// creation (per skills/magus-creation/SKILL.md). applyHouse() turns a House (plus
// any required choice) into concrete free Virtue/Ability/Flaw picks + notes for
// choices the player still owes.
import { type AbilityPick, type Character, type TraitPick, traitPick } from "./character.ts";
import type { House } from "./glossary.ts";
import { abilityXp } from "./costs.ts";
import type { RulesData } from "../data/rules.ts";

export interface HouseChoices {
  /** For Houses offering a Puissant choice (Bonisagus/Flambeau/Mercere). */
  puissant?: string;
}

export interface HouseApplication {
  virtues: TraitPick[];
  abilities: AbilityPick[];
  flaws: TraitPick[];
  notes: Note[];
}

/** A note about a House choice still owed. `hint` is the CLI command that makes it — the CLI appends it, the web ignores it (like Issue.hint). */
export interface Note {
  message: string;
  hint?: string;
}

function freeTrait(rules: RulesData, input: string, param?: string): TraitPick | { error: string } {
  const r = rules.resolveTrait(input, param);
  if (!r.ok) return { error: r.error };
  const t = r.trait;
  return traitPick(t, true);
}

function freeAbility(rules: RulesData, name: string, score: number): AbilityPick | { error: string } {
  const a = rules.ability(name);
  if (!a) return { error: `ability "${name}" not found` };
  return { name: a.name, xp: abilityXp(score), stage: "free", type: a.type };
}

/** Resolve a Puissant choice against an allowed option set, falling back to a default. */
function pickPuissant(
  choice: string | undefined,
  options: string[],
  fallback: string,
): { value: string; note?: string } {
  if (!choice) return { value: fallback };
  const hit = options.find((o) => o.toLowerCase() === choice.toLowerCase());
  if (hit) return { value: hit };
  return { value: fallback, note: `Unknown Puissant choice "${choice}"; using ${fallback} (options: ${options.join(", ")}).` };
}

interface HouseBenefit {
  virtues?: { name: string; param?: string }[];
  abilities?: { name: string; score: number }[];
  puissant?: { kind: "art" | "ability"; options: string[]; fallback: string };
  /** Warping Points inflicted at creation unless a paid Virtue/Flaw's name matches `unless`. */
  warping?: { points: number; unless: RegExp; reason: string };
  notes?: Note[];
}

/** The free, off-budget benefit each House grants at creation. */
const HOUSE_BENEFITS: Record<House, HouseBenefit> = {
  Bjornaer: { abilities: [{ name: "Heartbeast", score: 1 }] },
  Bonisagus: { puissant: { kind: "ability", options: ["Magic Theory", "Intrigue"], fallback: "Magic Theory" } },
  Criamon: { abilities: [{ name: "Enigmatic Wisdom", score: 1 }] },
  "Ex Miscellanea": {
    notes: [
      {
        message: "Ex Miscellanea grants (off-budget): one free Minor Hermetic Virtue, one free Major non-Hermetic Virtue, and a compulsory Major Hermetic Flaw. Add them as free picks once chosen.",
        hint: "add virtue/flaw --free",
      },
    ],
  },
  Flambeau: { puissant: { kind: "art", options: ["Perdo", "Ignem"], fallback: "Ignem" } },
  Guernicus: { virtues: [{ name: "Hermetic Prestige" }] },
  Jerbiton: {
    notes: [{ message: "Jerbiton grants one free Minor Virtue (scholarship, the arts, or mundane interaction). Add it as a free pick once chosen.", hint: "add virtue --free" }],
  },
  Mercere: { puissant: { kind: "art", options: ["Creo", "Muto"], fallback: "Creo" } },
  Merinita: {
    virtues: [{ name: "Faerie Magic" }],
    abilities: [{ name: "Faerie Magic", score: 1 }],
    // ponytail: "faerie-related" matched by name only; a Virtue that's faerie in substance but not in name needs a dismiss.
    warping: { points: 1, unless: /faerie/i, reason: "Merinita initiation — no faerie-related Virtue or Flaw" },
  },
  Tremere: { virtues: [{ name: "Minor Magical Focus", param: "certamen" }] },
  Tytalus: { virtues: [{ name: "Self-Confident" }] },
  Verditius: { virtues: [{ name: "Verditius Magic" }] },
};

/** Warping Points a House's initiation inflicts on this character (0 if exempt). */
export function houseWarping(ch: Character): { points: number; reason: string } | null {
  const w = ch.house ? HOUSE_BENEFITS[ch.house].warping : undefined;
  if (!w) return null;
  const exempt = [...ch.virtues, ...ch.flaws].some((t) => !t.free && w.unless.test(t.name));
  return exempt ? null : { points: w.points, reason: w.reason };
}

export function applyHouse(
  house: House,
  choices: HouseChoices,
  rules: RulesData,
): HouseApplication {
  const app: HouseApplication = { virtues: [], abilities: [], flaws: [], notes: [] };
  const addV = (input: string, param?: string) => {
    const v = freeTrait(rules, input, param);
    if ("error" in v) app.notes.push({ message: `House benefit not applied: ${v.error}` });
    else app.virtues.push(v);
  };
  const addA = (name: string, score: number) => {
    const a = freeAbility(rules, name, score);
    if ("error" in a) app.notes.push({ message: `House benefit not applied: ${a.error}` });
    else app.abilities.push(a);
  };

  const benefit = HOUSE_BENEFITS[house];
  for (const v of benefit.virtues ?? []) addV(v.name, v.param);
  for (const a of benefit.abilities ?? []) addA(a.name, a.score);
  if (benefit.puissant) {
    const { kind, options, fallback } = benefit.puissant;
    const p = pickPuissant(choices.puissant, options, fallback);
    if (p.note) app.notes.push({ message: p.note });
    addV(kind === "art" ? "Puissant Art" : "Puissant Ability", p.value);
  }
  app.notes.push(...(benefit.notes ?? []));
  return app;
}

/** Houses that require a --puissant choice, with their options (for `new --help` / errors). */
export const HOUSE_PUISSANT_CHOICES: Partial<Record<House, string[]>> = Object.fromEntries(
  Object.entries(HOUSE_BENEFITS)
    .filter(([, b]) => b.puissant)
    .map(([house, b]) => [house, b.puissant!.options]),
);
