// The wizard's step sequence and per-step budget meters. Pure data + derivations:
// Wizard.tsx maps each step `key` to its body component, so this stays testable and
// free of JSX.
import type { CharacterKind } from "../../../chargen/src/domain/character.ts";
import type { Budgets } from "../../../chargen/src/domain/budgets.ts";
import { KIND_LABEL } from "../engine.ts";
import type { Meter } from "../components/BudgetBar.tsx";

export type StepKey = "concept" | "characteristics" | "virtues" | "abilities" | "arts" | "personality" | "review";
export type BudgetKey = "characteristics" | "virtues-flaws" | "childhood" | "later-life" | "apprenticeship";

export interface StepDef {
  key: StepKey;
  label: string;
  /** The teaching blurb shown above the step body. */
  why: string;
  /** Budget keys this step is responsible for — drives meters and tab status. */
  budgets: BudgetKey[];
}

export function stepsFor(kind: CharacterKind): StepDef[] {
  const concept: StepDef = {
    key: "concept", label: "Concept", budgets: [],
    why: kind === "magus"
      ? "Start with a concept and your House — its free benefit shapes your magic. Magi finish apprenticeship at 25+."
      : `Who is this ${KIND_LABEL[kind].toLowerCase()}? ${kind === "grog" ? "Grogs can be any age — grizzled veterans or eager novices." : "Companions play best created young (under 30)."} Later-life years set your main Ability budget (×15 xp/year).`,
  };
  const characteristics: StepDef = {
    key: "characteristics", label: "Characteristics", budgets: ["characteristics"],
    why: "Spend exactly 7 points across the eight Characteristics. Positive scores cost more the higher they go (+3 = 6 pts); negatives give points back.",
  };
  const virtues: StepDef = {
    key: "virtues", label: "Virtues & Flaws", budgets: ["virtues-flaws"],
    why: kind === "grog"
      ? "Grogs are minor characters: up to 3 points of Minor Flaws, balanced by an equal number of Minor Virtues — no Major V/F, no Story Flaws, no The Gift. Everyone takes one Social Status (e.g. Covenfolk)."
      : kind === "companion"
        ? "Up to 10 points of Flaws, balanced by an equal number of points of Virtues. Take one Social Status. Hermetic Virtues/Flaws need The Gift. A Major Personality or Story Flaw tells the troupe what stories you want."
        : "Up to 10 points of Flaws balanced by Virtues. The Gift, Hermetic Magus, and your House benefit are free. Take at least one Hermetic Flaw; at most one Major Hermetic Virtue.",
  };
  const abilities: StepDef = {
    key: "abilities", label: "Abilities",
    budgets: kind === "magus" ? ["childhood", "later-life", "apprenticeship"] : ["childhood", "later-life"],
    why: "Set a Native Language (free, score 5), spend 45 xp on childhood skills, then your later-life xp. Your age caps the maximum score of any Ability.",
  };
  const arts: StepDef = {
    key: "arts", label: "Arts & Spells", budgets: ["apprenticeship"],
    why: "Apprenticeship gives 240 xp for Arts + Abilities (Parma Magica, Magic Theory, Latin are mandatory) and 120 levels of spells. A spell's level can't exceed its Lab Total.",
  };
  const personality: StepDef = {
    key: "personality", label: "Personality", budgets: [],
    why: kind === "grog"
      ? "Give the grog a few Personality Traits. Grogs should have a score in Loyal (warriors also in Brave) — these guide play when the character is shared."
      : "A few Personality Traits to guide roleplaying. A Personality Flaw is mirrored by a ±3 trait (±6 for a Major).",
  };
  const review: StepDef = { key: "review", label: "Review", budgets: [], why: "" };

  const mid = kind === "magus" ? [characteristics, virtues, abilities, arts] : [characteristics, virtues, abilities];
  return [concept, ...mid, personality, review];
}

export function metersFor(step: StepDef, b: Budgets): Meter[] {
  const out: Meter[] = [];
  if (step.budgets.includes("characteristics")) out.push({ ...b.characteristics, label: "Characteristics" });
  if (step.budgets.includes("virtues-flaws")) {
    const vf = b.virtuesFlaws;
    out.push({
      label: "Virtues/Flaws", spent: vf.flawPoints, cap: vf.cap,
      over: vf.flawPoints > vf.cap || !vf.balanced,
      full: vf.balanced && vf.flawPoints > 0,
      text: `V ${vf.virtuePoints} ${vf.balanced ? "=" : "≠"} F ${vf.flawPoints} (≤${vf.cap})`,
    });
  }
  if (step.budgets.includes("childhood")) out.push({ ...b.childhood, label: "Childhood" });
  if (step.budgets.includes("later-life")) out.push({ ...b.laterLife, label: "Later life" });
  if (step.budgets.includes("apprenticeship")) {
    out.push({ ...b.apprenticeship, label: "Apprenticeship" });
    out.push({ ...b.apprenticeship.spells, label: "Spells" });
  }
  return out;
}
