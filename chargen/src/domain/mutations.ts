// Pure character mutations. Each returns a MutationResult; on a hard-cap violation
// the change is rejected (original character returned) unless `force` is set. Soft
// problems (unbalanced V&F, unused xp, missing minimums) are returned as issues but
// never block a mutation — they're expected mid-build. The CLI is a thin wrapper
// over these; a web app can call them identically.
import { charKind } from "./character.ts";
import type { AbilityPick, Character, PersonalityTrait, SpellPick, TraitPick } from "./character.ts";
import { type Art, type Characteristic, type Form, type Stage, type Technique, FORMS, TECHNIQUES, isArt, isCharacteristic } from "./glossary.ts";
import type { ResolvedAbility, ResolvedTrait } from "../data/rules.ts";
import type { SpellRow } from "../data/types.ts";
import { type Issue, VIOLATION_CODES, validate } from "./validate.ts";
import { affinityXp, artXp } from "./costs.ts";
import { deriveModifiers } from "./modifiers.ts";
import { type LabTotalOpts, spellLabTotal } from "./labtotal.ts";

export interface MutationResult {
  ok: boolean;
  character: Character;
  applied?: string;
  rejected?: string;
  issues: Issue[];
  forced?: boolean;
}

const clone = (ch: Character): Character => structuredClone(ch);

/** A rejected mutation that leaves the character untouched. */
const reject = (ch: Character, rejected: string): MutationResult => ({ ok: false, character: ch, rejected, issues: validate(ch) });

function finalize(original: Character, candidate: Character, applied: string, force: boolean): MutationResult {
  const issues = validate(candidate);
  const blocking = issues.filter((i) => i.level === "error" && VIOLATION_CODES.has(i.code));
  if (blocking.length > 0 && !force) {
    return {
      ok: false,
      character: original,
      rejected: `${blocking.map((b) => b.message).join(" ")} (use --force to override)`,
      issues: validate(original),
    };
  }
  return { ok: true, character: candidate, applied, issues, forced: force && blocking.length > 0 };
}

export function setCharacteristic(ch: Character, characteristic: Characteristic, value: number, force = false): MutationResult {
  if (value < -3 || value > 3) {
    return { ok: false, character: ch, rejected: `Characteristic value ${value} is out of range (−3..+3).`, issues: validate(ch) };
  }
  const candidate = clone(ch);
  if (value === 0) delete candidate.characteristics[characteristic];
  else candidate.characteristics[characteristic] = value;
  return finalize(ch, candidate, `${characteristic} ${value >= 0 ? "+" : ""}${value}`, force);
}

const sameTrait = (a: { name: string; param?: string }, b: { name: string; param?: string }) =>
  a.name.toLowerCase() === b.name.toLowerCase() &&
  (a.param ?? "").toLowerCase() === (b.param ?? "").toLowerCase();

function isRepeatable(description: string): boolean {
  return /(more than once|multiple times|may be taken (again|several|two|twice)|take this (virtue|flaw) (more than once|multiple))/i.test(description);
}

export function addTrait(ch: Character, kind: "Virtue" | "Flaw", resolved: ResolvedTrait, force = false): MutationResult {
  const list = kind === "Virtue" ? ch.virtues : ch.flaws;
  const dupe = list.find((t) => sameTrait(t, { name: resolved.canonical, param: resolved.param }));
  if (dupe && !isRepeatable(resolved.row.description) && !force) {
    const why = dupe.free ? "it duplicates a free benefit you already have" : "it's already taken and isn't repeatable";
    return { ok: false, character: ch, rejected: `Cannot add ${resolved.display}: ${why}.`, issues: validate(ch) };
  }
  const pick: TraitPick = {
    name: resolved.canonical, display: resolved.display, param: resolved.param,
    size: resolved.size, category: resolved.row.category, points: resolved.points,
  };
  const candidate = clone(ch);
  (kind === "Virtue" ? candidate.virtues : candidate.flaws).push(pick);
  return finalize(ch, candidate, `+ ${kind}: ${resolved.display} (${resolved.size}, ${resolved.row.category}) = ${resolved.points} pt${resolved.points === 1 ? "" : "s"}`, force);
}

