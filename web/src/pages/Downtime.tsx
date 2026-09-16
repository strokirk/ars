import { useEffect, useState } from "preact/hooks";
import type { JSX } from "preact";
import { Hourglass, FlaskConical, TriangleAlert, Lock, X, Plus, CalendarDays } from "lucide-preact";
import { Button } from "../components/ui/Button.tsx";
import { Select } from "../components/ui/Select.tsx";
import { Stepper } from "../components/ui/Stepper.tsx";
import { OptionList, OptionRow } from "../components/ui/OptionList.tsx";
import { CopyBox } from "../components/ui/CopyBox.tsx";
import { roster } from "../lib/roster.ts";
import { drafts } from "../store.ts";
import { title as draftTitle } from "../charutil.ts";
import {
  CATEGORIES, CATEGORY_LABEL, CATEGORY_COLOR, DEMO_ACTIVITIES, DEMO_ADJUSTMENTS,
  DEMO_SEASONS, DEMO_PROJECT_BARS, DEMO_PROJECTS, DEMO_GAINS, DEMO_WARNING,
  type DowntimeCategory, type DemoAdjustment,
} from "../lib/downtime-demo.ts";

/**
 * The season planner — lab work, writing, study, teaching, covenant service.
 * `#/lab` is this same page with the Lab category preselected; there is no
 * separate lab tool. See docs/DOWNTIME-PLAN.todo.md.
 *
 * NON-FUNCTIONAL SCAFFOLD: every number on this page comes from
 * `lib/downtime-demo.ts`, not a rules engine — there isn't one wired up yet.
 * Mode, category and subject switches are real interactions; the totals and
 * outcomes they surround are static, so the header doesn't yet respond to the
 * inputs below it. This pass is for layout and interaction review before any
 * logic lands — see the plan doc's phasing.
 */
export function Downtime({ who, category }: { who?: string; category?: "all" | "lab" }) {
  const [mode, setMode] = useState<"browse" | "plan">("browse");
  const [cat, setCat] = useState<DowntimeCategory | "all">(category === "lab" ? "lab" : "all");
  const [subject, setSubject] = useState(who ?? roster[0]?.slug ?? "manual");
  const [adjustments, setAdjustments] = useState<DemoAdjustment[]>(DEMO_ADJUSTMENTS);

  // `#/downtime` and `#/lab` are the same mounted page (see router.ts), so a link
  // between them while this component is already live only changes `category` —
  // the state initializer above won't re-run. Follow it explicitly.
  useEffect(() => { setCat(category === "lab" ? "lab" : "all"); }, [category]);

  const subjectOptions = [
    ...roster.map((r) => ({ value: `r:${r.slug}`, label: r.character.name })),
    ...drafts.value.map((d) => ({ value: `d:${d.id}`, label: `${draftTitle(d.character)} (draft)` })),
    { value: "manual", label: "— Manual entry —" },
  ];
  const subjectValue = subject === "manual" ? "manual"
    : roster.some((r) => r.slug === subject) ? `r:${subject}`
    : `d:${subject}`;

  return (
    <div class="downtime">
      <div class="libhead">
        <h1>
          {cat === "lab" ? <FlaskConical size={20} aria-hidden="true" /> : <Hourglass size={20} aria-hidden="true" />}
          {" "}{cat === "lab" ? "The Laboratory" : "Downtime"}
        </h1>
        <p class="note">
          Plan a season — or several — of lab work, writing, study, teaching or
          covenant service, and see what it buys before you commit to it.
        </p>
      </div>

      <div class="downtime-head">
        <Select
          label="Subject"
          value={subjectValue}
          options={subjectOptions}
          onChange={(v) => setSubject(v === "manual" ? "manual" : v.slice(2))}
        />
        <div class="mode-toggle" role="group" aria-label="View">
          <Button size="small" variant="brand" appearance={mode === "browse" ? "accent" : "outlined"} onClick={() => setMode("browse")}>
            Browse
          </Button>
          <Button size="small" variant="brand" appearance={mode === "plan" ? "accent" : "outlined"} onClick={() => setMode("plan")}>
            <CalendarDays size={14} aria-hidden="true" slot="start" /> Plan
          </Button>
        </div>
      </div>

      {mode === "browse"
        ? <BrowseMode cat={cat} setCat={setCat} adjustments={adjustments} setAdjustments={setAdjustments} />
        : <PlanMode />}
    </div>
  );
}

