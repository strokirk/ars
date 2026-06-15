export interface Meter {
  label: string;
  spent: number;
  cap: number;
  over?: boolean;
  full?: boolean;
  /** Override the right-hand value text (e.g. "V 3 = F 3"). */
  text?: string;
}

/** Sticky bottom bar of live budget meters for the current step. */
export function BudgetBar({ meters }: { meters: Meter[] }) {
  if (meters.length === 0) return null;
  return (
    <div class="budgetbar">
      <div class="meters">
        {meters.map((m) => (
          <span class={`meter ${m.over ? "over" : m.full ? "full" : ""}`} key={m.label}>
            {m.label} <b>{m.text ?? `${m.spent}/${m.cap}`}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
