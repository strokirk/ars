import { useLayoutEffect, useRef } from "preact/hooks";
import type WaSelect from "@awesome.me/webawesome/dist/components/select/select.js";

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * The app's dropdown, wrapping Web Awesome's `<wa-select>`. A native `<select>`
 * hands its popup to the OS, which draws it in the platform's own style and
 * takes no CSS at all; `<wa-select>` renders the listbox itself (in the top
 * layer, so no `overflow` ancestor clips it), and it wears our theme.
 *
 * The custom elements are registered once by `src/webawesome.ts`, the app entry.
 * This wrapper deliberately doesn't import them: under test the tags stay inert
 * DOM that still carries `value` and still emits `change`, which keeps the suite
 * clear of Web Awesome's browser-only runtime.
 */
export function Select({
  value, options, onChange, label, pill = false, active = false, placeholder,
}: {
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  /** Accessible name — these dropdowns rarely carry a visible label. */
  label: string;
  /** Pill shape, to sit among the filter bar's chips; otherwise a form field. */
  pill?: boolean;
  /** Mark the control as currently narrowing something. */
  active?: boolean;
  placeholder?: string;
}) {
  const ref = useRef<WaSelect | null>(null);
  const latest = useRef(onChange);
  latest.current = onChange;

  // Assigned as a property, after the options exist: a <wa-select> resolves its
  // display label against its children.
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && el.value !== value) el.value = value;
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // `value` is an array only for multi-selects, which these never are.
    const onSelect = (e: Event) => {
      const v = (e.target as WaSelect).value;
      latest.current(typeof v === "string" ? v : (v?.[0] ?? ""));
    };
    el.addEventListener("change", onSelect);
    return () => el.removeEventListener("change", onSelect);
  }, []);

  // A <wa-select> is block-width by default and its display input carries a wide
  // intrinsic size, so a pill is sized from its longest label instead — that keeps
  // a row of them a row rather than a stack.
  const widest = options.reduce((n, o) => Math.max(n, o.label.length), 0);

  return (
    <wa-select
      // A callback ref: Web Awesome's JSX types take the element, not a RefObject.
      ref={(el: WaSelect | null) => { ref.current = el; }}
      class={`ui-select ${pill ? "pill" : ""} ${active ? "on" : ""}`}
      style={pill ? { "--label-width": `${widest}ch` } : undefined}
      size={pill ? "small" : "medium"}
      pill={pill}
      aria-label={label}
      placeholder={placeholder}
    >
      {options.map((o) => <wa-option value={o.value} key={o.value}>{o.label}</wa-option>)}
    </wa-select>
  );
}
