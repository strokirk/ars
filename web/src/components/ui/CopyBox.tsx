import { useState } from "preact/hooks";

/**
 * Read-only text shown inline with a copy button — how the app hands over
 * Markdown/JSON exports instead of triggering a download the user then has to
 * go find on disk.
 */
export function CopyBox({ text, label, filename }: { text: string; label: string; filename?: string }) {
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

  const save = () => {
    if (!filename) return;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div class="copybox">
      <div class="copybox-head">
        <span class="note">{label} · {text.length.toLocaleString()} characters</span>
        <span class="copybox-actions">
          {filename && <button class="btn btn-sm btn-ghost" onClick={save}>Save file</button>}
          <button class="btn btn-sm btn-primary" onClick={copy}>{copied ? "✓ Copied" : "Copy"}</button>
        </span>
      </div>
      <textarea id="copybox-text" class="copybox-text" readOnly rows={18} value={text} onFocus={(e) => (e.target as HTMLTextAreaElement).select()} />
    </div>
  );
}
