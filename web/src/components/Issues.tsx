import type { Issue } from "../engine.ts";

/**
 * Render validation issues, optionally scoped to budget keys. Errors first. With
 * `onDismiss`, each can be accepted (it stops counting against legality) and the
 * accepted ones listed below with a way back.
 */
export function Issues({ issues, budgets, onDismiss }: {
  issues: Issue[];
  budgets?: readonly string[];
  onDismiss?: (code: string, dismissed: boolean) => void;
}) {
  const scoped = (budgets ? issues.filter((i) => budgets.includes(i.budget)) : issues)
    .slice()
    .sort((a, b) => (a.level === b.level ? 0 : a.level === "error" ? -1 : 1));
  const live = scoped.filter((i) => !i.dismissed);
  // One code can repeat (an age cap per Ability); dismissal is per code.
  const dismissed = [...new Map(scoped.filter((i) => i.dismissed).map((i) => [i.code, i])).values()];
  if (live.length === 0 && dismissed.length === 0) return null;
  return (
    <>
      <ul class="issues">
        {live.map((i, n) => (
          <li class={`issue ${i.level}`} key={`${i.code}-${n}`}>
            <span class="ico">{i.level === "error" ? "✗" : "⚠"}</span>
            <span>{i.message}</span>
            {onDismiss && <button class="linkish dismiss" title="Accept this and stop flagging it" onClick={() => onDismiss(i.code, true)}>Dismiss</button>}
          </li>
        ))}
      </ul>
      {dismissed.length > 0 && (
        <p class="note dismissed">
          Dismissed: {dismissed.map((i, n) => (
            <span key={i.code}>
              {n > 0 && " · "}
              <span title={i.message}>{i.message.split(/[.:—]/)[0]}</span>
              {onDismiss && <> <button class="linkish" onClick={() => onDismiss(i.code, false)}>restore</button></>}
            </span>
          ))}
        </p>
      )}
    </>
  );
}
