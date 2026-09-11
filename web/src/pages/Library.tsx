// The reference library: browse the rulebook's spells and Virtues & Flaws with no
// character in play. Same browser components the creator uses, minus the actions.
import { navigate } from "../router.ts";
import { SpellBrowser } from "../components/SpellBrowser.tsx";
import { TraitBrowser } from "../components/TraitBrowser.tsx";
import { rules } from "../engine.ts";
import { Sparkles, Plus, Minus, ScrollText, Ruler, Wand2, Library as LibraryIcon } from "lucide-preact";
import { TECHNIQUES, TECHNIQUE_LEGEND } from "../lib/legend.ts";
import { Button } from "../components/ui/Button.tsx";
import { GuidelineBrowser } from "../components/GuidelineBrowser.tsx";
import { GuidelineLadder } from "../components/GuidelineLadder.tsx";
import { SpellDesigner } from "../components/SpellDesigner.tsx";
import { GUIDELINES } from "../lib/guidelines.ts";

// Virtues and Flaws get a tab each rather than a switch nested inside a tab.
const TABS = [
  { key: "spells", label: "Spells", Icon: Sparkles },
  { key: "guidelines", label: "Guidelines", Icon: ScrollText },
  { key: "parameters", label: "R / D / T", Icon: Ruler },
  { key: "design", label: "Design", Icon: Wand2 },
  { key: "virtues", label: "Virtues", Icon: Plus },
  { key: "flaws", label: "Flaws", Icon: Minus },
] as const;

export type LibraryTab = (typeof TABS)[number]["key"];

export function Library({ tab }: { tab?: string }) {
  const active: LibraryTab = TABS.some((t) => t.key === tab)
    ? (tab as LibraryTab)
    : "spells";
  return (
    <div>
      <div class="libhead">
        <h1>
          <LibraryIcon size={20} aria-hidden="true" /> The Library
        </h1>
        <p class="note">
          {rules.spells.length} spells · {GUIDELINES.length} guidelines ·{" "}
          {rules.virtuesFlaws.length} Virtues &amp; Flaws — Ars Magica, Definitive Edition
        </p>
      </div>

      <div class="tabs">
        {TABS.map((t) => (
          <Button
            variant="brand"
            appearance={active === t.key ? "accent" : "outlined"}
            key={t.key}
            onClick={() => navigate(`/library/${t.key}`)}
          >
            <t.Icon size={15} aria-hidden="true" slot="start" /> {t.label}
          </Button>
        ))}
      </div>

      {(active === "spells" || active === "guidelines" || active === "design") && (
        <div class="legend" aria-label="Technique colours">
          {TECHNIQUES.map((t) => (
            <span
              class="legend-item"
              key={t}
              style={`--tech:${TECHNIQUE_LEGEND[t]!.color}`}
              title={`${t} — ${TECHNIQUE_LEGEND[t]!.gloss}`}
            >
              <i class="swatch" /> <b>{TECHNIQUE_LEGEND[t]!.abbr}</b> {t}
            </span>
          ))}
        </div>
      )}

      {active === "spells" && <SpellBrowser />}
      {active === "guidelines" && <GuidelineBrowser />}
      {active === "parameters" && <GuidelineLadder />}
      {active === "design" && <SpellDesigner />}
      {(active === "virtues" || active === "flaws") && (
        <TraitBrowser kind={active === "flaws" ? "Flaw" : "Virtue"} />
      )}
    </div>
  );
}
