import type { JSX } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { ScrollText } from "lucide-preact";
import { navigate } from "../router.ts";
import { Button } from "../components/ui/Button.tsx";
import { getDraft, saveDraft, newId } from "../store.ts";
import {
  apply, reseedMagus, budgetsOf, issuesOf, freshCharacter, charKind, VIOLATION_CODES,
  KIND_LABEL, type Character, type CharacterKind, type Op,
} from "../engine.ts";
import { BudgetBar } from "../components/BudgetBar.tsx";
import {
  ConceptStep, CharacteristicsStep, VirtuesStep, AbilitiesStep, PersonalityStep, ArtsSpellsStep, type StepProps,
} from "../steps.tsx";
import { stepsFor, metersFor, type StepDef, type StepKey } from "../lib/wizard-steps.ts";

/** Step bodies, keyed by the step definitions in lib/wizard-steps.ts. */
const BODIES: Record<StepKey, (p: StepProps) => JSX.Element> = {
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
      puissant: opts.puissant,
    });
    setCh(next); saveDraft(id, next);
  };
  const viewSheet = () => { saveDraft(id, ch); navigate(`/sheet/${id}`); };

  const kind = charKind(ch);
  const steps = useMemo(() => stepsFor(kind), [kind]);
  const b = budgetsOf(ch);
  const issues = issuesOf(ch);
  const cur = steps[Math.min(step, steps.length - 1)]!;

  // "flagged" tracks active rule violations (a cap exceeded, a kind forbidden a pick)
  // — advisory, never blocking — the same set the sheet's callout and the CLI's
  // status icons use. A step with only completeness gaps (still spending xp) never
  // flags; it just isn't "done" yet.
  const stepStatus = (s: StepDef): string => {
    const flagged = issues.some((i) => VIOLATION_CODES.has(i.code) && (s.budgets as string[]).includes(i.budget));
    if (flagged) return "flagged";
    if (s.budgets.length && s.budgets.every((bk) => !issues.some((i) => i.budget === bk))) return "done";
    return "";
  };

  const Body = BODIES[cur.key];

  return (
    <div>
      <div class="steps">
        {steps.map((s, i) => (
          <button class={`step-pip ${i === step ? "active" : stepStatus(s)}`} key={s.key} onClick={() => setStep(i)}>
            {i + 1}. {s.label}
          </button>
        ))}
      </div>

      <div class="title-row">
        <h2 style="color:var(--accent); margin:.3rem 0 .2rem;">{KIND_LABEL[kind]} · {cur.label}</h2>
        <Button size="small" onClick={viewSheet} title="View sheet">
          <ScrollText size={15} aria-hidden="true" /> <span class="btn-label">View sheet</span>
        </Button>
      </div>

      <div class="panel">
        {cur.why && <div class="why">{cur.why}</div>}
        {Body && <Body ch={ch} update={update} reseed={kind === "magus" ? reseed : undefined} />}
      </div>

      <div class="navrow">
        <Button disabled={step === 0} onClick={() => setStep(step - 1)}>← Back</Button>
        {step < steps.length - 1
          ? <Button variant="brand" appearance="accent" onClick={() => setStep(step + 1)}>Next →</Button>
          : <Button onClick={() => navigate("/")}>Done</Button>}
      </div>

      <BudgetBar meters={metersFor(cur, b)} />
    </div>
  );
}
