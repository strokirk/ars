import { Button } from "./Button.tsx";

/**
 * A row of filter chips behaving as a single-select. `value` of "" is the
 * catch-all option (labelled by `allLabel`); pass allLabel={null} to omit it.
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
    <div class="chips">
      {allLabel !== null && (
        <Button
          onClick={() => onChange("")}
          variant="brand"
          size={"small"}
          appearance={value === "" ? "accent" : "outlined"}
        >
          {allLabel}
        </Button>
      )}
      {options.map((o) => (
        <Button
          variant="brand"
          size={"small"}
          appearance={value === o ? "accent" : "outlined"}
          key={o}
          onClick={() => onChange(value === o ? "" : o)}
        >
          {labelOf ? labelOf(o) : o}
        </Button>
      ))}
    </div>
  );
}
