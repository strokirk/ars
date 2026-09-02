// The committed covenant roster: characters/*.json bundled at compile time and keyed
// by a URL-safe slug so each member has a stable, linkable sheet at #/roster/:slug.
import type { Character } from "../../../chargen/src/domain/character.ts";
import { kebab } from "../../../chargen/src/cli/sheet.ts";

export interface RosterEntry {
  slug: string;
  character: Character;
}

const modules = import.meta.glob("../../../characters/*.json", { eager: true }) as Record<
  string,
  { default: Character }
>;

/**
 * Build roster entries from raw characters, assigning each a unique slug derived from
 * its name. Duplicate names get a numeric suffix so links never collide. Pure — the
 * bundled `roster` below is just this applied to the globbed modules.
 */
export function buildRoster(characters: Character[]): RosterEntry[] {
  const seen = new Map<string, number>();
  return characters
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((character) => {
      const base = kebab(character.name);
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      return { slug: n === 1 ? base : `${base}-${n}`, character };
    });
}

export const roster: RosterEntry[] = buildRoster(Object.values(modules).map((m) => m.default));

export function rosterEntry(slug: string): RosterEntry | undefined {
  return roster.find((e) => e.slug === slug);
}
