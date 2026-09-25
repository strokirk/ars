// The serializable character document. Plain data only — every command reads it,
// applies a pure mutation (domain/mutations.ts), and writes it back. A web app can
// hold the same object in memory and drive the same mutations/validators.
import type { Art, Characteristic, Form, House, Stage, Technique } from "./glossary.ts";
import type { ResolvedTrait } from "../data/rules.ts";
import type { VirtueFlawRow } from "../data/types.ts";

/** Player-character category. Drives which budgets and V&F limits apply. */
export type CharacterKind = "grog" | "companion" | "magus";

export interface TraitPick {
  name: string;        // canonical data name, e.g. "Puissant Art"
  display: string;     // human form, e.g. "Puissant Ignem"
  param?: string;      // bound parameter, e.g. "Ignem" or a focus phrase
  size: "Minor" | "Major" | "Free";
  category: string;
  points: number;      // 0 (Free) | 1 (Minor) | 3 (Major)
  free?: boolean;      // The Gift / Hermetic Magus / House benefit — off-budget
  repeatable?: boolean; // the rules allow taking it more than once (VirtueFlawRow.repeatable)
  enables?: VirtueFlawRow["enables"]; // Ability types it opens at creation
}

/** A resolved trait as stored on the character — the data flags travel with it so validation stays rules-free. */
export function traitPick(t: ResolvedTrait, free = false): TraitPick {
  return {
    name: t.canonical, display: t.display, param: t.param, size: t.size, category: t.row.category,
    points: free ? 0 : t.points,
    ...(free ? { free: true } : {}),
    ...(t.row.repeatable ? { repeatable: true } : {}),
    ...(t.row.enables?.length ? { enables: t.row.enables } : {}),
  };
}

export interface AbilityPick {
  name: string;
  score: number;
  stage: Stage;        // which xp pool paid for it ("free" = granted, off-budget)
  specialty?: string;
  type: "General" | "Academic" | "Arcane" | "Martial" | "Supernatural" | null;
  restricted?: boolean; // marked * in the rules: can't be used untrained
}

export interface SpellPick {
  name: string;
  technique: Technique;
  form: Form;
  level: number;
  requisites: string[]; // needed to recompute the Lab Total on validation
  labTotal: number;     // the cap computed when added, recorded for audit
  inFocus?: boolean;    // counted as in your Magical Focus
  aura?: number;        // aura assumed when learning (default 3)
  mastery?: number;     // Spell Mastery score (costs xp like an Ability)
}

/** The xp/level pools a bonus can top up. */
export type XpPool = "childhood" | "later-life" | "apprenticeship" | "spells" | "mastery";
export const XP_POOLS: readonly XpPool[] = ["childhood", "later-life", "apprenticeship", "spells", "mastery"];

/** A player/GM-entered adjustment to a pool's cap (negative to take xp away). */
export interface XpBonus {
  pool: XpPool;
  xp: number;
  note: string;
}

export interface PersonalityTrait {
  trait: string;
  value: number;       // -3..+3 (or ±6 to mirror a Major Personality Flaw)
}

export interface Character {
  schema: 2;
  /** "grog" | "companion" | "magus". Absent on legacy data → treated as "magus". */
  kind: CharacterKind;
  name: string;
  /** Magi only. Undefined for grogs and companions. */
  house?: House;
  concept: string;
  /** Freeform Markdown: fluff, goals, interpretation, GM notes. Off-budget. */
  notes: string;
  age: number;
  characteristics: Partial<Record<Characteristic, number>>;
  virtues: TraitPick[];
  flaws: TraitPick[];
  nativeLanguage?: string;
  abilities: AbilityPick[];
  arts: Partial<Record<Art, number>>;
  spells: SpellPick[];
  personality: PersonalityTrait[];
  confidence: number;
  reputation?: string | null;
  laterLifeYears: number;
  /** Free-form adjustments on top of what Virtues grant (house rules, a story reward). */
  xpBonuses?: XpBonus[];
  /** Issue codes the player has reviewed and accepted — they stop counting against legality. */
  dismissed?: string[];
}

export interface NewCharacterOpts {
  name: string;
  kind?: CharacterKind;
  house?: House;
  concept?: string;
  notes?: string;
  age?: number;
}

/**
 * Age follows directly from Later-life years, not a free choice: 5 fixed years of
 * childhood, then the later-life years, then (for a freshly Gauntleted magus) the
 * fixed 15-year apprenticeship. `set age` can still override it (e.g. building a
 * magus some years past Gauntlet), but the wizard never needs to — it derives Age
 * from Later-life years automatically.
 */
export function defaultAge(kind: CharacterKind, laterLifeYears: number): number {
  return 5 + laterLifeYears + (kind === "magus" ? 15 : 0);
}

export function newCharacter(opts: NewCharacterOpts): Character {
  const kind = opts.kind ?? "magus";
  const laterLifeYears = 5;
  return {
    schema: 2,
    kind,
    name: opts.name,
    house: opts.house,
    concept: opts.concept ?? "",
    notes: opts.notes ?? "",
    age: opts.age ?? defaultAge(kind, laterLifeYears),
    characteristics: {},
    virtues: [],
    flaws: [],
    abilities: [],
    arts: {},
    spells: [],
    personality: [],
    // Grogs are minor characters and have no Confidence (it marks central characters).
    confidence: (opts.kind ?? "magus") === "grog" ? 0 : 1,
    reputation: null,
    laterLifeYears,
  };
}

/** Resolve a character's kind, defaulting legacy data (no `kind`) to "magus". */
export function charKind(ch: Pick<Character, "kind">): CharacterKind {
  return ch.kind ?? "magus";
}
