export interface Meter {
  label: string;
  spent: number;
  cap: number;
  over?: boolean;
  full?: boolean;
  /** Override the right-hand value text (e.g. "V 3 = F 3"). */
  text?: string;
  /** Muted trailing gloss (e.g. "33 left") — the sticky bar leaves it off. */
  note?: string;
}

/** One meter: the label, the value, and an optional gloss. Shared by the sticky
 *  bottom bar and the per-stage headings in the Abilities step. */
export function MeterPill({ meter: m }: { meter: Meter }) {
  return (
    <span class={`meter ${m.over ? "over" : m.full ? "full" : ""}`}>
      {m.label} <b>{m.text ?? `${m.spent}/${m.cap}`}</b>
      {m.note && <span class="gloss">{m.note}</span>}
    </span>
  );
}

/** Sticky bottom bar of live budget meters for the current step. */
export function BudgetBar({ meters }: { meters: Meter[] }) {
  if (meters.length === 0) return null;
  return (
    <div class="budgetbar">
      <div class="meters">
        {meters.map((m) => <MeterPill key={m.label} meter={m} />)}
      </div>
    </div>
  );
}
