// The serializable character document. Plain data only — every command reads it,
// applies a pure mutation (domain/mutations.ts), and writes it back. A web app can
// hold the same object in memory and drive the same mutations/validators.
import type { Art, Characteristic, Form, House, Stage, Technique } from "./glossary.ts";

export interface TraitPick {
  name: string;        // canonical data name, e.g. "Puissant Art"
  display: string;     // human form, e.g. "Puissant Ignem"
  param?: string;      // bound parameter, e.g. "Ignem" or a focus phrase
  size: "Minor" | "Major" | "Free";
  category: string;
  points: number;      // 0 (Free) | 1 (Minor) | 3 (Major)
  free?: boolean;      // The Gift / Hermetic Magus / House benefit — off-budget
}

export interface AbilityPick {
  name: string;
  score: number;
  stage: Stage;        // which xp pool paid for it ("free" = granted, off-budget)
  specialty?: string;
  type: "General" | "Academic" | "Arcane" | "Martial" | "Supernatural" | null;
  restricted?: boolean; // marked * in the rules: needs an enabling Virtue
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
}

export interface PersonalityTrait {
  trait: string;
  value: number;       // -3..+3 (or ±6 to mirror a Major Personality Flaw)
}

export interface Character {
  schema: 2;
  name: string;
  house: House;
  concept: string;
  /** Freeform Markdown: fluff, goals, interpretation, GM notes. Off-budget. */
  notes: string;
  age: number;
  favoredTechnique?: Technique;
  favoredForm?: Form;
  focus?: string;
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
}

export interface NewCharacterOpts {
  name: string;
  house: House;
  concept?: string;
  notes?: string;
  age?: number;
  favoredTechnique?: Technique;
  favoredForm?: Form;
  focus?: string;
}

export function newCharacter(opts: NewCharacterOpts): Character {
  return {
    schema: 2,
    name: opts.name,
    house: opts.house,
    concept: opts.concept ?? "",
    notes: opts.notes ?? "",
    age: opts.age ?? 25,
    favoredTechnique: opts.favoredTechnique,
    favoredForm: opts.favoredForm,
    focus: opts.focus,
    characteristics: {},
    virtues: [],
    flaws: [],
    abilities: [],
    arts: {},
    spells: [],
    personality: [],
    confidence: 1,
    reputation: null,
    laterLifeYears: 5,
  };
}
