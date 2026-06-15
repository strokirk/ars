// Browser-side rules data: build the pure RulesData engine from the repo's committed
// data/*.json (Vite bundles JSON imports), reusing the exact same class the CLI uses.
import { RulesData } from "../../chargen/src/data/rules.ts";
import type { AbilityRow, SpellRow, VirtueFlawRow } from "../../chargen/src/data/types.ts";
import virtuesFlaws from "../../data/virtues_flaws.json";
import abilities from "../../data/abilities.json";
import spells from "../../data/spells.json";

export const rules = new RulesData(
  virtuesFlaws as VirtueFlawRow[],
  abilities as AbilityRow[],
  spells as SpellRow[],
);
