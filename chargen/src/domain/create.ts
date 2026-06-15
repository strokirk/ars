// Fresh-character bootstrap, shared by `new` and `build` (and tests). Builds a
// blank magus and applies the off-budget grants every magus gets: The Gift,
// Hermetic Magus, and the House's free benefit. Previously this loop was copy-
// pasted across cmdNew and both test files.
import { newCharacter, type Character, type NewCharacterOpts } from "./character.ts";
import { applyHouse } from "./houses.ts";
import type { House } from "./glossary.ts";
import type { RulesData } from "../data/rules.ts";

export interface CreateOpts extends NewCharacterOpts {
  /** Magi always belong to a House. */
  house: House;
  /** House Puissant choice, for Houses that offer one (Bonisagus/Flambeau/Mercere). */
  puissant?: string;
}

export interface CreateResult {
  character: Character;
  /** Notes about House choices still owed (e.g. Ex Miscellanea's free Virtues). */
  notes: string[];
  /** Display labels of the granted off-budget picks. */
  free: string[];
}

export function createMagus(opts: CreateOpts, rules: RulesData): CreateResult {
  const ch = newCharacter({ ...opts, kind: "magus" });
  for (const n of ["The Gift", "Hermetic Magus"]) {
    const r = rules.resolveTrait(n);
    if (r.ok) ch.virtues.push({ name: r.trait.canonical, display: r.trait.display, size: r.trait.size, category: r.trait.row.category, points: 0, free: true });
  }
  const app = applyHouse(opts.house, { puissant: opts.puissant }, rules, { favoredTechnique: opts.favoredTechnique, favoredForm: opts.favoredForm });
  ch.virtues.push(...app.virtues);
  ch.flaws.push(...app.flaws);
  ch.abilities.push(...app.abilities);
  const free = [...ch.virtues.filter((v) => v.free).map((v) => v.display), ...app.abilities.map((a) => `${a.name} ${a.score}`)];
  return { character: ch, notes: app.notes, free };
}

/**
 * A blank grog: a minor covenant character. No Gift, no House, no Hermetic grants.
 * The player owes a Social Status Virtue and (by the rules) a score in Loyal.
 */
export function createGrog(opts: NewCharacterOpts): CreateResult {
  const ch = newCharacter({ ...opts, kind: "grog" });
  return {
    character: ch,
    free: [],
    notes: [
      "Grogs: up to 3 points of Minor Flaws balanced by Minor Virtues — no Major V/F, no Story Flaws, no The Gift.",
      "Take a Social Status (e.g. Covenfolk) and give the grog a score in Loyal (warriors also take Brave).",
    ],
  };
}

/**
 * A blank companion: an important non-magus. No Gift/House by default (Hermetic V&F
 * are only permitted if you separately add The Gift). The player owes a Social Status.
 */
export function createCompanion(opts: NewCharacterOpts): CreateResult {
  const ch = newCharacter({ ...opts, kind: "companion" });
  return {
    character: ch,
    free: [],
    notes: [
      "Companions: up to 10 points of Flaws balanced by an equal number of points of Virtues.",
      "Take a Social Status. A Major Personality or Story Flaw helps tell the troupe what stories you want.",
    ],
  };
}
