import type { ComponentChildren } from "preact";
import { useRef } from "preact/hooks";
import { usePublishHeight } from "../lib/use-publish-height.ts";

export interface Meter {
  label: string;
  spent: number;
  cap: number;
  over?: boolean;
  full?: boolean;
  /** Override the right-hand value text (e.g. "V 3 = F 3"). */
  text?: string;
  /** Muted trailing gloss (e.g. "33 left"). */
  note?: string;
}

/** One meter: the label, the value, and an optional gloss. Used in the per-stage
 *  headings of the Abilities step. */
export function MeterPill({ meter: m }: { meter: Meter }) {
  return (
    <span class={`meter ${m.over ? "over" : m.full ? "full" : ""}`}>
      {m.label} <b>{m.text ?? `${m.spent}/${m.cap}`}</b>
      {m.note && <span class="gloss">{m.note}</span>}
    </span>
  );
}

/** What's left of a pool, in words. */
export const leftText = (m: Meter): string => {
  const left = m.cap - m.spent;
  return left > 0 ? `${left} left` : left < 0 ? `${-left} over` : "all spent";
};

/** Sticky strip under the step pips: one bar per budget pool, and the step
 *  navigation (`children`) on the right. */
export function BudgetBar({ meters, children }: { meters: Meter[]; children?: ComponentChildren }) {
  const el = useRef<HTMLDivElement>(null);
  // The creator's sticky filter bars hang below this strip.
  usePublishHeight(el, "--budgetbar-h");
  return (
    <div class="budgetbar" ref={el}>
      <div class="meters">
        {meters.map((m) => (
          <div key={m.label} class={`pool ${m.over ? "over" : m.full ? "full" : ""}`}>
            <div class="pool-label">
              <span>{m.label}</span>
              <b>{m.text ?? leftText(m)}</b>
            </div>
            <div class="pool-bar" title={`${m.spent}/${m.cap}`}>
              <i style={{ width: `${m.cap > 0 ? Math.min(100, (m.spent / m.cap) * 100) : m.spent > 0 ? 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </div>
      {children && <div class="budgetbar-nav">{children}</div>}
    </div>
  );
}
