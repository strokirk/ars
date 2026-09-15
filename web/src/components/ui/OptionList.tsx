import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";

/** Result list. Scrolls with the page — a nested scroll box hides the results. */
export function OptionList({ children, empty = "No matches." }: { children: ComponentChildren; empty?: string }) {
  const rows = Array.isArray(children) ? children.flat() : [children];
  const isEmpty = rows.filter(Boolean).length === 0;
  return <ul class="option-list">{isEmpty ? <li class="note">{empty}</li> : children}</ul>;
}

/**
 * One result: an aligned title, a small meta line carrying the badge and the
 * row's facts, a description that starts clamped to two lines and expands on
 * tap, and an optional action on the right.
 *
 * The badge sits on the meta line rather than before the title on purpose —
 * badges vary in width, and leading them would leave every title starting at a
 * different indent. The colour instead rides the row's left edge.
 */
export function OptionRow({
  title, badge, meta, description, action, accent, defaultOpen = false,
}: {
  title: ComponentChildren;
  /** Small identifier (an ArtBadge, a TraitBadge) opening the meta line. */
  badge?: ComponentChildren;
  meta?: ComponentChildren;
  description?: string;
  action?: ComponentChildren;
  /** Colour for the row's left edge — the list's at-a-glance category cue. */
  accent?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const expandable = Boolean(description);
  return (
    <li class="option" style={accent ? `--row:${accent}` : undefined}>
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
        <div class="ttl">{title}</div>
        {(badge || meta) && <div class="sz">{badge}{meta && <span class="facts">{meta}</span>}</div>}
        {description && <div class={`desc ${open ? "" : "clamp"}`}>{description}</div>}
      </div>
      {action}
    </li>
  );
}
