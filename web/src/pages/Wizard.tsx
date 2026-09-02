import type { JSX } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { navigate } from "../router.ts";
import { getDraft, saveDraft, newId } from "../store.ts";
import {
  apply, reseedMagus, budgetsOf, issuesOf, isCharacterLegal, freshCharacter, charKind,
  KIND_LABEL, type Character, type CharacterKind, type Op,
} from "../engine.ts";
import { BudgetBar } from "../components/BudgetBar.tsx";
import { Issues } from "../components/Issues.tsx";
import {
  ConceptStep, CharacteristicsStep, VirtuesStep, AbilitiesStep, PersonalityStep, ArtsSpellsStep, type StepProps,
} from "../steps.tsx";
import { stepsFor, metersFor, type StepDef, type StepKey } from "../lib/wizard-steps.ts";

/** Step bodies, keyed by the step definitions in lib/wizard-steps.ts. Review has none. */
const BODIES: Partial<Record<StepKey, (p: StepProps) => JSX.Element>> = {
  concept: ConceptStep,
  characteristics: CharacteristicsStep,
  virtues: VirtuesStep,
  abilities: AbilitiesStep,
  arts: ArtsSpellsStep,
  personality: PersonalityStep,
};

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
    const errs = issues.filter((i) => i.level === "error" && (s.budgets as string[]).includes(i.budget));
    if (errs.length) return "flagged";
    if (s.budgets.length && s.budgets.every((bk) => !issues.some((i) => i.budget === bk))) return "done";
    return "";
  };

  const Body = BODIES[cur.key];
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
        {!isReview && Body && <Body ch={ch} update={update} reseed={kind === "magus" ? reseed : undefined} />}

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
