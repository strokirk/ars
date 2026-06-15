// Legality checking. validate() returns structured Issues (errors block `check`;
// warnings are advisory). It encodes the "Final legality checklist" from
// skills/magus-creation/SKILL.md. Pure — shared by the CLI and any web UI.
import { type Character, charKind } from "./character.ts";
import { type Budgets, ageAbilityMax, computeBudgets } from "./budgets.ts";
import { type Modifiers, deriveModifiers } from "./modifiers.ts";
import { abilityAllowed, hasEnablingVirtue } from "./ability-policy.ts";
import { spellLabTotal } from "./labtotal.ts";

export type IssueLevel = "error" | "warning";
export interface Issue {
  level: IssueLevel;
  code: string;
  budget: string;
  message: string;
}

// Active rule violations (something is *wrong* now), as opposed to "incomplete"
// errors (under-spend, imbalance, a required pick not yet made). A mutation is
// rejected only on these; status shows ⚠ only for these.
export const VIOLATION_CODES = new Set([
  "char-over", "flaw-cap", "minor-flaw-cap", "major-herm-virtue", "story-flaw-cap",
  "pers-flaw-cap", "major-pers-flaw", "childhood-over", "later-over", "appr-over",
  "spell-over", "age-cap", "ability-stage", "spell-labtotal",
  // grog/companion active violations (a missing Social Status is a completeness gap,
  // like native-language — it blocks final legality but never rejects a mutation).
  "gift-forbidden", "major-forbidden", "story-forbidden", "hermetic-forbidden",
]);

const REQUIRED_FREE = ["The Gift", "Hermetic Magus"];

