import {
  Sparkles, Crown, BookOpen, Drama, Moon, Wand2, Circle, Plus, Minus,
  type LucideProps,
} from "lucide-preact";
import type { ComponentType } from "preact";

// Category icons are presentational only — an unknown category falls back to a dot.
const CATEGORY_ICON: Record<string, ComponentType<LucideProps>> = {
  Hermetic: Wand2,
  "Social Status": Crown,
  Story: BookOpen,
  Personality: Drama,
  Supernatural: Moon,
  General: Circle,
};

export function CategoryIcon({ category, size = 14 }: { category: string; size?: number }) {
  const Icon = CATEGORY_ICON[category] ?? Sparkles;
  return <Icon size={size} aria-hidden="true" />;
}

/**
 * A Virtue/Flaw at a glance: direction (Virtues add, Flaws cost), the category
 * icon, and the size. Virtues read green, Flaws red — the same polarity the
 * budget meters use.
 */
export function TraitBadge({ kind, size, category }: { kind: "Virtue" | "Flaw"; size: string; category: string }) {
  const virtue = kind === "Virtue";
  return (
    <span class={`traitbadge ${virtue ? "virtue" : "flaw"}`} title={`${size} ${kind}${category ? ` · ${category}` : ""}`}>
      {virtue ? <Plus size={13} aria-hidden="true" /> : <Minus size={13} aria-hidden="true" />}
      <CategoryIcon category={category} size={13} />
      <span class="pair">{size === "Major or Minor" ? "Maj/Min" : size}</span>
    </span>
  );
}
