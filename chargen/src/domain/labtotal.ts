// Lab Total for learning a spell — the per-spell cap a known spell's level must not
// exceed (skills/magus-creation/SKILL.md):
//   Lab Total = Technique + Form + Intelligence + Magic Theory + aura (+mods)
// For spells with requisites, the LOWEST applicable Technique and LOWEST applicable
// Form are used. Modifiers: Puissant (+3 to that Art's totals), Magical Focus (add
// the lowest applicable Art twice, when in-focus), Deficient Art (halve the total).
import type { Character } from "./character.ts";
import type { Modifiers } from "./modifiers.ts";
import { type Art, type Form, type Technique, isForm, isTechnique } from "./glossary.ts";

export const DEFAULT_AURA = 3;

export interface SpellLike {
  technique: Technique;
  form: Form;
  requisites: string[];
}

export interface LabTotalResult {
  total: number;
  techVal: number;
  formVal: number;
  int: number;
  magicTheory: number;
  aura: number;
  focusBonus: number;
  puissantBonus: number;
  deficient: boolean;
  breakdown: string;
}

const score = (ch: Character, art: Art): number => ch.arts[art] ?? 0;

function magicTheoryScore(ch: Character): number {
  const a = ch.abilities.find((x) => x.name.toLowerCase() === "magic theory");
  return a?.score ?? 0;
}

export interface LabTotalOpts {
  aura?: number;
  inFocus?: boolean;
}

export function spellLabTotal(ch: Character, mods: Modifiers, spell: SpellLike, opts: LabTotalOpts = {}): LabTotalResult {
  const techs: Art[] = [spell.technique, ...spell.requisites.filter(isTechnique)];
  const forms: Art[] = [spell.form, ...spell.requisites.filter(isForm)];
  // Lowest applicable Technique and Form (requisites can drag the total down).
  const lowestTech = techs.reduce((lo, a) => (score(ch, a) < score(ch, lo) ? a : lo), techs[0]!);
  const lowestForm = forms.reduce((lo, a) => (score(ch, a) < score(ch, lo) ? a : lo), forms[0]!);
  const techVal = score(ch, lowestTech);
  const formVal = score(ch, lowestForm);

  const int = ch.characteristics.Int ?? 0;
  // Puissant Magic Theory (e.g. the Bonisagus free benefit) adds +2 to MT in ALL
  // totals, including the Lab Total.
  const mtPuissant = mods.puissantAbility.get("Magic Theory") ?? 0;
  const magicTheory = magicTheoryScore(ch) + mtPuissant;
  const aura = opts.aura ?? DEFAULT_AURA;

  const puissantBonus = (mods.puissantArt.get(lowestTech) ?? 0) + (mods.puissantArt.get(lowestForm) ?? 0);
  const focusBonus = opts.inFocus ? Math.min(techVal, formVal) : 0;
  const deficient = mods.deficientArts.has(lowestTech) || mods.deficientArts.has(lowestForm);

  let total = techVal + formVal + int + magicTheory + aura + puissantBonus + focusBonus;
  if (deficient) total = Math.floor(total / 2);

  const parts = [
    `${lowestTech} ${techVal}`, `${lowestForm} ${formVal}`, `Int ${int}`,
    `Magic Theory ${magicTheory}${mtPuissant ? ` (incl. Puissant +${mtPuissant})` : ""}`, `aura ${aura}`,
  ];
  if (puissantBonus) parts.push(`Puissant +${puissantBonus}`);
  if (focusBonus) parts.push(`Focus +${focusBonus}`);
  const breakdown = `${parts.join(" + ")}${deficient ? " , halved (Deficient)" : ""} = ${total}`;
  return { total, techVal, formVal, int, magicTheory, aura, focusBonus, puissantBonus, deficient, breakdown };
}
