// Computes the five creation budgets from a Character. Pure: feeds both `status`
// rendering and `validate`. Affinity discounts and Skilled-Parens/Warrior bonuses
// come from the derived Modifiers.
import { charKind } from "./character.ts";
import type { AbilityPick, Character, XpPool } from "./character.ts";
import { abilityScoreFromXp, abilityXp, affinityXp, artXp, charCost } from "./costs.ts";
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
  majorVirtues: number;
  majorFlaws: number;
  majorHermeticVirtues: number;
  hermeticVirtues: number;
  hermeticFlaws: number;
  storyFlaws: number;
  personalityFlaws: number;
  majorPersonalityFlaws: number;
  /** Count of Social Status traits (free + paid). All characters need ≥1. */
  socialStatuses: number;
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
  /** Spell Mastery xp. Its cap is what Virtues/bonuses grant; anything past it is paid from apprenticeship xp. */
  mastery: BudgetLine;
}

/** Total bonus xp granted to one pool (Virtues + manual bonuses). */
export const grantedXp = (mods: Modifiers, pool: XpPool): number =>
  mods.grants.filter((g) => g.pool === pool).reduce((s, g) => s + g.xp, 0);

/** Real xp that takes an Ability from 0 to `score`, after any Affinity discount. */
export function abilityCost(name: string, score: number, mods: Modifiers): number {
  const raw = abilityXp(score);
  return mods.affinityAbility.has(name) ? affinityXp(raw) : raw;
}

/** What `xp` real xp counts for on the Ability ladder (an Affinity makes it ×1.5). */
export function effectiveXp(name: string, xp: number, mods: Modifiers): number {
  return mods.affinityAbility.has(name) ? Math.floor(xp * 1.5) : xp;
}

/** One Ability summed across the stages that paid for it. */
export interface AbilityTotal {
  name: string;
  type: AbilityPick["type"];
  restricted?: boolean;
  specialty?: string;
  /** Real xp across every stage row. */
  xp: number;
  score: number;
  rows: AbilityPick[];
}

/** Each Ability once, with its score from the xp of all its stage rows combined. */
export function abilityTotals(ch: Pick<Character, "abilities">, mods: Modifiers): AbilityTotal[] {
  const byName = new Map<string, AbilityTotal>();
  for (const a of ch.abilities) {
    const k = a.name.toLowerCase();
    let t = byName.get(k);
    if (!t) byName.set(k, (t = { name: a.name, type: a.type, restricted: a.restricted, xp: 0, score: 0, rows: [] }));
    t.rows.push(a);
    t.xp += a.xp;
    t.specialty ??= a.specialty || undefined;
  }
  for (const t of byName.values()) t.score = abilityScoreFromXp(effectiveXp(t.name, t.xp, mods));
  return [...byName.values()];
}

/** An Ability's combined score (0 if not taken). */
export function abilityScore(ch: Pick<Character, "abilities">, name: string, mods: Modifiers): number {
  return abilityTotals(ch, mods).find((t) => t.name.toLowerCase() === name.toLowerCase())?.score ?? 0;
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
  const majorVirtues = paidVirtues.filter((v) => v.size === "Major").length;
  const majorFlaws = paidFlaws.filter((f) => f.size === "Major").length;
  const majorHermeticVirtues = paidVirtues.filter((v) => v.size === "Major" && isHermetic(v.category)).length;
  const hermeticVirtues = paidVirtues.filter((v) => isHermetic(v.category)).length;
  const hermeticFlaws = paidFlaws.filter((f) => isHermetic(f.category)).length;
  const storyFlaws = paidFlaws.filter((f) => f.category === "Story").length;
  const personalityFlaws = paidFlaws.filter((f) => f.category === "Personality").length;
  const majorPersonalityFlaws = paidFlaws.filter((f) => f.category === "Personality" && f.size === "Major").length;
  // Social Status traits are 0-point/Free; count free + paid (Hermetic Magus included).
  const socialStatuses = ch.virtues.filter((v) => v.category === "Social Status").length;
  // Flaw-point ceiling: grogs are minor characters (≤3); companions and magi ≤10.
  const flawCap = charKind(ch) === "grog" ? 3 : 10;

  // 3-5. xp pools by stage
  const stageXp = (stage: AbilityPick["stage"]) =>
    ch.abilities.filter((a) => a.stage === stage).reduce((s, a) => s + a.xp, 0);
  const childhoodSpent = stageXp("childhood");
  const childhoodCap = CHILDHOOD_XP + grantedXp(mods, "childhood");
  const laterLifeSpent = stageXp("later-life");
  const laterLifeCap = ch.laterLifeYears * mods.laterLifeXpPerYear + grantedXp(mods, "later-life");

  const masterySpent = ch.spells.reduce((s, sp) => s + abilityXp(sp.mastery ?? 0), 0);
  const masteryCap = Math.max(0, grantedXp(mods, "mastery"));
  const masteryOverflow = Math.max(0, masterySpent - masteryCap);

  const artXpSpent = ARTS.reduce<number>((s, art) => s + (ch.arts[art] ? artCost(art, ch.arts[art]!, mods) : 0), 0);
  const apprenticeAbilityXp = stageXp("apprenticeship");
  const apprenticeSpent = artXpSpent + apprenticeAbilityXp + masteryOverflow;
  const apprenticeCap = APPRENTICESHIP_XP + grantedXp(mods, "apprenticeship");

  const spellsSpent = ch.spells.reduce((s, sp) => s + sp.level, 0);
  const spellCap = SPELL_LEVELS + grantedXp(mods, "spells");

  const line = (key: string, label: string, spent: number, cap: number): BudgetLine => ({
    key, label, spent, cap, over: spent > cap, full: spent === cap,
  });

  const hasAbility = (name: string) =>
    abilityScore(ch, name, mods) >= 1;

  return {
    characteristics: line("characteristics", "Characteristics", charSpent, CHAR_POINTS),
    virtuesFlaws: {
      ...line("virtues-flaws", "Virtues/Flaws", flawPoints, flawCap),
      virtuePoints, flawPoints,
      balanced: virtuePoints === flawPoints,
      minorFlaws, majorVirtues, majorFlaws, majorHermeticVirtues,
      hermeticVirtues, hermeticFlaws, storyFlaws,
      personalityFlaws, majorPersonalityFlaws, socialStatuses,
    },
    childhood: { ...line("childhood", "Childhood xp", childhoodSpent, childhoodCap), nativeLanguageSet: !!ch.nativeLanguage },
    laterLife: { ...line("later-life", "Later life xp", laterLifeSpent, laterLifeCap), years: ch.laterLifeYears },
    apprenticeship: {
      ...line("apprenticeship", "Apprenticeship xp", apprenticeSpent, apprenticeCap),
      spells: line("spells", "Spell levels", spellsSpent, spellCap),
      minimums: {
        parmaMagica: hasAbility("Parma Magica"),
        magicTheory: hasAbility("Magic Theory"),
        latin: abilityTotals(ch, mods).some((t) => t.score >= 1 && (/latin/i.test(t.name) || /latin/i.test(t.specialty ?? ""))),
      },
    },
    mastery: line("mastery", "Mastery xp", masterySpent - masteryOverflow, masteryCap),
  };
}
