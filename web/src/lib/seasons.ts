// Downtime totals + activities: the generalization of "Lab Total" (see
// data/seasons/README.md) to every seasonal activity — lab work, writing,
// study, teaching. Loaded the same way web/src/lib/guidelines.ts loads
// data/guidelines/*.yaml: glob at build time, merge by book, later book wins
// on a repeated `key`. Pure data + pure functions — no UI.
import type { Characteristic, Form, Technique } from "../../../chargen/src/domain/glossary.ts";
import { abilityScore, type Subject } from "./subject.ts";

const yamlFiles = import.meta.glob<{ default: unknown }>("../../../data/seasons/*.yaml", { eager: true });

export type TermKind = "characteristic" | "ability" | "art" | "aura" | "fixed" | "input";

export interface Term {
  kind: TermKind;
  of?: string;                         // characteristic/ability name
  role?: "technique" | "form";         // art kind: which Art the activity supplies
  value?: number;                      // fixed kind
  label?: string;                      // input kind
  default?: number;                    // input kind
  /** characteristic/ability/art kinds: multiply the score (e.g. "Latin x 20" for Lab Texts). */
  multiplier?: number;
}

export interface TotalDef {
  key: string;
  name: string;
  terms: Term[];
  book: string;
}

export type Work =
  | { kind: "repeatable"; unit: string; divisor: number; roundUp?: boolean }
  | { kind: "accumulate"; unit: string; subtractGoal?: boolean }
  | { kind: "charges" }
  | { kind: "fixed" }
  | { kind: "xp" };

export type DowntimeCategory = "lab" | "write" | "study" | "teach";

