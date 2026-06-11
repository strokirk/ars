// Batch operations — the heart of the LLM-friendly surface. An agent emits an
// array of Ops (one stage, or a whole character) and applyOps() folds them into
// the character in order, validating ONCE at the end. This collapses ~34 separate
// CLI invocations into a handful and is the single chokepoint every command (the
// granular `add`/`set`/`remove`, plus `apply` and `build`) routes through.
//
// Order-safety: assignment-style picks (Characteristics, Arts) come as whole-map
// ops (`chars`, `arts`) that assign-then-validate, so an agent can list all eight
// Characteristics in any order — negatives that buy points back included — without
// a transient "over 7" rejection. Additive ops (virtue/flaw/ability/spell) are
// monotonic and need no special handling. A rejected op never aborts the batch:
// every problem is reported together so the agent can fix and resubmit in one pass.
import type { Character } from "./character.ts";
import type { RulesData } from "../data/rules.ts";
import { type Issue, VIOLATION_CODES, validate } from "./validate.ts";
import {
  addAbility, addFreeTrait, addPersonality, addSpell, addTrait,
  removeAbility, removeSpell, removeTrait, setArt, setArts, setCharacteristic, setCharacteristics,
  setMeta, setNativeLanguage, setNotes, type MetaFields, type MutationResult,
} from "./mutations.ts";
import { XP_STAGES, isArt, isCharacteristic } from "./glossary.ts";

const STAGE_NAMES = new Set<string>([...XP_STAGES, "free"]);

export type Op =
  | { op: "chars"; values: Record<string, number> }
  | { op: "char"; name: string; value: number }
  | { op: "virtue"; name: string; param?: string; size?: "Minor" | "Major"; free?: boolean }
  | { op: "flaw"; name: string; param?: string; size?: "Minor" | "Major"; free?: boolean }
  | { op: "ability"; name: string; score: number; stage: string; specialty?: string; type?: string }
  | { op: "arts"; values: Record<string, number> }
  | { op: "art"; name: string; score: number }
  | { op: "spell"; name: string; aura?: number; focus?: boolean }
  | { op: "personality"; trait: string; value: number }
  | { op: "native-language"; value: string }
  | { op: "notes"; value: string; mode?: "set" | "append" }
  | { op: "meta"; fields: MetaFields }
  | { op: "remove"; kind: "virtue" | "flaw" | "ability" | "spell"; name: string };

export const OP_KINDS = [
  "chars", "char", "virtue", "flaw", "ability", "arts", "art",
  "spell", "personality", "native-language", "notes", "meta", "remove",
] as const;

export interface OpResult {
  index: number;
  op: Op;
  ok: boolean;
  applied?: string;
  rejected?: string;
}

export interface BatchResult {
  /** True when every op applied and no active cap violation remains. */
  ok: boolean;
  /** True when the result should be persisted (no input rejections; legal or --force). */
  saved: boolean;
  /** The resulting character (whether or not it will be saved — for display). */
  character: Character;
  results: OpResult[];
  issues: Issue[];
}

const cap = (s: string): string => (s.length ? s[0]!.toUpperCase() + s.slice(1).toLowerCase() : s);

