import { useState } from "preact/hooks";
import { Wand2, RotateCcw, ChevronDown, TriangleAlert, Info } from "lucide-preact";
import {
  RANGE_LADDER, DURATION_LADDER, TARGET_LADDER, TARGET_KINDS,
  magnitudeOf, levelRung, rungLevel, type Param, type ParamKind, type Guideline,
} from "../lib/guidelines.ts";
import {
  design, update, reset, guidelineOf, pickGuideline, setParam, paramFor, resultOf, statLine,
  baseRung, setBaseRung,
} from "../lib/design-store.ts";
import { TECHNIQUE_COLOR } from "../lib/arts.ts";
import type { Technique } from "../../../chargen/src/domain/glossary.ts";
import { GuidelineBrowser } from "./GuidelineBrowser.tsx";
import { ArtBadge } from "./ui/ArtBadge.tsx";
import { Button } from "./ui/Button.tsx";
import { Stepper } from "./ui/Stepper.tsx";
import { CopyBox } from "./ui/CopyBox.tsx";

/**
 * Build a spell from a guideline and watch the level move.
 *
 * Reads the same data the reference tabs do — the guideline rows and the Range /
 * Duration / Target ladders — so the designer is the ladder made interactive rather
 * than a second copy of it. Every part stays adjustable: pick a different effect and
 * the parameters survive, nudge the base up or down in magnitudes, jump to any rung
 * of any ladder, and the running total re-reads underneath.
 */
export function SpellDesigner() {
  const d = design.value;
  const guideline = guidelineOf(d);
  const result = resultOf(d);
  // The picker opens on load (there is nothing else to do yet) and closes on a pick.
  const [picking, setPicking] = useState(!guideline);

  if (picking || !guideline) {
    return (
      <div class="designer">
        <div class="designer-lead">
          <h2>
            <Wand2 size={17} aria-hidden="true" /> Choose the effect
          </h2>
          <p class="note">
            Every spell starts from one guideline, quoted at Range Personal, Duration
            Momentary, Target Individual. Pick one and pay for the rest.
          </p>
          {guideline && (
            <Button appearance="plain" variant="brand" onClick={() => setPicking(false)}>
              Keep {truncate(guideline.effect)}
            </Button>
          )}
        </div>
        <GuidelineBrowser
          onPick={(g: Guideline) => { update((cur) => pickGuideline(cur, g)); setPicking(false); }}
        />
      </div>
    );
  }

  return (
    <div class="designer">
      <Total result={result!} guideline={guideline} d={d} />

      <section class="design-block">
        <h3>The effect</h3>
        <div class="chosen" style={`--tech:${TECHNIQUE_COLOR[guideline.technique as Technique]}`}>
          <div class="chosen-txt">
            <b>{guideline.effect}</b>
            <span class="chosen-meta">
              <ArtBadge
                technique={guideline.technique}
                form={guideline.form}
                level={guideline.isGeneral ? "Gen" : guideline.level}
              />
              {guideline.isGeneral && <i class="note">General — you set the level</i>}
            </span>
          </div>
          <Button size="small" onClick={() => setPicking(true)}>Change</Button>
        </div>

        {/* "Boost or lower the effect": steps the base along the magnitude ladder,
            which is not level ±5 at the bottom (5 down a magnitude is 4, not 0). */}
        <div class="design-row">
          <label>
            Base level
            {guideline.level !== null && d.base !== guideline.level && (
              <i class="drift">guideline says {guideline.level}</i>
            )}
          </label>
          <div class="design-ctl">
            {/* Counts rungs, shows levels: one press is one magnitude, which is not
                one level at the bottom of the ladder (5 down a magnitude is 4). */}
            <Stepper
              label="base level"
              value={baseRung(d)}
              min={1}
              max={levelRung(75)}
              format={(rung) => String(rungLevel(rung))}
              onChange={(rung) => update((cur) => setBaseRung(cur, rung))}
            />
            {guideline.level !== null && d.base !== guideline.level && (
              <button type="button" class="linkish" onClick={() => update((cur) => ({ ...cur, base: guideline.level! }))}>
                reset
              </button>
            )}
          </div>
        </div>
      </section>

      <Ladder kind="range" label="Range" rungs={RANGE_LADDER} d={d} />
      <Ladder kind="duration" label="Duration" rungs={DURATION_LADDER} d={d} />
      <TargetLadder d={d} />

      <section class="design-block">
        <h3>Extra magnitudes</h3>
        <div class="design-row">
          <label>
            Target size
            <i class="hint">each magnitude multiplies the size by ten</i>
          </label>
          <div class="design-ctl">
            <Stepper label="size magnitudes" value={d.size} min={0} max={10} onChange={(size) => update((cur) => ({ ...cur, size }))} />
          </div>
        </div>
        <div class="design-row">
          <label>
            Requisites &amp; complexity
            <i class="hint">a requisite that enhances the effect, an unusual shape, a finicky trigger</i>
          </label>
          <div class="design-ctl">
            <Stepper label="extra magnitudes" value={d.extra} min={0} max={10} onChange={(extra) => update((cur) => ({ ...cur, extra }))} />
          </div>
        </div>
        {guideline.technique === "Creo" && (
          <div class="design-row">
            <label>
              Creates something lasting
              <i class="hint">a Momentary Creo that leaves a real thing behind must be a Ritual</i>
            </label>
            <div class="design-ctl">
              <button
                type="button"
                class={`chip-toggle ${d.lastingCreo ? "on" : ""}`}
                aria-pressed={d.lastingCreo}
                onClick={() => update((cur) => ({ ...cur, lastingCreo: !cur.lastingCreo }))}
              >
                {d.lastingCreo ? "Yes" : "No"}
              </button>
            </div>
          </div>
        )}
      </section>

      <CopyBox label="This spell" text={exportText(d, result!, guideline)} />

      <div class="design-foot">
        <Button variant="brand" onClick={() => { reset(); setPicking(true); }}>
          <RotateCcw size={14} aria-hidden="true" slot="start" /> Start over
        </Button>
      </div>
    </div>
  );
}

