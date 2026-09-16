// PLACEHOLDER DATA for Plan mode only. Browse mode now reads real activities and
// totals from lib/seasons.ts (see data/seasons/core.yaml) — this file used to hold
// its demo data too, but that's gone now that it's real. Plan mode's season grid
// (multi-season project assignment) is still a future phase — see
// docs/DOWNTIME-PLAN.todo.md — so its numbers stay illustrative until then.
import { CATEGORY_COLOR, type DowntimeCategory } from "./seasons.ts";

export interface DemoSeasonCell {
  year: number;
  season: "Spring" | "Summer" | "Autumn" | "Winter";
}

export const DEMO_SEASONS: DemoSeasonCell[] = [
  { year: 1221, season: "Spring" },
  { year: 1221, season: "Summer" },
  { year: 1221, season: "Autumn" },
  { year: 1221, season: "Winter" },
  { year: 1222, season: "Spring" },
];

export interface DemoProjectBar {
  id: string;
  name: string;
  category: DowntimeCategory;
  span: number;             // how many consecutive season columns, from `start`
  start: number;             // index into DEMO_SEASONS
  note: string;
  done?: boolean;
}

export const DEMO_PROJECT_BARS: DemoProjectBar[] = [
  { id: "ring", name: "Invest: Ring of Seeing", category: "lab", start: 0, span: 3, note: "18/season · 4 vis" },
  { id: "adventure", name: "Adventure", category: "study", start: 3, span: 1, note: "exposure only" },
  { id: "ring2", name: "Ring of Seeing (cont.)", category: "lab", start: 4, span: 1, note: "done ✓", done: true },
];

export interface DemoProject {
  id: string;
  name: string;
  category: DowntimeCategory;
  goalLabel: string;
  progressPct: number;
  status: string;
  blocked?: string;
}

export const DEMO_PROJECTS: DemoProject[] = [
  { id: "ring", name: "Ring of Seeing", category: "lab", goalLabel: "50 levels", progressPct: 72, status: "36/50 · 1 season left" },
  { id: "summa", name: "Summa on Creo", category: "write", goalLabel: "Level 15", progressPct: 0, status: "not started · 5 seasons" },
  { id: "pilum", name: "Pilum of Fire (CrIg 60)", category: "lab", goalLabel: "level 60", progressPct: 0, status: "", blocked: "needs Lab Total 60, you have 37" },
];

export const DEMO_GAINS = [
  { label: "Items", text: "Ring of Seeing (50 levels invested)" },
  { label: "Vis", text: "−4 pawns" },
  { label: "Books", text: "Tractatus on Creo, Quality 11" },
  { label: "Experience", text: "+11 xp → Magic Theory 5 → 6 (4 spare)" },
];

export const DEMO_WARNING = "Winter 1221 has no project assigned — exposure xp only.";

export { CATEGORY_COLOR };
