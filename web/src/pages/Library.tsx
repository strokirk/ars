// The reference library: browse the rulebook's spells and Virtues & Flaws with no
// character in play. Same browser components the creator uses, minus the actions.
import { navigate } from "../router.ts";
import { SpellBrowser } from "../components/SpellBrowser.tsx";
import { TraitBrowser } from "../components/TraitBrowser.tsx";
import { rules } from "../engine.ts";

const TABS = [
  { key: "spells", label: "Spells" },
  { key: "virtues", label: "Virtues & Flaws" },
] as const;

export type LibraryTab = (typeof TABS)[number]["key"];

export function Library({ tab }: { tab?: string }) {
  const active: LibraryTab = TABS.some((t) => t.key === tab) ? (tab as LibraryTab) : "spells";
  return (
    <div>
      <div class="hero" style="margin:.8rem 0 1.2rem;">
        <h1 style="font-size:1.7rem;">The Library</h1>
        <p>
          {rules.spells.length} spells · {rules.virtuesFlaws.length} Virtues &amp; Flaws — Ars Magica, Definitive Edition
        </p>
      </div>

      <div class="tabs">
        {TABS.map((t) => (
          <button class={`tab ${active === t.key ? "on" : ""}`} key={t.key} onClick={() => navigate(`/library/${t.key}`)}>
            {t.label}
          </button>
        ))}
      </div>

      <div class="panel">
        {active === "spells" ? <SpellBrowser /> : <TraitBrowser />}
      </div>
    </div>
  );
}
