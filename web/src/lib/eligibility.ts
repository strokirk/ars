// Which Virtues/Flaws a character of a given kind may even be offered. This only
// narrows the *browsing list* — the engine's validate() remains the authority on
// legality, and forced picks still surface as Issues.
import { charKind, type Character } from "../../../chargen/src/domain/character.ts";
import type { VirtueFlawRow } from "../../../chargen/src/data/types.ts";

export const hasGift = (ch: Character): boolean => ch.virtues.some((v) => /^the gift$/i.test(v.name));

export function isTraitSelectable(row: VirtueFlawRow, ch: Character): boolean {
  const kind = charKind(ch);
  // Hermetic V/F require The Gift; magi have it by construction.
  if (kind !== "magus" && row.category === "Hermetic" && !hasGift(ch)) return false;
  // The Gift itself: grogs never take it, magi already have it free.
  if (/^the gift$/i.test(row.name)) return kind === "companion";
  if (kind === "grog") {
    if (row.category === "Story") return false; // grogs are minor characters
    if (row.size === "Major") return false;     // ...and Minor-only
  }
  return true;
}
