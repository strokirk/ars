import type { JSX } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { navigate } from "../router.ts";
import { getDraft, saveDraft, newId } from "../store.ts";
import {
  apply, reseedMagus, budgetsOf, issuesOf, isCharacterLegal, freshCharacter, charKind,
  KIND_LABEL, type Character, type CharacterKind, type Op, type Budgets,
} from "../engine.ts";
import { BudgetBar, type Meter } from "../components/BudgetBar.tsx";
import { Issues } from "../components/Issues.tsx";
import {
  ConceptStep, CharacteristicsStep, VirtuesStep, AbilitiesStep, PersonalityStep, ArtsSpellsStep, type StepProps,
} from "../steps.tsx";

interface StepDef {
  key: string;
  label: string;
  why: string;
  budgets: string[];
  Body?: (p: StepProps) => JSX.Element;
}

function stepsFor(kind: CharacterKind): StepDef[] {
  const concept: StepDef = {
    key: "concept", label: "Concept", budgets: [], Body: ConceptStep,
    why: kind === "magus"
      ? "Start with a concept and your House — its free benefit shapes your magic. Magi finish apprenticeship at 25+."
      : `Who is this ${KIND_LABEL[kind].toLowerCase()}? ${kind === "grog" ? "Grogs can be any age — grizzled veterans or eager novices." : "Companions play best created young (under 30)."} Later-life years set your main Ability budget (×15 xp/year).`,
  };
  const characteristics: StepDef = {
    key: "characteristics", label: "Characteristics", budgets: ["characteristics"], Body: CharacteristicsStep,
    why: "Spend exactly 7 points across the eight Characteristics. Positive scores cost more the higher they go (+3 = 6 pts); negatives give points back.",
  };
  const virtues: StepDef = {
    key: "virtues", label: "Virtues & Flaws", budgets: ["virtues-flaws"], Body: VirtuesStep,
    why: kind === "grog"
      ? "Grogs are minor characters: up to 3 points of Minor Flaws, balanced by an equal number of Minor Virtues — no Major V/F, no Story Flaws, no The Gift. Everyone takes one Social Status (e.g. Covenfolk)."
      : kind === "companion"
        ? "Up to 10 points of Flaws, balanced by an equal number of points of Virtues. Take one Social Status. Hermetic Virtues/Flaws need The Gift. A Major Personality or Story Flaw tells the troupe what stories you want."
        : "Up to 10 points of Flaws balanced by Virtues. The Gift, Hermetic Magus, and your House benefit are free. Take at least one Hermetic Flaw; at most one Major Hermetic Virtue.",
  };
  const abilities: StepDef = {
    key: "abilities", label: "Abilities",
    budgets: kind === "magus" ? ["childhood", "later-life", "apprenticeship"] : ["childhood", "later-life"],
    Body: AbilitiesStep,
    why: "Set a Native Language (free, score 5), spend 45 xp on childhood skills, then your later-life xp. Your age caps the maximum score of any Ability.",
  };
  const arts: StepDef = {
    key: "arts", label: "Arts & Spells", budgets: ["apprenticeship"], Body: ArtsSpellsStep,
    why: "Apprenticeship gives 240 xp for Arts + Abilities (Parma Magica, Magic Theory, Latin are mandatory) and 120 levels of spells. A spell's level can't exceed its Lab Total.",
  };
  const personality: StepDef = {
    key: "personality", label: "Personality", budgets: [], Body: PersonalityStep,
    why: kind === "grog"
      ? "Give the grog a few Personality Traits. Grogs should have a score in Loyal (warriors also in Brave) — these guide play when the character is shared."
      : "A few Personality Traits to guide roleplaying. A Personality Flaw is mirrored by a ±3 trait (±6 for a Major).",
  };
  const review: StepDef = { key: "review", label: "Review", budgets: [], why: "" };

  const mid = kind === "magus" ? [characteristics, virtues, abilities, arts] : [characteristics, virtues, abilities];
  return [concept, ...mid, personality, review];
}

