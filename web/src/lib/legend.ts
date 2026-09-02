// The Technique legend shown above the spell browser: colour, abbreviation and a
// one-word gloss, assembled from the glossary + the Art visual language.
import { TECHNIQUES, ART_ABBR, type Technique } from "../../../chargen/src/domain/glossary.ts";
import { TECHNIQUE_COLOR, TECHNIQUE_GLOSS } from "./arts.ts";

export { TECHNIQUES };

export const TECHNIQUE_LEGEND: Record<Technique, { color: string; abbr: string; gloss: string }> =
  Object.fromEntries(
    TECHNIQUES.map((t) => [t, { color: TECHNIQUE_COLOR[t], abbr: ART_ABBR[t], gloss: TECHNIQUE_GLOSS[t] }]),
  ) as Record<Technique, { color: string; abbr: string; gloss: string }>;
