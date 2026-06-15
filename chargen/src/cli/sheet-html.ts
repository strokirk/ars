// Self-contained HTML character sheet (embedded CSS + a little vanilla JS, no
// external assets). Companion to the Markdown export. Interactive niceties:
//  - Abilities and Spells sort on click (A–Z / score / level / Form).
//  - Traits and Spells expand to their full rules text WHERE WE HAVE IT — pass a
//    SheetData with description lookups (the CLI/site wire these from the rules DB).
//  - Arts are split into Techniques and Forms, each Art colour- and icon-coded.
//  - Virtues/Flaws are ordered Major→Minor then A–Z (hardcoded, no control).
import { type Character, type SpellPick, type TraitPick, type AbilityPick, charKind } from "../domain/character.ts";
import { type Budgets, computeBudgets } from "../domain/budgets.ts";
import { confidenceScore } from "../domain/modifiers.ts";
import {
  type Art, CHARACTERISTICS, CHARACTERISTIC_NAMES, FORMS, TECHNIQUES, ART_ABBR,
} from "../domain/glossary.ts";
import { magusTitle } from "./sheet.ts";

/** Optional description lookups, supplied by callers that have the rules data. */
export interface SheetData {
  /** Full rules text for a Virtue/Flaw by its canonical name (e.g. "Affinity with Art"). */
  traitDesc?: (canonical: string) => string | undefined;
  /** Full rules text for a spell by name. */
  spellDesc?: (name: string) => string | undefined;
}

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const sign = (n: number): string => (n > 0 ? `+${n}` : `${n}`);

/** Per-Art colour + a small relevant icon. */
const ART_THEME: Record<Art, { c: string; icon: string }> = {
  Creo: { c: "#3f8f5b", icon: "✦" }, Intellego: { c: "#3a6ea5", icon: "◎" },
  Muto: { c: "#8a5cb0", icon: "⟳" }, Perdo: { c: "#5a5550", icon: "☠" },
  Rego: { c: "#b08a2e", icon: "✋" },
  Animal: { c: "#8a6d3b", icon: "🐾" }, Aquam: { c: "#2f8fb0", icon: "💧" },
  Auram: { c: "#7fb6d6", icon: "🌬" }, Corpus: { c: "#c08a7a", icon: "🧍" },
  Herbam: { c: "#5a9e3f", icon: "🌿" }, Ignem: { c: "#c64a2e", icon: "🔥" },
  Imaginem: { c: "#b07fb0", icon: "🎭" }, Mentem: { c: "#9a7bc0", icon: "🧠" },
  Terram: { c: "#8a7a5a", icon: "⛰" }, Vim: { c: "#6a6fb0", icon: "✨" },
};

