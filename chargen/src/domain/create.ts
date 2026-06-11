// Fresh-character bootstrap, shared by `new` and `build` (and tests). Builds a
// blank magus and applies the off-budget grants every magus gets: The Gift,
// Hermetic Magus, and the House's free benefit. Previously this loop was copy-
// pasted across cmdNew and both test files.
import { newCharacter, type Character, type NewCharacterOpts } from "./character.ts";
import { applyHouse } from "./houses.ts";
import type { RulesData } from "../data/rules.ts";

export interface CreateOpts extends NewCharacterOpts {
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
  const ch = newCharacter(opts);
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