/** Add a free, off-budget Virtue/Flaw (e.g. an Ex Miscellanea / Jerbiton grant). */
export function addFreeTrait(ch: Character, kind: "Virtue" | "Flaw", resolved: ResolvedTrait): MutationResult {
  const candidate = clone(ch);
  const pick: TraitPick = {
    name: resolved.canonical, display: resolved.display, param: resolved.param,
    size: resolved.size, category: resolved.row.category, points: 0, free: true,
  };
  (kind === "Virtue" ? candidate.virtues : candidate.flaws).push(pick);
  return finalize(ch, candidate, `+ Free ${kind}: ${resolved.display}`, true);
}

export function removeTrait(ch: Character, kind: "Virtue" | "Flaw", query: string): MutationResult {
  const candidate = clone(ch);
  const list = kind === "Virtue" ? candidate.virtues : candidate.flaws;
  const q = query.toLowerCase();
  const idx = list.findIndex((t) => t.display.toLowerCase() === q || t.name.toLowerCase() === q);
  if (idx === -1) return { ok: false, character: ch, rejected: `No ${kind} matching "${query}" to remove.`, issues: validate(ch) };
  const [removed] = list.splice(idx, 1);
  return { ok: true, character: candidate, applied: `− ${kind}: ${removed!.display}`, issues: validate(candidate) };
}

export function addAbility(ch: Character, resolved: ResolvedAbility, score: number, stage: Stage, specialty: string | undefined, force = false): MutationResult {
  if (!Number.isInteger(score) || score < 1) {
    return { ok: false, character: ch, rejected: `Ability score must be a positive integer.`, issues: validate(ch) };
  }
  const candidate = clone(ch);
  const existing = candidate.abilities.find((a) => a.name.toLowerCase() === resolved.name.toLowerCase() && a.stage === stage);
  const pick: AbilityPick = {
    name: resolved.name, score, stage, type: resolved.type, restricted: resolved.restricted || undefined,
    specialty: specialty ?? existing?.specialty,
  };
  if (existing) Object.assign(existing, pick);
  else candidate.abilities.push(pick);
  return finalize(ch, candidate, `+ ${resolved.name} ${score}${specialty ? ` (${specialty})` : ""} [${stage}]`, force);
}

export function removeAbility(ch: Character, query: string): MutationResult {
  const candidate = clone(ch);
  const q = query.toLowerCase();
  const idx = candidate.abilities.findIndex((a) => a.name.toLowerCase() === q && a.stage !== "free");
  if (idx === -1) return { ok: false, character: ch, rejected: `No (non-granted) Ability matching "${query}" to remove.`, issues: validate(ch) };
  const [removed] = candidate.abilities.splice(idx, 1);
  return { ok: true, character: candidate, applied: `− ${removed!.name} ${removed!.score}`, issues: validate(candidate) };
}

export function setArt(ch: Character, art: Art, score: number, force = false): MutationResult {
  if (!Number.isInteger(score) || score < 0) {
    return { ok: false, character: ch, rejected: `Art score must be a non-negative integer.`, issues: validate(ch) };
  }
  const candidate = clone(ch);
  if (score === 0) delete candidate.arts[art];
  else candidate.arts[art] = score;
  const mods = deriveModifiers(candidate);
  const raw = artXp(score);
  const real = mods.affinityArt.has(art) ? affinityXp(raw) : raw;
  const notes: string[] = [];
  if (mods.affinityArt.has(art)) notes.push(`Affinity ×1.5, base ${raw}`);
  if (mods.puissantArt.has(art)) notes.push(`Puissant +${mods.puissantArt.get(art)} to totals`);
  if (mods.deficientArts.has(art)) notes.push(`Deficient: totals halved`);
  return finalize(ch, candidate, `+ ${art} ${score} = ${real} xp${notes.length ? ` (${notes.join("; ")})` : ""}`, force);
}

