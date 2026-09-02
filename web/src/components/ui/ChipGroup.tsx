/**
 * A row of filter chips behaving as a single-select. `value` of "" is the
 * catch-all option (labelled by `allLabel`); pass allLabel={null} to omit it.
 */
export function ChipGroup<T extends string>({
  options, value, onChange, allLabel = "All", labelOf,
}: {
  options: readonly T[];
  value: T | "";
  onChange: (next: T | "") => void;
  allLabel?: string | null;
  labelOf?: (o: T) => string;
}) {
  return (
    <div class="chips">
      {allLabel !== null && (
        <button class={`chip-toggle ${value === "" ? "on" : ""}`} onClick={() => onChange("")}>{allLabel}</button>
      )}
      {options.map((o) => (
        <button class={`chip-toggle ${value === o ? "on" : ""}`} key={o} onClick={() => onChange(value === o ? "" : o)}>
          {labelOf ? labelOf(o) : o}
        </button>
      ))}
    </div>
  );
}
