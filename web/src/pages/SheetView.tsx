import { useMemo, useRef, useState } from "preact/hooks";
import type { Match } from "../router.ts";
import { navigate } from "../router.ts";
import { getDraft, saveDraft, newId, encodeCharacter, decodeCharacter } from "../store.ts";
import { rules, isCharacterLegal, type Character } from "../engine.ts";
import { renderSheetHtml } from "../../../chargen/src/cli/sheet-html.ts";
import { renderSheet } from "../../../chargen/src/cli/sheet.ts";
import { title } from "../charutil.ts";
import { kebab } from "../../../chargen/src/cli/sheet.ts";

const sheetData = {
  traitDesc: (n: string) => rules.virtueFlawRow(n)?.description,
  spellDesc: (n: string) => rules.spell(n)?.description,
};

function download(filename: string, text: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function SheetView({ match }: { match: Match }) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const [copied, setCopied] = useState(false);

  const { ch, draftId, shared } = useMemo(() => {
    if (match.name === "sheet") {
      const d = getDraft(match.param!);
      return { ch: d?.character ?? null, draftId: match.param!, shared: false };
    }
    return { ch: decodeCharacter(match.param!), draftId: undefined as string | undefined, shared: true };
  }, [match.name, match.param]);

  if (!ch) {
    return (
      <div class="panel">
        <p>That character could not be loaded. <a href="#/" onClick={() => navigate("/")}>Back to the roster.</a></p>
      </div>
    );
  }

  const html = renderSheetHtml(ch, sheetData);
  const base = kebab(ch.name || "character");

  const copyShare = async () => {
    const link = `${location.origin}${location.pathname}#/c/${encodeCharacter(ch)}`;
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { prompt("Copy this shareable link:", link); }
  };

  const saveCopy = () => {
    const id = newId();
    saveDraft(id, ch);
    navigate(`/edit/${id}`);
  };

  return (
    <div>
      <div class="toolbar" style="margin-bottom:.6rem;">
        {!shared && draftId && <button class="btn btn-sm btn-primary" onClick={() => navigate(`/edit/${draftId}`)}>✎ Edit</button>}
        {shared && <button class="btn btn-sm btn-primary" onClick={saveCopy}>＋ Save to my drafts</button>}
        <button class="btn btn-sm" onClick={() => download(`${base}.md`, renderSheet(ch), "text/markdown")}>Markdown</button>
        <button class="btn btn-sm" onClick={() => download(`${base}.json`, JSON.stringify(ch, null, 2), "application/json")}>JSON</button>
        <button class="btn btn-sm" onClick={() => iframe.current?.contentWindow?.print()}>Print</button>
        <button class="btn btn-sm" onClick={copyShare}>{copied ? "✓ Link copied" : "Share link"}</button>
      </div>

      {!isCharacterLegal(ch) && (
        <div class="why" style="border-color:var(--warn); background:#f7f1e0;">
          <strong style="color:var(--warn);">Work in progress.</strong> This sheet isn't rules-legal yet — open it in the editor to finish.
        </div>
      )}

      <iframe
        ref={iframe}
        title={title(ch)}
        srcdoc={html}
        style="width:100%; border:1px solid var(--line); border-radius:12px; background:#fff; height:80vh;"
        onLoad={(e) => {
          const doc = (e.currentTarget as HTMLIFrameElement).contentWindow?.document;
          if (doc) (e.currentTarget as HTMLIFrameElement).style.height = doc.documentElement.scrollHeight + 40 + "px";
        }}
      />
    </div>
  );
}