export function validate(ch: Character, mods: Modifiers = deriveModifiers(ch), budgets: Budgets = computeBudgets(ch, mods)): Issue[] {
  const issues: Issue[] = [];
  const err = (code: string, budget: string, message: string) => issues.push({ level: "error", code, budget, message });
  const warn = (code: string, budget: string, message: string) => issues.push({ level: "warning", code, budget, message });
  const kind = charKind(ch);
  const isMagus = kind === "magus";
  const gifted = ch.virtues.some((v) => /^the gift$/i.test(v.name));

  // 1. Characteristics — must net exactly 7 (all character types).
  const c = budgets.characteristics;
  if (c.over) err("char-over", "characteristics", `Characteristics overspent: ${c.spent} of ${c.cap} points used.`);
  else if (c.spent < c.cap) err("char-under", "characteristics", `Characteristics incomplete: ${c.spent}/${c.cap} points spent — assign ${c.cap - c.spent} more.`);

  // 2. Virtues & Flaws.
  const vf = budgets.virtuesFlaws;
  // Magi must carry the two free Status/Gift Virtues.
  if (isMagus) {
    for (const name of REQUIRED_FREE) {
      if (!ch.virtues.some((v) => v.name.toLowerCase() === name.toLowerCase())) {
        err("missing-free", "virtues-flaws", `Missing required free Virtue: ${name}.`);
      }
    }
  }
  // Every character must take a Social Status.
  if (vf.socialStatuses < 1) err("social-status", "virtues-flaws", `Every character must take one Social Status Virtue (e.g. Covenfolk, Knight).`);
  // Flaw-point ceiling and balance (cap is per-kind: grog 3, others 10).
  if (vf.flawPoints > vf.cap) err("flaw-cap", "virtues-flaws", `Flaw points ${vf.flawPoints} exceed the ${vf.cap}-point limit${kind === "grog" ? " for grogs" : ""}.`);
  if (!vf.balanced) err("vf-balance", "virtues-flaws", `Virtue points (${vf.virtuePoints}) must equal Flaw points (${vf.flawPoints}).`);
  if (vf.minorFlaws > 5) err("minor-flaw-cap", "virtues-flaws", `Too many Minor Flaws: ${vf.minorFlaws} (max 5).`);

  if (kind === "grog") {
    // Grogs are minor characters: Minor V/F only, no Story Flaws, no The Gift, ≤1 Personality Flaw.
    if (vf.majorVirtues + vf.majorFlaws > 0) err("major-forbidden", "virtues-flaws", `Grogs may not take Major Virtues or Flaws.`);
    if (vf.storyFlaws > 0) err("story-forbidden", "virtues-flaws", `Grogs may not take Story Flaws.`);
    if (vf.personalityFlaws > 1) err("pers-flaw-cap", "virtues-flaws", `Grogs take at most 1 Personality Flaw (have ${vf.personalityFlaws}).`);
    if (ch.virtues.some((v) => /^the gift$/i.test(v.name))) err("gift-forbidden", "virtues-flaws", `Grogs may not have The Gift — a Gifted character is too important to be a grog.`);
  } else {
    if (vf.storyFlaws > 1) err("story-flaw-cap", "virtues-flaws", `Too many Story Flaws: ${vf.storyFlaws} (max 1).`);
    if (vf.personalityFlaws > 2) err("pers-flaw-cap", "virtues-flaws", `Too many Personality Flaws: ${vf.personalityFlaws} (max 2).`);
    if (vf.majorPersonalityFlaws > 1) err("major-pers-flaw", "virtues-flaws", `Too many Major Personality Flaws: ${vf.majorPersonalityFlaws} (max 1).`);
  }

  // Hermetic Virtues/Flaws: magi need ≥1 Hermetic Flaw and ≤1 Major Hermetic Virtue;
  // grogs/companions may not take Hermetic V&F at all unless Gifted.
  if (isMagus) {
    if (vf.majorHermeticVirtues > 1) err("major-herm-virtue", "virtues-flaws", `Too many Major Hermetic Virtues: ${vf.majorHermeticVirtues} (max 1).`);
    if (vf.hermeticFlaws < 1) err("need-herm-flaw", "virtues-flaws", `A magus needs at least 1 Hermetic Flaw.`);
  } else if (!gifted && vf.hermeticVirtues + vf.hermeticFlaws > 0) {
    err("hermetic-forbidden", "virtues-flaws", `Only Gifted characters may take Hermetic Virtues or Flaws.`);
  }

  // 3. Childhood.
  if (!budgets.childhood.nativeLanguageSet) err("native-language", "childhood", `Native Language not set (mandatory, score ${5} for 75 xp). Use \`set native-language <lang>\`.`);
  if (budgets.childhood.over) err("childhood-over", "childhood", `Childhood xp overspent: ${budgets.childhood.spent}/${budgets.childhood.cap}.`);
  else if (budgets.childhood.spent < budgets.childhood.cap) warn("childhood-under", "childhood", `Childhood xp unused: ${budgets.childhood.spent}/${budgets.childhood.cap}.`);

  // 4. Later life.
  if (budgets.laterLife.over) err("later-over", "later-life", `Later-life xp overspent: ${budgets.laterLife.spent}/${budgets.laterLife.cap}.`);
  else if (budgets.laterLife.spent < budgets.laterLife.cap) warn("later-under", "later-life", `Later-life xp unused: ${budgets.laterLife.spent}/${budgets.laterLife.cap}.`);

  // 5. Apprenticeship (magi only — grogs/companions have no Arts, spells, or apprenticeship).
  if (isMagus) {
    const ap = budgets.apprenticeship;
    if (ap.over) err("appr-over", "apprenticeship", `Apprenticeship xp overspent: ${ap.spent}/${ap.cap}.`);
    else if (ap.spent < ap.cap) warn("appr-under", "apprenticeship", `Apprenticeship xp unused: ${ap.spent}/${ap.cap}.`);
    if (!ap.minimums.parmaMagica) err("min-parma", "apprenticeship", `Parma Magica ≥ 1 is required.`);
    if (!ap.minimums.magicTheory) err("min-magic-theory", "apprenticeship", `Magic Theory ≥ 1 is required.`);
    if (!ap.minimums.latin) err("min-latin", "apprenticeship", `Latin ≥ 1 is required.`);
    if (ap.spells.over) err("spell-over", "apprenticeship", `Spell levels overspent: ${ap.spells.spent}/${ap.spells.cap}.`);
    for (const s of ch.spells) {
      const lt = spellLabTotal(ch, mods, s, { aura: s.aura, inFocus: s.inFocus });
      if (s.level > lt.total) err("spell-labtotal", "apprenticeship", `${s.name} (level ${s.level}) exceeds its Lab Total of ${lt.total} (${lt.breakdown}).`);
    }
  }

  // Age caps + stage/type legality on Abilities (Affinity allows +2 over at creation).
  const max = ageAbilityMax(ch.age);
  const stageBudget: Record<string, string> = { childhood: "childhood", "later-life": "later-life", apprenticeship: "apprenticeship" };
  for (const a of ch.abilities) {
    if (a.stage === "free" || a.stage === "post-gauntlet") continue;
    const cap = mods.affinityAbility.has(a.name) ? max + 2 : max;
    if (a.score > cap) err("age-cap", stageBudget[a.stage] ?? "apprenticeship", `${a.name} ${a.score} exceeds the age-${ch.age} maximum of ${cap}.`);
    const pol = abilityAllowed(ch, a.type, a.stage);
    if (!pol.allowed) err("ability-stage", stageBudget[a.stage] ?? "apprenticeship", `${a.name} (${a.type}) not allowed in ${a.stage}: ${pol.reason}`);
    else if (a.restricted && a.stage !== "apprenticeship" && !hasEnablingVirtue(ch, a.type)) warn("ability-restricted", stageBudget[a.stage] ?? "apprenticeship", `${a.name} is marked * (needs an enabling Virtue) — verify you have one.`);
  }

  return issues;
}

/** Convenience: true when no error-level issues remain. */
export function isLegal(issues: Issue[]): boolean {
  return !issues.some((i) => i.level === "error");
}
