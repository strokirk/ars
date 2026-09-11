import type { ComponentChildren } from "preact";
import { useMemo, useState } from "preact/hooks";
import { ScrollText, Info } from "lucide-preact";
import {
  GUIDELINES, BOOKS, queryGuidelines, groupGuidelines, artNotesFor, formInfo,
  type Guideline, type GuidelineSort,
} from "../lib/guidelines.ts";
import { TECHNIQUE_COLOR } from "../lib/arts.ts";
import { TECHNIQUES, FORMS, ART_ABBR, type Technique } from "../../../chargen/src/domain/glossary.ts";
import { FilterBar, type ActiveFilter, type SortOption } from "./ui/FilterBar.tsx";
import { Select } from "./ui/Select.tsx";
import { OptionList, OptionRow, MoreRows, useVisibleCount } from "./ui/OptionList.tsx";
import { ArtBadge, FormIcon } from "./ui/ArtBadge.tsx";

const MAX_LEVELS = [5, 10, 15, 20, 25, 30, 40, 50];
const SORTS: SortOption<GuidelineSort>[] = [
  { value: "art", label: "Sort: Arts" },
  { value: "level", label: "Sort: Level ↑" },
  { value: "level-desc", label: "Sort: Level ↓" },
  { value: "effect", label: "Sort: A → Z" },
];

/**
 * Browse the guideline effects — what a given level buys, before Range, Duration and
 * Target are paid for. Same filter/paging chrome as the spell and trait browsers.
 *
 * Rows are grouped by Technique+Form, and each group leads with that pair's rules notes
 * (and the Form's base Individual), because a guideline read without them is misleading:
 * "create a mammal" at level 15 is a *pony-sized* mammal.
 *
 * `action` makes rows actionable — the designer passes a "Use this" button.
 */
export function GuidelineBrowser({
  action, pageSize = 80, onPick,
}: {
  action?: (g: Guideline) => ComponentChildren;
  pageSize?: number;
  /** Called when a row itself is activated, for the designer's tap-to-load. */
  onPick?: (g: Guideline) => void;
}) {
  const [search, setSearch] = useState("");
  const [technique, setTechnique] = useState("");
  const [form, setForm] = useState("");
  const [book, setBook] = useState("");
  const [maxLevel, setMaxLevel] = useState<number | "">("");
  const [includeGeneral, setIncludeGeneral] = useState(true);
  const [sort, setSort] = useState<GuidelineSort>("art");

  const matches = useMemo(
    () => queryGuidelines(GUIDELINES, {
      search, technique, form, book, includeGeneral, sort,
      maxLevel: maxLevel === "" ? undefined : maxLevel,
    }),
    [search, technique, form, book, maxLevel, includeGeneral, sort],
  );
  const { visible, hidden, showMore, showAll } = useVisibleCount(matches, pageSize);
  const groups = useMemo(() => groupGuidelines(visible, sort), [visible, sort]);

  const active: ActiveFilter[] = [
    technique && { label: technique, clear: () => setTechnique("") },
    form && { label: form, clear: () => setForm("") },
    book && { label: BOOKS.find((b) => b.key === book)?.abbr ?? book, clear: () => setBook("") },
    maxLevel !== "" && { label: `Level ≤ ${maxLevel}`, clear: () => setMaxLevel("") },
    !includeGeneral && { label: "No General", clear: () => setIncludeGeneral(true) },
  ].filter(Boolean) as ActiveFilter[];

  const clearAll = () => {
    setSearch(""); setTechnique(""); setForm(""); setBook("");
    setMaxLevel(""); setIncludeGeneral(true);
  };

  return (
    <div class="browser">
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Search guideline effects…"
        sort={sort}
        sorts={SORTS}
        onSort={setSort}
        active={active}
        onClear={clearAll}
        summary={
          <>
            {matches.length} guideline{matches.length === 1 ? "" : "s"}
            {hidden > 0 && ` · showing ${visible.length}`}
          </>
        }
      >
        <div class="artfilter" role="group" aria-label="Filter by Technique">
          <button class={`chip-toggle ${technique === "" ? "on" : ""}`} onClick={() => setTechnique("")}>
            All Techniques
          </button>
          {TECHNIQUES.map((t) => (
            <button
              key={t}
              class={`chip-toggle tech ${technique === t ? "on" : ""}`}
              style={`--tech:${TECHNIQUE_COLOR[t as Technique]}`}
              title={t}
              onClick={() => setTechnique(technique === t ? "" : t)}
            >
              <span class="ab">{ART_ABBR[t]}</span> {t}
            </button>
          ))}
        </div>
        <div class="artfilter" role="group" aria-label="Filter by Form">
          <button class={`chip-toggle ${form === "" ? "on" : ""}`} onClick={() => setForm("")}>
            All Forms
          </button>
          {FORMS.map((f) => (
            <button
              key={f}
              class={`chip-toggle ${form === f ? "on" : ""}`}
              title={f}
              onClick={() => setForm(form === f ? "" : f)}
            >
              <FormIcon form={f} size={14} /> {f}
            </button>
          ))}
        </div>
        <div class="chips">
          <Select
            label="Maximum level"
            pill
            active={maxLevel !== ""}
            value={String(maxLevel)}
            options={[
              { value: "", label: "Any level" },
              ...MAX_LEVELS.map((l) => ({ value: String(l), label: `Level ≤ ${l}` })),
            ]}
            onChange={(v) => setMaxLevel(v === "" ? "" : Number(v))}
          />
          {/* Only worth showing once a supplement is actually installed. */}
          {BOOKS.length > 1 && (
            <Select
              label="Book"
              pill
              active={Boolean(book)}
              value={book}
              options={[
                { value: "", label: "Every book" },
                ...BOOKS.map((b) => ({ value: b.key, label: b.name })),
              ]}
              onChange={setBook}
            />
          )}
          <button
            class={`chip-toggle ${!includeGeneral ? "on" : ""}`}
            title="General guidelines scale with the level of the spell"
            onClick={() => setIncludeGeneral(!includeGeneral)}
          >
            Hide General
          </button>
        </div>
      </FilterBar>

      <OptionList empty="No guidelines match these filters.">
        {groups.flatMap((g) => [
          g.label ? (
            <li
              class="group-head"
              key={`h-${g.key}`}
              style={g.technique ? `--tech:${TECHNIQUE_COLOR[g.technique as Technique]}` : undefined}
            >
              {g.technique && <i class="swatch" />}
              {g.label} <span class="n">{g.rows.length}</span>
            </li>
          ) : null,
          // The qualifying notes belong to an Art, so they only appear on Art groups.
          g.technique && g.form ? (
            <ArtNotes key={`n-${g.key}`} technique={g.technique} form={g.form} />
          ) : null,
          ...g.rows.map((row) => (
            <OptionRow
              key={row.id}
              title={row.effect}
              accent={TECHNIQUE_COLOR[row.technique as Technique]}
              badge={
                <ArtBadge
                  technique={row.technique}
                  form={row.form}
                  level={row.isGeneral ? "Gen" : row.level}
                />
              }
              meta={guidelineMeta(row)}
              action={
                action?.(row) ??
                (onPick ? (
                  <button type="button" class="btn btn-sm" onClick={() => onPick(row)}>
                    Use
                  </button>
                ) : undefined)
              }
            />
          )),
        ])}
      </OptionList>
      <MoreRows hidden={hidden} pageSize={pageSize} onMore={showMore} onAll={showAll} />
    </div>
  );
}

