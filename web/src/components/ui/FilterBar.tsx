import type { ComponentChildren } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { SlidersHorizontal, Shuffle, X } from "lucide-preact";
import { SearchField } from "./SearchField.tsx";

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
  search, onSearch, placeholder,
  sort, sorts, onSort, onShuffle,
  lead, summary, active = [], onClear, children,
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
    const publish = () => document.documentElement.style.setProperty("--filterbar-h", `${el.offsetHeight}px`);
    publish();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div class={`filterbar ${open ? "open" : ""}`}>
      <div class="filterbar-row" ref={row}>
        <SearchField value={search} onInput={onSearch} placeholder={placeholder}>
          {lead}
          {sorts && sort !== undefined && onSort && (
            <select
              aria-label="Sort" class="pill-select" value={sort}
              onChange={(e) => onSort((e.target as HTMLSelectElement).value as S)}
            >
              {sorts.map((s) => <option value={s.value} key={s.value}>{s.label}</option>)}
            </select>
          )}
          {onShuffle && (
            <button class="chip-toggle" title="Shuffle again" onClick={onShuffle}>
              <Shuffle size={13} aria-hidden="true" /> Shuffle
            </button>
          )}
          {children && (
            <button
              class={`chip-toggle ${open || active.length ? "on" : ""}`}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              <SlidersHorizontal size={13} aria-hidden="true" /> Filters{active.length ? ` (${active.length})` : ""}
            </button>
          )}
        </SearchField>

        <div class="filterbar-meta">
          <p class="note count">{summary}</p>
          {active.map((f) => (
            <button class="active-chip" key={f.label} title={`Remove filter: ${f.label}`} onClick={f.clear}>
              {f.label} <X size={12} aria-hidden="true" />
            </button>
          ))}
          {(active.length > 0 || search) && onClear && (
            <button class="linkish" onClick={onClear}>Clear all</button>
          )}
        </div>
      </div>

      {open && children && (
        <div class="filterpanel">
          {children}
          <div class="filterpanel-foot">
            {onClear && <button class="chip-toggle" onClick={onClear}>Clear all</button>}
            <button class="chip-toggle" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
