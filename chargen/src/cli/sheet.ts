// Renders the finished character to the Markdown sheet from skills/magus-creation
// (the "Output template" section), so exports match what the skill prescribes.
import { type Character, charKind } from "../domain/character.ts";
import { type Budgets, computeBudgets } from "../domain/budgets.ts";
import { confidenceScore } from "../domain/modifiers.ts";
import { CHARACTERISTICS, FORMS, TECHNIQUES, ART_ABBR } from "../domain/glossary.ts";

export function kebab(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "magus";
}

/** "Marcus" + Flambeau → "Marcus of House Flambeau"; but if the name already
 *  carries its House ("Corvus of Tytalus", "Corvus ex Tytalus"), don't repeat it.
 *  Grogs/companions have no House, so the bare name is returned. */
export function magusTitle(ch: Character): string {
  if (!ch.house) return ch.name;
  return ch.name.toLowerCase().includes(ch.house.toLowerCase()) ? ch.name : `${ch.name} of House ${ch.house}`;
}

export function renderSheet(ch: Character, b: Budgets = computeBudgets(ch)): string {
  const L: string[] = [];
  const magus = charKind(ch) === "magus";
  const spec = [ch.favoredTechnique, ch.favoredForm].filter(Boolean).join(" ");
  L.push(`# ${magusTitle(ch)}`, "");
  L.push(`**Concept:** ${ch.concept || "—"} · **Age:** ${ch.age}${magus ? " (fresh Gauntlet unless noted)" : ""}`);
  L.push(`**Specialty:** ${[spec, ch.focus ? `focus: ${ch.focus}` : ""].filter(Boolean).join(" / ") || "—"}`, "");

  L.push("## Characteristics");
  L.push(CHARACTERISTICS.map((c) => `${c} ${fmt(ch.characteristics[c] ?? 0)}`).join(", ") + `   (spent: ${b.characteristics.spent})`, "");

  L.push("## Virtues & Flaws");
  const free = ch.virtues.filter((v) => v.free);
  const vir = ch.virtues.filter((v) => !v.free);
  const flw = ch.flaws.filter((f) => !f.free);
  L.push(`- Free: ${free.map((v) => v.display).join("; ") || "—"}`);
  L.push(`- Virtues (${b.virtuesFlaws.virtuePoints} pts): ${vir.map((v) => `${v.display} (${v.size})`).join("; ") || "—"}`);
  L.push(`- Flaws (${b.virtuesFlaws.flawPoints} pts): ${flw.map((f) => `${f.display} (${f.size})`).join("; ") || "—"}   ← Virtue pts ${b.virtuesFlaws.balanced ? "=" : "≠"} Flaw pts`, "");

  L.push("## Abilities");
  if (ch.nativeLanguage) L.push(`Native Language: ${ch.nativeLanguage} 5`);
  const abil = ch.abilities.filter((a) => a.stage !== "free");
  const freeAb = ch.abilities.filter((a) => a.stage === "free");
  L.push(abil.map((a) => `${a.name} ${a.score}${a.specialty ? ` (${a.specialty})` : ""}`).join(", ") || "—");
  if (freeAb.length) L.push(`Granted: ${freeAb.map((a) => `${a.name} ${a.score}`).join(", ")}`);
  L.push(`(xp: childhood ${b.childhood.spent}/${b.childhood.cap} · later life ${b.laterLife.spent}/${b.laterLife.cap}${magus ? ` · apprenticeship ${b.apprenticeship.spent}/${b.apprenticeship.cap}` : ""})`, "");

  if (magus) {
    L.push("## Arts");
    const tech = TECHNIQUES.map((t) => `${ART_ABBR[t]} ${ch.arts[t] ?? 0}`).join(" ");
    const form = FORMS.map((f) => `${ART_ABBR[f]} ${ch.arts[f] ?? 0}`).join(" ");
    L.push(`${tech} | ${form}`, "");

    L.push(`## Spells Known  (total levels: ${b.apprenticeship.spells.spent})`);
    if (ch.spells.length === 0) L.push("—");
    else for (const s of ch.spells) L.push(`- ${s.name} (${ART_ABBR[s.technique]}${ART_ABBR[s.form]} ${s.level})`);
    L.push("");
  }

  const hasConfidence = charKind(ch) !== "grog";
  L.push(`## Personality / Reputation${hasConfidence ? " / Confidence" : ""}`);
  const traits = ch.personality.map((p) => `${p.trait} ${fmt(p.value)}`).join(", ") || "—";
  const conf = confidenceScore(ch);
  L.push(`Traits: ${traits} · Reputation: ${ch.reputation ?? "—"}${hasConfidence ? ` · Confidence ${conf.score} (${conf.points} points)` : ""}`, "");

  L.push("## Notes & Description");
  L.push(ch.notes?.trim() ? ch.notes.trim() : "—", "");
  return L.join("\n");
}

function fmt(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}
