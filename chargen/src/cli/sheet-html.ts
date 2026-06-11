// Self-contained HTML character sheet (embedded CSS, no external assets) — a
// printable, shareable companion to the Markdown export. Same data as sheet.ts;
// this is the presentation layer only. The freeform `notes` field is rendered
// through a tiny Markdown subset so fluff/goals keep their formatting.
import type { Character } from "../domain/character.ts";
import { type Budgets, computeBudgets } from "../domain/budgets.ts";
import { confidenceScore } from "../domain/modifiers.ts";
import { CHARACTERISTICS, CHARACTERISTIC_NAMES, FORMS, TECHNIQUES, ART_ABBR } from "../domain/glossary.ts";
import { magusTitle } from "./sheet.ts";

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const sign = (n: number): string => (n > 0 ? `+${n}` : `${n}`);

/** Minimal inline Markdown → HTML (bold, italic, code, links) on escaped text. */
function inline(s: string): string {
  return esc(s)
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

/** Block-level Markdown subset → HTML: headings, bullet lists, paragraphs. Line-
 *  based, so a heading directly above a list (no blank line) still parses. */
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

const STYLE = `
:root { --ink:#1c1a17; --muted:#6b6257; --line:#d8cfc0; --accent:#7a2e1d; --bg:#fbf8f3; }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--ink);
  font:15px/1.5 "Iowan Old Style",Palatino,Georgia,serif; }
main { max-width:820px; margin:0 auto; padding:2.5rem 1.5rem 4rem; }
h1 { font-size:2rem; margin:0 0 .2rem; color:var(--accent); }
h2 { font-size:1.1rem; text-transform:uppercase; letter-spacing:.06em;
  border-bottom:2px solid var(--line); padding-bottom:.25rem; margin:2rem 0 .8rem; }
.sub { color:var(--muted); margin:.1rem 0 1.4rem; }
.grid { display:grid; grid-template-columns:repeat(4,1fr); gap:.5rem; }
.stat { background:#fff; border:1px solid var(--line); border-radius:6px; padding:.5rem .6rem; }
.stat b { display:block; font-size:.7rem; text-transform:uppercase; color:var(--muted); letter-spacing:.04em; }
.stat span { font-size:1.25rem; font-weight:600; }
.arts { display:grid; grid-template-columns:repeat(5,1fr); gap:.4rem; }
.art { background:#fff; border:1px solid var(--line); border-radius:6px; padding:.35rem .4rem; text-align:center; }
.art b { display:block; font-size:.72rem; color:var(--accent); }
.art span { font-size:1.1rem; font-weight:600; }
ul { margin:.3rem 0; padding-left:1.2rem; }
li { margin:.15rem 0; }
.tag { color:var(--muted); }
.free { color:var(--muted); font-style:italic; }
table { border-collapse:collapse; width:100%; }
td { padding:.2rem .4rem; border-bottom:1px solid var(--line); vertical-align:top; }
td.lvl { width:3.5rem; color:var(--accent); font-weight:600; }
.notes { background:#fff; border:1px solid var(--line); border-radius:6px; padding:.2rem 1rem; }
.ledger { color:var(--muted); font-size:.85rem; margin-top:.4rem; }
`;

export function renderSheetHtml(ch: Character, b: Budgets = computeBudgets(ch)): string {
  const spec = [ch.favoredTechnique, ch.favoredForm].filter(Boolean).join(" ");
  const specialty = [spec, ch.focus ? `focus: ${ch.focus}` : ""].filter(Boolean).join(" / ") || "—";
  const conf = confidenceScore(ch);
  const free = ch.virtues.filter((v) => v.free);
  const vir = ch.virtues.filter((v) => !v.free);
  const flw = ch.flaws.filter((f) => !f.free);
  const abil = ch.abilities.filter((a) => a.stage !== "free");
  const freeAb = ch.abilities.filter((a) => a.stage === "free");

  const stats = CHARACTERISTICS.map((c) =>
    `<div class="stat" title="${CHARACTERISTIC_NAMES[c]}"><b>${c}</b><span>${sign(ch.characteristics[c] ?? 0)}</span></div>`).join("");
  const arts = [...TECHNIQUES, ...FORMS].map((a) =>
    `<div class="art"><b>${ART_ABBR[a]}</b><span>${ch.arts[a] ?? 0}</span></div>`).join("");
  const traitLi = (t: { display: string; size: string }) => `<li>${esc(t.display)} <span class="tag">(${t.size})</span></li>`;
  const spells = ch.spells.length
    ? `<table>${ch.spells.map((s) => `<tr><td class="lvl">${ART_ABBR[s.technique]}${ART_ABBR[s.form]} ${s.level}</td><td>${esc(s.name)}${s.inFocus ? ' <span class="tag">· in focus</span>' : ""}</td></tr>`).join("")}</table>`
    : "<p>—</p>";

  const body = `
  <h1>${esc(magusTitle(ch))}</h1>
  <p class="sub">${esc(ch.concept || "—")} · Age ${ch.age}${specialty !== "—" ? ` · ${esc(specialty)}` : ""}</p>

  <h2>Characteristics</h2>
  <div class="grid">${stats}</div>
  <p class="ledger">spent ${b.characteristics.spent} / ${b.characteristics.cap}</p>

  <h2>Virtues &amp; Flaws</h2>
  <p class="free">Free: ${free.map((v) => esc(v.display)).join("; ") || "—"}</p>
  <ul>${vir.map(traitLi).join("") || "<li>—</li>"}</ul>
  <p class="tag">Virtues ${b.virtuesFlaws.virtuePoints} pts ${b.virtuesFlaws.balanced ? "=" : "≠"} Flaws ${b.virtuesFlaws.flawPoints} pts</p>
  <ul>${flw.map(traitLi).join("") || "<li>—</li>"}</ul>

  <h2>Abilities</h2>
  ${ch.nativeLanguage ? `<p><strong>Native Language:</strong> ${esc(ch.nativeLanguage)} 5</p>` : ""}
  <ul>${abil.map((a) => `<li>${esc(a.name)} ${a.score}${a.specialty ? ` <span class="tag">(${esc(a.specialty)})</span>` : ""}</li>`).join("") || "<li>—</li>"}</ul>
  ${freeAb.length ? `<p class="free">Granted: ${freeAb.map((a) => `${esc(a.name)} ${a.score}`).join(", ")}</p>` : ""}
  <p class="ledger">xp — childhood ${b.childhood.spent}/${b.childhood.cap} · later life ${b.laterLife.spent}/${b.laterLife.cap} · apprenticeship ${b.apprenticeship.spent}/${b.apprenticeship.cap}</p>

  <h2>Arts</h2>
  <div class="arts">${arts}</div>

  <h2>Spells Known <span class="tag">(${b.apprenticeship.spells.spent} levels)</span></h2>
  ${spells}

  <h2>Personality · Reputation · Confidence</h2>
  <p>${ch.personality.map((p) => `${esc(p.trait)} ${sign(p.value)}`).join(", ") || "—"}<br>
  Reputation: ${ch.reputation ? esc(ch.reputation) : "—"} · Confidence ${conf.score} (${conf.points} points)</p>

  <h2>Notes &amp; Description</h2>
  <div class="notes">${ch.notes?.trim() ? markdown(ch.notes) : "<p>—</p>"}</div>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(magusTitle(ch))}</title>
<style>${STYLE}</style></head>
<body><main>${body}</main></body></html>`;
}
