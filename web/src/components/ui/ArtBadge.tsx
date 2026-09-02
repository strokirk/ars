import {
  PawPrint, Droplets, Wind, PersonStanding, Leaf, Flame, Eye, Brain, Mountain, Sparkles,
  type LucideProps,
} from "lucide-preact";
import type { ComponentType } from "preact";
import { TECHNIQUE_COLOR, TECHNIQUE_GLOSS, FORM_GLOSS, FORM_ICON, artPair } from "../../lib/arts.ts";
import type { Technique, Form } from "../../../../chargen/src/domain/glossary.ts";

const ICONS: Record<string, ComponentType<LucideProps>> = {
  PawPrint, Droplets, Wind, PersonStanding, Leaf, Flame, Eye, Brain, Mountain, Sparkles,
};

/** The Form's icon, or nothing for an unrecognised Form. */
export function FormIcon({ form, size = 15 }: { form: string; size?: number }) {
  const Icon = ICONS[FORM_ICON[form as Form] ?? ""];
  return Icon ? <Icon size={size} aria-hidden="true" /> : null;
}

/**
 * A spell's Technique/Form at a glance: the Form's icon, then the pair in mixed
 * case ("PeAn", never "PEAN" — uppercasing destroys the word boundary), with the
 * Technique half tinted by its own colour so a list can be scanned by Technique.
 */
export function ArtBadge({
  technique, form, level, title,
}: {
  technique: string;
  form: string;
  /** Rendered after the pair; pass "Gen" for General-level spells. */
  level?: number | string | null;
  title?: string;
}) {
  const pair = artPair(technique, form);
  const color = TECHNIQUE_COLOR[technique as Technique];
  const gloss = [
    TECHNIQUE_GLOSS[technique as Technique] && `${technique} — ${TECHNIQUE_GLOSS[technique as Technique]}`,
    FORM_GLOSS[form as Form] && `${form} — ${FORM_GLOSS[form as Form]}`,
  ].filter(Boolean).join(" · ");

  return (
    <span class="artbadge" style={color ? `--tech:${color}` : undefined} title={title ?? gloss}>
      <FormIcon form={form} />
      <span class="pair">
        <span class="t">{pair.slice(0, 2)}</span>{pair.slice(2)}
      </span>
      {level !== undefined && level !== null && <span class="lvl">{level}</span>}
    </span>
  );
}
