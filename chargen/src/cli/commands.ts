// Command handlers. Every state change flows through ONE path: build an Op[] and
// hand it to applyOps() (domain/operations.ts), which validates and reports
// uniformly. `build` (whole character in one call) and `apply` (a stage's ops)
// are the LLM-friendly bulk entry points; `add`/`set`/`remove`/`notes` are thin
// single-op sugar over the same core. Read-only commands (`status`, `options`,
// `check`, `schema`) and `export` round out the surface.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { type Flags, flagBool, flagNum, flagStr } from "./args.ts";
import type { RulesData } from "../data/rules.ts";
import { loadCharacter, saveCharacter, characterExists } from "./persist.ts";
import { renderIssues, renderStatus, renderBatch } from "./render.ts";
import { renderSheet, kebab } from "./sheet.ts";
import { renderSheetHtml } from "./sheet-html.ts";
import { createMagus } from "../domain/create.ts";
import { computeBudgets } from "../domain/budgets.ts";
import { validate, isLegal } from "../domain/validate.ts";
import { nextGuidance } from "../domain/guidance.ts";
import { type Op, applyOps } from "../domain/operations.ts";
import type { MetaFields } from "../domain/mutations.ts";
import { specToBuild, type BuildSpec } from "./spec.ts";
import { abilityAllowed } from "../domain/ability-policy.ts";
import { deriveModifiers } from "../domain/modifiers.ts";
import { spellLabTotal } from "../domain/labtotal.ts";
import { type Form, type Stage, type Technique } from "../domain/glossary.ts";
import { newCharacter } from "../domain/character.ts";
import {
  CHARACTERISTICS, CHARACTERISTIC_NAMES, FORMS, HOUSES, TECHNIQUES, XP_STAGES,
} from "../domain/glossary.ts";

export interface Ctx {
  positionals: string[];
  flags: Flags;
  charPath: string;
  rules: RulesData;
  json: boolean;
}

const out = (ctx: Ctx, text: string, data: unknown) =>
  console.log(ctx.json ? JSON.stringify(data, null, 2) : text);
const fail = (ctx: Ctx, message: string): number => {
  console.error(ctx.json ? JSON.stringify({ ok: false, error: message }) : `✗ ${message}`);
  return 2;
};

function tryLoad(ctx: Ctx): ReturnType<typeof loadCharacter> | undefined {
  return characterExists(ctx.charPath) ? loadCharacter(ctx.charPath) : undefined;
}

/** Apply an op batch to the loaded character, persist when saved, render. The one
 *  exit through which add/set/remove/apply all flow. */
function runBatch(ctx: Ctx, ch: ReturnType<typeof loadCharacter>, ops: Op[]): number {
  const result = applyOps(ch, ops, ctx.rules, { force: flagBool(ctx.flags, "force") });
  if (result.saved) saveCharacter(ctx.charPath, result.character);
  const b = computeBudgets(result.character);
  out(ctx, renderBatch(result, b), {
    ok: result.ok, saved: result.saved,
    results: result.results.map((r) => ({ op: r.op, ok: r.ok, applied: r.applied, rejected: r.rejected })),
    budgets: b, issues: result.issues, legal: isLegal(result.issues),
  });
  return result.saved ? 0 : 1;
}

