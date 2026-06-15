// Thin UI-facing layer over the pure chargen engine. Everything the wizard does to a
// character goes through applyOps with force:true — so picks always land and the
// engine's validate() Issues become the teaching feedback (the final "Save" is gated
// on isLegal). This keeps the site and the CLI in exact agreement by construction.
import { rules } from "./rules.ts";
import { type Op, applyOps, type BatchResult } from "../../chargen/src/domain/operations.ts";
import { computeBudgets, type Budgets } from "../../chargen/src/domain/budgets.ts";
import { validate, isLegal, type Issue } from "../../chargen/src/domain/validate.ts";
import { deriveModifiers } from "../../chargen/src/domain/modifiers.ts";
import { createGrog, createCompanion, createMagus, type CreateResult } from "../../chargen/src/domain/create.ts";
import { type Character, type CharacterKind, charKind } from "../../chargen/src/domain/character.ts";
import type { House, Technique, Form } from "../../chargen/src/domain/glossary.ts";

export { rules };
export type { Op, Issue, Budgets, Character, CharacterKind, House, Technique, Form };

/** Apply a batch, forcing through cap violations (they surface as Issues, not rejections). */
export function apply(ch: Character, ops: Op[]): Character {
  return applyOps(ch, ops, rules, { force: true }).character;
}

/** Full batch result — use when you need to know if an *input* (not a cap) was rejected. */
export function applyResult(ch: Character, ops: Op[]): BatchResult {
  return applyOps(ch, ops, rules, { force: true });
}

export const budgetsOf = (ch: Character): Budgets => computeBudgets(ch);
export const issuesOf = (ch: Character): Issue[] => validate(ch);
export const isCharacterLegal = (ch: Character): boolean => isLegal(validate(ch));
export const modifiersOf = (ch: Character) => deriveModifiers(ch);
export { charKind };

export interface NewOpts {
  name?: string;
  house?: House;
  puissant?: string;
  favoredTechnique?: Technique;
  favoredForm?: Form;
}

/** Fresh blank character of a kind. Magus requires a House (defaults applied later). */
export function freshCharacter(kind: CharacterKind, opts: NewOpts = {}): CreateResult {
  const name = opts.name ?? "";
  if (kind === "grog") return createGrog({ name });
  if (kind === "companion") return createCompanion({ name });
  return createMagus(
    {
      name,
      house: opts.house ?? "Bonisagus",
      puissant: opts.puissant,
      favoredTechnique: opts.favoredTechnique,
      favoredForm: opts.favoredForm,
    },
    rules,
  );
}

/**
 * Rebuild a magus with new House / favored / Puissant choices (which change the free,
 * off-budget grants) while carrying over every player-made pick. Used when the House
 * dropdown changes mid-build so we don't strand stale House benefits.
 */
export function reseedMagus(prev: Character, opts: NewOpts): Character {
  const base = createMagus(
    {
      name: prev.name,
      concept: prev.concept,
      age: prev.age,
      house: opts.house ?? prev.house ?? "Bonisagus",
      puissant: opts.puissant,
      favoredTechnique: opts.favoredTechnique ?? prev.favoredTechnique,
      favoredForm: opts.favoredForm ?? prev.favoredForm,
      focus: prev.focus,
    },
    rules,
  ).character;
  base.notes = prev.notes;
  base.laterLifeYears = prev.laterLifeYears;
  base.nativeLanguage = prev.nativeLanguage;
  base.characteristics = prev.characteristics;
  base.arts = prev.arts;
  base.spells = prev.spells;
  base.personality = prev.personality;
  base.reputation = prev.reputation;
  base.confidence = prev.confidence;
  // Keep player picks; replace only the free (Gift/Status/House) grants.
  base.virtues = [...base.virtues.filter((v) => v.free), ...prev.virtues.filter((v) => !v.free)];
  base.flaws = [...base.flaws.filter((f) => f.free), ...prev.flaws.filter((f) => !f.free)];
  base.abilities = [...base.abilities.filter((a) => a.stage === "free"), ...prev.abilities.filter((a) => a.stage !== "free")];
  return base;
}

export const KIND_LABEL: Record<CharacterKind, string> = { grog: "Grog", companion: "Companion", magus: "Magus" };
export const KIND_BLURB: Record<CharacterKind, string> = {
  grog: "A covenant soldier or servant — quick to make, and a minor character by the rules.",
  companion: "An important non-magus: a knight, scholar, faerie-touched wanderer, or worse.",
  magus: "A Gifted member of the Order of Hermes, built across the five creation budgets.",
};
