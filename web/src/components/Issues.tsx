import type { Issue } from "../engine.ts";

/**
 * Render validation issues, optionally scoped to budget keys. Errors first; info
 * (facts like starting Warping) as plain lines. With `onDismiss`, warnings can be
 * accepted (they stop counting) and are listed in an "N dismissed" disclosure with a
 * way back — errors never. With `goTo`, each issue links to the step that fixes it
 * (`goTo` returns undefined when there's nowhere else to go).
 */
export function Issues({ issues, budgets, onDismiss, goTo, goLabel = "Go" }: {
  issues: Issue[];
  budgets?: readonly string[];
  onDismiss?: (code: string, dismissed: boolean) => void;
  goTo?: (i: Issue) => (() => void) | undefined;
  goLabel?: string;
}) {
  const scoped = (budgets ? issues.filter((i) => budgets.includes(i.budget)) : issues)
    .slice()
    .sort((a, b) => (a.level === b.level ? 0 : a.level === "error" ? -1 : 1));
  const facts = scoped.filter((i) => i.level === "info");
  const live = scoped.filter((i) => i.level !== "info" && !i.dismissed);
  // One code can repeat (an age cap per Ability); dismissal is per code.
  const dismissed = [...new Map(scoped.filter((i) => i.dismissed).map((i) => [i.code, i])).values()];
  if (scoped.length === 0) return null;
  return (
    <>
      {facts.map((i) => <p class="note fact" key={i.code}>{i.message}</p>)}
      {live.length > 0 && (
        <ul class="issues">
          {live.map((i, n) => {
            const go = goTo?.(i);
            return (
              <li class={`issue ${i.level}`} key={`${i.code}-${n}`}>
                <span class="ico">{i.level === "error" ? "✗" : "⚠"}</span>
                <span>{i.message}</span>
                <span class="issue-acts">
                  {go && <button class="linkish" onClick={go}>{goLabel}</button>}
                  {onDismiss && i.level === "warning" && <button class="linkish" title="Accept this and stop flagging it" onClick={() => onDismiss(i.code, true)}>Dismiss</button>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {dismissed.length > 0 && (
        <details class="note dismissed">
          <summary>{dismissed.length} dismissed</summary>
          <ul class="issues">
            {dismissed.map((i) => (
              <li class="issue" key={i.code}>
                <span>{i.message}</span>
                {onDismiss && <span class="issue-acts"><button class="linkish" onClick={() => onDismiss(i.code, false)}>Restore</button></span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
