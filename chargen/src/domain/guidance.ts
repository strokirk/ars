// The "what to do next" tutor behind `chargen status`. Produces ordered, reasoned
// guidance so an agent can drive creation from the CLI alone (keeping the prose
// skill small). Pure: returns structured blocks the renderer formats.
import type { Character } from "./character.ts";
import type { Budgets } from "./budgets.ts";

export interface Guidance {
  stage: number;
  headline: string;
  reason: string;
  hint: string;
}

interface StageState {
  done: boolean;
  guidance: Guidance;
}

export function stageStates(ch: Character, b: Budgets): StageState[] {
  const vf = b.virtuesFlaws;
  const ap = b.apprenticeship;

  return [
    {
      done: b.characteristics.spent === b.characteristics.cap && !b.characteristics.over,
      guidance: {
        stage: 1,
        headline: "Characteristics",
        reason: `Spend all ${b.characteristics.cap} points (${b.characteristics.spent} used). For a magus, favor Int (every Lab Total uses it) and keep Sta ≥ 0 (spellcasting).`,
        hint: "chargen set char Int 3",
      },
    },
    {
      done: vf.balanced && vf.hermeticFlaws >= 1 && vf.flawPoints <= 10 &&
        vf.minorFlaws <= 5 && vf.majorHermeticVirtues <= 1 && vf.storyFlaws <= 1 &&
        vf.personalityFlaws <= 2 && vf.majorPersonalityFlaws <= 1,
      guidance: {
        stage: 2,
        headline: "Virtues & Flaws",
        reason: vfReason(vf),
        hint: "chargen options flaws --category Hermetic --random 3",
      },
    },
    {
      done: b.childhood.nativeLanguageSet && b.childhood.spent >= b.childhood.cap && !b.childhood.over,
      guidance: {
        stage: 3,
        headline: "Childhood xp",
        reason: `${b.childhood.nativeLanguageSet ? "" : "Set your Native Language (spoken vernacular, score 5) first. "}Spend ${b.childhood.cap} xp on General childhood Abilities (${b.childhood.spent} used). These are mundane skills from before the Gift was discovered.`,
        hint: ch.nativeLanguage ? `chargen add ability Awareness 2 --stage childhood` : `chargen set native-language German`,
      },
    },
    {
      done: b.laterLife.spent >= b.laterLife.cap && !b.laterLife.over,
      guidance: {
        stage: 4,
        headline: "Later life (pre-apprenticeship)",
        reason: `Spend ${b.laterLife.cap} xp (${b.laterLife.years} yrs × 15) on General Abilities only (${b.laterLife.spent} used). No Academic/Arcane/Martial/Supernatural here — those come in apprenticeship.`,
        hint: "chargen add ability Bargain 3 --stage later-life",
      },
    },
    {
      done: ap.spent >= ap.cap && !ap.over && ap.minimums.parmaMagica && ap.minimums.magicTheory &&
        ap.minimums.latin && ap.spells.spent > 0 && !ap.spells.over,
      guidance: {
        stage: 5,
        headline: "Apprenticeship (Arts, Abilities & Spells)",
        reason: apprenticeReason(ap),
        hint: ap.minimums.magicTheory ? "chargen set art Ignem 10" : "chargen add ability \"Magic Theory\" 3 --stage apprenticeship",
      },
    },
  ];
}

function vfReason(vf: Budgets["virtuesFlaws"]): string {
  const parts: string[] = [];
  if (vf.hermeticFlaws < 1) parts.push("you still need ≥1 Hermetic Flaw");
  if (!vf.balanced) parts.push(`Virtue pts (${vf.virtuePoints}) must end equal to Flaw pts (${vf.flawPoints})`);
  if (vf.flawPoints > 10) parts.push(`Flaw points ${vf.flawPoints} exceed the 10-pt limit`);
  if (parts.length === 0) parts.push("balanced and legal");
  return `${parts.join("; ")}. Free & off-budget: The Gift, Hermetic Magus, your House benefit. Caps: ≤10 Flaw pts, ≤5 Minor Flaws, ≤1 Major Hermetic Virtue.`;
}

function apprenticeReason(ap: Budgets["apprenticeship"]): string {
  const need: string[] = [];
  if (!ap.minimums.parmaMagica) need.push("Parma Magica ≥1");
  if (!ap.minimums.magicTheory) need.push("Magic Theory ≥1");
  if (!ap.minimums.latin) need.push("Latin ≥1");
  const mins = need.length ? `Mandatory minimums still missing: ${need.join(", ")}. ` : "Mandatory minimums present. ";
  return `${mins}Spend ${ap.cap} xp on Arts + Abilities (${ap.spent} used) and up to ${ap.spells.cap} levels of spells (${ap.spells.spent} used). Split a Technique and a Form — Casting/Lab Totals add them.`;
}

export function nextGuidance(ch: Character, b: Budgets): Guidance[] {
  const states = stageStates(ch, b);
  const incomplete = states.filter((s) => !s.done);
  // Show the earliest incomplete stage in full, plus the next one as a preview.
  return incomplete.slice(0, 2).map((s) => s.guidance);
}
