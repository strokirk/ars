/** The search box that heads every picker and browser. */
export function SearchField({
  value, onInput, placeholder, children,
}: {
  value: string;
  onInput: (v: string) => void;
  placeholder: string;
  /** Extra controls rendered alongside the input (sort selects, toggles). */
  children?: preact.ComponentChildren;
}) {
  return (
    <div class="toolbar">
      <input
        type="text" value={value} placeholder={placeholder} aria-label={placeholder}
        onInput={(e) => onInput((e.target as HTMLInputElement).value)}
      />
      {value && <button class="btn btn-sm btn-ghost" title="Clear search" onClick={() => onInput("")}>×</button>}
      {children}
    </div>
  );
}
