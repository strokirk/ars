// Tiny hash router backed by a signal. Routes:
//   #/                home (roster + create + drafts)
//   #/new/:kind       wizard for a fresh grog | companion | magus
//   #/edit/:id        wizard resuming a saved draft
//   #/sheet/:id       finished-sheet view of a draft
//   #/c/:data         shared character (base64 in the hash)
import { signal } from "@preact/signals";

export const route = signal(parseHash());

function parseHash(): string {
  const h = location.hash.replace(/^#/, "");
  return h.length ? h : "/";
}

addEventListener("hashchange", () => { route.value = parseHash(); });

export function navigate(path: string): void {
  if (location.hash.replace(/^#/, "") === path) route.value = path;
  else location.hash = path;
  scrollTo(0, 0);
}

export interface Match { name: "home" | "new" | "edit" | "sheet" | "share" | "notfound"; param?: string; }

export function matchRoute(path: string): Match {
  const p = path.split("/").filter(Boolean); // ["new","grog"]
  if (p.length === 0) return { name: "home" };
  if (p[0] === "new" && p[1]) return { name: "new", param: p[1] };
  if (p[0] === "edit" && p[1]) return { name: "edit", param: p[1] };
  if (p[0] === "sheet" && p[1]) return { name: "sheet", param: p[1] };
  if (p[0] === "c" && p[1]) return { name: "share", param: p.slice(1).join("/") };
  return { name: "notfound" };
}
