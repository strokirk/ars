// The one-shot `build` input: a single structured document that mirrors a finished
// character. An agent emits this straight from a concept — name, House, the five
// budgets' worth of picks, and freeform notes — in ONE call. specToBuild() splits
// it into the creation options (free House grants) and the ordered Op[] that
// applyOps() then folds in and validates. This is the "reduce upfront context +
// guarantee legal" path: the agent describes the whole magus, the tool checks it.
import type { CreateOpts } from "../domain/create.ts";
import type { Op } from "../domain/operations.ts";
import type { MetaFields } from "../domain/mutations.ts";

type TraitEntry = string | { name: string; param?: string; size?: "Minor" | "Major"; free?: boolean };
type SpellEntry = string | { name: string; aura?: number; focus?: boolean };

export interface BuildSpec {
  name: string;
  house: string;
  concept?: string;
  notes?: string;
  age?: number;
  favoredTechnique?: string;
  favoredForm?: string;
  focus?: string;
  /** House Puissant choice (Bonisagus/Flambeau/Mercere). */
  puissant?: string;
  laterLifeYears?: number;
  confidence?: number;
  reputation?: string | null;
  characteristics?: Record<string, number>;
  virtues?: TraitEntry[];
  flaws?: TraitEntry[];
  nativeLanguage?: string;
  abilities?: { name: string; score: number; stage: string; specialty?: string; type?: string }[];
  arts?: Record<string, number>;
  spells?: SpellEntry[];
  personality?: { trait: string; value: number }[];
}

function traitOp(kind: "virtue" | "flaw", e: TraitEntry): Op {
  return typeof e === "string"
    ? { op: kind, name: e }
    : { op: kind, name: e.name, param: e.param, size: e.size, free: e.free };
}

function spellOp(e: SpellEntry): Op {
  return typeof e === "string" ? { op: "spell", name: e } : { op: "spell", name: e.name, aura: e.aura, focus: e.focus };
}

export interface BuildPlan {
  opts: CreateOpts;
  ops: Op[];
}

/** Translate a BuildSpec into creation options + the ordered op batch. */
export function specToBuild(spec: BuildSpec): BuildPlan {
  const opts: CreateOpts = {
    name: spec.name,
    house: spec.house as CreateOpts["house"],
    concept: spec.concept,
    notes: spec.notes,
    age: spec.age,
    favoredTechnique: spec.favoredTechnique as CreateOpts["favoredTechnique"],
    favoredForm: spec.favoredForm as CreateOpts["favoredForm"],
    focus: spec.focus,
    puissant: spec.puissant,
  };

  const ops: Op[] = [];
  const meta: MetaFields = {};
  if (spec.laterLifeYears !== undefined) meta.laterLifeYears = spec.laterLifeYears;
  if (spec.confidence !== undefined) meta.confidence = spec.confidence;
  if (spec.reputation !== undefined) meta.reputation = spec.reputation;
  if (Object.keys(meta).length) ops.push({ op: "meta", fields: meta });

  if (spec.characteristics) ops.push({ op: "chars", values: spec.characteristics });
  for (const v of spec.virtues ?? []) ops.push(traitOp("virtue", v));
  for (const f of spec.flaws ?? []) ops.push(traitOp("flaw", f));
  if (spec.nativeLanguage) ops.push({ op: "native-language", value: spec.nativeLanguage });
  for (const a of spec.abilities ?? []) ops.push({ op: "ability", name: a.name, score: a.score, stage: a.stage, specialty: a.specialty, type: a.type });
  if (spec.arts) ops.push({ op: "arts", values: spec.arts });
  for (const s of spec.spells ?? []) ops.push(spellOp(s));
  for (const p of spec.personality ?? []) ops.push({ op: "personality", trait: p.trait, value: p.value });

  return { opts, ops };
}
