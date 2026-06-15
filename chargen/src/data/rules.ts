// Typed lookups, filters, and trait resolution over the rules data. This module is
// PURE (no Node built-ins) so it bundles for the browser unchanged; the file-system
// loader lives in ./load-node.ts. A web app builds `new RulesData(...)` from JSON it
// imports directly and reuses all of domain/*.
import type { AbilityRow, AbilityType, Size, SpellRow, VirtueFlawRow } from "./types.ts";
import { isArt, isForm, isTechnique } from "../domain/glossary.ts";

const norm = (s: string) => s.trim().toLowerCase();

export interface ResolvedTrait {
  row: VirtueFlawRow;
  canonical: string;
  param?: string;
  display: string;
  size: Exclude<Size, "Major or Minor">;
  points: number;
}

export type TraitResolution =
  | { ok: true; trait: ResolvedTrait }
  | { ok: false; error: string };

// Parameterized templates we understand well enough to (a) accept a friendly form
// like "Puissant Ignem" and (b) attach mechanical effects. kind drives validation
// of the parameter; see domain/modifiers.ts for the effects.
const PARAM_KIND: Record<string, "art" | "ability" | "form" | "technique" | "text"> = {
  "puissant art": "art",
  "affinity with art": "art",
  "puissant ability": "ability",
  "affinity with ability": "ability",
  "deficient form": "form",
  "deficient technique": "technique",
  "minor magical focus": "text",
  "major magical focus": "text",
  "academic concentration (subject)": "text",
};

function pointsFor(size: Size): number {
  return size === "Major" ? 3 : size === "Minor" ? 1 : 0;
}

/** Build the human-facing name from a parameterized canonical name + parameter. */
function friendlyName(canonical: string, param?: string): string {
  if (!param) return canonical;
  if (/ Art$/.test(canonical)) return canonical.replace(/ Art$/, ` ${param}`);
  if (/ Ability$/.test(canonical)) return canonical.replace(/ Ability$/, ` ${param}`);
  if (/ Form$/.test(canonical)) return canonical.replace(/ Form$/, ` ${param}`);
  if (/ Technique$/.test(canonical)) return canonical.replace(/ Technique$/, ` ${param}`);
  return `${canonical} (${param})`;
}

export interface ResolvedAbility {
  name: string;          // display name, e.g. "Latin", "Order of Hermes Lore"
  type: AbilityType;
  restricted: boolean;
  param?: string;        // bound parameter for templated abilities
  baseName?: string;     // underlying data row, e.g. "(Dead Language)"
}
export type AbilityResolution =
  | { ok: true; ability: ResolvedAbility }
  | { ok: false; error: string };

// Concrete instances of templated abilities and a few aliases. The friendly name
// is what we store (so e.g. the Latin minimum check works); the type comes from
// the underlying data row.
const ABILITY_ALIASES: Record<string, string> = {
  latin: "(Dead Language)",
  greek: "(Dead Language)",
  hebrew: "(Dead Language)",
};

export interface VFFilter {
  kind?: "Virtue" | "Flaw";
  category?: string;
  size?: "Minor" | "Major";
  search?: string;
}
export interface AbilityFilter {
  type?: string;
  restricted?: boolean;
  search?: string;
}
export interface SpellFilter {
  technique?: string;
  form?: string;
  maxLevel?: number;
  range?: string;
  isGeneral?: boolean;
  search?: string;
}

export class RulesData {
  readonly virtuesFlaws: VirtueFlawRow[];
  readonly abilities: AbilityRow[];
  readonly spells: SpellRow[];
  private vfByName = new Map<string, VirtueFlawRow>();
  private abByName = new Map<string, AbilityRow>();
  private spByName = new Map<string, SpellRow>();

  constructor(virtuesFlaws: VirtueFlawRow[], abilities: AbilityRow[], spells: SpellRow[]) {
    this.virtuesFlaws = virtuesFlaws;
    this.abilities = abilities;
    this.spells = spells;
    for (const v of virtuesFlaws) this.vfByName.set(norm(v.name), v);
    for (const a of abilities) this.abByName.set(norm(a.name), a);
    for (const s of spells) this.spByName.set(norm(s.name), s);
  }

