/** A single-choice list of cards (name + blurb) instead of a `<select>` — for a
 *  choice where the options themselves need explaining, not just naming. */
export function RadioCards({
  name, value, onChange, options,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; blurb?: string }[];
}) {
  return (
    <div class="radio-cards" role="radiogroup" aria-label={name}>
      {options.map((o) => (
        <label class={`radio-card ${o.value === value ? "on" : ""}`} key={o.value}>
          <input
            type="radio" name={name} value={o.value} checked={o.value === value}
            onChange={() => onChange(o.value)}
          />
          <span>
            <span class="rc-name">{o.label}</span>
            {o.blurb && <span class="rc-blurb">{o.blurb}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}