/** "base Individual · ritual · HoH:MC" — whatever this row actually needs saying. */
function guidelineMeta(g: Guideline): string {
  const parts: string[] = [];
  if (g.isGeneral) parts.push("scales with the spell's level");
  if (g.ritual) parts.push("ritual");
  if (BOOKS.length > 1) parts.push(BOOKS.find((b) => b.key === g.book)?.abbr ?? g.book);
  return parts.join(" · ");
}

/**
 * The prose the rulebook prints above a guideline table — requisites this pair always
 * needs, what its botches do, how its sizes work. Collapsed, because it is a wall of
 * text above every group, but one tap from the rows it qualifies.
 */
function ArtNotes({ technique, form }: { technique: string; form: string }) {
  const [open, setOpen] = useState(false);
  const notes = artNotesFor(technique, form);
  const size = formInfo(form);
  const count = notes.reduce((n, a) => n + a.notes.length, 0) + (size?.baseIndividual ? 1 : 0);
  if (!count) return null;

  return (
    <li class="art-notes" style={`--tech:${TECHNIQUE_COLOR[technique as Technique]}`}>
      <button type="button" class="art-notes-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <ScrollText size={13} aria-hidden="true" />
        {open ? "Hide" : "Show"} the {technique} {form} notes
        <span class="n">{count}</span>
      </button>
      {open && (
        <div class="art-notes-body">
          {size?.baseIndividual && (
            <p class="basesize">
              <b>Base Individual</b> — {size.baseIndividual}
            </p>
          )}
          {notes.flatMap((a) =>
            a.notes.map((n) =>
              n.startsWith("Community Gloss:") ? (
                <p class="gloss" key={n}>
                  <Info size={12} aria-hidden="true" /> {n.replace(/^Community Gloss:\s*/, "")}
                </p>
              ) : (
                <p key={n}>{n}</p>
              ),
            ),
          )}
        </div>
      )}
    </li>
  );
}
