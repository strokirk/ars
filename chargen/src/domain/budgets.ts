// Computes the five creation budgets from a Character. Pure: feeds both `status`
// rendering and `validate`. Affinity discounts and Skilled-Parens/Warrior bonuses
// come from the derived Modifiers.
import type { AbilityPick, Character } from "./character.ts";
import { abilityXp, affinityXp, artXp, charCost } from "./costs.ts";
import { type Modifiers, deriveModifiers } from "./modifiers.ts";
import { ARTS, type Art } from "./glossary.ts";

export const CHAR_POINTS = 7;
export const CHILDHOOD_XP = 45;
export const XP_PER_YEAR = 15;
export const APPRENTICESHIP_XP = 240;
export const SPELL_LEVELS = 120;
export const NATIVE_LANGUAGE_SCORE = 5;

/** Highest Ability/Art score allowed at creation, by age. */
export function ageAbilityMax(age: number): number {
  if (age < 30) return 5;
  if (age <= 35) return 6;
  if (age <= 40) return 7;
  if (age <= 45) return 8;
  return 9;
}

export interface BudgetLine {
  key: string;
  label: string;
  spent: number;
  cap: number;
  over: boolean;
  full: boolean;
}

export interface VFBudget extends BudgetLine {
  virtuePoints: number;
  flawPoints: number;
  balanced: boolean;
  minorFlaws: number;
  majorHermeticVirtues: number;
  hermeticFlaws: number;
  storyFlaws: number;
  personalityFlaws: number;
  majorPersonalityFlaws: number;
}

export interface ApprenticeshipMinimums {
  parmaMagica: boolean;
  magicTheory: boolean;
  latin: boolean;
}

export interface Budgets {
  characteristics: BudgetLine;
  virtuesFlaws: VFBudget;
  childhood: BudgetLine & { nativeLanguageSet: boolean };
  laterLife: BudgetLine & { years: number };
  apprenticeship: BudgetLine & { spells: BudgetLine; minimums: ApprenticeshipMinimums };
}

export function abilityCost(a: AbilityPick, mods: Modifiers): number {
  const raw = abilityXp(a.score);
  return mods.affinityAbility.has(a.name) ? affinityXp(raw) : raw;
}

export function artCost(art: Art, score: number, mods: Modifiers): number {
  const raw = artXp(score);
  return mods.affinityArt.has(art) ? affinityXp(raw) : raw;
}

const isHermetic = (category: string) => category === "Hermetic";

export function computeBudgets(ch: Character, mods: Modifiers = deriveModifiers(ch)): Budgets {
  // 1. Characteristics
  const charSpent = Object.values(ch.characteristics).reduce<number>((s, v) => s + charCost(v ?? 0), 0);

  // 2. Virtues & Flaws (free picks excluded from the balance)
  const paidVirtues = ch.virtues.filter((v) => !v.free);
  const paidFlaws = ch.flaws.filter((f) => !f.free);
  const virtuePoints = paidVirtues.reduce((s, v) => s + v.points, 0);
  const flawPoints = paidFlaws.reduce((s, f) => s + f.points, 0);
  const minorFlaws = paidFlaws.filter((f) => f.size === "Minor").length;
  const majorHermeticVirtues = paidVirtues.filter((v) => v.size === "Major" && isHermetic(v.category)).length;
  const hermeticFlaws = paidFlaws.filter((f) => isHermetic(f.category)).length;
  const storyFlaws = paidFlaws.filter((f) => f.category === "Story").length;
  const personalityFlaws = paidFlaws.filter((f) => f.category === "Personality").length;
  const majorPersonalityFlaws = paidFlaws.filter((f) => f.category === "Personality" && f.size === "Major").length;

  // 3-5. xp pools by stage
  const stageXp = (stage: AbilityPick["stage"]) =>
    ch.abilities.filter((a) => a.stage === stage).reduce((s, a) => s + abilityCost(a, mods), 0);
  const childhoodSpent = stageXp("childhood");
  const laterLifeSpent = stageXp("later-life");
  const laterLifeCap = ch.laterLifeYears * XP_PER_YEAR;

  const artXpSpent = ARTS.reduce<number>((s, art) => s + (ch.arts[art] ? artCost(art, ch.arts[art]!, mods) : 0), 0);
  const apprenticeAbilityXp = stageXp("apprenticeship");
  const apprenticeSpent = artXpSpent + apprenticeAbilityXp;
  const apprenticeCap = APPRENTICESHIP_XP + mods.bonusApprenticeshipXp + mods.warriorXp;

  const spellsSpent = ch.spells.reduce((s, sp) => s + sp.level, 0);
  const spellCap = SPELL_LEVELS + mods.bonusSpellLevels;

  const line = (key: string, label: string, spent: number, cap: number): BudgetLine => ({
    key, label, spent, cap, over: spent > cap, full: spent === cap,
  });

  const hasAbility = (name: string) =>
    ch.abilities.some((a) => a.name.toLowerCase() === name.toLowerCase() && a.score >= 1);

  return {
    characteristics: line("characteristics", "Characteristics", charSpent, CHAR_POINTS),
    virtuesFlaws: {
      ...line("virtues-flaws", "Virtues/Flaws", flawPoints, 10),
      virtuePoints, flawPoints,
      balanced: virtuePoints === flawPoints,
      minorFlaws, majorHermeticVirtues, hermeticFlaws, storyFlaws,
      personalityFlaws, majorPersonalityFlaws,
    },
    childhood: { ...line("childhood", "Childhood xp", childhoodSpent, CHILDHOOD_XP), nativeLanguageSet: !!ch.nativeLanguage },
    laterLife: { ...line("later-life", "Later life xp", laterLifeSpent, laterLifeCap), years: ch.laterLifeYears },
    apprenticeship: {
      ...line("apprenticeship", "Apprenticeship xp", apprenticeSpent, apprenticeCap),
      spells: line("spells", "Spell levels", spellsSpent, spellCap),
      minimums: {
        parmaMagica: hasAbility("Parma Magica"),
        magicTheory: hasAbility("Magic Theory"),
        latin: ch.abilities.some((a) => /latin/i.test(a.name) || /latin/i.test(a.specialty ?? "")),
      },
    },
  };
}
