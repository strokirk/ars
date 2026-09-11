import { useState } from "preact/hooks";
import { BookOpen, Info } from "lucide-preact";
import {
  RANGE_LADDER, DURATION_LADDER, TARGET_LADDER, TARGET_KINDS, LEVEL_RULES, SIZE_RULES,
  FORM_INFO, BOOKS, bookOf, type Param, type TargetKind,
} from "../lib/guidelines.ts";
import { FormIcon } from "./ui/ArtBadge.tsx";

/**
 * The Range / Duration / Target reference, laid out the way the rulebook prints it:
 * magnitudes down the side, the five parallel ladders across the top. Reading a row
 * across is the whole point — it is the only view that shows at a glance that Voice,
 * Sun and Group all cost the same +2.
 *
 * Every cell is a button; picking one opens its full rules text underneath, so the
 * grid stays scannable and the prose never pushes it off the screen.
 */
export function GuidelineLadder() {
  const [picked, setPicked] = useState<Param | null>(null);

  const columns: { key: string; label: string; rungs: Param[] }[] = [
    { key: "range", label: "Range", rungs: RANGE_LADDER },
    { key: "duration", label: "Duration", rungs: DURATION_LADDER },
    ...TARGET_KINDS.map((k) => ({
      key: k.key,
      label: k.label,
      rungs: TARGET_LADDER.filter((p) => p.targetKind === k.key),
    })),
  ];
  const maxMag = Math.max(...columns.flatMap((c) => c.rungs.map((r) => r.magnitudes)));
  const rows = Array.from({ length: maxMag + 1 }, (_, m) => m);

  return (
    <div class="ladder-wrap">
      <p class="note ladder-intro">
        Guidelines assume <b>Range Personal</b>, <b>Duration Momentary</b>,{" "}
        <b>Target Individual</b> — the cheapest rung of each ladder. Every step up adds a
        magnitude; every step down subtracts one. Tap any rung for its full rules text.
      </p>

      {/* Wide on desktop, and its own scroller on a phone — the grid is the one thing
          in the app allowed to be wider than the page. */}
      <div class="ladder-scroll">
        <table class="ladder">
          <thead>
            <tr>
              <th scope="col" class="magcol">
                <span class="sr-head">Magnitudes</span>
              </th>
              {columns.map((c) => (
                <th scope="col" key={c.key}>
                  {c.label}
                  {TARGET_KINDS.some((k) => k.key === c.key) && <i class="sub">Target</i>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m}>
                <th scope="row" class="magcol">
                  <span class="mag" style={`--mag:var(--mag-${m})`}>
                    {m === 0 ? "+0" : `+${m}`}
                  </span>
                  <i class="lvl">{m === 0 ? "free" : `+${m * 5} levels`}</i>
                </th>
                {columns.map((c) => {
                  const here = c.rungs.filter((r) => r.magnitudes === m);
                  return (
                    <td key={c.key}>
                      {here.length === 0 ? (
                        <span class="none" aria-label="no rung at this magnitude">
                          —
                        </span>
                      ) : (
                        here.map((r) => (
                          <button
                            key={`${r.kind}-${r.targetKind ?? ""}-${r.key}`}
                            type="button"
                            class={`rung ${picked === r ? "on" : ""}`}
                            style={`--mag:var(--mag-${m})`}
                            aria-pressed={picked === r}
                            onClick={() => setPicked(picked === r ? null : r)}
                          >
                            {r.name}
                            {r.ritual && <i class="ritual" title="Must be cast as a Ritual">R</i>}
                          </button>
                        ))
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {picked ? (
        <ParamDetail param={picked} onClose={() => setPicked(null)} />
      ) : (
        <div class="ladder-legend note">
          {TARGET_KINDS.map((k) => (
            <span key={k.key}>
              <b>{k.label}:</b> {k.blurb}
            </span>
          ))}
          <span>
            <b class="ritual-key">R</b> — forces the spell to be cast as a Ritual.
          </span>
        </div>
      )}

      <Rules title="Working out the level" rules={LEVEL_RULES} />
      <Rules title="Target size" rules={SIZE_RULES} />
      <FormSizes />
    </div>
  );
}

function ParamDetail({ param, onClose }: { param: Param; onClose: () => void }) {
  const book = bookOf(param.book);
  const kind = param.kind === "target" ? `${param.targetKind} Target` : param.kind;
  return (
    <div class="param-detail" style={`--mag:var(--mag-${param.magnitudes})`}>
      <div class="param-head">
        <h3>
          {param.name}
          <span class="mag" style={`--mag:var(--mag-${param.magnitudes})`}>
            +{param.magnitudes}
          </span>
        </h3>
        <button type="button" class="linkish" onClick={onClose}>
          Close
        </button>
      </div>
      <p class="note kindline">
        {kind} · {param.magnitudes === 0 ? "adds no levels" : `adds ${param.magnitudes * 5} levels`}
        {param.ritual && " · must be a Ritual"}
        {BOOKS.length > 1 && book && ` · ${book.abbr}`}
      </p>
      <p class="param-desc">{param.description}</p>
      {param.baseSize && (
        <p class="param-note">
          <Info size={13} aria-hidden="true" /> {param.baseSize}
        </p>
      )}
      {param.notes.map((n) => (
        <p class="param-note" key={n}>
          <Info size={13} aria-hidden="true" /> {n}
        </p>
      ))}
    </div>
  );
}

function Rules({ title, rules }: { title: string; rules: { title: string; text: string }[] }) {
  const [open, setOpen] = useState(false);
  if (!rules.length) return null;
  return (
    <section class="rulesblock">
      <button type="button" class="rules-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <BookOpen size={15} aria-hidden="true" /> {title}
        <span class="n">{rules.length}</span>
      </button>
      {open && (
        <div class="rules-body">
          {rules.map((r) => (
            <div key={r.title}>
              {r.title && <h4>{r.title}</h4>}
              <p>{r.text}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Each Form's base Individual — the size rules mean nothing without it. */
function FormSizes() {
  const [open, setOpen] = useState(false);
  return (
    <section class="rulesblock">
      <button type="button" class="rules-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <BookOpen size={15} aria-hidden="true" /> Base Individual, by Form
        <span class="n">{FORM_INFO.length}</span>
      </button>
      {open && (
        <div class="rules-body formsizes">
          {FORM_INFO.map((f) => (
            <div key={f.name}>
              <h4>
                <FormIcon form={f.name} size={15} /> {f.name}
              </h4>
              <p>{f.baseIndividual}</p>
              {f.notes.map((n) => (
                <p class="param-note" key={n}>
                  <Info size={13} aria-hidden="true" /> {n}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
