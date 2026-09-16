import { useEffect, useMemo, useState } from "preact/hooks";
import type { JSX } from "preact";
import { Hourglass, FlaskConical, TriangleAlert, X, Plus, CalendarDays } from "lucide-preact";
import { Button } from "../components/ui/Button.tsx";
import { Select } from "../components/ui/Select.tsx";
import { Stepper } from "../components/ui/Stepper.tsx";
import { OptionList, OptionRow } from "../components/ui/OptionList.tsx";
import { CopyBox } from "../components/ui/CopyBox.tsx";
import { roster } from "../lib/roster.ts";
import { drafts } from "../store.ts";
import { title as draftTitle } from "../charutil.ts";
import { BLANK_SUBJECT, fromCharacter, type Subject } from "../lib/subject.ts";
import {
  ACTIVITIES, CATEGORIES, CATEGORY_LABEL, CATEGORY_COLOR, totalOf, computeTotal, computeOutcome,
  type ActivityDef, type DowntimeCategory, type Outcome, type TotalResult,
} from "../lib/seasons.ts";
import { TECHNIQUES, FORMS, type Technique, type Form } from "../../../chargen/src/domain/glossary.ts";
import {
  DEMO_SEASONS, DEMO_PROJECT_BARS, DEMO_PROJECTS, DEMO_GAINS, DEMO_WARNING,
} from "../lib/downtime-demo.ts";

/**
 * The season planner — lab work, writing, study, teaching. `#/lab` is this same
 * page with the Lab category preselected; there is no separate lab tool. See
 * docs/DOWNTIME-PLAN.todo.md and data/seasons/README.md.
 *
 * Browse mode is real: totals and activity outcomes come from lib/seasons.ts,
 * which reads data/seasons/core.yaml. Plan mode (multi-season project
 * assignment) is still a later phase and stays on demo data — see PlanMode.
 */
export function Downtime({ who, category }: { who?: string; category?: "all" | "lab" }) {
  const [mode, setMode] = useState<"browse" | "plan">("browse");
  const [cat, setCat] = useState<DowntimeCategory | "all">(category === "lab" ? "lab" : "all");
  // Manual entry is the default — the planner has to work with no character at all.
  const [subjectKey, setSubjectKey] = useState(who ?? "manual");

  useEffect(() => { setCat(category === "lab" ? "lab" : "all"); }, [category]);

  const subjectOptions = [
    { value: "manual", label: "— Manual entry —" },
    ...roster.map((r) => ({ value: `r:${r.slug}`, label: r.character.name })),
    ...drafts.value.map((d) => ({ value: `d:${d.id}`, label: `${draftTitle(d.character)} (draft)` })),
  ];
  const subject = useMemo<Subject>(() => {
    if (subjectKey.startsWith("r:")) {
      const r = roster.find((x) => x.slug === subjectKey.slice(2));
      if (r) return fromCharacter(r.character);
    }
    if (subjectKey.startsWith("d:")) {
      const d = drafts.value.find((x) => x.id === subjectKey.slice(2));
      if (d) return fromCharacter(d.character);
    }
    return BLANK_SUBJECT;
  }, [subjectKey]);

  return (
    <div class="downtime">
      <div class="libhead">
        <h1>
          {cat === "lab" ? <FlaskConical size={20} aria-hidden="true" /> : <Hourglass size={20} aria-hidden="true" />}
          {" "}{cat === "lab" ? "The Laboratory" : "Downtime"}
        </h1>
        <p class="note">
          Plan a season — or several — of lab work, writing, study or teaching, and
          see what it buys before you commit to it.
        </p>
      </div>

      <div class="downtime-head">
        <Select label="Subject" value={subjectKey} options={subjectOptions} onChange={setSubjectKey} />
        <div class="mode-toggle" role="group" aria-label="View">
          <Button size="small" variant="brand" appearance={mode === "browse" ? "accent" : "outlined"} onClick={() => setMode("browse")}>
            Browse
          </Button>
          <Button size="small" variant="brand" appearance={mode === "plan" ? "accent" : "outlined"} onClick={() => setMode("plan")}>
            <CalendarDays size={14} aria-hidden="true" slot="start" /> Plan
          </Button>
        </div>
      </div>

      {mode === "browse" ? <BrowseMode subject={subject} cat={cat} setCat={setCat} /> : <PlanMode />}
    </div>
  );
}

interface Adjustment { id: string; activityKey: string; label: string; value: number }

