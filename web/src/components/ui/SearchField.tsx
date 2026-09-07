import type { ComponentChildren } from "preact";
import { Button } from "./Button.tsx";

/** The search box that heads every picker and browser. */
export function SearchField({
  value, onInput, placeholder, children,
}: {
  value: string;
  onInput: (v: string) => void;
  placeholder: string;
  /** Extra controls rendered alongside the input (sort selects, toggles). */
  children?: ComponentChildren;
}) {
  return (
    <div class="toolbar">
      <input
        type="text" value={value} placeholder={placeholder} aria-label={placeholder}
        onInput={(e) => onInput((e.target as HTMLInputElement).value)}
      />
      {value && <Button size="small" appearance="plain" title="Clear search" onClick={() => onInput("")}>×</Button>}
      {children}
    </div>
  );
}