function BrowseMode({
  cat, setCat, adjustments, setAdjustments,
}: {
  cat: DowntimeCategory | "all";
  setCat: (c: DowntimeCategory | "all") => void;
  adjustments: DemoAdjustment[];
  setAdjustments: (a: DemoAdjustment[]) => void;
}) {
  const activities = DEMO_ACTIVITIES.filter((a) => cat === "all" || a.category === cat);

  return (
    <>
      {/* Sticky total — placeholder arithmetic; see the page-level note below it. */}
      <div class="total downtime-total" style={`--tech:${CATEGORY_COLOR.lab}`}>
        <div class="total-main">
          <span class="total-num">
            <i>Lab Total</i>
            <b>37</b>
          </span>
          <div class="total-side">
            <p class="statline">Creo 12 + Vim 8 + Int +3 + Magic Theory 5 + aura 3</p>
            <p class="note">+ Puissant Creo 3, + Good library 3 (house rule)</p>
          </div>
        </div>
        <p class="note downtime-preview-note">
          Static preview — picking a different activity below will retitle
          this header to its own total (Teaching Total, Book Quality…) once
          the totals engine is wired up.
        </p>
      </div>

      <section class="design-block">
        <h3>The lab &amp; the season</h3>
        <div class="design-row">
          <label>Aura</label>
          <div class="design-ctl"><Stepper label="aura" value={3} min={0} max={10} onChange={() => {}} /></div>
        </div>
        <div class="design-row">
          <label>Intelligence</label>
          <div class="design-ctl">
            <Stepper label="intelligence" value={3} min={-5} max={5} format={(v) => (v >= 0 ? `+${v}` : String(v))} onChange={() => {}} />
          </div>
        </div>
        <div class="design-row">
          <label>Magic Theory</label>
          <div class="design-ctl"><Stepper label="magic theory" value={5} min={0} max={12} onChange={() => {}} /></div>
        </div>
        {adjustments.map((adj) => (
          <div class="design-row adjustment-row" key={adj.id}>
            <label>
              {adj.label}
              <i class="hint">
                applies to {adj.scope === "all" ? "everything" : adj.scope === "category" ? "this category" : "this activity"}
              </i>
            </label>
            <div class="design-ctl">
              <span class="adj-value">+{adj.value}</span>
              <button type="button" class="row-remove" aria-label={`Remove ${adj.label}`} onClick={() => setAdjustments(adjustments.filter((a) => a.id !== adj.id))}>
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
        <div class="design-row">
          <Button
            size="small"
            onClick={() => setAdjustments([
              ...adjustments,
              { id: `adj-${Date.now()}`, label: "New adjustment", value: 1, scope: "activity" },
            ])}
          >
            <Plus size={13} aria-hidden="true" slot="start" /> Add adjustment
          </Button>
        </div>
      </section>

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
          {activities.map((a) => (
            <OptionRow
              key={a.key}
              accent={a.locked ? "var(--faint)" : CATEGORY_COLOR[a.category]}
              title={<>{a.locked && <Lock size={13} aria-hidden="true" />} {a.name}</>}
              badge={<span class="badge-tag" style={`--row:${CATEGORY_COLOR[a.category]}`}>{CATEGORY_LABEL[a.category]}</span>}
              meta={(
                <>
                  {a.locked ? <span class="locked-note">{a.locked}</span> : <>{a.totalLabel} · <b>{a.outcome}</b></>}
                  <span class="book-tag">{a.book}</span>
                </>
              )}
              description={a.detail}
            />
          ))}
        </OptionList>
      </section>

      <CopyBox
        label="This season"
        text={"Marcus of Bonisagus — Spring 1221\nExtract vis from the aura (Creo Vim). Lab Total 37 ÷ 10 = 3 pawns.\n\n(Demo text — not yet generated from a real plan.)"}
      />
    </>
  );
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
        clicking a cell doesn't yet drop into Browse mode. See
        docs/DOWNTIME-PLAN.todo.md for the wiring plan.
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
