// Which Ability *types* may be bought at each life stage. Childhood and later-life
// are mundane (General only); apprenticeship grants Academic/Arcane/Martial, with
// Supernatural still gated behind a Supernatural Virtue. Enabling-Virtue detection
// is name-based and deliberately conservative — `--force` is always available.
import type { Character } from "./character.ts";
import type { Stage } from "./glossary.ts";
import type { AbilityType } from "../data/types.ts";

export interface AbilityPolicy {
  allowed: boolean;
  reason?: string;
}

function hasCategory(ch: Character, category: string): boolean {
  return ch.virtues.some((v) => v.category === category);
}
function hasVirtueNamed(ch: Character, ...names: string[]): boolean {
  const set = new Set(names.map((n) => n.toLowerCase()));
  return ch.virtues.some((v) => set.has(v.name.toLowerCase()) || set.has(v.display.toLowerCase()));
}

/** Does the character have a Virtue that enables a given non-General Ability type? */
export function hasEnablingVirtue(ch: Character, type: AbilityType): boolean {
  switch (type) {
    case "Supernatural": return hasCategory(ch, "Supernatural");
    case "Academic": return hasVirtueNamed(ch, "Educated", "Clerk", "Priest", "Mythic Companion");
    case "Martial": return hasVirtueNamed(ch, "Warrior", "Knight", "Soldier", "Custos");
    case "Arcane": return false; // Arcane comes from apprenticeship for magi
    default: return true;
  }
}

export function abilityAllowed(ch: Character, type: AbilityType, stage: Stage): AbilityPolicy {
  if (stage === "free" || stage === "post-gauntlet") return { allowed: true };
  if (type === "General" || type === null) return { allowed: true };

  if (stage === "childhood") {
    return { allowed: false, reason: `${type} Abilities can't be learned in childhood — they come in apprenticeship (or with an enabling Virtue).` };
  }
  if (stage === "later-life") {
    if (hasEnablingVirtue(ch, type)) return { allowed: true };
    return { allowed: false, reason: `${type} Abilities need an enabling Virtue before apprenticeship.` };
  }
  // apprenticeship
  if (type === "Supernatural" && !hasEnablingVirtue(ch, "Supernatural")) {
    return { allowed: false, reason: `Supernatural Abilities require a Supernatural Virtue.` };
  }
  return { allowed: true };
}