function metersFor(step: StepDef, b: Budgets): Meter[] {
  const out: Meter[] = [];
  if (step.budgets.includes("characteristics")) out.push({ ...b.characteristics, label: "Characteristics" });
  if (step.budgets.includes("virtues-flaws")) {
    const vf = b.virtuesFlaws;
    out.push({ label: "Virtues/Flaws", spent: vf.flawPoints, cap: vf.cap, over: vf.flawPoints > vf.cap || !vf.balanced, full: vf.balanced && vf.flawPoints > 0, text: `V ${vf.virtuePoints} ${vf.balanced ? "=" : "≠"} F ${vf.flawPoints} (≤${vf.cap})` });
  }
  if (step.budgets.includes("childhood")) out.push({ ...b.childhood, label: "Childhood" });
  if (step.budgets.includes("later-life")) out.push({ ...b.laterLife, label: "Later life" });
  if (step.budgets.includes("apprenticeship")) {
    out.push({ ...b.apprenticeship, label: "Apprenticeship" });
    out.push({ ...b.apprenticeship.spells, label: "Spells" });
  }
  return out;
}

export function Wizard({ kindParam, draftId }: { kindParam?: string; draftId?: string }) {
  const [id] = useState(() => draftId ?? newId());
  const [ch, setCh] = useState<Character>(() => {
    if (draftId) { const d = getDraft(draftId); if (d) return d.character; }
    const kind = (["grog", "companion", "magus"] as const).includes(kindParam as CharacterKind) ? (kindParam as CharacterKind) : "grog";
    return freshCharacter(kind).character;
  });
  const [step, setStep] = useState(0);

  // Started via /new/:kind — persist and switch the URL to a stable /edit/:id.
  useEffect(() => {
    if (!draftId) { saveDraft(id, ch); navigate(`/edit/${id}`); }
    // eslint-disable-next-line
  }, []);

  const update = (ops: Op[]) => { const next = apply(ch, ops); setCh(next); saveDraft(id, next); };
  const reseed: StepProps["reseed"] = (opts) => {
    const next = reseedMagus(ch, {
      house: opts.house as Parameters<typeof reseedMagus>[1]["house"],
      favoredTechnique: opts.favoredTechnique as Parameters<typeof reseedMagus>[1]["favoredTechnique"],
      favoredForm: opts.favoredForm as Parameters<typeof reseedMagus>[1]["favoredForm"],
      puissant: opts.puissant,
    });
    setCh(next); saveDraft(id, next);
  };

  const kind = charKind(ch);
  const steps = useMemo(() => stepsFor(kind), [kind]);
  const b = budgetsOf(ch);
  const issues = issuesOf(ch);
  const legal = isCharacterLegal(ch);
  const cur = steps[Math.min(step, steps.length - 1)]!;

  const stepStatus = (s: StepDef): string => {
    const errs = issues.filter((i) => i.level === "error" && s.budgets.includes(i.budget));
    if (errs.length) return "flagged";
    if (s.budgets.length && s.budgets.every((bk) => !issues.some((i) => i.budget === bk))) return "done";
    return "";
  };

  const isReview = cur.key === "review";

  return (
    <div>
      <div class="steps">
        {steps.map((s, i) => (
          <button class={`step-pip ${i === step ? "active" : stepStatus(s)}`} key={s.key} onClick={() => setStep(i)}>
            {i + 1}. {s.label}
          </button>
        ))}
      </div>

      <h2 style="color:var(--accent); margin:.3rem 0 .2rem;">{KIND_LABEL[kind]} · {cur.label}</h2>

      <div class="panel">
        {!isReview && cur.why && <div class="why">{cur.why}</div>}
        {!isReview && cur.Body && <cur.Body ch={ch} update={update} reseed={kind === "magus" ? reseed : undefined} />}

        {isReview && (
          <div>
            {legal ? (
              <div class="why" style="border-color:var(--ok); background:#eaf3ea;"><strong style="color:var(--ok);">✓ Rules-legal.</strong> This {KIND_LABEL[kind].toLowerCase()} is ready. View the sheet to export or share it.</div>
            ) : (
              <div class="why" style="border-color:var(--err); background:#f7eae6;"><strong style="color:var(--err);">Not yet legal.</strong> Resolve the errors below — the budget meters and step tabs show where.</div>
            )}
            <Issues issues={issues} />
            <div class="navrow" style="margin-top:1rem;">
              <button class="btn btn-primary" onClick={() => { saveDraft(id, ch); navigate(`/sheet/${id}`); }}>View sheet →</button>
            </div>
          </div>
        )}
      </div>

      <div class="navrow">
        <button class="btn" disabled={step === 0} onClick={() => setStep(step - 1)}>← Back</button>
        {step < steps.length - 1
          ? <button class="btn btn-primary" onClick={() => setStep(step + 1)}>Next →</button>
          : <button class="btn" onClick={() => navigate("/")}>Done</button>}
      </div>

      {!isReview && <BudgetBar meters={metersFor(cur, b)} />}
    </div>
  );
}
