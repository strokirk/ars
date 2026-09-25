import { useMemo, useRef, useState } from "preact/hooks";
import type { Match } from "../router.ts";
import { navigate } from "../router.ts";
import { Button } from "../components/ui/Button.tsx";
import { Collapsible } from "../components/ui/Collapsible.tsx";
import { Issues } from "../components/Issues.tsx";
import { getDraft, saveDraft, newId, decodeCharacter } from "../store.ts";
import { rules, issuesOf, isCharacterLegal, type Character } from "../engine.ts";
import { rosterEntry } from "../lib/roster.ts";
import { renderSheetHtml } from "../../../chargen/src/cli/sheet-html.ts";
import { renderSheet } from "../../../chargen/src/cli/sheet.ts";
import { title } from "../charutil.ts";
import { CopyBox } from "../components/ui/CopyBox.tsx";

const sheetData = {
  traitDesc: (n: string) => rules.virtueFlawRow(n)?.description,
  spellDesc: (n: string) => rules.spell(n)?.description,
};

export function SheetView({ match }: { match: Match }) {
  const iframe = useRef<HTMLIFrameElement>(null);
  // Exports open inline (with a copy button) rather than dropping a file the user
  // then has to go find — on mobile especially, a download is a dead end.
  const [view, setView] = useState<"markdown" | "json" | null>(null);

  // Three sources feed the same sheet: a local draft (editable), a committed roster
  // member (read-only, but copyable into a draft), or a shared base64 link.
  const { ch, draftId, shared } = useMemo(() => {
    if (match.name === "sheet") {
      const d = getDraft(match.param!);
      return { ch: d?.character ?? null, draftId: match.param!, shared: false };
    }
    if (match.name === "roster") {
      return { ch: rosterEntry(match.param!)?.character ?? null, draftId: undefined, shared: true };
    }
    return { ch: decodeCharacter(match.param!), draftId: undefined, shared: true };
  }, [match.name, match.param]);

  if (!ch) {
    return (
      <div class="panel">
        <p>That character could not be loaded. <a href="#/" onClick={() => navigate("/")}>Back to the roster.</a></p>
      </div>
    );
  }

  const html = renderSheetHtml(ch, sheetData);
  const issues = issuesOf(ch);
  const legal = isCharacterLegal(ch);

  const saveCopy = () => {
    const id = newId();
    saveDraft(id, ch);
    navigate(`/edit/${id}`);
  };

  return (
    <div>
      <div class="toolbar" style="margin-bottom:.6rem;">
        {!shared && draftId && <Button size="small" variant="brand" appearance="accent" onClick={() => navigate(`/edit/${draftId}`)}>✎ Edit</Button>}
        {shared && <Button size="small" variant="brand" appearance="accent" onClick={saveCopy}>＋ Save to my drafts</Button>}
        {/* The two export views are toggles: the open one shows as filled. */}
        <Button size="small" appearance={view === "markdown" ? "filled" : "outlined"} onClick={() => setView(view === "markdown" ? null : "markdown")}>Markdown</Button>
        <Button size="small" appearance={view === "json" ? "filled" : "outlined"} onClick={() => setView(view === "json" ? null : "json")}>JSON</Button>
        <Button size="small" onClick={() => iframe.current?.contentWindow?.print()}>Print</Button>
      </div>

      {view && (
        <CopyBox
          label={view === "markdown" ? "Markdown sheet" : "Character JSON"}
          text={view === "markdown" ? renderSheet(ch) : JSON.stringify(ch, null, 2)}
        />
      )}

      {issues.length > 0 && (
        <Collapsible
          class="why"
          open={!legal}
          summary={
            legal
              ? <span style="color:var(--warn);">⚠ Rules-legal, with {issues.length} note{issues.length === 1 ? "" : "s"} worth a look</span>
              : <span style="color:var(--err);">✗ Not yet legal — {issues.length} issue{issues.length === 1 ? "" : "s"} (open it in the editor to finish)</span>
          }
        >
          <Issues issues={issues} />
        </Collapsible>
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
