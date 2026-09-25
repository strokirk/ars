import { useState } from "preact/hooks";
import { Button } from "./Button.tsx";

/**
 * Read-only text shown inline with a copy button — how the app hands over
 * Markdown/JSON exports instead of triggering a download the user then has to
 * go find on disk.
 */
export function CopyBox({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API needs a secure context and permission; fall back to a
      // selection the user can copy by hand.
      const el = document.getElementById("copybox-text") as HTMLTextAreaElement | null;
      el?.select();
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div class="copybox">
      <div class="copybox-head">
        <span class="note">{label} · {text.length.toLocaleString()} characters</span>
        <Button size="small" variant="brand" appearance="accent" onClick={copy}>{copied ? "✓ Copied" : "Copy"}</Button>
      </div>
      <textarea id="copybox-text" class="copybox-text" readOnly rows={18} value={text} onFocus={(e) => (e.target as HTMLTextAreaElement).select()} />
    </div>
  );
}
