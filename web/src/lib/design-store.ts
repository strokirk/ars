// The spell designer's working state. A module-level signal rather than component
// state so the design survives a trip to the Guidelines tab and back, and a signal
// rather than localStorage because a half-built spell is not worth persisting.
import { signal } from "@preact/signals";
import {
  GUIDELINES, findParam, designSpell, levelRung, rungLevel,
  type Guideline, type DesignResult, type Param, type ParamKind,
} from "./guidelines.ts";

export interface Design {
  /** The chosen guideline, or null while nothing is picked. */
  guidelineId: string | null;
  /** Base level in play. Starts at the guideline's own level and can be nudged. */
  base: number;
  rangeKey: string;
  durationKey: string;
  targetKey: string;
  /** Which Target ladder `targetKey` names — the three share key names. */
  targetKind: "object" | "container" | "sense";
  size: number;
  extra: number;
  /** A Creo effect meant to outlast the spell, which forces a Momentary Ritual. */
  lastingCreo: boolean;
}

/** Guidelines are quoted at the bottom rung of every ladder, so that is the start. */
export const BLANK: Design = {
  guidelineId: null,
  base: 5,
  rangeKey: "Per",
  durationKey: "Mom",
  targetKey: "Ind",
  targetKind: "object",
  size: 0,
  extra: 0,
  lastingCreo: false,
};

export const design = signal<Design>({ ...BLANK });

/**
 * Apply a change to the *current* design. Handlers that close over the design as it
 * was rendered go stale the moment two of them fire before a re-render — two taps on
 * a stepper would then both compute from the same starting level and the second would
 * be lost. Reading `peek()` here makes every handler current by construction.
 */
export const update = (fn: (d: Design) => Design): void => { design.value = fn(design.peek()); };

export const reset = (): void => { design.value = { ...BLANK }; };

export const guidelineOf = (d: Design): Guideline | undefined =>
  d.guidelineId ? GUIDELINES.find((g) => g.id === d.guidelineId) : undefined;

/**
 * Load a guideline, keeping every parameter the user has already chosen — picking a
 * different effect should not throw away the Range and Duration they just set.
 * A General guideline has no level of its own, so the current base carries over.
 */
export function pickGuideline(d: Design, g: Guideline): Design {
  return { ...d, guidelineId: g.id, base: g.level ?? d.base, lastingCreo: false };
}

/**
 * Set the base from a rung of the magnitude ladder — "boost or lower the effect"
 * itself. The stepper counts rungs so one press is always one magnitude, which is
 * not one level at the bottom of the ladder.
 */
export const setBaseRung = (d: Design, rung: number): Design => ({ ...d, base: rungLevel(rung) });

export function setParam(d: Design, kind: ParamKind, p: Param): Design {
  if (kind === "range") return { ...d, rangeKey: p.key };
  if (kind === "duration") return { ...d, durationKey: p.key };
  return { ...d, targetKey: p.key, targetKind: p.targetKind ?? "object" };
}

/** The Param a design currently names, falling back to the bottom rung. */
export function paramFor(d: Design, kind: ParamKind): Param {
  if (kind === "range") return findParam("range", d.rangeKey) ?? findParam("range", "Per")!;
  if (kind === "duration") return findParam("duration", d.durationKey) ?? findParam("duration", "Mom")!;
  // Target keys repeat across the object/container/sense ladders ("Touch" is both a
  // Range and a sense Target), so the kind has to disambiguate.
  const target = findParam("target", d.targetKey);
  return target?.targetKind === d.targetKind ? target : findParam("target", "Ind")!;
}

/** Total the current design. Returns null until an effect has been chosen. */
export function resultOf(d: Design): DesignResult | null {
  const g = guidelineOf(d);
  if (!g) return null;
  return designSpell({
    base: d.base,
    range: paramFor(d, "range"),
    duration: paramFor(d, "duration"),
    target: paramFor(d, "target"),
    size: d.size,
    extra: d.extra,
    guidelineRitual: g.ritual,
    lastingCreo: d.lastingCreo,
    technique: g.technique,
  });
}

/** The base level as a rung, for the stepper — it steps magnitudes, not levels. */
export const baseRung = (d: Design): number => levelRung(d.base);

/** The spell's stat block, the way the rulebook writes it. */
export function statLine(d: Design): string {
  return `R: ${paramFor(d, "range").name}, D: ${paramFor(d, "duration").name}, T: ${paramFor(d, "target").name}`;
}