/**
 * The running total, and the arithmetic behind it. The breakdown is not decoration:
 * a level that moved by 1 instead of 5 looks like a bug until you can see that the
 * step happened below level 5, where a magnitude is worth one level.
 */
function Total({
  result, guideline, d,
}: {
  result: NonNullable<ReturnType<typeof resultOf>>;
  guideline: Guideline;
  d: typeof design.value;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div class="total" style={`--tech:${TECHNIQUE_COLOR[guideline.technique as Technique]}`}>
      <div class="total-main">
        <span class="total-num">
          <i>Level</i>
          <b>{result.level}</b>
        </span>
        <div class="total-side">
          <p class="statline">
            {guideline.technique} {guideline.form} · {statLine(d)}
          </p>
          <p class="note">
            {magnitudeOf(result.level)} magnitude{magnitudeOf(result.level) === 1 ? "" : "s"}
            {result.isRitual ? " · Ritual" : " · Formulaic or Spontaneous"}
            {result.totalMagnitudes > 0 && ` · +${result.totalMagnitudes} over the guideline`}
          </p>
        </div>
      </div>

      {result.ritualReasons.length > 0 && (
        <p class="total-flag ritual">
          <Info size={13} aria-hidden="true" />
          Must be a Ritual — {result.ritualReasons.join("; ")}. Rituals cost one pawn of
          vis per magnitude.
        </p>
      )}
      {result.warnings.map((w) => (
        <p class="total-flag warn" key={w}>
          <TriangleAlert size={13} aria-hidden="true" /> {w}
        </p>
      ))}

      <button type="button" class="total-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <ChevronDown size={14} aria-hidden="true" class={open ? "flip" : ""} />
        {open ? "Hide" : "Show"} the arithmetic
      </button>
      {open && (
        <ol class="breakdown">
          {result.steps.map((s, i) => (
            <li key={`${s.label}-${i}`}>
              <span class="b-label">{s.label}</span>
              <span class="b-mag">{s.magnitudes ? `${s.magnitudes > 0 ? "+" : ""}${s.magnitudes} mag` : ""}</span>
              <span class="b-run">{s.running}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** One ladder as a row of jump-anywhere chips — no stepping through the rungs. */
function Ladder({
  kind, label, rungs, d,
}: {
  kind: ParamKind;
  label: string;
  rungs: Param[];
  d: typeof design.value;
}) {
  const current = paramFor(d, kind);
  return (
    <section class="design-block">
      <h3>{label}</h3>
      <div class="rungs" role="group" aria-label={label}>
        {rungs.map((p) => (
          <Rung key={p.key} p={p} on={p === current} onPick={() => update((cur) => setParam(cur, kind, p))} />
        ))}
      </div>
      <p class="rung-say">{current.summary}</p>
    </section>
  );
}

/** Targets run as three parallel ladders, so they get three labelled rows. */
function TargetLadder({ d }: { d: typeof design.value }) {
  const current = paramFor(d, "target");
  return (
    <section class="design-block">
      <h3>Target</h3>
      {TARGET_KINDS.map((k) => (
        <div class="target-lane" key={k.key}>
          <h4 title={k.blurb}>{k.label}</h4>
          <div class="rungs" role="group" aria-label={`${k.label} Target`}>
            {TARGET_LADDER.filter((p) => p.targetKind === k.key).map((p) => (
              <Rung key={p.key} p={p} on={p === current} onPick={() => update((cur) => setParam(cur, "target", p))} />
            ))}
          </div>
        </div>
      ))}
      <p class="rung-say">{current.summary}</p>
    </section>
  );
}

function Rung({ p, on, onPick }: { p: Param; on: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      class={`rung-chip ${on ? "on" : ""}`}
      style={`--mag:var(--mag-${p.magnitudes})`}
      aria-pressed={on}
      title={p.summary}
      onClick={onPick}
    >
      {p.name}
      <i class="m">+{p.magnitudes}</i>
      {p.ritual && <i class="ritual" title="Must be cast as a Ritual">R</i>}
    </button>
  );
}

const truncate = (s: string) => (s.length > 44 ? `${s.slice(0, 43)}…` : s);

/** The design as a spell entry, in the rulebook's own format. */
function exportText(
  d: typeof design.value,
  result: NonNullable<ReturnType<typeof resultOf>>,
  g: Guideline,
): string {
  const design_ = [
    `Base ${d.base}`,
    ...result.steps.slice(1).filter((s) => s.magnitudes).map(
      (s) => `${s.magnitudes > 0 ? "+" : ""}${s.magnitudes} ${s.label.replace(/^(Range|Duration|Target): /, "")}`,
    ),
  ].join(", ");
  return [
    `${g.technique} ${g.form} ${result.level}${result.isRitual ? " (Ritual)" : ""}`,
    statLine(d),
    "",
    g.effect,
    "",
    `(${design_})`,
    ...(result.isRitual ? [`Ritual: ${magnitudeOf(result.level)} pawns of vis.`] : []),
  ].join("\n");
}
