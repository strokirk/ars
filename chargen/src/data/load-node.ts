// Node-only file-system loader for the committed data/*.json artifacts. Kept apart
// from rules.ts so that the pure RulesData class bundles for the browser unchanged
// (the web app builds `new RulesData(...)` from JSON it imports directly).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { AbilityRow, SpellRow, VirtueFlawRow } from "./types.ts";
import { RulesData } from "./rules.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
// chargen/src/data -> ../../../data == <repo>/data
const DEFAULT_DATA_DIR = join(HERE, "..", "..", "..", "data");

export function loadRules(dataDir: string = DEFAULT_DATA_DIR): RulesData {
  const read = <T>(file: string): T =>
    JSON.parse(readFileSync(join(dataDir, file), "utf8")) as T;
  return new RulesData(
    read<VirtueFlawRow[]>("virtues_flaws.json"),
    read<AbilityRow[]>("abilities.json"),
    read<SpellRow[]>("spells.json"),
  );
}
