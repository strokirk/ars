import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { Button } from "./Button.tsx";

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

/**
 * Reveal a long result list a page at a time. `rows` doubles as the reset key —
 * a new filter or sort produces a new array, which starts the count over. The
 * key is stored *with* the count rather than reset from an effect: preact runs
 * effects after paint, so an effect-based reset can land on top of a click that
 * happened first and silently undo it.
 */
export function useVisibleCount<T>(rows: readonly T[], pageSize: number) {
  const [state, setState] = useState<{ key: readonly T[]; n: number }>({ key: rows, n: pageSize });
  const n = state.key === rows ? state.n : pageSize;
  return {
    visible: rows.slice(0, n),
    hidden: Math.max(0, rows.length - n),
    showMore: () => setState({ key: rows, n: n + pageSize }),
    showAll: () => setState({ key: rows, n: rows.length }),
  };
}

/** The footer that goes with `useVisibleCount` — nothing renders once all rows are out. */
export function MoreRows({
  hidden, pageSize, onMore, onAll,
}: {
  hidden: number;
  pageSize: number;
  onMore: () => void;
  onAll: () => void;
}) {
  if (hidden === 0) return null;
  return (
    <div class="more">
      <Button size="small" onClick={onMore}>Show {Math.min(pageSize, hidden)} more</Button>
      <Button size="small" appearance="plain" onClick={onAll}>Show all {hidden} remaining</Button>
    </div>
  );
}