  virtueFlawRow(name: string): VirtueFlawRow | undefined {
    return this.vfByName.get(norm(name));
  }
  ability(name: string): AbilityRow | undefined {
    return this.abByName.get(norm(name));
  }
  spell(name: string): SpellRow | undefined {
    return this.spByName.get(norm(name));
  }

  filterVirtuesFlaws(f: VFFilter): VirtueFlawRow[] {
    const s = f.search ? norm(f.search) : undefined;
    return this.virtuesFlaws.filter((v) =>
      (!f.kind || v.kind === f.kind) &&
      (!f.category || norm(v.category) === norm(f.category) ||
        v.categories.some((c) => norm(c) === norm(f.category!))) &&
      (!f.size || v.size === f.size || v.size === "Major or Minor") &&
      (!s || norm(v.name).includes(s) || norm(v.description).includes(s)),
    );
  }

  filterAbilities(f: AbilityFilter): AbilityRow[] {
    const s = f.search ? norm(f.search) : undefined;
    return this.abilities.filter((a) =>
      (!f.type || (a.type ?? "").toLowerCase() === f.type.toLowerCase()) &&
      (f.restricted === undefined || a.restricted === f.restricted) &&
      (!s || norm(a.name).includes(s) || norm(a.description).includes(s)),
    );
  }

  filterSpells(f: SpellFilter): SpellRow[] {
    const s = f.search ? norm(f.search) : undefined;
    return this.spells.filter((sp) =>
      (!f.technique || norm(sp.technique) === norm(f.technique)) &&
      (!f.form || norm(sp.form) === norm(f.form)) &&
      (f.maxLevel === undefined || (sp.level !== null && sp.level <= f.maxLevel)) &&
      (!f.range || norm(sp.range) === norm(f.range)) &&
      (f.isGeneral === undefined || sp.is_general === f.isGeneral) &&
      (!s || norm(sp.name).includes(s) || norm(sp.description).includes(s)),
    );
  }

  /**
   * Resolve a user-typed ability name into a concrete pick. Accepts exact data
   * names (Awareness, Magic Theory), aliases (Latin → a Dead Language), and
   * templated forms (e.g. "Order of Hermes Lore" → "(Area) Lore", "Craft Pottery"
   * → "Craft (Type)"). `typeOverride` lets the caller force-create an ability not
   * in the list.
   */
  resolveAbility(input: string, typeOverride?: string): AbilityResolution {
    const exact = this.ability(input);
    if (exact) return { ok: true, ability: { name: exact.name, type: exact.type, restricted: exact.restricted, baseName: exact.name } };

    const alias = ABILITY_ALIASES[norm(input)];
    if (alias) {
      const base = this.ability(alias);
      if (base) return { ok: true, ability: { name: cap(input), type: base.type, restricted: base.restricted, param: cap(input), baseName: base.name } };
    }

    const template = (baseName: string, param: string): AbilityResolution | null => {
      const base = this.ability(baseName);
      if (!base) return null;
      return { ok: true, ability: { name: input.trim(), type: base.type, restricted: base.restricted, param, baseName: base.name } };
    };
    let m: RegExpMatchArray | null;
    if ((m = input.match(/^(.+?)\s+Lore$/i))) return template("(Area) Lore", m[1]!.trim()) ?? this.unknownAbility(input);
    if (/^Craft\b/i.test(input)) return template("Craft (Type)", input.replace(/^Craft\s*/i, "").replace(/[()]/g, "").trim()) ?? this.unknownAbility(input);
    if (/^Profession\b/i.test(input)) return template("Profession (Type)", input.replace(/^Profession\s*/i, "").replace(/[()]/g, "").trim()) ?? this.unknownAbility(input);

    if (typeOverride) {
      const t = ["General", "Academic", "Arcane", "Martial", "Supernatural"].find((x) => x.toLowerCase() === typeOverride.toLowerCase());
      if (t) return { ok: true, ability: { name: input.trim(), type: t as AbilityType, restricted: false } };
    }
    return this.unknownAbility(input);
  }

