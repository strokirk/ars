import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";

/** Scrolling result list shared by every picker and browser. */
export function OptionList({ children, empty = "No matches." }: { children: ComponentChildren; empty?: string }) {
  const rows = Array.isArray(children) ? children.flat() : [children];
  const isEmpty = rows.filter(Boolean).length === 0;
  return <ul class="option-list">{isEmpty ? <li class="note">{empty}</li> : children}</ul>;
}

/**
 * One result: a title with a small uppercase meta line, a description that starts
 * clamped to two lines and expands on tap, and an optional action on the right.
 */
export function OptionRow({
  title, meta, description, action, defaultOpen = false,
}: {
  title: ComponentChildren;
  meta?: ComponentChildren;
  description?: string;
  action?: ComponentChildren;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const expandable = Boolean(description);
  return (
    <li class="option">
      <div
        class="meta"
        role={expandable ? "button" : undefined}
        tabIndex={expandable ? 0 : undefined}
        aria-expanded={expandable ? open : undefined}
        onClick={() => expandable && setOpen(!open)}
        onKeyDown={(e) => {
          if (!expandable) return;
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(!open); }
        }}
      >
        <div class="ttl">{title} {meta && <span class="sz">{meta}</span>}</div>
        {description && <div class={`desc ${open ? "" : "clamp"}`}>{description}</div>}
      </div>
      {action}
    </li>
  );
}