/** Minimal inline Markdown → HTML (bold, italic, code, links) on escaped text. */
function inline(s: string): string {
  return esc(s)
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

/** Block-level Markdown subset → HTML: headings, bullet lists, paragraphs. */
function markdown(src: string): string {
  const html: string[] = [];
  let para: string[] = [];
  let inList = false;
  const flushPara = () => { if (para.length) { html.push(`<p>${para.map(inline).join("<br>")}</p>`); para = []; } };
  const closeList = () => { if (inList) { html.push("</ul>"); inList = false; } };
  for (const raw of src.replace(/\r\n/g, "\n").trim().split("\n")) {
    const line = raw.trimEnd();
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (h) { flushPara(); closeList(); html.push(`<h${h[1]!.length + 2}>${inline(h[2]!)}</h${h[1]!.length + 2}>`); }
    else if (li) { flushPara(); if (!inList) { html.push("<ul>"); inList = true; } html.push(`<li>${inline(li[1]!)}</li>`); }
    else if (line === "") { flushPara(); closeList(); }
    else { closeList(); para.push(line); }
  }
  flushPara(); closeList();
  return html.join("\n");
}

const SIZE_RANK: Record<string, number> = { Major: 0, Minor: 1, Free: 2 };

function traitItem(t: TraitPick, data: SheetData): string {
  const head = `${esc(t.display)} <span class="tag">(${t.size})</span>`;
  const desc = data.traitDesc?.(t.name);
  return desc
    ? `<details class="row"><summary>${head}</summary><div class="desc">${esc(desc)}</div></details>`
    : `<div class="row flat">${head}</div>`;
}

function spellItem(s: SpellPick, data: SheetData): string {
  const tf = `${ART_ABBR[s.technique]}${ART_ABBR[s.form]}`;
  const head = `<span class="lvl">${tf} ${s.level}</span> ${esc(s.name)}${s.inFocus ? ' <span class="tag">· in focus</span>' : ""}`;
  const attrs = `data-name="${esc(s.name.toLowerCase())}" data-level="${s.level}" data-tf="${tf}"`;
  const desc = data.spellDesc?.(s.name);
  return desc
    ? `<details class="row" ${attrs}><summary>${head}</summary><div class="desc">${esc(desc)}</div></details>`
    : `<div class="row flat" ${attrs}>${head}</div>`;
}

function abilityItem(a: AbilityPick): string {
  return `<li data-name="${esc(a.name.toLowerCase())}" data-score="${a.score}">${esc(a.name)} ${a.score}${a.specialty ? ` <span class="tag">(${esc(a.specialty)})</span>` : ""}</li>`;
}

function artChip(a: Art, score: number): string {
  const t = ART_THEME[a];
  return `<div class="art" style="--c:${t.c}"><span class="ic">${t.icon}</span><b>${ART_ABBR[a]}</b><span class="sc">${score}</span></div>`;
}

const STYLE = `
:root { --ink:#1c1a17; --muted:#6b6257; --line:#d8cfc0; --accent:#7a2e1d; --bg:#fbf8f3; }
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.5 "Iowan Old Style",Palatino,Georgia,serif; }
main { max-width:820px; margin:0 auto; padding:2.5rem 1.5rem 4rem; }
h1 { font-size:2rem; margin:0 0 .2rem; color:var(--accent); }
h2 { font-size:1.1rem; text-transform:uppercase; letter-spacing:.06em; border-bottom:2px solid var(--line); padding-bottom:.25rem; margin:2rem 0 .8rem;
  display:flex; align-items:baseline; gap:.6rem; flex-wrap:wrap; }
h3.sub { font-size:.78rem; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); margin:1rem 0 .4rem; }
.sub { color:var(--muted); margin:.1rem 0 1.4rem; }
.grid { display:grid; grid-template-columns:repeat(4,1fr); gap:.5rem; }
.stat { background:#fff; border:1px solid var(--line); border-radius:6px; padding:.5rem .6rem; }
.stat b { display:block; font-size:.7rem; text-transform:uppercase; color:var(--muted); letter-spacing:.04em; }
.stat span { font-size:1.25rem; font-weight:600; }
.arts { display:grid; grid-template-columns:repeat(5,1fr); gap:.4rem; }
.art { display:flex; align-items:center; gap:.35rem; background:#fff; border:1px solid var(--line);
  border-left:4px solid var(--c); border-radius:6px; padding:.35rem .5rem; }
.art .ic { font-size:.95rem; line-height:1; filter:saturate(.85); }
.art b { color:var(--c); font-size:.9rem; }
.art .sc { margin-left:auto; font-size:1.05rem; font-weight:600; }
ul { margin:.3rem 0; padding-left:1.2rem; } li { margin:.15rem 0; }
ul.sortable { list-style:none; padding-left:0; columns:2; column-gap:1.4rem; }
ul.sortable li { break-inside:avoid; }
.tag { color:var(--muted); }
.free { color:var(--muted); font-style:italic; }
.row { margin:.1rem 0; }
details.row > summary { cursor:pointer; list-style:revert; }
details.row > summary:hover { color:var(--accent); }
.row.flat { color:var(--ink); }
.desc { margin:.35rem 0 .6rem 1rem; padding:.5rem .8rem; border-left:3px solid var(--line);
  color:#3c3630; font-size:.92rem; white-space:pre-wrap; }
.lvl { color:var(--accent); font-weight:600; display:inline-block; min-width:4.2rem; }
.ctl { font-size:.78rem; color:var(--muted); font-family:system-ui,sans-serif; text-transform:none; letter-spacing:0; font-weight:400; }
.ctl button { font:inherit; color:var(--muted); background:#f3ece0; border:1px solid var(--line);
  border-radius:999px; padding:.12rem .6rem; margin-left:.25rem; cursor:pointer; }
.ctl button:hover { border-color:var(--accent); color:var(--accent); }
.ctl button.on { background:var(--accent); color:#fff; border-color:var(--accent); }
.notes { background:#fff; border:1px solid var(--line); border-radius:6px; padding:.2rem 1rem; }
.ledger { color:var(--muted); font-size:.85rem; margin-top:.4rem; }
`;

const SCRIPT = `
(function () {
  function key(el, k) {
    if (k === "name") return el.dataset.name || "";
    if (k === "tf") return el.dataset.tf || "";
    if (k === "score") return -Number(el.dataset.score);   // high → low
    if (k === "level") return Number(el.dataset.level);     // low → high
    return "";
  }
  document.querySelectorAll("button[data-sort]").forEach(function (b) {
    b.addEventListener("click", function () {
      var box = document.getElementById(b.dataset.tgt);
      var items = Array.prototype.slice.call(box.children);
      items.sort(function (x, y) { var a = key(x, b.dataset.sort), c = key(y, b.dataset.sort); return a < c ? -1 : a > c ? 1 : 0; });
      items.forEach(function (i) { box.appendChild(i); });
      b.parentElement.querySelectorAll("button").forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on");
    });
  });
})();
`;

export function renderSheetHtml(ch: Character, data: SheetData = {}, b: Budgets = computeBudgets(ch)): string {
  const magus = charKind(ch) === "magus";
  const hasConfidence = charKind(ch) !== "grog"; // companions & magi have Confidence; grogs don't
  const spec = [ch.favoredTechnique, ch.favoredForm].filter(Boolean).join(" ");
  const specialty = [spec, ch.focus ? `focus: ${ch.focus}` : ""].filter(Boolean).join(" / ") || "—";
  const conf = confidenceScore(ch);
  const free = ch.virtues.filter((v) => v.free);
  const bySize = (a: TraitPick, c: TraitPick) => (SIZE_RANK[a.size]! - SIZE_RANK[c.size]!) || a.display.localeCompare(c.display);
  const vir = ch.virtues.filter((v) => !v.free).sort(bySize);
  const flw = ch.flaws.filter((f) => !f.free).sort(bySize);
  const abil = ch.abilities.filter((a) => a.stage !== "free").sort((a, c) => a.name.localeCompare(c.name));
  const freeAb = ch.abilities.filter((a) => a.stage === "free");
  const spells = [...ch.spells].sort((a, c) => a.level - c.level);

  const stats = CHARACTERISTICS.map((c) =>
    `<div class="stat" title="${CHARACTERISTIC_NAMES[c]}"><b>${c}</b><span>${sign(ch.characteristics[c] ?? 0)}</span></div>`).join("");

  const body = `
  <h1>${esc(magusTitle(ch))}</h1>
  <p class="sub">${esc(ch.concept || "—")} · Age ${ch.age}${specialty !== "—" ? ` · ${esc(specialty)}` : ""}</p>

  <h2>Characteristics</h2>
  <div class="grid">${stats}</div>
  <p class="ledger">spent ${b.characteristics.spent} / ${b.characteristics.cap}</p>

  <h2>Virtues &amp; Flaws</h2>
  <p class="free">Free: ${free.map((v) => esc(v.display)).join("; ") || "—"}</p>
  <h3 class="sub">Virtues · ${b.virtuesFlaws.virtuePoints} pts</h3>
  ${vir.map((v) => traitItem(v, data)).join("") || '<div class="row flat">—</div>'}
  <h3 class="sub">Flaws · ${b.virtuesFlaws.flawPoints} pts ${b.virtuesFlaws.balanced ? "(balanced)" : "(unbalanced)"}</h3>
  ${flw.map((f) => traitItem(f, data)).join("") || '<div class="row flat">—</div>'}

  <h2>Abilities <span class="ctl">sort: <button data-sort="name" data-tgt="abilities" class="on">A–Z</button><button data-sort="score" data-tgt="abilities">score</button></span></h2>
  ${ch.nativeLanguage ? `<p><strong>Native Language:</strong> ${esc(ch.nativeLanguage)} 5</p>` : ""}
  <ul id="abilities" class="sortable">${abil.map(abilityItem).join("") || "<li>—</li>"}</ul>
  ${freeAb.length ? `<p class="free">Granted: ${freeAb.map((a) => `${esc(a.name)} ${a.score}`).join(", ")}</p>` : ""}
  <p class="ledger">xp — childhood ${b.childhood.spent}/${b.childhood.cap} · later life ${b.laterLife.spent}/${b.laterLife.cap}${magus ? ` · apprenticeship ${b.apprenticeship.spent}/${b.apprenticeship.cap}` : ""}</p>

  ${magus ? `<h2>Arts</h2>
  <h3 class="sub">Techniques</h3>
  <div class="arts">${TECHNIQUES.map((t) => artChip(t, ch.arts[t] ?? 0)).join("")}</div>
  <h3 class="sub">Forms</h3>
  <div class="arts">${FORMS.map((f) => artChip(f, ch.arts[f] ?? 0)).join("")}</div>

  <h2>Spells Known <span class="tag">(${b.apprenticeship.spells.spent} levels)</span>${spells.length ? ` <span class="ctl">sort: <button data-sort="level" data-tgt="spells" class="on">level</button><button data-sort="name" data-tgt="spells">A–Z</button><button data-sort="tf" data-tgt="spells">Form</button></span>` : ""}</h2>
  <div id="spells">${spells.map((s) => spellItem(s, data)).join("") || '<div class="row flat">—</div>'}</div>` : ""}

  <h2>Personality · Reputation${hasConfidence ? " · Confidence" : ""}</h2>
  <p>${ch.personality.map((p) => `${esc(p.trait)} ${sign(p.value)}`).join(", ") || "—"}<br>
  Reputation: ${ch.reputation ? esc(ch.reputation) : "—"}${hasConfidence ? ` · Confidence ${conf.score} (${conf.points} points)` : ""}</p>

  <h2>Notes &amp; Description</h2>
  <div class="notes">${ch.notes?.trim() ? markdown(ch.notes) : "<p>—</p>"}</div>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(magusTitle(ch))}</title>
<style>${STYLE}</style></head>
<body><main>${body}</main><script>${SCRIPT}</script></body></html>`;
}