export function addSpell(ch: Character, spell: SpellRow, opts: LabTotalOpts = {}, force = false): MutationResult {
  if (spell.level === null) {
    return { ok: false, character: ch, rejected: `"${spell.name}" is a General-level spell; pick a fixed-level spell.`, issues: validate(ch) };
  }
  const mods = deriveModifiers(ch);
  const lt = spellLabTotal(ch, mods, { technique: spell.technique as Technique, form: spell.form as Form, requisites: spell.requisites }, opts);
  const candidate = clone(ch);
  if (candidate.spells.some((s) => s.name.toLowerCase() === spell.name.toLowerCase())) {
    return { ok: false, character: ch, rejected: `"${spell.name}" is already known.`, issues: validate(ch) };
  }
  const pick: SpellPick = {
    name: spell.name, technique: spell.technique as Technique, form: spell.form as Form,
    level: spell.level, requisites: spell.requisites, labTotal: lt.total,
    inFocus: opts.inFocus || undefined, aura: opts.aura,
  };
  candidate.spells.push(pick);
  const head = `Lab Total (${spell.technique} ${spell.form}): ${lt.breakdown}\n+ ${spell.name} (${spell.tech_abbr}${spell.form_abbr} ${spell.level})${spell.level <= lt.total ? ` ✓ ${spell.level} ≤ ${lt.total}` : ""}`;
  return finalize(ch, candidate, head, force);
}

export function removeSpell(ch: Character, query: string): MutationResult {
  const candidate = clone(ch);
  const q = query.toLowerCase();
  const idx = candidate.spells.findIndex((s) => s.name.toLowerCase() === q);
  if (idx === -1) return { ok: false, character: ch, rejected: `No spell matching "${query}" to remove.`, issues: validate(ch) };
  const [removed] = candidate.spells.splice(idx, 1);
  return { ok: true, character: candidate, applied: `− ${removed!.name}`, issues: validate(candidate) };
}

export function addPersonality(ch: Character, trait: string, value: number): MutationResult {
  if (!Number.isInteger(value) || value < -6 || value > 6) {
    return { ok: false, character: ch, rejected: `Personality value must be an integer −6..+6 (usually −3..+3).`, issues: validate(ch) };
  }
  const candidate = clone(ch);
  const existing = candidate.personality.find((p) => p.trait.toLowerCase() === trait.toLowerCase());
  if (existing) existing.value = value;
  else (candidate.personality as PersonalityTrait[]).push({ trait, value });
  return finalize(ch, candidate, `Personality: ${trait} ${value >= 0 ? "+" : ""}${value}`, true);
}

// Dead/liturgical languages are Academic Abilities, never a native vernacular.
const DEAD_LANGUAGES = new Set(["latin", "greek", "ancient greek", "hebrew", "classical greek", "gothic"]);

export function setNativeLanguage(ch: Character, language: string, force = false): MutationResult {
  if (DEAD_LANGUAGES.has(language.trim().toLowerCase()) && !force) {
    return {
      ok: false, character: ch,
      rejected: `${language} is a Dead Language (an Academic Ability), not a native tongue. Your Native Language is your spoken vernacular (e.g. German, French, Italian). To learn ${language}, use \`add ability "${language}" <score> --stage apprenticeship\`. (use --force to override)`,
      issues: validate(ch),
    };
  }
  const candidate = clone(ch);
  candidate.nativeLanguage = language;
  return finalize(ch, candidate, `Native Language: ${language} (score 5, 75 xp)`, true);
}

export function setConcept(ch: Character, concept: string): MutationResult {
  const candidate = clone(ch);
  candidate.concept = concept;
  return finalize(ch, candidate, `Concept: ${concept}`, true);
}

// Age, confidence, later-life-years, focus, favored Tech/Form and reputation are
// all set via setMeta (below) — one mutation for the scalar header fields.

/**
 * Assign a whole Characteristic map at once, validating the final total (not each
 * intermediate). This is the batch-safe path: an LLM can submit all eight values
 * in any order — including negatives that buy points back — without a transient
 * "over 7" rejection mid-way. A value of 0 clears the Characteristic.
 */
export function setCharacteristics(ch: Character, values: Record<string, number>, force = false): MutationResult {
  const candidate = clone(ch);
  const applied: string[] = [];
  for (const [name, value] of Object.entries(values)) {
    if (!isCharacteristic(name)) return reject(ch, `Unknown Characteristic "${name}".`);
    if (!Number.isInteger(value) || value < -3 || value > 3) return reject(ch, `${name} value ${value} is out of range (−3..+3).`);
    if (value === 0) delete candidate.characteristics[name as Characteristic];
    else candidate.characteristics[name as Characteristic] = value;
    if (value !== 0) applied.push(`${name} ${value > 0 ? "+" : ""}${value}`);
  }
  return finalize(ch, candidate, `Characteristics: ${applied.join(", ") || "cleared"}`, force);
}