/** Apply one op against `ch`, returning a MutationResult. Pure. */
export function applyOp(ch: Character, op: Op, rules: RulesData, force = false): MutationResult {
  switch (op.op) {
    case "chars":
      return setCharacteristics(ch, op.values, force);
    case "char":
      if (!isCharacteristic(op.name)) return { ok: false, character: ch, rejected: `Unknown Characteristic "${op.name}".`, issues: validate(ch) };
      return setCharacteristic(ch, op.name, op.value, force);
    case "virtue":
    case "flaw": {
      const res = rules.resolveTrait(op.name, op.param, op.size);
      if (!res.ok) return { ok: false, character: ch, rejected: res.error, issues: validate(ch) };
      const kind = op.op === "virtue" ? "Virtue" : "Flaw";
      return op.free ? addFreeTrait(ch, kind, res.trait) : addTrait(ch, kind, res.trait, force);
    }
    case "ability": {
      if (!STAGE_NAMES.has(op.stage)) return { ok: false, character: ch, rejected: `Unknown stage "${op.stage}" (childhood | later-life | apprenticeship).`, issues: validate(ch) };
      const res = rules.resolveAbility(op.name, op.type);
      if (!res.ok) return { ok: false, character: ch, rejected: res.error, issues: validate(ch) };
      return addAbility(ch, res.ability, op.score, op.stage as never, op.specialty, force);
    }
    case "arts":
      return setArts(ch, op.values, force);
    case "art": {
      const art = cap(op.name);
      if (!isArt(art)) return { ok: false, character: ch, rejected: `Unknown Art "${op.name}".`, issues: validate(ch) };
      return setArt(ch, art, op.score, force);
    }
    case "spell": {
      const s = rules.spell(op.name);
      if (!s) return { ok: false, character: ch, rejected: `No spell named "${op.name}". Try \`chargen options spells --search ${op.name.split(/\s+/)[0]}\`.`, issues: validate(ch) };
      return addSpell(ch, s, { aura: op.aura, inFocus: op.focus }, force);
    }
    case "personality":
      return addPersonality(ch, op.trait, op.value);
    case "native-language":
      return setNativeLanguage(ch, op.value, force);
    case "notes":
      return setNotes(ch, op.value, op.mode ?? "set");
    case "meta":
      return setMeta(ch, op.fields, force);
    case "remove":
      if (op.kind === "virtue" || op.kind === "flaw") return removeTrait(ch, op.kind === "virtue" ? "Virtue" : "Flaw", op.name);
      if (op.kind === "ability") return removeAbility(ch, op.name);
      return removeSpell(ch, op.name);
  }
}

export interface ApplyOpts {
  /** Override cap/age violations on every op (input errors still reject). */
  force?: boolean;
}

/**
 * Fold an array of ops into a character. Each op is applied in order; a rejected
 * op is recorded but does not abort the batch. The batch is `saved` only when every
 * op applied (no input rejection) and, unless `force`, no active cap violation
 * remains. Completeness gaps (under-spend, missing minimums) never block a save —
 * they're expected mid-build and surfaced via `check`.
 */
export function applyOps(ch: Character, ops: Op[], rules: RulesData, opts: ApplyOpts = {}): BatchResult {
  const force = opts.force ?? false;
  let candidate = ch;
  const results: OpResult[] = [];
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]!;
    const r = applyOp(candidate, op, rules, force);
    if (r.ok) candidate = r.character;
    results.push({ index: i, op, ok: r.ok, applied: r.applied, rejected: r.rejected });
  }
  const issues = validate(candidate);
  const allApplied = results.every((r) => r.ok);
  const blocking = issues.filter((i) => i.level === "error" && VIOLATION_CODES.has(i.code));
  const saved = allApplied && (force || blocking.length === 0);
  return { ok: allApplied && blocking.length === 0, saved, character: candidate, results, issues };
}

/** Short human label for an op (for logs / dry summaries). */
export function opSummary(op: Op): string {
  switch (op.op) {
    case "chars": return `chars ${Object.entries(op.values).map(([k, v]) => `${k} ${v}`).join(", ")}`;
    case "char": return `char ${op.name} ${op.value}`;
    case "virtue": case "flaw": return `${op.op} ${op.name}${op.param ? ` (${op.param})` : ""}${op.free ? " [free]" : ""}`;
    case "ability": return `ability ${op.name} ${op.score} [${op.stage}]`;
    case "arts": return `arts ${Object.entries(op.values).map(([k, v]) => `${k} ${v}`).join(", ")}`;
    case "art": return `art ${op.name} ${op.score}`;
    case "spell": return `spell ${op.name}`;
    case "personality": return `personality ${op.trait} ${op.value}`;
    case "native-language": return `native-language ${op.value}`;
    case "notes": return `notes (${op.mode ?? "set"})`;
    case "meta": return `meta ${Object.keys(op.fields).join(", ")}`;
    case "remove": return `remove ${op.kind} ${op.name}`;
  }
}
