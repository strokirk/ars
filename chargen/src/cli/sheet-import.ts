// Parses the Markdown sheet renderSheet() produces (sheet.ts) back into a Character.
// Round-trips the standard export exactly; anything it can't resolve (a Virtue/Flaw
// or Ability name the rules data doesn't recognize) is skipped and reported in
// `warnings` rather than failing the whole import.
import { migrateCharacter, newCharacter, traitPick, type Character, type CharacterKind, type TraitPick } from "../domain/character.ts";
import { CHARACTERISTICS, TECHNIQUES, FORMS, ART_ABBR, HOUSES, type Art, type Characteristic, type House, type Technique, type Form, type Stage } from "../domain/glossary.ts";
import { deriveModifiers } from "../domain/modifiers.ts";
import { spellLabTotal } from "../domain/labtotal.ts";
import type { RulesData } from "../data/rules.ts";

export interface ImportResult {
  character: Character;
  warnings: string[];
}

const ABBR_TO_ART: Record<string, Art> = Object.fromEntries(
  ([...TECHNIQUES, ...FORMS] as Art[]).map((a) => [ART_ABBR[a], a]),
);

function section(lines: string[], heading: RegExp): string[] {
  const start = lines.findIndex((l) => heading.test(l.trim()));
  if (start === -1) return [];
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^##\s/.test(l.trim()));
  return (end === -1 ? rest : rest.slice(0, end)).map((l) => l.trim()).filter(Boolean);
}

const afterColon = (line: string | undefined): string => {
  if (!line) return "";
  const i = line.indexOf(":");
  return i === -1 ? "" : line.slice(i + 1).replace(/\s*←.*$/, "").trim();
};

const splitList = (s: string): string[] =>
  !s || s === "—" ? [] : s.split(/[;,]/).map((x) => x.trim()).filter(Boolean);

/** "Puissant Ignem (Minor)" → { name: "Puissant Ignem", size: "Minor" }. Also
 *  matches "Free" (a Social Status virtue's intrinsic size, unrelated to `free:true`
 *  off-budget grants — those never reach here, they're parsed off the "Free:" line). */
function splitSized(entry: string): { name: string; size?: "Minor" | "Major" | "Free" } {
  const m = entry.match(/^(.*)\s+\((Minor|Major|Free)\)$/);
  return m ? { name: m[1]!.trim(), size: m[2] as "Minor" | "Major" | "Free" } : { name: entry };
}

