// PLACEHOLDER DATA for the non-functional Downtime/Lab UI scaffold.
//
// None of this reads the totals engine, Subject model or data/seasons/*.yaml
// described in docs/DOWNTIME-PLAN.todo.md — those don't exist yet. Every
// number here is hand-typed to *look* like a computed outcome so the page can
// be reviewed for layout and interaction before any rules logic is wired up.
// Delete this file once ActivityBrowser reads real activities + totals.

export type DowntimeCategory = "lab" | "study" | "write" | "teach" | "service";

export const CATEGORY_LABEL: Record<DowntimeCategory, string> = {
  lab: "Lab",
  study: "Study",
  write: "Write",
  teach: "Teach",
  service: "Service",
};

// Muted, parchment-safe hues — one per category, distinct from the Technique
// palette so a mixed activity list doesn't read as spell-coded.
export const CATEGORY_COLOR: Record<DowntimeCategory, string> = {
  lab: "#7a2e1d",
  study: "#2e5f7a",
  write: "#3f7d4f",
  teach: "#6b3f8f",
  service: "#9a6b16",
};

export interface DemoActivity {
  key: string;
  name: string;
  category: DowntimeCategory;
  totalLabel: string;      // which total this runs on, e.g. "Lab Total"
  outcome: string;         // the one-line result, at the demo numbers below
  detail: string;
  book: string;
  locked?: string;         // present + reason if gated by a missing Virtue
}

export const DEMO_ACTIVITIES: DemoActivity[] = [
  {
    key: "invent-spell",
    name: "Invent a spell",
    category: "lab",
    totalLabel: "Lab Total",
    outcome: "up to level 37",
    detail: "One season, formulaic or ritual, Technique + Form of your choosing. The spell's level must not exceed your Lab Total for its Technique and Form.",
    book: "Core",
  },
  {
    key: "extract-vis",
    name: "Extract vis from the aura",
    category: "lab",
    totalLabel: "Lab Total (Creo Vim)",
    outcome: "3 pawns / season",
    detail: "Lab Total divided by ten, rounded down, capped by the aura's own strength — a weak aura limits the yield no matter how high the total climbs.",
    book: "Core",
  },
  {
    key: "charged-device",
    name: "Make a charged device",
    category: "lab",
    totalLabel: "Lab Total",
    outcome: "14 charges at level 15",
    detail: "One season per effect. The effect's level can't exceed the Lab Total; the number of charges is set by how much of the total goes unspent.",
    book: "Core",
  },
  {
    key: "invested-device",
    name: "Invested device — open & instill",
    category: "lab",
    totalLabel: "Lab Total",
    outcome: "18 levels / season",
    detail: "Opening a device for enchantment is one season. Instilling an effect spends Lab Total ÷ 2 levels per season toward the effect's total level — spread a large effect across as many seasons as it needs.",
    book: "Core",
  },
  {
    key: "longevity-ritual",
    name: "Longevity Ritual",
    category: "lab",
    totalLabel: "Lab Total (Creo Corpus)",
    outcome: "+6 to aging rolls · 8 pawns of vis",
    detail: "A ritual spell, one season, whose bonus to aging rolls is set by the Lab Total. Requires vis equal to the bonus granted.",
    book: "Core",
  },
  {
    key: "verditius-rune",
    name: "Craft a Verditius rune",
    category: "lab",
    totalLabel: "Lab Total",
    outcome: "requires Verditius Magic",
    detail: "House Verditius's runic enchantment lets a magus build an item's magical capacity ahead of investing effects into it.",
    book: "HoH: MC",
    locked: "Requires the Verditius Magic Virtue",
  },
  {
    key: "write-tractatus",
    name: "Write a tractatus",
    category: "write",
    totalLabel: "Book Quality",
    outcome: "Quality 11 · one season",
    detail: "A single-season book on one Art or Ability, limited to six per Art/Ability per lifetime. Quality is set by Communication and the author's score in the subject.",
    book: "Core",
  },
  {
    key: "write-summa",
    name: "Write a summa",
    category: "write",
    totalLabel: "Book Quality",
    outcome: "Level 15 · about 5 seasons",
    detail: "A multi-season book that can teach up to its own Level, limited by the author's own score in the subject. Longer and better than a tractatus, and the author can't write two on the same subject.",
    book: "Core",
  },
  {
    key: "copy-book",
    name: "Copy a book",
    category: "write",
    totalLabel: "Scribing",
    outcome: "≈1 season per 30 levels",
    detail: "Produces a duplicate of an existing book of the same Quality. Takes roughly a season for every thirty levels' worth of the original, rounded up.",
    book: "Core",
  },
  {
    key: "read-summa",
    name: "Read a summa",
    category: "study",
    totalLabel: "Source Quality",
    outcome: "+11 xp — Magic Theory 5 → 6, 4 spare",
    detail: "One season, xp equal to the book's Quality, capped by the book's Level for an Art or Ability you don't already exceed it in.",
    book: "Core",
  },
  {
    key: "practice",
    name: "Practice an Ability",
    category: "study",
    totalLabel: "flat",
    outcome: "+2 xp",
    detail: "A season spent alone with an Ability, no book or teacher required. Reliable, unglamorous, always available.",
    book: "Core",
  },
  {
    key: "teach",
    name: "Teach one student",
    category: "teach",
    totalLabel: "Teaching Total",
    outcome: "+14 xp to the student",
    detail: "One season. The teacher's Teaching Total sets the xp a single student gains, capped by the teacher's own score in what's being taught.",
    book: "Core",
  },
  {
    key: "covenant-service",
    name: "Covenant service",
    category: "service",
    totalLabel: "flat",
    outcome: "meets your season's obligation",
    detail: "A season given over to the covenant itself — maintaining the Aegis, running errands, keeping the library in order.",
    book: "Core",
  },
];

export const CATEGORIES: DowntimeCategory[] = ["lab", "study", "write", "teach", "service"];

export interface DemoAdjustment {
  id: string;
  label: string;
  value: number;
  scope: "activity" | "category" | "all";
}

export const DEMO_ADJUSTMENTS: DemoAdjustment[] = [
  { id: "library", label: "Good library (house rule)", value: 3, scope: "category" },
];

// ── Plan mode ────────────────────────────────────────────────────────────

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
  span: number;            // how many consecutive season columns, from `start`
  start: number;            // index into DEMO_SEASONS
  note: string;
  done?: boolean;
}

export const DEMO_PROJECT_BARS: DemoProjectBar[] = [
  { id: "ring", name: "Invest: Ring of Seeing", category: "lab", start: 0, span: 3, note: "18/season · 4 vis" },
  { id: "adventure", name: "Adventure", category: "service", start: 3, span: 1, note: "exposure only" },
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
