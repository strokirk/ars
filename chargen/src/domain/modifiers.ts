// Derives mechanical effects from a character's chosen Virtues/Flaws (free ones
// included). These feed xp budgeting (Affinity, VIRTUE_XP grants, the player's own
// xpBonuses) and the Lab/Casting Totals (Puissant, Magical Focus, Deficient).
import type { AbilityPick, Character, XpPool } from "./character.ts";
import { type Art, isArt } from "./glossary.ts";
import type { AbilityType } from "../data/types.ts";

/** Extra xp (or spell levels) added to one creation pool's cap. */
export interface XpGrant {
  pool: XpPool;
  xp: number;
  /** Virtue display name, or the player's note for a manual bonus. */
  source: string;
  /** Only Abilities matching this may spend it — checked by validate(), not enforced. */
  only?: { label: string; types?: AbilityType[]; names?: string[] };
}

/**
 * Creation xp each Virtue grants, per copy taken. Pure data: add a row here and
 * budgets, validation and the wizard's pool headings pick it up. Mundane bonuses
 * land in the later-life pool (where non-General Abilities open up with the
 * enabling Virtue); a Virtue whose restriction can't be expressed as types/names
 * (Well-Traveled) carries only its label.
 */
export const VIRTUE_XP: Record<string, Omit<XpGrant, "source">[]> = {
  "Skilled Parens": [{ pool: "apprenticeship", xp: 60 }, { pool: "spells", xp: 30 }],
  Warrior: [{ pool: "later-life", xp: 50, only: { label: "Martial Abilities", types: ["Martial"] } }],
  "Arcane Lore": [{ pool: "later-life", xp: 50, only: { label: "Arcane Abilities", types: ["Arcane"] } }],
  Educated: [{ pool: "later-life", xp: 50, only: { label: "Latin and Artes Liberales", names: ["Latin", "Artes Liberales"] } }],
  "Privileged Upbringing": [{ pool: "later-life", xp: 50, only: { label: "General, Academic or Martial Abilities", types: ["General", "Academic", "Martial"] } }],
  "Well-Traveled": [{ pool: "later-life", xp: 50, only: { label: "living languages, Area Lores, Bargain, Carouse, Charm, Etiquette, Folk Ken or Guile" } }],
  "Mastered Spells": [{ pool: "mastery", xp: 50 }],
};

/** Does an Ability satisfy a grant's restriction? Unrestricted/uncheckable grants accept anything. */
export function grantAccepts(g: XpGrant, a: Pick<AbilityPick, "name" | "type">): boolean {
  if (!g.only || (!g.only.types && !g.only.names)) return true;
  if (g.only.types?.includes(a.type as AbilityType)) return true;
  return g.only.names?.some((n) => n.toLowerCase() === a.name.toLowerCase()) ?? false;
}

export interface Modifiers {
  puissantArt: Map<Art, number>;        // Art -> +3 (×n if stacked)
  puissantAbility: Map<string, number>; // ability name -> +2
  affinityArt: Set<Art>;                // Arts whose xp counts ×1.5
  affinityAbility: Set<string>;         // ability names whose xp counts ×1.5
  foci: { size: "Minor" | "Major"; text: string }[];
  deficientArts: Set<Art>;              // Arts whose totals are halved
  grants: XpGrant[];                    // VIRTUE_XP rows + the player's xpBonuses
  laterLifeXpPerYear: number;           // 15 normally; Wealthy 20, Poor 10 (companions)
}

export function deriveModifiers(ch: Character): Modifiers {
  const m: Modifiers = {
    puissantArt: new Map(),
    puissantAbility: new Map(),
    affinityArt: new Set(),
    affinityAbility: new Set(),
    foci: [],
    deficientArts: new Set(),
    grants: [],
    laterLifeXpPerYear: 15,
  };
  const asArt = (p?: string): Art | undefined => (p && isArt(p) ? p : undefined);

  // Wealthy/Poor adjust the later-life xp rate (companions only, by the rules).
  if (ch.virtues.some((v) => v.name.toLowerCase() === "wealthy")) m.laterLifeXpPerYear = 20;
  if (ch.flaws.some((f) => f.name.toLowerCase() === "poor")) m.laterLifeXpPerYear = 10;

  for (const v of ch.virtues) {
    for (const g of VIRTUE_XP[v.name] ?? []) m.grants.push({ ...g, source: v.display });
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
    }
  }
  for (const b of ch.xpBonuses ?? []) m.grants.push({ pool: b.pool, xp: b.xp, source: b.note || "Bonus" });
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