export interface ActivityDef {
  key: string;
  name: string;
  category: DowntimeCategory;
  total?: string;
  fixedArts?: { technique: Technique; form: Form };
  work: Work;
  needsGoal?: boolean;
  goalLabel?: string;
  sideTotals: { key: string; label: string }[];
  summary: string;
  detail: string;
  book: string;
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const num = (v: unknown, fallback = 0): number => (typeof v === "number" ? v : fallback);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function readTerm(row: Record<string, unknown>): Term {
  return {
    kind: str(row.kind) as TermKind,
    of: str(row.of) || undefined,
    role: (row.role as Term["role"]) || undefined,
    value: typeof row.value === "number" ? row.value : undefined,
    label: str(row.label) || undefined,
    default: typeof row.default === "number" ? row.default : undefined,
    multiplier: typeof row.multiplier === "number" ? row.multiplier : undefined,
  };
}

interface Loaded { totals: TotalDef[]; activities: ActivityDef[] }

function load(files: Record<string, { default: unknown }>): Loaded {
  const totals = new Map<string, TotalDef>();
  const activities = new Map<string, ActivityDef>();

  for (const path of Object.keys(files).sort()) {
    const doc = (files[path]!.default ?? {}) as Record<string, unknown>;
    const bookRow = (doc.book ?? {}) as Record<string, unknown>;
    const key = str(bookRow.key) || path.replace(/^.*\/|\.yaml$/g, "");

    for (const row of list(doc.totals) as Record<string, unknown>[]) {
      const tkey = str(row.key);
      if (!tkey) continue;
      totals.set(tkey, {
        key: tkey,
        name: str(row.name) || tkey,
        terms: list(row.terms).map((t) => readTerm(t as Record<string, unknown>)),
        book: key,
      });
    }

    for (const row of list(doc.activities) as Record<string, unknown>[]) {
      const akey = str(row.key);
      if (!akey) continue;
      const work = (row.work ?? {}) as Record<string, unknown>;
      const fixedArts = row.fixedArts as Record<string, unknown> | undefined;
      activities.set(akey, {
        key: akey,
        name: str(row.name) || akey,
        category: str(row.category) as DowntimeCategory,
        total: str(row.total) || undefined,
        fixedArts: fixedArts ? { technique: str(fixedArts.technique) as Technique, form: str(fixedArts.form) as Form } : undefined,
        work: { ...work, kind: str(work.kind) } as unknown as Work,
        needsGoal: row.needsGoal === true,
        goalLabel: str(row.goalLabel) || undefined,
        sideTotals: list(row.sideTotals).map((s) => {
          const r = s as Record<string, unknown>;
          return { key: str(r.key), label: str(r.label) };
        }),
        summary: str(row.summary),
        detail: str(row.detail),
        book: key,
      });
    }
  }
  return { totals: [...totals.values()], activities: [...activities.values()] };
}

const data = load(yamlFiles);
export const TOTALS: TotalDef[] = data.totals;
export const ACTIVITIES: ActivityDef[] = data.activities;
export const CATEGORIES: DowntimeCategory[] = ["lab", "write", "study", "teach"];
export const CATEGORY_LABEL: Record<DowntimeCategory, string> = {
  lab: "Lab", write: "Write", study: "Study", teach: "Teach",
};
// Muted, parchment-safe hues — distinct from the Technique palette so a mixed
// activity list doesn't read as spell-coded.
export const CATEGORY_COLOR: Record<DowntimeCategory, string> = {
  lab: "#7a2e1d", write: "#3f7d4f", study: "#2e5f7a", teach: "#6b3f8f",
};

export const totalOf = (key: string): TotalDef | undefined => TOTALS.find((t) => t.key === key);

/** A stable key for a term's editable value, shared across every total/activity that reads it. */
export function termId(term: Term, arts?: { technique: Technique; form: Form }): string {
  if (term.kind === "art") return `art:${term.role === "technique" ? arts?.technique : arts?.form}`;
  if (term.kind === "characteristic") return `char:${term.of}`;
  if (term.kind === "ability") return `ability:${term.of}`;
  if (term.kind === "aura") return "aura";
  return "fixed"; // never read for fixed; input terms get their own id below
}

/** `input` terms are scoped to the total they live in — two totals can both ask for "the book's Quality". */
export function inputTermId(totalKey: string, index: number): string {
  return `input:${totalKey}:${index}`;
}

export interface TotalContext {
  subject: Subject;
  overrides: Record<string, number>;
  arts?: { technique: Technique; form: Form };
}

export interface TotalLine { label: string; value: number; id?: string; editable: boolean; multiplier?: number }
export interface TotalResult { value: number; lines: TotalLine[] }

/** Seed a term's starting value from the Subject — the override map takes over once the player edits it. */
export function subjectValue(term: Term, ctx: TotalContext): number {
  if (term.kind === "characteristic") return ctx.subject.characteristics[term.of as Characteristic] ?? 0;
  if (term.kind === "ability") return abilityScore(ctx.subject, term.of ?? "");
  if (term.kind === "art") {
    const art = term.role === "technique" ? ctx.arts?.technique : ctx.arts?.form;
    return art ? ctx.subject.arts[art] ?? 0 : 0;
  }
  if (term.kind === "aura") return 3; // the rulebook's own worked examples default to a 3-magnitude aura
  return 0;
}

/** Compute one total, honouring live overrides over the Subject's own numbers. */
export function computeTotal(total: TotalDef, ctx: TotalContext, adjustments: number): TotalResult {
  const lines: TotalLine[] = [];
  let value = 0;
  total.terms.forEach((term, i) => {
    if (term.kind === "fixed") {
      value += term.value ?? 0;
      lines.push({ label: "base", value: term.value ?? 0, editable: false });
      return;
    }
    const id = term.kind === "input" ? inputTermId(total.key, i) : termId(term, ctx.arts);
    const label = term.kind === "input" ? term.label ?? "input"
      : term.kind === "art" ? (term.role === "technique" ? ctx.arts?.technique : ctx.arts?.form) ?? term.role!
      : term.kind === "characteristic" ? term.of!
      : term.kind === "ability" ? term.of!
      : "aura";
    const fallback = term.kind === "input" ? term.default ?? 0 : subjectValue(term, ctx);
    const v = ctx.overrides[id] ?? fallback;
    const mult = term.multiplier ?? 1;
    value += v * mult;
    // The Stepper edits the raw score (e.g. Latin 5); the header shows the ×20 that
    // turns it into the season's rate, same distinction the book itself draws.
    lines.push({ label, value: v, id, editable: true, multiplier: mult !== 1 ? mult : undefined });
  });
  if (adjustments) {
    value += adjustments;
    lines.push({ label: "adjustments", value: adjustments, editable: false });
  }
  return { value, lines };
}

export interface Outcome { text: string; blocked?: boolean; seasons?: number }

/** Turn a total's value (+ an optional goal, for accumulate/charges) into what a season buys. */
export function computeOutcome(activity: ActivityDef, totalValue: number, goal: number | undefined): Outcome {
  const w = activity.work;
  switch (w.kind) {
    case "repeatable": {
      const raw = totalValue / w.divisor;
      const n = Math.max(0, w.roundUp ? Math.ceil(raw) : Math.floor(raw));
      // Singularize only the leading count-word ("pawns of Vim vis" -> "pawn of...").
      const [first, ...rest] = w.unit.split(" ");
      const unit = n === 1 && first!.endsWith("s") ? [first!.slice(0, -1), ...rest].join(" ") : w.unit;
      return { text: `${n} ${unit} / season` };
    }
    case "xp":
      return { text: `+${Math.max(0, totalValue)} xp this season` };
    case "fixed": {
      // A goal on a `fixed` activity is a pass/fail gate (reproducing from a
      // Laboratory Text), not something to accumulate toward.
      if (activity.needsGoal && goal !== undefined && totalValue < goal) {
        return { text: `blocked — needs ${goal}, you have ${totalValue}`, blocked: true };
      }
      return { text: "one season", seasons: 1 };
    }
    case "charges": {
      if (goal === undefined) return { text: `choose ${(activity.goalLabel ?? "a level").toLowerCase()}` };
      if (totalValue < goal) return { text: `blocked — needs ${goal}, you have ${totalValue}`, blocked: true };
      const charges = Math.floor((totalValue - goal) / 5) + 1;
      return { text: `${charges} charge${charges === 1 ? "" : "s"} at level ${goal}`, seasons: 1 };
    }
    case "accumulate": {
      if (goal === undefined) return { text: `choose ${(activity.goalLabel ?? "a level").toLowerCase()}` };
      const rate = w.subtractGoal ? totalValue - goal : totalValue;
      if (rate <= 0) {
        return {
          text: w.subtractGoal
            ? `blocked — total must exceed ${goal}, you have ${totalValue}`
            : "blocked — no progress at that rate",
          blocked: true,
        };
      }
      const seasons = Math.ceil(goal / rate);
      return { text: `${rate} ${w.unit}/season · ${seasons} season${seasons === 1 ? "" : "s"} to reach ${goal}`, seasons };
    }
    default:
      return { text: "" };
  }
}
