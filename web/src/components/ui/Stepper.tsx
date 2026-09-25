/** The −/value/+ control used for Characteristics, Ability scores and Art scores. */
export function Stepper({
  value, onChange, min = 0, max = Infinity, format, label, maxHint, editable,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  /** Render the value (e.g. Characteristics show a leading "+"). */
  format?: (v: number) => string;
  /** Accessible name for the buttons, e.g. "Intelligence". */
  label?: string;
  /** Why `+` stops where it does — shown on hover once the ceiling is reached. */
  maxHint?: string;
  /** Render the value as a number input so a score can be typed, not only stepped. */
  editable?: boolean;
}) {
  const atMax = value >= max;
  return (
    <span class="stepper">
      <button type="button" aria-label={label && `decrease ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
      {editable ? (
        <input
          class="val" type="number" inputMode="numeric" aria-label={label} value={value} min={min}
          max={Number.isFinite(max) ? max : undefined}
          onChange={(e) => {
            const input = e.target as HTMLInputElement;
            const n = Math.min(max, Math.max(min, Math.trunc(Number(input.value) || 0)));
            input.value = String(n); // snap back when the clamp leaves `value` unchanged
            if (n !== value) onChange(n);
          }}
        />
      ) : <span class="val">{format ? format(value) : value}</span>}
      <button
        type="button" aria-label={label && `increase ${label}`} disabled={atMax}
        title={atMax ? maxHint : undefined}
        onClick={() => onChange(value + 1)}
      >+</button>
    </span>
  );
}
