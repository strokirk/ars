// Derives mechanical effects from a character's chosen Virtues/Flaws (free ones
// included). These feed xp budgeting (Affinity, Skilled Parens, Warrior) and the
// Lab/Casting Totals (Puissant, Magical Focus, Deficient — used from M4/M5).
import type { Character } from "./character.ts";
import { type Art, isArt } from "./glossary.ts";

export interface Modifiers {
  puissantArt: Map<Art, number>;        // Art -> +3 (×n if stacked)
  puissantAbility: Map<string, number>; // ability name -> +2
  affinityArt: Set<Art>;                // Arts whose xp counts ×1.5
  affinityAbility: Set<string>;         // ability names whose xp counts ×1.5
  foci: { size: "Minor" | "Major"; text: string }[];
  deficientArts: Set<Art>;              // Arts whose totals are halved
  bonusApprenticeshipXp: number;        // Skilled Parens: +60
  bonusSpellLevels: number;             // Skilled Parens: +30
  warriorXp: number;                    // Warrior: +50, Martial Abilities only
}

export function deriveModifiers(ch: Character): Modifiers {
  const m: Modifiers = {
    puissantArt: new Map(),
    puissantAbility: new Map(),
    affinityArt: new Set(),
    affinityAbility: new Set(),
    foci: [],
    deficientArts: new Set(),
    bonusApprenticeshipXp: 0,
    bonusSpellLevels: 0,
    warriorXp: 0,
  };
  const asArt = (p?: string): Art | undefined => (p && isArt(p) ? p : undefined);

  for (const v of ch.virtues) {
    switch (v.name) {
      case "Puissant Art": {
        const a = asArt(v.param);
        if (a) m.puissantArt.set(a, (m.puissantArt.get(a) ?? 0) + 3);
        break;
      }
      case "Puissant Ability":
        if (v.param) m.puissantAbility.set(v.param, (m.puissantAbility.get(v.param) ?? 0) + 2);
        break;
      case "Affinity with Art": {
        const a = asArt(v.param);
        if (a) m.affinityArt.add(a);
        break;
      }
      case "Affinity with Ability":
        if (v.param) m.affinityAbility.add(v.param);
        break;
      case "Minor Magical Focus":
        m.foci.push({ size: "Minor", text: v.param ?? "" });
        break;
      case "Major Magical Focus":
        m.foci.push({ size: "Major", text: v.param ?? "" });
        break;
      case "Skilled Parens":
        m.bonusApprenticeshipXp += 60;
        m.bonusSpellLevels += 30;
        break;
      case "Warrior":
        m.warriorXp += 50;
        break;
    }
  }
  for (const f of ch.flaws) {
    if (f.name === "Deficient Form" || f.name === "Deficient Technique") {
      const a = asArt(f.param);
      if (a) m.deficientArts.add(a);
    }
  }
  return m;
}

/**
 * Effective Confidence Score + starting points. Base is 1 (3 points); the
 * Self-Confident Virtue raises it to 2 (5 points). An explicit higher stored
 * value (via `set confidence`) is respected.
 */
export function confidenceScore(ch: Character): { score: number; points: number } {
  const selfConfident = ch.virtues.some((v) => v.name === "Self-Confident");
  const score = Math.max(ch.confidence ?? 1, selfConfident ? 2 : 1);
  return { score, points: score >= 2 ? 5 : 3 };
}