/** Assign a whole Art map at once (batch-safe). A score of 0 clears the Art. */
export function setArts(ch: Character, values: Record<string, number>, force = false): MutationResult {
  const candidate = clone(ch);
  const applied: string[] = [];
  for (const [name, score] of Object.entries(values)) {
    const art = name.length ? name[0]!.toUpperCase() + name.slice(1).toLowerCase() : name;
    if (!isArt(art)) return reject(ch, `Unknown Art "${name}".`);
    if (!Number.isInteger(score) || score < 0) return reject(ch, `${art} score must be a non-negative integer.`);
    if (score === 0) delete candidate.arts[art as Art];
    else candidate.arts[art as Art] = score;
    if (score !== 0) applied.push(`${art} ${score}`);
  }
  return finalize(ch, candidate, `Arts: ${applied.join(", ") || "cleared"}`, force);
}

/** Set or append the freeform Markdown notes. Off-budget, never blocks. */
export function setNotes(ch: Character, value: string, mode: "set" | "append" = "set"): MutationResult {
  const candidate = clone(ch);
  candidate.notes = mode === "append" && candidate.notes
    ? `${candidate.notes.replace(/\s+$/, "")}\n\n${value}`
    : value;
  return finalize(ch, candidate, `Notes ${mode === "append" ? "appended" : "set"} (${candidate.notes.length} chars)`, true);
}

export interface MetaFields {
  name?: string;
  concept?: string;
  age?: number;
  focus?: string;
  favoredTechnique?: string;
  favoredForm?: string;
  confidence?: number;
  laterLifeYears?: number;
  reputation?: string | null;
}

/** Set any subset of the scalar header fields in one mutation. */
export function setMeta(ch: Character, m: MetaFields, force = false): MutationResult {
  const candidate = clone(ch);
  const applied: string[] = [];
  if (m.name !== undefined) { candidate.name = m.name; applied.push("name"); }
  if (m.concept !== undefined) { candidate.concept = m.concept; applied.push("concept"); }
  if (m.focus !== undefined) { candidate.focus = m.focus; applied.push(`focus "${m.focus}"`); }
  if (m.reputation !== undefined) { candidate.reputation = m.reputation; applied.push("reputation"); }
  if (m.favoredTechnique !== undefined) {
    const t = TECHNIQUES.find((x) => x.toLowerCase() === m.favoredTechnique!.toLowerCase());
    if (!t) return reject(ch, `Unknown Technique "${m.favoredTechnique}" (Creo Intellego Muto Perdo Rego).`);
    candidate.favoredTechnique = t; applied.push(`favored Technique ${t}`);
  }
  if (m.favoredForm !== undefined) {
    const f = FORMS.find((x) => x.toLowerCase() === m.favoredForm!.toLowerCase());
    if (!f) return reject(ch, `Unknown Form "${m.favoredForm}".`);
    candidate.favoredForm = f; applied.push(`favored Form ${f}`);
  }
  if (m.age !== undefined) {
    // Magi finish a 15-year apprenticeship, so they're ≥25; grogs/companions can be younger.
    const floor = charKind(ch) === "magus" ? 25 : 5;
    if (!Number.isInteger(m.age) || (m.age < floor && !force)) {
      return reject(ch, charKind(ch) === "magus" ? `Age ${m.age} is below the Gauntlet minimum of 25 (use --force).` : `Age ${m.age} is too low (minimum ${floor}; use --force).`);
    }
    candidate.age = m.age; applied.push(`age ${m.age}`);
  }
  if (m.laterLifeYears !== undefined) {
    if (!Number.isInteger(m.laterLifeYears) || m.laterLifeYears < 0) return reject(ch, `Later-life years must be a non-negative integer.`);
    candidate.laterLifeYears = m.laterLifeYears; applied.push(`later-life ${m.laterLifeYears}y`);
  }
  if (m.confidence !== undefined) {
    if (!Number.isInteger(m.confidence) || m.confidence < 0) return reject(ch, `Confidence must be a non-negative integer.`);
    candidate.confidence = m.confidence; applied.push(`confidence ${m.confidence}`);
  }
  return finalize(ch, candidate, `Meta: ${applied.join(", ") || "(no changes)"}`, force);
}
