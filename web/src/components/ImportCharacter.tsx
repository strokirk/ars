import { useState } from "preact/hooks";
import { navigate } from "../router.ts";
import { newId, saveDraft } from "../store.ts";
import { rules } from "../engine.ts";
import { parseSheetMarkdown } from "../../../chargen/src/cli/sheet-import.ts";
import type { Character } from "../../../chargen/src/domain/character.ts";
import { Button } from "./ui/Button.tsx";

interface Parsed {
  character: Character;
  warnings: string[];
}

/** JSON export is exact; anything else is read as the Markdown sheet (sheet.ts's
 *  renderSheet), which round-trips but may skip a name the rules data doesn't know. */
function parseImport(text: string): Parsed {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed) as Partial<Character> | null;
    if (!parsed || typeof parsed !== "object" || !parsed.kind || !parsed.name) {
      throw new Error("That JSON doesn't look like an exported character.");
    }
    return { character: parsed as Character, warnings: [] };
  }
  return parseSheetMarkdown(trimmed, rules);
}

/** Paste a character's Markdown or JSON export and bring it back in as a new draft. */
export function ImportCharacter() {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Parsed | null>(null);

  const read = () => {
    setError(null);
    setPending(null);
    if (!text.trim()) return;
    try {
      setPending(parseImport(text));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that as a character.");
    }
  };

  const confirm = () => {
    if (!pending) return;
    const id = newId();
    saveDraft(id, pending.character);
    navigate(`/edit/${id}`);
  };

  return (
    <div class="card create-tile">
      <h3>Import a character</h3>
      <p>Paste a character's Markdown or JSON export (from "View sheet") to bring it back in as a new draft.</p>
      <textarea
        rows={5} value={text} placeholder="Paste Markdown or JSON here…"
        onInput={(e) => { setText((e.target as HTMLTextAreaElement).value); setPending(null); setError(null); }}
      />
      {error && <p class="note" style="color:var(--err);">{error}</p>}
      {pending && (
        <p class="note">
          Read <b>{pending.character.name || "Unnamed"}</b> ({pending.character.kind}).
          {pending.warnings.length > 0 && (
            <> Skipped {pending.warnings.length} thing{pending.warnings.length === 1 ? "" : "s"} it didn't recognize: {pending.warnings.join("; ")}</>
          )}
        </p>
      )}
      <div class="navrow" style="margin-top:0;">
        {!pending
          ? <Button variant="brand" appearance="accent" block onClick={read}>Read</Button>
          : <Button variant="brand" appearance="accent" block onClick={confirm}>Open in editor →</Button>}
      </div>
    </div>
  );
}
