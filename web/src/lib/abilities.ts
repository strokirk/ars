// Pure logic behind the creator's Abilities step: what a character may take at a
// given stage, what the next point costs, and which data rows are placeholders the
// player still has to name. It mirrors the engine (ability-policy, costs, budgets)
// rather than second-guessing it, so the picker never offers a pick validate()
// will turn round and flag.
import { abilityXp, affinityXp } from "../../../chargen/src/domain/costs.ts";
import { ageAbilityMax } from "../../../chargen/src/domain/budgets.ts";
import { abilityAllowed } from "../../../chargen/src/domain/ability-policy.ts";
import type { Character } from "../../../chargen/src/domain/character.ts";
import type { Modifiers } from "../../../chargen/src/domain/modifiers.ts";
import type { Stage } from "../../../chargen/src/domain/glossary.ts";
import type { AbilityRow, AbilityType } from "../../../chargen/src/data/types.ts";

export const ABILITY_TYPES = ["General", "Academic", "Arcane", "Martial", "Supernatural"] as const;
export type AbilityTypeFilter = (typeof ABILITY_TYPES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  childhood: "Childhood",
  "later-life": "Later life",
  apprenticeship: "Apprenticeship",
  "post-gauntlet": "Post-gauntlet",
  free: "Granted",
};

/** A handful of rows carry no type at all (cross-reference stubs); they read General. */
export const typeLabel = (t: AbilityType): string => t ?? "General";

// ── xp arithmetic ────────────────────────────────────────────────────────────

/** Total xp tied up in an Ability at `score`, after any Affinity discount. */
export function abilityCost(name: string, score: number, mods: Modifiers): number {
  const raw = abilityXp(score);
  return mods.affinityAbility.has(name) ? affinityXp(raw) : raw;
}

/**
 * What the *next* point costs. Ability xp is quadratic (5, 15, 30, 50, 75…), so
 * 4 → 5 costs 25 where 1 → 2 costs 10 — the single most surprising thing about
 * spending a creation budget, and the reason the picker prints it on every row.
 */
export function xpToNext(name: string, score: number, mods: Modifiers): number {
  return abilityCost(name, score + 1, mods) - abilityCost(name, score, mods);
}

/** Highest score this Ability may reach at creation. An Affinity buys two more. */
export function abilityMax(ch: Character, name: string, mods: Modifiers): number {
  const max = ageAbilityMax(ch.age);
  return mods.affinityAbility.has(name) ? max + 2 : max;
}

// ── placeholder rows ─────────────────────────────────────────────────────────

/** A data row that names a shape rather than an Ability: "(Area) Lore", "Craft (Type)". */
export interface AbilityTemplate {
  /** Prompt shown once the player picks the row. */
  label: string;
  placeholder: string;
  /** Ready-made answers, where the rules name them. */
  choices?: readonly string[];
  /** Build the concrete Ability name from the player's answer. */
  build: (param: string) => string;
}

const TEMPLATES: Record<string, AbilityTemplate> = {
  "(area) lore": {
    label: "Which area?", placeholder: "e.g. Provence, the Rhine Tribunal",
    build: (p) => `${p} Lore`,
  },
  "(mystery cult) lore": {
    label: "Which Mystery Cult?", placeholder: "e.g. Bjornaer, Criamon",
    build: (p) => `${p} Lore`,
  },
  "(organization) lore": {
    label: "Which organization?", placeholder: "e.g. Order of Hermes, the Cistercians",
    build: (p) => `${p} Lore`,
  },
  "(dead language)": {
    label: "Which dead language?", placeholder: "Latin",
    choices: ["Latin", "Greek", "Hebrew"],
    build: (p) => p,
  },
  "craft (type)": {
    label: "Which craft?", placeholder: "e.g. Pottery, Carpentry",
    build: (p) => `Craft ${p}`,
  },
  "profession (type)": {
    label: "Which profession?", placeholder: "e.g. Scribe, Sailor",
    build: (p) => `Profession ${p}`,
  },
};

/** The template behind a row's name, if it is one. Matched by exact name — the
 *  parentheses in "Chirurgy (kie-RUHR-gee)" and "Enchanting (Ability)" are prose. */
export function abilityTemplate(name: string): AbilityTemplate | undefined {
  return TEMPLATES[name.trim().toLowerCase()];
}

/** The rules' suggested specialties for a row, as a list. */
export function specialtyHints(row: AbilityRow): string[] {
  return (row.specialties ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

// ── the browsable option list ────────────────────────────────────────────────

export interface AbilityOption {
  row: AbilityRow;
  /** Score already taken at the stage being browsed. */
  taken?: number;
  /** Other stages that already carry this Ability, labelled. */
  elsewhere?: string[];
  /** Why this stage can't take it — the engine's own wording. Undefined when it can. */
  blocked?: string;
  /** Set when the player has to name the specific Lore/Craft/language first. */
  template?: AbilityTemplate;
  /** In the caller's `recommended` list for this stage. */
  recommended?: boolean;
}

export interface AbilityQuery {
  search?: string;
  type?: AbilityTypeFilter | "";
  /** Drop blocked rows instead of listing them (disabled) at the bottom. */
  onlyAvailable?: boolean;
  /** Names to flag `recommended` and float to the top of the list. */
  recommended?: readonly string[];
}

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Annotate the Ability list for one stage of one character: what is already taken
 * (here or elsewhere), and what the stage refuses.
 *
 * Blocked rows stay in the list rather than being filtered out — a player hunting
 * for Single Weapon in childhood is better served by the reason than by an empty
 * result (unless `onlyAvailable` says otherwise) — but they always sort below
 * everything takeable, and recommended rows float to the top of what's left.
 */
export function abilityOptions(
  all: readonly AbilityRow[],
  ch: Character,
  stage: Stage,
  q: AbilityQuery = {},
): AbilityOption[] {
  const s = q.search ? norm(q.search) : undefined;
  const recommended = new Set((q.recommended ?? []).map(norm));
  const opts = all
    .filter((row) =>
      (!q.type || typeLabel(row.type) === q.type) &&
      (!s || norm(row.name).includes(s) || norm(row.description).includes(s)))
    .map((row): AbilityOption => {
      const mine = ch.abilities.filter((a) => norm(a.name) === norm(row.name));
      const here = mine.find((a) => a.stage === stage);
      const elsewhere = mine.filter((a) => a.stage !== stage).map((a) => STAGE_LABEL[a.stage]);
      const pol = abilityAllowed(ch, row.type, stage);
      return {
        row,
        taken: here?.score,
        elsewhere: elsewhere.length ? elsewhere : undefined,
        blocked: pol.allowed ? undefined : pol.reason,
        template: abilityTemplate(row.name),
        recommended: recommended.has(norm(row.name)) || undefined,
      };
    })
    .filter((o) => !q.onlyAvailable || !o.blocked);
  return opts.sort(
    (a, b) =>
      Number(Boolean(a.blocked)) - Number(Boolean(b.blocked)) ||
      Number(Boolean(b.recommended)) - Number(Boolean(a.recommended)) ||
      a.row.name.localeCompare(b.row.name),
  );
}
