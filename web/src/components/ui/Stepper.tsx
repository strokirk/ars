/** The −/value/+ control used for Characteristics, Ability scores and Art scores. */
export function Stepper({
  value, onChange, min = 0, max = Infinity, format, label,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  /** Render the value (e.g. Characteristics show a leading "+"). */
  format?: (v: number) => string;
  /** Accessible name for the buttons, e.g. "Intelligence". */
  label?: string;
}) {
  return (
    <span class="stepper">
      <button type="button" aria-label={label && `decrease ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
      <span class="val">{format ? format(value) : value}</span>
      <button type="button" aria-label={label && `increase ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
    </span>
  );
}