function BrowseMode({ subject, cat, setCat }: {
  subject: Subject; cat: DowntimeCategory | "all"; setCat: (c: DowntimeCategory | "all") => void;
}) {
  const activities = ACTIVITIES.filter((a) => cat === "all" || a.category === cat);
  const [focusedKey, setFocusedKey] = useState(activities[0]?.key);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [goals, setGoals] = useState<Record<string, number>>({});
  const [arts, setArts] = useState<{ technique: Technique; form: Form }>({ technique: "Creo", form: "Vim" });
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);

  // A different subject brings different numbers — start from theirs, not the
  // last subject's edits. ponytail: no per-subject persistence beyond this.
  useEffect(() => setOverrides({}), [subject]);
  // Keep the focus on something the current category filter still shows.
  useEffect(() => {
    if (!activities.some((a) => a.key === focusedKey)) setFocusedKey(activities[0]?.key);
  }, [cat]);

  const setOverride = (id: string, v: number) => setOverrides((o) => ({ ...o, [id]: v }));

  function resultFor(a: ActivityDef): { result?: TotalResult; outcome: Outcome } {
    if (!a.total) return { outcome: computeOutcome(a, 0, undefined) };
    const total = totalOf(a.total)!;
    const activeArts = a.fixedArts ?? arts;
    const adjSum = adjustments.filter((x) => x.activityKey === a.key).reduce((s, x) => s + x.value, 0);
    const result = computeTotal(total, { subject, overrides, arts: activeArts }, adjSum);
    const goal = a.needsGoal ? goals[a.key] : undefined;
    return { result, outcome: computeOutcome(a, result.value, goal) };
  }

  const focused = activities.find((a) => a.key === focusedKey) ?? ACTIVITIES.find((a) => a.key === focusedKey);
  const focusedResult = focused ? resultFor(focused) : undefined;
  const focusedTotal = focused?.total ? totalOf(focused.total) : undefined;
  const focusedAdjustments = adjustments.filter((x) => x.activityKey === focused?.key);
  const needsArtsPicker = focused && !focused.fixedArts && focused.total === "lab";

  return (
    <>
      {focused && (
        <div class="total downtime-total" style={`--tech:${CATEGORY_COLOR[focused.category]}`}>
          <div class="total-main">
            <span class="total-num">
              <i>{focusedTotal?.name ?? focused.name}</i>
              <b>{focusedResult?.result?.value ?? "—"}</b>
            </span>
            <div class="total-side">
              <p class="statline">
                {focusedResult?.result
                  ? focusedResult.result.lines.map((l) => `${l.label} ${l.value >= 0 ? "+" : ""}${l.value}`).join(" ").replace(/^\+/, "")
                  : focused.summary}
              </p>
              <p class="note">{focusedResult?.outcome.text}</p>
              {focused.sideTotals.map((st) => {
                const t = totalOf(st.key);
                if (!t) return null;
                const r = computeTotal(t, { subject, overrides, arts: focused.fixedArts ?? arts }, 0);
                return <p class="note" key={st.key}>{st.label}: <b>{r.value}</b></p>;
              })}
            </div>
          </div>

          {needsArtsPicker && (
            <div class="design-row">
              <label>Technique &amp; Form</label>
              <div class="design-ctl">
                <Select label="Technique" pill value={arts.technique} options={TECHNIQUES.map((t) => ({ value: t, label: t }))} onChange={(v) => setArts((a) => ({ ...a, technique: v as Technique }))} />
                <Select label="Form" pill value={arts.form} options={FORMS.map((f) => ({ value: f, label: f }))} onChange={(v) => setArts((a) => ({ ...a, form: v as Form }))} />
              </div>
            </div>
          )}

          {focused.needsGoal && (
            <div class="design-row">
              <label>{focused.goalLabel}</label>
              <div class="design-ctl">
                <Stepper label={focused.goalLabel} value={goals[focused.key] ?? 0} min={0} onChange={(v) => setGoals((g) => ({ ...g, [focused.key]: v }))} />
              </div>
            </div>
          )}

          {focusedResult?.result?.lines.filter((l) => l.editable).map((l) => (
            <div class="design-row" key={l.id}>
              <label>{cap(l.label)}</label>
              <div class="design-ctl">
                <Stepper label={l.label} value={l.value} min={-10} onChange={(v) => setOverride(l.id!, v)} />
              </div>
            </div>
          ))}

          {focusedAdjustments.map((adj) => (
            <div class="design-row adjustment-row" key={adj.id}>
              <input
                type="text" value={adj.label}
                onInput={(e) => {
                  const v = (e.target as HTMLInputElement).value;
                  setAdjustments((all) => all.map((x) => (x.id === adj.id ? { ...x, label: v } : x)));
                }}
              />
              <div class="design-ctl">
                <Stepper label={adj.label} value={adj.value} min={-20} onChange={(v) => setAdjustments((all) => all.map((x) => (x.id === adj.id ? { ...x, value: v } : x)))} />
                <button type="button" class="row-remove" aria-label={`Remove ${adj.label}`} onClick={() => setAdjustments((all) => all.filter((x) => x.id !== adj.id))}>
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
          {focused.total && (
            <div class="design-row">
              <Button
                size="small"
                onClick={() => setAdjustments((all) => [...all, { id: `adj-${Date.now()}`, activityKey: focused.key, label: "House rule", value: 1 }])}
              >
                <Plus size={13} aria-hidden="true" slot="start" /> Add adjustment
              </Button>
            </div>
          )}
        </div>
      )}

      <section class="design-block">
        <h3>What this season buys</h3>
        <div class="cat-chips" role="group" aria-label="Category">
          <Button size="small" variant="brand" appearance={cat === "all" ? "accent" : "outlined"} onClick={() => setCat("all")}>
            All
          </Button>
          {CATEGORIES.map((c) => (
            <Button key={c} size="small" color={CATEGORY_COLOR[c]} appearance={cat === c ? "accent" : "outlined"} onClick={() => setCat(c)}>
              {CATEGORY_LABEL[c]}
            </Button>
          ))}
        </div>

        <OptionList empty="No activities in this category yet.">
          {activities.map((a) => {
            const { outcome } = resultFor(a);
            return (
              <OptionRow
                key={a.key}
                accent={CATEGORY_COLOR[a.category]}
                title={(
                  <button type="button" class="activity-ttl" onClick={() => setFocusedKey(a.key)}>
                    {a.name}
                  </button>
                )}
                badge={<span class="badge-tag" style={`--row:${CATEGORY_COLOR[a.category]}`}>{CATEGORY_LABEL[a.category]}</span>}
                meta={(
                  <>
                    <b class={outcome.blocked ? "outcome-blocked" : undefined}>{outcome.text}</b>
                    <span class="book-tag">{a.book}</span>
                  </>
                )}
                description={a.summary + (a.detail ? ` ${a.detail}` : "")}
              />
            );
          })}
        </OptionList>
      </section>

      {focused && (
        <CopyBox label="This season" text={exportText(subject, focused, focusedResult)} />
      )}
    </>
  );
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

function exportText(subject: Subject, a: ActivityDef, r?: { result?: TotalResult; outcome: Outcome }): string {
  const lines = [
    `${subject.name} — ${a.name}`,
    r?.result ? `${totalOf(a.total ?? "")?.name ?? "Total"}: ${r.result.value} (${r.result.lines.map((l) => `${l.label} ${l.value}`).join(", ")})` : a.summary,
    r?.outcome.text ?? "",
  ];
  return lines.filter(Boolean).join("\n");
}

function PlanMode() {
  return (
    <>
      <section class="design-block plan-grid-block">
        <h3>The next few seasons</h3>
        <div class="season-grid-wrap">
          <table class="season-grid">
            <thead>
              <tr>
                <th class="subject-col">Subject</th>
                {DEMO_SEASONS.map((s, i) => (
                  <th key={i}>{s.season}<br /><span class="year">{s.year}</span></th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th class="subject-col">Marcus of Bonisagus</th>
                {renderProjectRow()}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="design-block">
        <h3>Projects</h3>
        <ul class="project-list">
          {DEMO_PROJECTS.map((p) => (
            <li class="project-row" key={p.id} style={`--row:${CATEGORY_COLOR[p.category]}`}>
              <div class="project-head">
                <span class="project-name">{p.name}</span>
                <span class="project-goal">{p.goalLabel}</span>
              </div>
              {p.blocked
                ? <p class="total-flag warn"><TriangleAlert size={13} aria-hidden="true" /> Blocked — {p.blocked}</p>
                : (
                  <>
                    <div class="project-bar-track"><div class="project-bar-fill" style={`width:${p.progressPct}%; background:${CATEGORY_COLOR[p.category]}`} /></div>
                    <p class="note">{p.status}</p>
                  </>
                )}
            </li>
          ))}
        </ul>
        <Button size="small" onClick={() => {}}>
          <Plus size={13} aria-hidden="true" slot="start" /> Start a project
        </Button>
      </section>

      <section class="design-block">
        <h3>Gains over these seasons</h3>
        <dl class="gains-list">
          {DEMO_GAINS.map((g) => (
            <div class="gains-row" key={g.label}>
              <dt>{g.label}</dt>
              <dd>{g.text}</dd>
            </div>
          ))}
        </dl>
        <p class="total-flag warn"><TriangleAlert size={13} aria-hidden="true" /> {DEMO_WARNING}</p>
      </section>

      <p class="note downtime-preview-note">
        Static preview — season cells, project bars and gains are demo data;
        clicking a cell doesn't yet drop into Browse mode. Browse mode itself is
        real now — see docs/DOWNTIME-PLAN.todo.md for the wiring plan.
      </p>
    </>
  );
}

/** Project bars as colspan'd cells laid over the season columns they occupy. */
function renderProjectRow(): JSX.Element[] {
  const cells: JSX.Element[] = [];
  let col = 0;
  const bars = [...DEMO_PROJECT_BARS].sort((a, b) => a.start - b.start);
  for (const bar of bars) {
    if (bar.start > col) {
      cells.push(<td key={`gap-${col}`} colSpan={bar.start - col} class="season-cell empty">exposure</td>);
    }
    cells.push(
      <td key={bar.id} colSpan={bar.span} class={`season-cell project ${bar.done ? "done" : ""}`} style={`--row:${CATEGORY_COLOR[bar.category]}`}>
        <span class="cell-name">{bar.name}</span>
        <span class="cell-note">{bar.note}</span>
      </td>,
    );
    col = bar.start + bar.span;
  }
  if (col < DEMO_SEASONS.length) {
    cells.push(<td key="gap-end" colSpan={DEMO_SEASONS.length - col} class="season-cell empty">+ add</td>);
  }
  return cells;
}
