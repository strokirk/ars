import type { ComponentChildren } from "preact";

/** The search box that heads every picker and browser. `type="search"` gets us the
 *  right mobile keyboard and an Escape-to-clear for free; the native clear glyph is
 *  suppressed in favour of our own × so it can sit inside the field on every browser. */
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
      <div class="search-wrap">
        <input
          type="search" value={value} placeholder={placeholder} aria-label={placeholder}
          onInput={(e) => onInput((e.target as HTMLInputElement).value)}
        />
        {value && (
          <button type="button" class="search-clear" title="Clear search" onClick={() => onInput("")}>×</button>
        )}
      </div>
      {children}
    </div>
  );
}
