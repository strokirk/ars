// Which Ability *types* are usual at each life stage. Childhood and later-life are
// mundane (General only, unless a Virtue opens more); apprenticeship adds
// Academic/Arcane/Martial, with Supernatural gated behind a Supernatural Virtue.
// `allowed: false` is a soft lock: validate() warns, the picker still lets you add.
import type { Character } from "./character.ts";
import type { Stage } from "./glossary.ts";
import type { AbilityType } from "../data/types.ts";

export interface AbilityPolicy {
  allowed: boolean;
  reason?: string;
}

/**
 * Does the character have a Virtue that opens a non-General Ability type? Read from
 * the data (each Virtue's `enables`, lifted from its rules text), plus the blanket
 * rule that a Supernatural Virtue opens Supernatural Abilities. Advisory only — many
 * Virtues interact in ways no table captures, so a "no" here is a nudge to check with
 * the GM, never a hard block.
 */
export function hasEnablingVirtue(ch: Character, type: AbilityType): boolean {
  if (type === "General" || type === null) return true;
  if (type === "Supernatural") return ch.virtues.some((v) => v.category === "Supernatural");
  return ch.virtues.some((v) => v.enables?.includes(type));
}

const GM_CALL = "check with your GM if another Virtue or the story allows it.";

export function abilityAllowed(ch: Character, type: AbilityType, stage: Stage): AbilityPolicy {
  if (stage === "free" || stage === "post-gauntlet") return { allowed: true };
  if (type === "General" || type === null) return { allowed: true };

  if (stage === "childhood") {
    return { allowed: false, reason: `${type} Abilities aren't usually learned in childhood — ${GM_CALL}` };
  }
  if (stage === "later-life") {
    if (hasEnablingVirtue(ch, type)) return { allowed: true };
    return { allowed: false, reason: `${type} Abilities before apprenticeship usually need a Virtue that allows them — ${GM_CALL}` };
  }
  // apprenticeship
  if (type === "Supernatural" && !hasEnablingVirtue(ch, "Supernatural")) {
    return { allowed: false, reason: `Supernatural Abilities usually need a Supernatural Virtue — ${GM_CALL}` };
  }
  return { allowed: true };
}
