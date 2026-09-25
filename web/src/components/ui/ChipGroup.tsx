import { Button } from "./Button.tsx";

/**
 * A segmented control: joined buttons behaving as a single-select. `value` of ""
 * is the catch-all option (labelled by `allLabel`); pass allLabel={null} to omit it.
 * Meant for a handful of short options — a long list belongs in wrapping chips.
 */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  allLabel = "All",
  labelOf,
}: {
  options: readonly T[];
  value: T | "";
  onChange: (next: T | "") => void;
  allLabel?: string | null;
  labelOf?: (o: T) => string;
}) {
  return (
    <wa-button-group class="seg" label={allLabel ?? "Filter"}>
      {allLabel !== null && (
        <Button
          onClick={() => onChange("")}
          variant="brand"
          size="small"
          appearance={value === "" ? "filled-outlined" : "outlined"}
          pressed={value === ""}
        >
          {allLabel}
        </Button>
      )}
      {options.map((o) => (
        <Button
          variant="brand"
          size="small"
          appearance={value === o ? "filled-outlined" : "outlined"}
          pressed={value === o}
          key={o}
          onClick={() => onChange(value === o ? "" : o)}
        >
          {labelOf ? labelOf(o) : o}
        </Button>
      ))}
    </wa-button-group>
  );
}
