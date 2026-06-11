// The twelve Hermetic Houses and the free, off-budget benefit each grants at
// creation (per skills/magus-creation/SKILL.md). applyHouse() turns a House (plus
// any required choice) into concrete free Virtue/Ability/Flaw picks + notes for
// choices the player still owes.
import type { AbilityPick, TraitPick } from "./character.ts";
import type { House, Technique } from "./glossary.ts";
import type { RulesData } from "../data/rules.ts";

export interface HouseChoices {
  /** For Houses offering a Puissant choice (Bonisagus/Flambeau/Mercere). */
  puissant?: string;
}

export interface HouseContext {
  favoredTechnique?: Technique;
  favoredForm?: string;
}

export interface HouseApplication {
  virtues: TraitPick[];
  abilities: AbilityPick[];
  flaws: TraitPick[];
  notes: string[];
}

function freeTrait(rules: RulesData, input: string, param?: string): TraitPick | { error: string } {
  const r = rules.resolveTrait(input, param);
  if (!r.ok) return { error: r.error };
  const t = r.trait;
  return { name: t.canonical, display: t.display, param: t.param, size: t.size, category: t.row.category, points: 0, free: true };
}

function freeAbility(rules: RulesData, name: string, score: number): AbilityPick | { error: string } {
  const a = rules.ability(name);
  if (!a) return { error: `ability "${name}" not found` };
  return { name: a.name, score, stage: "free", type: a.type };
}

/** Resolve a Puissant choice against an allowed option set, falling back to a default. */
function pickPuissant(
  choice: string | undefined,
  options: string[],
  fallback: string,
): { value: string; note?: string } {
  if (!choice) return { value: fallback };
  const hit = options.find((o) => o.toLowerCase() === choice.toLowerCase());
  if (hit) return { value: hit };
  return { value: fallback, note: `Unknown Puissant choice "${choice}"; using ${fallback} (options: ${options.join(", ")}).` };
}

export function applyHouse(
  house: House,
  choices: HouseChoices,
  rules: RulesData,
  ctx: HouseContext,
): HouseApplication {
  const app: HouseApplication = { virtues: [], abilities: [], flaws: [], notes: [] };
  const addV = (input: string, param?: string) => {
    const v = freeTrait(rules, input, param);
    if ("error" in v) app.notes.push(`House benefit not applied: ${v.error}`);
    else app.virtues.push(v);
  };
  const addA = (name: string, score: number) => {
    const a = freeAbility(rules, name, score);
    if ("error" in a) app.notes.push(`House benefit not applied: ${a.error}`);
    else app.abilities.push(a);
  };
  const puissantArt = (opts: string[], fallback: string) => {
    const p = pickPuissant(choices.puissant, opts, fallback);
    if (p.note) app.notes.push(p.note);
    addV("Puissant Art", p.value);
  };
  const puissantAbility = (opts: string[], fallback: string) => {
    const p = pickPuissant(choices.puissant, opts, fallback);
    if (p.note) app.notes.push(p.note);
    addV("Puissant Ability", p.value);
  };

  switch (house) {
    case "Bjornaer":
      addA("Heartbeast", 1);
      break;
    case "Bonisagus":
      puissantAbility(["Magic Theory", "Intrigue"], "Magic Theory");
      break;
    case "Criamon":
      addA("Enigmatic Wisdom", 1);
      break;
    case "Ex Miscellanea":
      app.notes.push(
        "Ex Miscellanea grants (off-budget): one free Minor Hermetic Virtue, one free Major non-Hermetic Virtue, and a compulsory Major Hermetic Flaw. Add them with `add virtue/flaw --free` once chosen.",
      );
      break;
    case "Flambeau": {
      const fallback = ctx.favoredForm === "Ignem" ? "Ignem" : ctx.favoredTechnique === "Perdo" ? "Perdo" : "Ignem";
      puissantArt(["Perdo", "Ignem"], fallback);
      break;
    }
    case "Guernicus":
      addV("Hermetic Prestige");
      break;
    case "Jerbiton":
      app.notes.push("Jerbiton grants one free Minor Virtue (scholarship, the arts, or mundane interaction). Add it with `add virtue --free` once chosen.");
      break;
    case "Mercere": {
      const fallback = ctx.favoredTechnique === "Muto" ? "Muto" : "Creo";
      puissantArt(["Creo", "Muto"], fallback);
      break;
    }
    case "Merinita":
      addV("Faerie Magic");
      app.notes.push("Merinita: +1 Warping Point if you take no faerie-related Virtue/Flaw.");
      break;
    case "Tremere":
      addV("Minor Magical Focus", "certamen");
      break;
    case "Tytalus":
      addV("Self-Confident");
      break;
    case "Verditius":
      addV("Verditius Magic");
      break;
  }
  return app;
}

/** Houses that require a --puissant choice, with their options (for `new --help` / errors). */
export const HOUSE_PUISSANT_CHOICES: Partial<Record<House, string[]>> = {
  Bonisagus: ["Magic Theory", "Intrigue"],
  Flambeau: ["Perdo", "Ignem"],
  Mercere: ["Creo", "Muto"],
};