export function parseSheetMarkdown(md: string, rules: RulesData): ImportResult {
  const warnings: string[] = [];
  const lines = md.replace(/\r\n/g, "\n").split("\n");

  // ── header: title, concept/age/later-life, kind ───────────────────────────
  const rawTitleLine = lines.find((l) => l.startsWith("# "));
  if (rawTitleLine === undefined) warnings.push("No title line (# Name) found; the name is blank.");
  const titleLine = (rawTitleLine ?? "").slice(2).trim();
  let house: House | undefined;
  let name = titleLine;
  const houseMatch = titleLine.match(/^(.*?)\s*of House\s+(.+)$/);
  if (houseMatch && (HOUSES as readonly string[]).includes(houseMatch[2]!.trim())) {
    name = houseMatch[1]!.trim();
    house = houseMatch[2]!.trim() as House;
  }

  const headerLine = lines.find((l) => l.startsWith("**Concept:**")) ?? "";
  const headerMatch = headerLine.match(/\*\*Concept:\*\*\s*(.+?)\s*·\s*\*\*Age:\*\*\s*(\d+)\s*·\s*\*\*Later-life years:\*\*\s*(\d+)/);
  if (!headerMatch) warnings.push("Could not parse the Concept/Age/Later-life years line.");
  const concept = headerMatch && headerMatch[1] !== "—" ? headerMatch[1]!.trim() : "";
  const age = headerMatch ? Number(headerMatch[2]) : 25;
  const laterLifeYears = headerMatch ? Number(headerMatch[3]) : 5;

  // **Type:** is explicit since exports carry it; older exports fall back to the sheet's shape.
  const typeLine = lines.find((l) => l.startsWith("**Type:**"))?.replace("**Type:**", "").trim().toLowerCase();
  const personalityHeading = lines.find((l) => l.startsWith("## Personality")) ?? "";
  const kind: CharacterKind = typeLine === "grog" || typeLine === "companion" || typeLine === "magus"
    ? typeLine
    : house || lines.some((l) => l.trim() === "## Arts")
      ? "magus"
      : personalityHeading.includes("Confidence") ? "companion" : "grog";

  const ch: Character = newCharacter({ name, kind, house, concept, age });
  ch.laterLifeYears = laterLifeYears;

  // ── characteristics ────────────────────────────────────────────────────────
  const charLine = section(lines, /^## Characteristics$/)[0] ?? "";
  for (const c of CHARACTERISTICS) {
    const m = charLine.match(new RegExp(`\\b${c}\\s+([+-]?\\d+)`));
    const v = m ? Number(m[1]) : 0;
    if (v !== 0) ch.characteristics[c as Characteristic] = v;
  }

  // ── virtues & flaws ──────────────────────────────────────────────────────
  const vfLines = section(lines, /^## Virtues & Flaws$/);
  const freeLine = vfLines.find((l) => l.startsWith("- Free:"));
  const virtueLine = vfLines.find((l) => l.startsWith("- Virtues"));
  const flawLine = vfLines.find((l) => l.startsWith("- Flaws"));

  const resolveDisplay = (display: string, sizeHint?: "Minor" | "Major" | "Free"): TraitPick | null => {
    // "Major or Minor" rows need the hint; unambiguous ("Free", or a fixed
    // Minor/Major row) resolve fine without one — and passing it would be
    // mistaken for a real parameter.
    const sizeArg = sizeHint === "Minor" || sizeHint === "Major" ? sizeHint : undefined;
    let r = rules.resolveTrait(display, undefined, sizeArg);
    if (!r.ok) {
      const m = display.match(/^(.*)\s+\(([^()]+)\)$/);
      if (m) r = rules.resolveTrait(m[1]!.trim(), m[2]!.trim(), sizeArg);
    }
    if (!r.ok) { warnings.push(`Could not resolve Virtue/Flaw "${display}" (${r.error})`); return null; }
    return traitPick(r.trait);
  };

  for (const entry of splitList(afterColon(freeLine))) {
    const t = resolveDisplay(entry);
    if (t) ch.virtues.push({ ...t, points: 0, free: true });
  }
  for (const entry of splitList(afterColon(virtueLine)).map(splitSized)) {
    const t = resolveDisplay(entry.name, entry.size);
    if (t) ch.virtues.push(t);
  }
  for (const entry of splitList(afterColon(flawLine)).map(splitSized)) {
    const t = resolveDisplay(entry.name, entry.size);
    if (t) ch.flaws.push(t);
  }

  // ── abilities ────────────────────────────────────────────────────────────
  const abilLines = section(lines, /^## Abilities$/);
  const nativeLine = abilLines.find((l) => l.startsWith("Native Language:"));
  if (nativeLine) ch.nativeLanguage = nativeLine.replace("Native Language:", "").trim().replace(/\s+\d+$/, "");

  // Current shape: "- Athletics 1 (Running) · childhood 5 xp, later-life 5 xp" (the score is derived; xp is kept).
  const STAGES = new Set<string>(["childhood", "later-life", "apprenticeship", "post-gauntlet", "free"]);
  for (const line of abilLines.filter((l) => l.startsWith("- "))) {
    const m = line.match(/^-\s+(.+?)\s+\d+(?:\s+\(([^()]+)\))?\s+·\s+(.+)$/);
    if (!m) { warnings.push(`Could not parse Ability line "${line}"`); continue; }
    const res = rules.resolveAbility(m[1]!.trim());
    if (!res.ok) { warnings.push(`Could not resolve Ability "${m[1]}" (${res.error})`); continue; }
    for (const part of m[3]!.split(",")) {
      const pm = part.trim().match(/^(\S+)\s+(\d+)\s+xp$/);
      if (!pm || !STAGES.has(pm[1]!)) { warnings.push(`Could not parse "${part.trim()}" for ${res.ability.name}`); continue; }
      ch.abilities.push({ name: res.ability.name, xp: Number(pm[2]), stage: pm[1] as Stage, specialty: m[2], type: res.ability.type, restricted: res.ability.restricted });
    }
  }
  // Older exports: one "Childhood: Athletics 1, …" line per stage, a score per entry (migrated below).
  const parseAbilityEntry = (entry: string, stage: Stage) => {
    const m = entry.match(/^(.+?)\s+(\d+)(?:\s+\(([^()]+)\))?$/);
    if (!m) { warnings.push(`Could not parse Ability entry "${entry}"`); return; }
    const [, abName, scoreStr, specialty] = m;
    const res = rules.resolveAbility(abName!.trim());
    if (!res.ok) { warnings.push(`Could not resolve Ability "${abName}" (${res.error})`); return; }
    ch.abilities.push({ name: res.ability.name, score: Number(scoreStr), stage, specialty, type: res.ability.type, restricted: res.ability.restricted } as never);
  };
  const stageBody = (label: string) => afterColon(abilLines.find((l) => l.startsWith(`${label}:`)));
  for (const [label, stage] of [["Childhood", "childhood"], ["Later life", "later-life"], ["Apprenticeship", "apprenticeship"], ["Post-Gauntlet", "post-gauntlet"]] as const) {
    for (const entry of splitList(stageBody(label))) parseAbilityEntry(entry, stage);
  }
  for (const entry of splitList(stageBody("Granted"))) parseAbilityEntry(entry, "free");
  migrateCharacter(ch);

  // ── arts & spells (magi only) ────────────────────────────────────────────
  if (kind === "magus") {
    const artsLine = section(lines, /^## Arts$/)[0] ?? "";
    for (const part of artsLine.split("|")) {
      const tokens = part.trim().split(/\s+/);
      for (let i = 0; i + 1 < tokens.length; i += 2) {
        const art = ABBR_TO_ART[tokens[i]!];
        const score = Number(tokens[i + 1]);
        if (art && score > 0) ch.arts[art] = score;
      }
    }

    for (const line of section(lines, /^## Spells Known/)) {
      if (line === "—") continue;
      const m = line.match(/^-\s+(.+?)\s+\(([A-Za-z]{2})([A-Za-z]{2})\s+(\d+)\)(?:\s+·\s+Mastery\s+(\d+))?$/);
      if (!m) { warnings.push(`Could not parse spell line "${line}"`); continue; }
      const [, spName, techAbbr, formAbbr, levelStr, masteryStr] = m;
      const row = rules.spell(spName!.trim());
      const technique = (row?.technique as Technique | undefined) ?? ABBR_TO_ART[techAbbr!] as Technique | undefined;
      const form = (row?.form as Form | undefined) ?? ABBR_TO_ART[formAbbr!] as Form | undefined;
      if (!technique || !form) { warnings.push(`Unknown Technique/Form for spell "${spName}"`); continue; }
      if (!row) warnings.push(`"${spName}" isn't in the rules data — imported with no known requisites.`);
      const level = Number(levelStr);
      ch.spells.push({ name: spName!.trim(), technique, form, level, requisites: row?.requisites ?? [], labTotal: level, ...(masteryStr ? { mastery: Number(masteryStr) } : {}) });
    }
    const mods = deriveModifiers(ch);
    for (const s of ch.spells) s.labTotal = spellLabTotal(ch, mods, s, { aura: s.aura, inFocus: s.inFocus }).total;
  }

  // ── personality / reputation / confidence ───────────────────────────────
  const persLine = section(lines, /^## Personality/)[0] ?? "";
  const pm = persLine.match(/Traits:\s*(.+?)\s*·\s*Reputation:\s*(.+?)(?:\s*·\s*Confidence\s+(\d+)\s*\(\d+\s*points\))?$/);
  if (pm) {
    for (const entry of splitList(pm[1] ?? "")) {
      const tm = entry.match(/^(.+?)\s+([+-]?\d+)$/);
      if (tm) ch.personality.push({ trait: tm[1]!.trim(), value: Number(tm[2]) });
      else warnings.push(`Could not parse Personality trait "${entry}"`);
    }
    const rep = pm[2]!.trim();
    ch.reputation = rep === "—" ? null : rep;
    if (pm[3]) ch.confidence = Number(pm[3]);
  } else {
    warnings.push("Could not parse the Personality/Reputation line.");
  }

  // ── notes ────────────────────────────────────────────────────────────────
  // Freeform Markdown, so it may contain its own "## " headings — take
  // everything to end of document rather than stopping at the next one.
  const notesStart = lines.findIndex((l) => l.trim() === "## Notes & Description");
  const notes = (notesStart === -1 ? "" : lines.slice(notesStart + 1).join("\n")).trim();
  ch.notes = notes === "—" ? "" : notes;

  return { character: ch, warnings };
}
