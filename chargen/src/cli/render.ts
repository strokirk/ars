// Human-readable formatting for the terminal. Every command also supports --json
// (handled in the command handlers); these helpers cover the text mode.
import type { Character } from "../domain/character.ts";
import type { Budgets } from "../domain/budgets.ts";
import type { Issue } from "../domain/validate.ts";
import type { Guidance } from "../domain/guidance.ts";
import type { MutationResult } from "../domain/mutations.ts";
import type { BatchResult } from "../domain/operations.ts";
import { VIOLATION_CODES } from "../domain/validate.ts";
import { opSummary } from "../domain/operations.ts";
import { stageStates } from "../domain/guidance.ts";

const RULE = "──────────────────────────────────────────────────────────────────";
const icon = (done: boolean, hasError: boolean) => (done ? "✓" : hasError ? "⚠" : "▢");

function budgetIcons(ch: Character, b: Budgets, issues: Issue[]) {
  const states = stageStates(ch, b);
  // ⚠ only for active violations (overspend / illegal); plain incomplete stays ▢.
  const violated = (key: string) => issues.some((i) => i.budget === key && VIOLATION_CODES.has(i.code));
  return {
    characteristics: icon(states[0]!.done, violated("characteristics")),
    vf: icon(states[1]!.done, violated("virtues-flaws")),
    childhood: icon(states[2]!.done, violated("childhood")),
    laterLife: icon(states[3]!.done, violated("later-life")),
    apprenticeship: icon(states[4]!.done, violated("apprenticeship")),
  };
}

export function renderStatus(ch: Character, b: Budgets, issues: Issue[], guidance: Guidance[]): string {
  const ic = budgetIcons(ch, b, issues);
  const vf = b.virtuesFlaws;
  const eq = vf.balanced ? "=" : "≠";
  const lines: string[] = [];
  const spec = [ch.favoredTechnique, ch.favoredForm].filter(Boolean).join(" ");
  lines.push(`${ch.name} of House ${ch.house} · age ${ch.age}${spec ? ` · ${spec}` : ""}${ch.focus ? `, focus: ${ch.focus}` : ""}`);
  if (ch.concept) lines.push(`“${ch.concept}”`);
  lines.push(`── Budgets ${RULE.slice(0, 56)}`);
  lines.push(`${ic.characteristics} Characteristics   ${b.characteristics.spent} / ${b.characteristics.cap} pts`);
  lines.push(`${ic.vf} Virtues/Flaws     V ${vf.virtuePoints} ${eq} F ${vf.flawPoints}   (≤10 Flaw pts · ${vf.minorFlaws}/5 Minor · ${vf.hermeticFlaws} Hermetic Flaw)`);
  lines.push(`${ic.childhood} Childhood xp      ${b.childhood.spent} / ${b.childhood.cap}   (Native Language: ${ch.nativeLanguage ?? "not set"})`);
  lines.push(`${ic.laterLife} Later life xp     ${b.laterLife.spent} / ${b.laterLife.cap}   (${b.laterLife.years} yrs × 15)`);
  lines.push(`${ic.apprenticeship} Apprenticeship    ${b.apprenticeship.spent} / ${b.apprenticeship.cap} xp   ·   spells ${b.apprenticeship.spells.spent} / ${b.apprenticeship.spells.cap} lvls`);
  lines.push(`  (icons lead each line: ▢ open · ⚠ needs attention · ✓ complete & legal)`);

  if (guidance.length > 0) {
    lines.push(`── What to do next ${RULE.slice(0, 48)}`);
    for (const g of guidance) {
      lines.push(`→ STAGE ${g.stage} — ${g.headline}. ${g.reason}`);
      lines.push(`    try: ${g.hint}`);
    }
  } else {
    lines.push(`✓ All five budgets are complete. Run \`chargen check\`, then \`chargen export\`.`);
  }
  const errs = issues.filter((i) => i.level === "error").length;
  if (errs > 0) lines.push(`Blocking for \`check\`: ${errs} item${errs === 1 ? "" : "s"} (run \`chargen check\`).`);
  return lines.join("\n");
}

export function renderIssues(issues: Issue[]): string {
  if (issues.length === 0) return "LEGAL ✓ — no problems found.";
  const errs = issues.filter((i) => i.level === "error");
  const warns = issues.filter((i) => i.level === "warning");
  const lines: string[] = [];
  for (const e of errs) lines.push(`✗ [${e.budget}] ${e.message}`);
  for (const w of warns) lines.push(`⚠ [${w.budget}] ${w.message}`);
  lines.push("");
  lines.push(errs.length === 0 ? "LEGAL ✓ — ready to export." : `ILLEGAL ✗ — ${errs.length} error${errs.length === 1 ? "" : "s"} to fix.`);
  return lines.join("\n");
}

/** One-line, five-budget ledger used after batch/granular mutations. */
export function compactLedger(b: Budgets): string {
  const vf = b.virtuesFlaws;
  return [
    `Char ${b.characteristics.spent}/${b.characteristics.cap}`,
    `V/F ${vf.virtuePoints}${vf.balanced ? "=" : "≠"}${vf.flawPoints}`,
    `Childhood ${b.childhood.spent}/${b.childhood.cap}`,
    `Later ${b.laterLife.spent}/${b.laterLife.cap}`,
    `Appr ${b.apprenticeship.spent}/${b.apprenticeship.cap}`,
    `Spells ${b.apprenticeship.spells.spent}/${b.apprenticeship.spells.cap}`,
  ].join(" · ");
}

/** Render a batch result: a ✓/✗ line per op, the ledger, then save status. */
export function renderBatch(result: BatchResult, b: Budgets): string {
  const lines: string[] = [];
  for (const r of result.results) {
    if (r.ok) lines.push(`✓ ${r.applied ?? opSummary(r.op)}`);
    else lines.push(`✗ ${opSummary(r.op)} — ${r.rejected}`);
  }
  lines.push("── " + compactLedger(b));
  const blocking = result.issues.filter((i) => i.level === "error" && VIOLATION_CODES.has(i.code));
  for (const v of blocking) lines.push(`⚠ ${v.message}`);
  if (result.saved) {
    const errs = result.issues.filter((i) => i.level === "error").length;
    lines.push(errs === 0 ? `✓ saved · LEGAL — ready to export.` : `✓ saved · ${errs} item${errs === 1 ? "" : "s"} still open (run \`chargen check\`).`);
  } else {
    const rejected = result.results.filter((r) => !r.ok).length;
    lines.push(rejected > 0
      ? `✗ NOT SAVED — ${rejected} op${rejected === 1 ? "" : "s"} rejected above; fix and resubmit.`
      : `✗ NOT SAVED — cap violation; pass --force to override.`);
  }
  return lines.join("\n");
}

export function renderMutation(result: MutationResult): string {
  if (!result.ok) return `✗ REJECTED: ${result.rejected}`;
  const lines: string[] = [];
  if (result.applied) lines.push(result.applied);
  if (result.forced) lines.push(`  ⚠ applied with --force despite a cap violation.`);
  return lines.join("\n");
}
