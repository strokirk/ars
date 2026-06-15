import type { Issue } from "../engine.ts";

/** Render validation issues, optionally scoped to one budget key. Errors first. */
export function Issues({ issues, budget }: { issues: Issue[]; budget?: string }) {
  const list = (budget ? issues.filter((i) => i.budget === budget) : issues)
    .slice()
    .sort((a, b) => (a.level === b.level ? 0 : a.level === "error" ? -1 : 1));
  if (list.length === 0) return null;
  return (
    <ul class="issues">
      {list.map((i, n) => (
        <li class={`issue ${i.level}`} key={`${i.code}-${n}`}>
          <span class="ico">{i.level === "error" ? "✗" : "⚠"}</span>
          <span>{i.message}</span>
        </li>
      ))}
    </ul>
  );
}
