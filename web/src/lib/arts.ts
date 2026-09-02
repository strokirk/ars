// The visual language for the Arts, plus canonicalisation of the noisier spell
// fields. Pure data + string helpers — no JSX, so it can be unit-tested and reused
// by any component.
import { TECHNIQUES, FORMS, ART_ABBR, type Technique, type Form } from "../../../chargen/src/domain/glossary.ts";

/**
 * One hue per Technique — the "verb" of a spell is what you scan for first, so it
 * carries the colour and the Form carries an icon. Chosen to read on parchment and
 * to stay distinguishable for the common red/green confusions (the five differ in
 * lightness as well as hue).
 */
export const TECHNIQUE_COLOR: Record<Technique, string> = {
  Creo: "#2f7d4f",       // creation, growth — green
  Intellego: "#2f6690",  // perception — blue
  Muto: "#6b4a86",       // change — violet
  Perdo: "#8e2b2b",      // destruction — deep red
  Rego: "#9a6b16",       // control — amber
};

/** A one-line gloss of what each Technique does, for tooltips and legends. */
export const TECHNIQUE_GLOSS: Record<Technique, string> = {
  Creo: "create", Intellego: "perceive", Muto: "transform", Perdo: "destroy", Rego: "control",
};

/** lucide-preact icon name per Form. Resolved to a component in components/ArtIcon.tsx. */
export const FORM_ICON: Record<Form, string> = {
  Animal: "PawPrint",
  Aquam: "Droplets",
  Auram: "Wind",
  Corpus: "PersonStanding",
  Herbam: "Leaf",
  Ignem: "Flame",
  Imaginem: "Eye",
  Mentem: "Brain",
  Terram: "Mountain",
  Vim: "Sparkles",
};

export const FORM_GLOSS: Record<Form, string> = {
  Animal: "beasts", Aquam: "water", Auram: "air & weather", Corpus: "the body",
  Herbam: "plants", Ignem: "fire & heat", Imaginem: "images & senses",
  Mentem: "the mind", Terram: "earth & stone", Vim: "magic itself",
};

const isTech = (s: string): s is Technique => (TECHNIQUES as readonly string[]).includes(s);
const isForm = (s: string): s is Form => (FORMS as readonly string[]).includes(s);

/** Technique colour for any Art name, or undefined for a Form. */
export const techniqueColor = (art: string): string | undefined =>
  isTech(art) ? TECHNIQUE_COLOR[art] : undefined;

export const formIcon = (art: string): string | undefined => (isForm(art) ? FORM_ICON[art] : undefined);

/**
 * "Creo", "Ignem" → "CrIg". Mixed case on purpose: the rulebook writes PeAn, and
 * uppercasing it to PEAN destroys the word boundary that makes it scannable.
 */
export function artPair(technique: string, form: string): string {
  const t = isTech(technique) ? ART_ABBR[technique] : technique.slice(0, 2);
  const f = isForm(form) ? ART_ABBR[form] : form.slice(0, 2);
  return `${t}${f}`;
}

// ── canonical Range / Duration / Target ──────────────────────────────────────
// The source Markdown is OCR'd, so these fields arrive spelled several ways
// ("Mom" and "Momentary", "Eve" for "Eye", "Ind Reg: Terram" for "Ind"). Filters
// have to group those, or the dropdowns fill with near-duplicates.

export const RANGES = ["Per", "Touch", "Eye", "Voice", "Sight", "Arc"] as const;
export const DURATIONS = ["Mom", "Conc", "Diam", "Sun", "Moon", "Year", "Ring", "Spec"] as const;
export const TARGETS = [
  "Ind", "Part", "Group", "Room", "Str", "Bound", "Circle",
  "Vision", "Hearing", "Smell", "Taste", "Touch", "Spec",
] as const;

export const RANGE_NAME: Record<string, string> = {
  Per: "Personal", Touch: "Touch", Eye: "Eye", Voice: "Voice", Sight: "Sight", Arc: "Arcane Connection",
};
export const DURATION_NAME: Record<string, string> = {
  Mom: "Momentary", Conc: "Concentration", Diam: "Diameter", Sun: "Sun",
  Moon: "Moon", Year: "Year", Ring: "Ring", Spec: "Special",
};
export const TARGET_NAME: Record<string, string> = {
  Ind: "Individual", Part: "Part", Group: "Group", Room: "Room", Str: "Structure",
  Bound: "Boundary", Circle: "Circle", Vision: "Vision", Hearing: "Hearing",
  Smell: "Smell", Taste: "Taste", Touch: "Touch", Spec: "Special",
};

/** Fold a raw field value onto its canonical abbreviation, or "" if unrecognised. */
function canonicalise(raw: string, table: readonly string[], names: Record<string, string>): string {
  const v = raw.trim();
  if (!v) return "";
  for (const key of table) {
    if (v.toLowerCase() === key.toLowerCase()) return key;
    if (v.toLowerCase() === names[key]!.toLowerCase()) return key;
    // "Ind Reg: Terram", "Sun & Year" — take the leading term.
    if (new RegExp(`^${key}\\b`, "i").test(v)) return key;
  }
  return "";
}

export const canonicalRange = (raw: string): string =>
  // "Eve" is an OCR slip for "Eye" and appears once in the data.
  canonicalise(/^eve$/i.test(raw.trim()) ? "Eye" : raw, RANGES, RANGE_NAME);
export const canonicalDuration = (raw: string): string => canonicalise(raw, DURATIONS, DURATION_NAME);
export const canonicalTarget = (raw: string): string => canonicalise(raw, TARGETS, TARGET_NAME);
