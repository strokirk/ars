// The reference library: browse the rulebook's spells and Virtues & Flaws with no
// character in play. Same browser components the creator uses, minus the actions.
import { navigate } from "../router.ts";
import { SpellBrowser } from "../components/SpellBrowser.tsx";
import { TraitBrowser } from "../components/TraitBrowser.tsx";
import { rules } from "../engine.ts";
import { Sparkles, Scale, Library as LibraryIcon } from "lucide-preact";
import { TECHNIQUES, TECHNIQUE_LEGEND } from "../lib/legend.ts";

const TABS = [
  { key: "spells", label: "Spells", Icon: Sparkles },
  { key: "virtues", label: "Virtues & Flaws", Icon: Scale },
] as const;

export type LibraryTab = (typeof TABS)[number]["key"];

export function Library({ tab }: { tab?: string }) {
  const active: LibraryTab = TABS.some((t) => t.key === tab) ? (tab as LibraryTab) : "spells";
  return (
    <div>
      <div class="hero libhero">
        <h1><LibraryIcon size={26} aria-hidden="true" /> The Library</h1>
        <p>
          {rules.spells.length} spells · {rules.virtuesFlaws.length} Virtues &amp; Flaws — Ars Magica, Definitive Edition
        </p>
      </div>

      <div class="tabs">
        {TABS.map((t) => (
          <button class={`tab ${active === t.key ? "on" : ""}`} key={t.key} onClick={() => navigate(`/library/${t.key}`)}>
            <t.Icon size={16} aria-hidden="true" /> {t.label}
          </button>
        ))}
      </div>

      {active === "spells" && (
        <div class="legend" aria-label="Technique colours">
          {TECHNIQUES.map((t) => (
            <span class="legend-item" key={t} style={`--tech:${TECHNIQUE_LEGEND[t]!.color}`}>
              <i class="swatch" /> <b>{TECHNIQUE_LEGEND[t]!.abbr}</b> {t} <span class="note">— {TECHNIQUE_LEGEND[t]!.gloss}</span>
            </span>
          ))}
        </div>
      )}

      <div class="panel">
        {active === "spells" ? <SpellBrowser /> : <TraitBrowser />}
      </div>
    </div>
  );
}
