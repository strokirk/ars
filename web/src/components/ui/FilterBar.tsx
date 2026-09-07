import type { ComponentChildren } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { SlidersHorizontal, Shuffle, X } from "lucide-preact";
import { SearchField } from "./SearchField.tsx";
import { Select } from "./Select.tsx";
import { Button } from "./Button.tsx";

export interface SortOption<T extends string> {
  value: T;
  label: string;
}

/** One filter the user has switched on, with the handler that switches it off again. */
export interface ActiveFilter {
  label: string;
  clear: () => void;
}

/**
 * The sticky header every browsing list wears: search + sort in a bar that stays
 * put while the page scrolls, the bulky filter controls tucked into a panel that
 * opens under it and can be dismissed, and the active filters listed as removable
 * chips so nothing is silently narrowing the list while the panel is shut.
 *
 * Both browsers share it — the only difference is what goes in `children`.
 */
export function FilterBar<S extends string>({
  search,
  onSearch,
  placeholder,
  sort,
  sorts,
  onSort,
  onShuffle,
  lead,
  summary,
  active = [],
  onClear,
  children,
}: {
  search: string;
  onSearch: (v: string) => void;
  placeholder: string;
  sort?: S;
  sorts?: readonly SortOption<S>[];
  onSort?: (v: S) => void;
  /** Re-seeds a random ordering; render the control only when one is in effect. */
  onShuffle?: () => void;
  /** Controls that belong beside the search box rather than in the panel. */
  lead?: ComponentChildren;
  /** The result count, always visible. */
  summary: ComponentChildren;
  active?: ActiveFilter[];
  onClear?: () => void;
  /** The filter controls themselves, revealed by the Filters button. */
  children?: ComponentChildren;
}) {
  const [open, setOpen] = useState(false);
  const row = useRef<HTMLDivElement>(null);

  // Group headings stick below this bar, so publish the bar's own height rather
  // than guessing it — it wraps to two or three lines on a narrow screen.
  useLayoutEffect(() => {
    const el = row.current;
    if (!el) return;
    const publish = () =>
      document.documentElement.style.setProperty(
        "--filterbar-h",
        `${el.offsetHeight}px`,
      );
    publish();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div class={`filterbar ${open ? "open" : ""}`}>
      <div class="filterbar-row" ref={row}>
        <SearchField
          value={search}
          onInput={onSearch}
          placeholder={placeholder}
        >
          {lead}
          {sorts && sort !== undefined && onSort && (
            <Select
              label="Sort"
              pill
              value={sort}
              options={sorts}
              onChange={(v) => onSort(v as S)}
            />
          )}
          {onShuffle && (
            <Button title="Shuffle again" onClick={onShuffle}>
              <Shuffle size={13} aria-hidden="true" /> Shuffle
            </Button>
          )}
          {children && (
            <Button
              class={`${open || active.length ? "on" : ""}`}
              aria-expanded={open}
              size={"small"}
              appearance={open || active.length ? "accent" : "outlined"}
              variant="brand"
              onClick={() => setOpen(!open)}
            >
              <SlidersHorizontal size={13} aria-hidden="true" /> Filters
              {active.length ? ` (${active.length})` : ""}
            </Button>
          )}
        </SearchField>

        <div class="filterbar-meta">
          <p class="note count">{summary}</p>
          {active.map((f) => (
            <Button
              key={f.label}
              size={"small"}
              appearance="plain"
              variant="brand"
              title={`Remove filter: ${f.label}`}
              onClick={f.clear}
            >
              {f.label} <X size={12} aria-hidden="true" slot="end" />
            </Button>
          ))}
          {(active.length > 0 || search) && onClear && (
            <Button size={"small"} onClick={onClear}>
              Clear all
            </Button>
          )}
        </div>
      </div>

      {open && children && (
        <div class="filterpanel">
          {children}
        </div>
      )}
    </div>
  );
}
