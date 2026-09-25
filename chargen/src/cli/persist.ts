// The only state I/O: load/save the character JSON file.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { type Character, migrateCharacter } from "../domain/character.ts";
import type { RulesData } from "../data/rules.ts";

export function characterExists(path: string): boolean {
  return existsSync(path);
}

export function loadCharacter(path: string, rules?: RulesData): Character {
  if (!existsSync(path)) {
    throw new Error(`No character file at ${path}. Create one with \`chargen new <name> --house <House>\` (or pass --char <path>).`);
  }
  const ch = JSON.parse(readFileSync(path, "utf8")) as Character;
  if (ch.schema !== 2) throw new Error(`Unsupported character schema ${ch.schema} in ${path}. Schema 2 is current; rebuild older characters with \`chargen build\`.`);
  return rules ? rules.refresh(ch) : migrateCharacter(ch);
}

export function saveCharacter(path: string, ch: Character): void {
  const dir = dirname(path);
  if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(ch, null, 2) + "\n", "utf8");
}
