// Pure character mutations. Each returns a MutationResult; on a hard-cap violation
// the change is rejected (original character returned) unless `force` is set. Soft
// problems (unbalanced V&F, unused xp, missing minimums) are returned as issues but
// never block a mutation — they're expected mid-build. The CLI is a thin wrapper
// over these; a web app can call them identically.
import { charKind, traitPick } from "./character.ts";
import type { AbilityPick, Character, PersonalityTrait, SpellPick, TraitPick, XpBonus } from "./character.ts";
import { type Art, type Characteristic, type Form, type Stage, type Technique, isArt, isCharacteristic } from "./glossary.ts";
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
  if (!Number.isInteger(value)) {
    return { ok: false, character: ch, rejected: `Characteristic value ${value} must be an integer.`, issues: validate(ch) };
  }
  const candidate = clone(ch);
  if (value === 0) delete candidate.characteristics[characteristic];
  else candidate.characteristics[characteristic] = value;
  return finalize(ch, candidate, `${characteristic} ${value >= 0 ? "+" : ""}${value}`, force);
}

const sameTrait = (a: { name: string; param?: string }, b: { name: string; param?: string }) =>
  a.name.toLowerCase() === b.name.toLowerCase() &&
  (a.param ?? "").toLowerCase() === (b.param ?? "").toLowerCase();

export function addTrait(ch: Character, kind: "Virtue" | "Flaw", resolved: ResolvedTrait, force = false): MutationResult {
  const list = kind === "Virtue" ? ch.virtues : ch.flaws;
  const dupe = list.find((t) => sameTrait(t, { name: resolved.canonical, param: resolved.param }));
  // Parameterized repeatables (Puissant Art, Affinity) repeat only with a different parameter.
  if (dupe && !(resolved.row.repeatable && !resolved.param) && !force) {
    const why = dupe.free ? "it duplicates a free benefit you already have" : "it's already taken and isn't repeatable";
    return { ok: false, character: ch, rejected: `Cannot add ${resolved.display}: ${why}.`, issues: validate(ch) };
  }
  const pick = traitPick(resolved);
  const candidate = clone(ch);
  (kind === "Virtue" ? candidate.virtues : candidate.flaws).push(pick);
  return finalize(ch, candidate, `+ ${kind}: ${resolved.display} (${resolved.size}, ${resolved.row.category}) = ${resolved.points} pt${resolved.points === 1 ? "" : "s"}`, force);
}

/** Add a free, off-budget Virtue/Flaw (e.g. an Ex Miscellanea / Jerbiton grant). */
export function addFreeTrait(ch: Character, kind: "Virtue" | "Flaw", resolved: ResolvedTrait): MutationResult {
  const candidate = clone(ch);
  const pick = traitPick(resolved, true);
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

export function removeAbility(ch: Character, query: string, stage?: Stage): MutationResult {
  const candidate = clone(ch);
  const q = query.toLowerCase();
  const idx = candidate.abilities.findIndex((a) => a.name.toLowerCase() === q && a.stage !== "free" && (!stage || a.stage === stage));
  if (idx === -1) return { ok: false, character: ch, rejected: `No (non-granted) Ability matching "${query}" to remove.`, issues: validate(ch) };
  const [removed] = candidate.abilities.splice(idx, 1);
  return { ok: true, character: candidate, applied: `− ${removed!.name} ${removed!.score}`, issues: validate(candidate) };
}

/** Rename one stage's copy of an Ability ("Provense Lore" → "Provence Lore"), keeping score, type and specialty. */
export function renameAbility(ch: Character, from: string, to: string, stage: Stage): MutationResult {
  const name = to.trim();
  const candidate = clone(ch);
  const row = candidate.abilities.find((a) => a.name.toLowerCase() === from.toLowerCase() && a.stage === stage);
  if (!row) return reject(ch, `No Ability "${from}" in ${stage} to rename.`);
  if (!name) return reject(ch, "An Ability needs a name.");
  if (candidate.abilities.some((a) => a !== row && a.stage === stage && a.name.toLowerCase() === name.toLowerCase())) {
    return reject(ch, `${name} is already taken in ${stage}.`);
  }
  row.name = name;
  return { ok: true, character: candidate, applied: `${from} → ${name} [${stage}]`, issues: validate(candidate) };
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

/** Set a known spell's Mastery score (0 clears it). Paid from the mastery pool, then apprenticeship xp. */
export function setMastery(ch: Character, name: string, score: number): MutationResult {
  if (!Number.isInteger(score) || score < 0) return reject(ch, `Mastery score must be a non-negative integer.`);
  const candidate = clone(ch);
  const spell = candidate.spells.find((s) => s.name.toLowerCase() === name.toLowerCase());
  if (!spell) return reject(ch, `"${name}" isn't a known spell.`);
  if (score === 0) delete spell.mastery;
  else spell.mastery = score;
  return finalize(ch, candidate, `Mastery: ${spell.name} ${score}`, true);
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

// Age, confidence, later-life-years and reputation are all set via setMeta
// (below) — one mutation for the scalar header fields.

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
    if (!Number.isInteger(value)) return reject(ch, `${name} value ${value} must be an integer.`);
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
  confidence?: number;
  laterLifeYears?: number;
  reputation?: string | null;
  /** Replaces the whole list. */
  xpBonuses?: XpBonus[];
  /** Replaces the whole list of accepted issue codes. */
  dismissed?: string[];
}

/** Set any subset of the scalar header fields in one mutation. */
export function setMeta(ch: Character, m: MetaFields, force = false): MutationResult {
  const candidate = clone(ch);
  const applied: string[] = [];
  if (m.name !== undefined) { candidate.name = m.name; applied.push("name"); }
  if (m.concept !== undefined) { candidate.concept = m.concept; applied.push("concept"); }
  if (m.reputation !== undefined) { candidate.reputation = m.reputation; applied.push("reputation"); }
  if (m.xpBonuses !== undefined) { candidate.xpBonuses = m.xpBonuses; applied.push(`${m.xpBonuses.length} xp bonus(es)`); }
  if (m.dismissed !== undefined) { candidate.dismissed = m.dismissed; applied.push(`${m.dismissed.length} dismissed`); }
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
