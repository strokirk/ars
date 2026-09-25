import { useState } from "preact/hooks";
import type { ComponentChildren } from "preact";

/**
 * A native `<details>` disclosure — the same collapse-with-full-text pattern the
 * generated character sheet already uses (chargen/src/cli/sheet-html.ts). `open`
 * only seeds the initial state; afterward this is fully user-controlled (toggling
 * never fights a manual open/close on re-render).
 */
export function Collapsible({
  summary, children, open: initialOpen = true, class: klass = "",
}: {
  summary: ComponentChildren;
  children: ComponentChildren;
  open?: boolean;
  class?: string;
}) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <details class={`collapsible ${klass}`} open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>{summary}</summary>
      <div class="collapsible-body">{children}</div>
    </details>
  );
}