// ── JSON input (build/apply): inline positional, --file <path|->, or stdin ──────
function readJsonInput(ctx: Ctx): string {
  const inline = ctx.positionals.find((p) => /^\s*[[{]/.test(p));
  if (inline) return inline;
  const file = flagStr(ctx.flags, "file");
  if (file && file !== "-") return readFileSync(file, "utf8");
  if (file === "-" || !process.stdin.isTTY) return readFileSync(0, "utf8");
  throw new Error(`No input. Pass a JSON string, --file <path>, or pipe it on stdin.`);
}

// ── new ───────────────────────────────────────────────────────────────────────
export function cmdNew(ctx: Ctx): number {
  const name = ctx.positionals[0];
  if (!name) return fail(ctx, `Usage: chargen new <name> --house <House>`);
  const house = HOUSES.find((h) => h.toLowerCase() === (flagStr(ctx.flags, "house") ?? "").toLowerCase());
  if (!house) return fail(ctx, `--house is required, one of: ${HOUSES.join(", ")}`);
  if (characterExists(ctx.charPath) && !flagBool(ctx.flags, "force")) {
    return fail(ctx, `${ctx.charPath} already exists. Use --force to overwrite or --char <path>.`);
  }
  const technique = TECHNIQUES.find((t) => t.toLowerCase() === (flagStr(ctx.flags, "technique") ?? "").toLowerCase());
  const form = FORMS.find((f) => f.toLowerCase() === (flagStr(ctx.flags, "form") ?? "").toLowerCase());

  const { character: ch, free, notes } = createMagus({
    name, house, concept: flagStr(ctx.flags, "concept"), notes: flagStr(ctx.flags, "notes"),
    age: flagNum(ctx.flags, "age"), favoredTechnique: technique, favoredForm: form,
    focus: flagStr(ctx.flags, "focus"), puissant: flagStr(ctx.flags, "puissant"),
  }, ctx.rules);
  saveCharacter(ctx.charPath, ch);

  const text = [
    `Created ${ctx.charPath} — ${name} of House ${house}, age ${ch.age} (fresh Gauntlet).`,
    `Free (off-budget): ${free.join(" · ")}`,
    ...notes.map((n) => `  • ${n}`),
    `Next: \`chargen build\` the whole magus in one call, or \`chargen status\` to go stage by stage.`,
  ].join("\n");
  out(ctx, text, { ok: true, path: ctx.charPath, character: ch, notes });
  return 0;
}

// ── build (one-shot full character) ─────────────────────────────────────────────
export function cmdBuild(ctx: Ctx): number {
  let spec: BuildSpec;
  try { spec = JSON.parse(readJsonInput(ctx)) as BuildSpec; }
  catch (e) { return fail(ctx, `Could not parse build spec as JSON: ${(e as Error).message}`); }
  if (!spec.name) return fail(ctx, `Build spec needs a "name".`);
  const house = HOUSES.find((h) => h.toLowerCase() === String(spec.house ?? "").toLowerCase());
  if (!house) return fail(ctx, `Build spec needs a valid "house" (one of: ${HOUSES.join(", ")}).`);
  if (characterExists(ctx.charPath) && !flagBool(ctx.flags, "force")) {
    return fail(ctx, `${ctx.charPath} already exists. Use --force to overwrite or --char <path>.`);
  }

  const { opts, ops } = specToBuild({ ...spec, house });
  const created = createMagus(opts, ctx.rules);
  const result = applyOps(created.character, ops, ctx.rules, { force: flagBool(ctx.flags, "force") });
  if (result.saved) saveCharacter(ctx.charPath, result.character);

  const b = computeBudgets(result.character);
  // Optional one-call export alongside the build.
  let exportNote = "";
  const outPath = flagStr(ctx.flags, "out");
  if (result.saved && outPath) exportNote = "\n" + writeSheets(result.character, outPath, exportFormat(ctx));

  const head = [
    `${result.saved ? "Built" : "Build FAILED (not saved)"} — ${spec.name} of House ${house}.`,
    created.free.length ? `Free (off-budget): ${created.free.join(" · ")}` : "",
    ...created.notes.map((n) => `  • ${n}`),
  ].filter(Boolean).join("\n");
  out(ctx, head + "\n" + renderBatch(result, b) + exportNote, {
    ok: result.ok, saved: result.saved, path: ctx.charPath,
    free: created.free, houseNotes: created.notes,
    results: result.results.map((r) => ({ op: r.op, ok: r.ok, applied: r.applied, rejected: r.rejected })),
    budgets: b, issues: result.issues, legal: isLegal(result.issues), character: result.character,
  });
  return result.saved ? 0 : 1;
}

// ── apply (a batch of ops to an existing character) ─────────────────────────────
export function cmdApply(ctx: Ctx): number {
  const ch = loadCharacter(ctx.charPath);
  let ops: Op[];
  try {
    const parsed = JSON.parse(readJsonInput(ctx));
    ops = Array.isArray(parsed) ? parsed : (parsed.ops as Op[]);
  } catch (e) { return fail(ctx, `Could not parse ops as JSON: ${(e as Error).message}`); }
  if (!Array.isArray(ops)) return fail(ctx, `Expected a JSON array of ops (or { "ops": [...] }). See \`chargen schema\`.`);
  return runBatch(ctx, ch, ops);
}

// ── status ──────────────────────────────────────────────────────────────────────
export function cmdStatus(ctx: Ctx): number {
  const ch = loadCharacter(ctx.charPath);
  const b = computeBudgets(ch);
  const issues = validate(ch);
  const guidance = nextGuidance(ch, b);
  out(ctx, renderStatus(ch, b, issues, guidance), { budgets: b, issues, guidance, legal: isLegal(issues) });
  return 0;
}

// ── options ───────────────────────────────────────────────────────────────────
function sample<T>(arr: T[], n: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a.slice(0, Math.max(0, n));
}

export function cmdOptions(ctx: Ctx): number {
  const what = (ctx.positionals[0] ?? "").toLowerCase();
  const random = flagNum(ctx.flags, "random");
  const describe = flagStr(ctx.flags, "describe");

  if (what === "characteristics") {
    out(ctx, CHARACTERISTICS.map((c) => `${c} — ${CHARACTERISTIC_NAMES[c]}`).join("\n"), { characteristics: CHARACTERISTICS });
    return 0;
  }
  if (what === "houses") {
    out(ctx, HOUSES.join("\n"), { houses: HOUSES });
    return 0;
  }
  if (what === "virtues" || what === "flaws") {
    const kind = what === "virtues" ? "Virtue" : "Flaw";
    if (describe) {
      const row = ctx.rules.virtueFlawRow(describe) ?? (() => { const r = ctx.rules.resolveTrait(describe); return r.ok ? r.trait.row : undefined; })();
      if (!row) return fail(ctx, `No Virtue/Flaw named "${describe}".`);
      out(ctx, `${row.name} (${row.size}, ${row.category})\n${row.description}`, { row });
      return 0;
    }
    const rows = ctx.rules.filterVirtuesFlaws({
      kind, category: flagStr(ctx.flags, "category"),
      size: flagStr(ctx.flags, "size") as "Minor" | "Major" | undefined,
      search: flagStr(ctx.flags, "search"),
    });
    if (random !== undefined) {
      const picks = sample(rows, random);
      const text = [`${picks.length} random suggestion${picks.length === 1 ? "" : "s"} (of ${rows.length} matching):`,
        ...picks.map((r) => `• ${r.name} (${r.size}, ${r.category}) — ${firstSentence(r.description)}`)].join("\n");
      out(ctx, text, { count: rows.length, suggestions: picks });
      return 0;
    }
    const text = [`NAME${" ".repeat(28)}SIZE   CATEGORY      pts`,
      ...rows.map((r) => `${r.name.padEnd(32).slice(0, 32)}${r.size.padEnd(7)}${r.category.padEnd(14)}${pts(r.size)}`)].join("\n") + `\n(${rows.length} rows; --describe <name> for full text, --random N for suggestions)`;
    out(ctx, text, { count: rows.length, rows });
    return 0;
  }
  if (what === "abilities") {
    if (describe) {
      const row = ctx.rules.ability(describe);
      if (!row) return fail(ctx, `No Ability named "${describe}".`);
      out(ctx, `${row.name} (${row.type ?? "—"}${row.restricted ? ", needs enabling Virtue" : ""})${row.specialties ? `\nSpecialties: ${row.specialties}` : ""}\n${row.description}`, { row });
      return 0;
    }
    let rows = ctx.rules.filterAbilities({ type: flagStr(ctx.flags, "type"), search: flagStr(ctx.flags, "search") });
    const stage = flagStr(ctx.flags, "stage") as Stage | undefined;
    let stageNote = "";
    if (stage) {
      const ch = tryLoad(ctx) ?? newCharacter({ name: "_", house: "Bonisagus" });
      rows = rows.filter((a) => abilityAllowed(ch, a.type, stage).allowed);
      stageNote = `, legal in ${stage}`;
    }
    const chosen = random !== undefined ? sample(rows, random) : rows;
    const text = chosen.map((a) => `${(a.type ?? "?").padEnd(12)} ${a.name}${a.restricted ? " *" : ""}`).join("\n") + `\n(${rows.length} rows${random !== undefined ? `, ${chosen.length} shown` : ""}${stageNote}; * = needs an enabling Virtue; --describe <name> for full text)`;
    out(ctx, text, { count: rows.length, rows: chosen });
    return 0;
  }
  if (what === "spells") {
    if (describe) {
      const s = ctx.rules.spell(describe);
      if (!s) return fail(ctx, `No spell named "${describe}".`);
      out(ctx, `${s.name} (${s.tech_abbr}${s.form_abbr} ${s.level ?? "Gen"})${s.is_ritual ? " Ritual" : ""}\nR: ${s.range}, D: ${s.duration}, T: ${s.target}${s.requisites.length ? ` · Req: ${s.requisites.join(", ")}` : ""}\n${s.description}`, { row: s });
      return 0;
    }
    let rows = ctx.rules.filterSpells({
      technique: flagStr(ctx.flags, "tech"), form: flagStr(ctx.flags, "form"),
      maxLevel: flagNum(ctx.flags, "max-level"), range: flagStr(ctx.flags, "range"),
      isGeneral: false, search: flagStr(ctx.flags, "search"),
    }).sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
    let learnNote = "";
    const ch = tryLoad(ctx);
    if (flagBool(ctx.flags, "learnable")) {
      if (!ch) return fail(ctx, `--learnable needs a character (run \`chargen new\` first, or pass --char <path>).`);
      const mods = deriveModifiers(ch);
      rows = rows.filter((s) => s.level !== null && s.level <= spellLabTotal(ch, mods, { technique: s.technique as Technique, form: s.form as Form, requisites: s.requisites }).total);
      learnNote = ", within your Lab Total";
    }
    const chosen = random !== undefined ? sample(rows, random) : rows;
    const ltOf = (s: typeof rows[number]) => ch ? spellLabTotal(ch, deriveModifiers(ch), { technique: s.technique as Technique, form: s.form as Form, requisites: s.requisites }).total : undefined;
    const text = [`LEVEL  NAME${" ".repeat(34)}R / D / T`,
      ...chosen.map((s) => {
        const lt = ltOf(s);
        const mark = lt !== undefined && s.level !== null ? (s.level <= lt ? " ✓" : " ✗") : "";
        return `${String(s.level ?? "Gen").padEnd(6)} ${s.name.padEnd(38).slice(0, 38)}${s.range}/${s.duration}/${s.target}${mark}`;
      })].join("\n") + `\n(${rows.length} spells${random !== undefined ? `, ${chosen.length} shown` : ""}${learnNote}${ch ? "; ✓/✗ = within/over your Lab Total" : ""}; --describe <name> for full text)`;
    out(ctx, text, { count: rows.length, rows: chosen });
    return 0;
  }
  return fail(ctx, `Unknown options target "${what}". Try: virtues | flaws | abilities | spells | characteristics | houses`);
}

// ── set (single-op sugar) ───────────────────────────────────────────────────────
export function cmdSet(ctx: Ctx): number {
  const what = (ctx.positionals[0] ?? "").toLowerCase();
  const ch = loadCharacter(ctx.charPath);
  const rest = ctx.positionals.slice(1);
  const meta = (fields: MetaFields): number => runBatch(ctx, ch, [{ op: "meta", fields }]);

  switch (what) {
    case "char": case "characteristic": {
      const [c, v] = rest;
      const value = Number(v);
      if (!c || !Number.isInteger(value)) return fail(ctx, `Usage: chargen set char <${CHARACTERISTICS.join("|")}> <value −3..+3>`);
      return runBatch(ctx, ch, [{ op: "char", name: c, value }]);
    }
    case "art": {
      const [a, s] = rest;
      const score = Number(s);
      if (!a || !Number.isInteger(score)) return fail(ctx, `Usage: chargen set art <Art> <score>`);
      return runBatch(ctx, ch, [{ op: "art", name: a, score }]);
    }
    case "native-language": {
      const lang = rest.join(" ");
      if (!lang) return fail(ctx, `Usage: chargen set native-language <language>`);
      return runBatch(ctx, ch, [{ op: "native-language", value: lang }]);
    }
    case "concept": return rest.length ? meta({ concept: rest.join(" ") }) : fail(ctx, `Usage: chargen set concept "<text>"`);
    case "focus": return meta({ focus: rest.join(" ") });
    case "technique": case "favored-technique": return meta({ favoredTechnique: rest[0] });
    case "form": case "favored-form": return meta({ favoredForm: rest[0] });
    case "reputation": return meta({ reputation: rest.join(" ") || null });
    case "age": return Number.isInteger(Number(rest[0])) ? meta({ age: Number(rest[0]) }) : fail(ctx, `Usage: chargen set age <n>`);
    case "later-life-years": return Number.isInteger(Number(rest[0])) ? meta({ laterLifeYears: Number(rest[0]) }) : fail(ctx, `Usage: chargen set later-life-years <n>`);
    case "confidence": return Number.isInteger(Number(rest[0])) ? meta({ confidence: Number(rest[0]) }) : fail(ctx, `Usage: chargen set confidence <n>`);
    default:
      return fail(ctx, `Unknown set target "${what}". Try: char | art | native-language | concept | focus | age | later-life-years | confidence | reputation`);
  }
}

// ── add (single-op sugar) ───────────────────────────────────────────────────────
export function cmdAdd(ctx: Ctx): number {
  const what = (ctx.positionals[0] ?? "").toLowerCase();
  const ch = loadCharacter(ctx.charPath);

  if (what === "virtue" || what === "flaw") {
    const name = ctx.positionals[1];
    if (!name) return fail(ctx, `Usage: chargen add ${what} <name> [--param X] [--size Minor|Major] [--free]`);
    return runBatch(ctx, ch, [{
      op: what, name, param: flagStr(ctx.flags, "param"),
      size: flagStr(ctx.flags, "size") as "Minor" | "Major" | undefined, free: flagBool(ctx.flags, "free"),
    }]);
  }
  if (what === "ability") {
    const name = ctx.positionals[1];
    const score = Number(ctx.positionals[2]);
    if (!name || !Number.isInteger(score)) return fail(ctx, `Usage: chargen add ability <name> <score> --stage childhood|later-life|apprenticeship [--specialty X]`);
    const stage = flagStr(ctx.flags, "stage");
    if (!stage) return fail(ctx, `--stage is required: childhood | later-life | apprenticeship`);
    return runBatch(ctx, ch, [{ op: "ability", name, score, stage, specialty: flagStr(ctx.flags, "specialty"), type: flagStr(ctx.flags, "type") }]);
  }
  if (what === "spell") {
    const name = ctx.positionals.slice(1).join(" ");
    if (!name) return fail(ctx, `Usage: chargen add spell <name> [--aura N] [--focus]`);
    return runBatch(ctx, ch, [{ op: "spell", name, aura: flagNum(ctx.flags, "aura"), focus: flagBool(ctx.flags, "focus") }]);
  }
  if (what === "personality") {
    const trait = ctx.positionals[1];
    const value = Number(ctx.positionals[2]);
    if (!trait || !Number.isInteger(value)) return fail(ctx, `Usage: chargen add personality <trait> <value>  (value −3..+3)`);
    return runBatch(ctx, ch, [{ op: "personality", trait, value }]);
  }
  return fail(ctx, `Unknown add target "${what}". Try: virtue | flaw | ability | spell | personality`);
}

// ── remove (single-op sugar) ────────────────────────────────────────────────────
export function cmdRemove(ctx: Ctx): number {
  const what = (ctx.positionals[0] ?? "").toLowerCase();
  const name = ctx.positionals.slice(1).join(" ");
  const ch = loadCharacter(ctx.charPath);
  if (!["virtue", "flaw", "ability", "spell"].includes(what)) {
    return fail(ctx, `Unknown remove target "${what}". Try: virtue | flaw | ability | spell`);
  }
  if (!name) return fail(ctx, `Usage: chargen remove ${what} <name>`);
  return runBatch(ctx, ch, [{ op: "remove", kind: what as "virtue" | "flaw" | "ability" | "spell", name }]);
}

// ── notes ───────────────────────────────────────────────────────────────────────
export function cmdNotes(ctx: Ctx): number {
  const ch = loadCharacter(ctx.charPath);
  const file = flagStr(ctx.flags, "file");
  const append = flagStr(ctx.flags, "append");
  const set = flagStr(ctx.flags, "set") ?? (file ? undefined : ctx.positionals.join(" "));
  let value = append ?? set;
  if (file) value = file === "-" ? readFileSync(0, "utf8") : readFileSync(file, "utf8");
  if (value === undefined || value === "") return fail(ctx, `Usage: chargen notes --set "<markdown>" | --append "<markdown>" | --file <path|->`);
  return runBatch(ctx, ch, [{ op: "notes", value, mode: append !== undefined ? "append" : "set" }]);
}

// ── check ─────────────────────────────────────────────────────────────────────
export function cmdCheck(ctx: Ctx): number {
  const ch = loadCharacter(ctx.charPath);
  const issues = validate(ch);
  out(ctx, renderIssues(issues), { legal: isLegal(issues), issues });
  return isLegal(issues) ? 0 : 1;
}

// ── export ────────────────────────────────────────────────────────────────────
type Format = "md" | "html" | "both";
function exportFormat(ctx: Ctx): Format {
  const f = (flagStr(ctx.flags, "format") ?? (flagBool(ctx.flags, "html") ? "html" : "md")).toLowerCase();
  return (f === "html" || f === "both") ? f : "md";
}
function writeFile(path: string, content: string): string {
  const dir = dirname(path);
  if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, content, "utf8");
  return `Wrote ${path}`;
}
/** Write the requested sheet format(s) next to `outPath` (swapping extension). */
function writeSheets(ch: ReturnType<typeof loadCharacter>, outPath: string, format: Format): string {
  const base = outPath.replace(/\.(md|markdown|html?)$/i, "");
  const done: string[] = [];
  if (format === "md" || format === "both") done.push(writeFile(/\.(md|markdown)$/i.test(outPath) ? outPath : `${base}.md`, renderSheet(ch)));
  if (format === "html" || format === "both") done.push(writeFile(/\.html?$/i.test(outPath) ? outPath : `${base}.html`, renderSheetHtml(ch)));
  return done.join("\n");
}

export function cmdExport(ctx: Ctx): number {
  const ch = loadCharacter(ctx.charPath);
  if (ctx.json) { console.log(JSON.stringify(ch, null, 2)); return 0; }
  const format = exportFormat(ctx);
  const outPath = flagStr(ctx.flags, "out");
  if (outPath) { console.log(writeSheets(ch, outPath, format)); return 0; }
  if (format === "both") return fail(ctx, `--format both needs --out <path> (writes <path>.md and <path>.html).`);
  console.log(format === "html" ? renderSheetHtml(ch) : renderSheet(ch));
  if (format === "md") console.log(`\n(Tip: \`chargen export --out characters/${kebab(ch.name)}.md\`, or --format html|both.)`);
  return 0;
}

// ── schema (one call: teach an agent the whole op/spec vocabulary) ──────────────
export function cmdSchema(ctx: Ctx): number {
  const schema = {
    enums: {
      houses: HOUSES, techniques: TECHNIQUES, forms: FORMS,
      characteristics: CHARACTERISTICS, stages: XP_STAGES,
    },
    buildSpec: {
      _: "Pass to `chargen build` (JSON via arg, --file, or stdin) to create + validate a whole magus in one call.",
      name: "string (required)", house: "House (required)",
      concept: "string", notes: "markdown string (fluff/goals/interpretation)",
      age: "int ≥25 (default 25)", favoredTechnique: "Technique", favoredForm: "Form",
      focus: "string", puissant: "House Puissant choice (Bonisagus/Flambeau/Mercere)",
      laterLifeYears: "int (default 5; ×15 xp)", confidence: "int", reputation: "string|null",
      characteristics: "{ Int: 3, Sta: 1, ... }  (net 7 pts)",
      virtues: '[ "Affinity with Ignem", { "name":"Magical Focus","param":"fire","size":"Minor" } ]',
      flaws: '[ "Necessary Condition" ]   (≥1 Hermetic; V pts = F pts; ≤10 F pts)',
      nativeLanguage: "string vernacular (never Latin; = score 5)",
      abilities: '[ { "name":"Magic Theory","score":3,"stage":"apprenticeship","specialty":"..." } ]',
      arts: "{ Ignem: 10, Creo: 6 }",
      spells: '[ "Pilum of Fire", { "name":"...","aura":5,"focus":true } ]   (each level ≤ its Lab Total)',
      personality: '[ { "trait":"Brave","value":3 } ]',
    },
    ops: {
      _: "Pass an array to `chargen apply` (JSON via arg, --file, or stdin) to edit an existing character. Rejected ops are reported together; nothing saves unless all apply.",
      examples: [
        { op: "chars", values: { Int: 3, Sta: 1, Per: 1, Str: -1 } },
        { op: "char", name: "Int", value: 3 },
        { op: "virtue", name: "Affinity with Ignem" },
        { op: "virtue", name: "Magical Focus", param: "fire", size: "Minor", free: false },
        { op: "flaw", name: "Necessary Condition" },
        { op: "ability", name: "Magic Theory", score: 3, stage: "apprenticeship", specialty: "spells" },
        { op: "arts", values: { Ignem: 10, Creo: 6 } },
        { op: "art", name: "Rego", score: 4 },
        { op: "spell", name: "Pilum of Fire", aura: 3, focus: false },
        { op: "personality", trait: "Brave", value: 3 },
        { op: "native-language", value: "German" },
        { op: "notes", value: "## Goals\n...", mode: "append" },
        { op: "meta", fields: { concept: "...", age: 30, confidence: 2 } },
        { op: "remove", kind: "spell", name: "Pilum of Fire" },
      ],
    },
  };
  if (ctx.json) { console.log(JSON.stringify(schema, null, 2)); return 0; }
  console.log(`chargen op/spec schema — give the whole magus to \`build\`, or stage-batches to \`apply\`.

ENUMS
  houses:          ${HOUSES.join(", ")}
  techniques:      ${TECHNIQUES.join(", ")}
  forms:           ${FORMS.join(", ")}
  characteristics: ${CHARACTERISTICS.join(", ")}
  stages:          ${XP_STAGES.join(", ")}

BUILD SPEC (chargen build '<json>')  — creates + validates a magus in ONE call:
${JSON.stringify(schema.buildSpec, null, 2)}

OPS (chargen apply '<json-array>')  — edit an existing character:
${JSON.stringify(schema.ops.examples, null, 2)}

Run \`chargen schema --json\` for the machine-readable form.`);
  return 0;
}

// ── helpers ─────────────────────────────────────────────────────────────────────
function pts(size: string): string {
  return size === "Major" ? "3" : size === "Minor" ? "1" : size === "Major or Minor" ? "1/3" : "0";
}
function firstSentence(s: string): string {
  const m = s.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : s).trim().slice(0, 160);
}
