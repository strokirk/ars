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
import { BonusXp } from "../components/BonusXp.tsx";
import { Issues } from "../components/Issues.tsx";
import { Collapsible } from "../components/ui/Collapsible.tsx";
import {
  ConceptStep, CharacteristicsStep, VirtuesStep, AbilitiesStep, PersonalityStep, ArtsSpellsStep, type StepProps,
} from "../steps.tsx";
import { stepsFor, metersFor, stepForIssue, type StepDef, type StepKey } from "../lib/wizard-steps.ts";

/** Steps whose teaching intro the viewer has closed — a per-viewer convenience. */
const WHY_KEY = "ars.whyHidden";
const readHidden = (): string[] => { try { return JSON.parse(localStorage.getItem(WHY_KEY) ?? "[]"); } catch { return []; } };

/** Step bodies, keyed by the step definitions in lib/wizard-steps.ts. */
const BODIES: Record<StepKey, (p: StepProps) => JSX.Element> = {
  concept: ConceptStep,
  characteristics: CharacteristicsStep,
  virtues: VirtuesStep,
  abilities: AbilitiesStep,
  arts: ArtsSpellsStep,
  personality: PersonalityStep,
};

export function Wizard({ kindParam, draftId, stepKey }: { kindParam?: string; draftId?: string; stepKey?: string }) {
  const [id] = useState(() => draftId ?? newId());
  const [ch, setCh] = useState<Character>(() => {
    if (draftId) { const d = getDraft(draftId); if (d) return d.character; }
    const kind = (["grog", "companion", "magus"] as const).includes(kindParam as CharacterKind) ? (kindParam as CharacterKind) : "grog";
    return freshCharacter(kind).character;
  });
  const [step, setStep] = useState(() => Math.max(0, stepsFor(charKind(ch)).findIndex((s) => s.key === stepKey)));

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
  const dismiss = (code: string, on: boolean) => {
    const set = new Set(ch.dismissed ?? []);
    if (on) set.add(code); else set.delete(code);
    update([{ op: "meta", fields: { dismissed: [...set] } }]);
  };
  const [whyHidden, setWhyHidden] = useState(readHidden);
  const toggleWhy = (key: string) => {
    const next = whyHidden.includes(key) ? whyHidden.filter((k) => k !== key) : [...whyHidden, key];
    setWhyHidden(next);
    try { localStorage.setItem(WHY_KEY, JSON.stringify(next)); } catch { /* storage blocked: session-only */ }
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
    const live = issues.filter((i) => !i.dismissed && i.level !== "info");
    const flagged = live.some((i) => VIOLATION_CODES.has(i.code) && (s.budgets as string[]).includes(i.budget));
    if (flagged) return "flagged";
    if (s.budgets.length && s.budgets.every((bk) => !live.some((i) => i.budget === bk))) return "done";
    return "";
  };

  const warnCount = (s: StepDef) =>
    issues.filter((i) => !i.dismissed && i.level === "warning" && stepForIssue(steps, i) === s.key).length;

  const Body = BODIES[cur.key];
  const stepIssues = issues.filter((i) => (cur.budgets as string[]).includes(i.budget));
  const warnings = stepIssues.filter((i) => i.level === "warning");
  const liveWarnings = warnings.filter((i) => !i.dismissed).length;
  const goTo = (i: { code: string; budget: string }) => {
    const n = steps.findIndex((s) => s.key === stepForIssue(steps, i));
    return n >= 0 && n !== step ? () => { setStep(n); scrollTo(0, 0); } : undefined;
  };

  return (
    <div>
      <div class="steps">
        {steps.map((s, i) => (
          <button class={`step-pip ${i === step ? "active" : stepStatus(s)}`} key={s.key} onClick={() => setStep(i)}>
            {i + 1}. {s.label}
            {warnCount(s) > 0 && <span class="pip-count" title="warnings">{warnCount(s)}</span>}
          </button>
        ))}
      </div>

      <BudgetBar meters={metersFor(cur, b)} bonus={(m) => m.pool && <BonusXp ch={ch} update={update} pool={m.pool} cap={m.cap} />}>
        <Button disabled={step === 0} onClick={() => { setStep(step - 1); scrollTo(0, 0); }}>← Back</Button>
        {step < steps.length - 1
          ? <Button variant="brand" appearance="accent" onClick={() => { setStep(step + 1); scrollTo(0, 0); }}>Next →</Button>
          : <Button onClick={() => navigate("/")}>Done</Button>}
      </BudgetBar>

      <div class="title-row">
        <h2 style="color:var(--accent); margin:.3rem 0 .2rem;">
          {KIND_LABEL[kind]} · {cur.label}
          {cur.why && whyHidden.includes(cur.key) && (
            <Button size="small" appearance="plain" class="why-show" title="Show the step intro" onClick={() => toggleWhy(cur.key)}>?</Button>
          )}
        </h2>
        <Button size="small" onClick={viewSheet} title="View sheet">
          <ScrollText size={15} aria-hidden="true" /> <span class="btn-label">View sheet</span>
        </Button>
      </div>

      <div class="panel">
        {cur.why && !whyHidden.includes(cur.key) && (
          <div class="why">
            <button class="x why-x" title="Hide this intro" aria-label="Hide this intro" onClick={() => toggleWhy(cur.key)}>×</button>
            {cur.why}
          </div>
        )}
        <Issues issues={stepIssues.filter((i) => i.level !== "warning")} goTo={goTo} />
        {warnings.length > 0 && (
          <Collapsible class="step-warnings" open={false} summary={`${liveWarnings} warning${liveWarnings === 1 ? "" : "s"} on this step`}>
            <Issues issues={warnings} onDismiss={dismiss} goTo={goTo} />
          </Collapsible>
        )}
        {Body && <Body ch={ch} update={update} reseed={kind === "magus" ? reseed : undefined} />}
      </div>
    </div>
  );
}