  private unknownAbility(input: string): AbilityResolution {
    return { ok: false, error: `No Ability named "${input}". Try \`chargen options abilities --search ${input.split(/\s+/)[0]}\`, or pass --type to force-create it.` };
  }

  /** Kind of parameter a (parameterized) trait expects, or undefined. */
  paramKind(canonical: string): "art" | "ability" | "form" | "technique" | "text" | undefined {
    return PARAM_KIND[norm(canonical)];
  }

  /**
   * Resolve a user-typed virtue/flaw into a concrete pick. Accepts:
   *  - an exact data name (e.g. "Necessary Condition", "Minor Magical Focus"),
   *  - a friendly parameterized form (e.g. "Puissant Ignem", "Affinity with Ignem",
   *    "Deficient Ignem"), which maps to the underlying template + parameter.
   * `paramArg` supplies the parameter for templates whose name doesn't carry it
   * (e.g. Magical Focus). `sizeArg` picks the size for "Major or Minor" entries.
   */
  resolveTrait(input: string, paramArg?: string, sizeArg?: "Minor" | "Major"): TraitResolution {
    const exact = this.virtueFlawRow(input);
    if (exact) return this.finishResolve(exact, paramArg, sizeArg, friendlyName(exact.name, paramArg));

    // Friendly parameterized forms.
    const tryParam = (canonical: string, param: string): TraitResolution | null => {
      const row = this.virtueFlawRow(canonical);
      if (!row) return null;
      return this.finishResolve(row, param, sizeArg, friendlyName(canonical, param));
    };

    let m: RegExpMatchArray | null;
    if ((m = input.match(/^Puissant\s+(.+)$/i))) {
      const p = m[1]!.trim();
      if (isArt(cap(p))) return tryParam("Puissant Art", cap(p))!;
      if (this.ability(p)) return tryParam("Puissant Ability", this.ability(p)!.name)!;
    }
    if ((m = input.match(/^Affinity with\s+(.+)$/i))) {
      const p = m[1]!.trim();
      if (isArt(cap(p))) return tryParam("Affinity with Art", cap(p))!;
      if (this.ability(p)) return tryParam("Affinity with Ability", this.ability(p)!.name)!;
    }
    if ((m = input.match(/^Deficient\s+(.+)$/i))) {
      const p = cap(m[1]!.trim());
      if (isForm(p)) return tryParam("Deficient Form", p)!;
      if (isTechnique(p)) return tryParam("Deficient Technique", p)!;
    }
    return { ok: false, error: `No Virtue or Flaw named "${input}". Try \`chargen options virtues --search ${input.split(/\s+/)[0]}\`.` };
  }

  private finishResolve(
    row: VirtueFlawRow,
    paramArg: string | undefined,
    sizeArg: "Minor" | "Major" | undefined,
    display: string,
  ): TraitResolution {
    let size: Exclude<Size, "Major or Minor">;
    if (row.size === "Major or Minor") {
      if (!sizeArg) return { ok: false, error: `"${row.name}" is "Major or Minor" — pass --size Minor or --size Major.` };
      size = sizeArg;
    } else {
      size = row.size;
    }
    const needsParam = this.paramKind(row.name);
    if (needsParam && !paramArg) {
      return { ok: false, error: `"${row.name}" needs a parameter — pass --param <${needsParam}> (e.g. "Puissant Ignem" or --param Ignem).` };
    }
    return {
      ok: true,
      trait: { row, canonical: row.name, param: paramArg, display, size, points: pointsFor(size) },
    };
  }
}

function cap(s: string): string {
  return s.length ? s[0]!.toUpperCase() + s.slice(1).toLowerCase() : s;
}
