// Static-site generator for the covenant roster. Reads the committed characters/*.json,
// renders each through the chargen HTML sheet renderer into site/characters/<name>.html,
// and emits site/index.html — a gallery plus a (non-functioning) "create" section.
//
//   node site/build.ts
//
// Pure build step, no deps beyond the chargen domain. Re-run after adding characters.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Character } from "../chargen/src/domain/character.ts";
import { renderSheetHtml } from "../chargen/src/cli/sheet-html.ts";
import { magusTitle, kebab } from "../chargen/src/cli/sheet.ts";
import { ART_ABBR } from "../chargen/src/domain/glossary.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const CHARS_DIR = join(ROOT, "characters");
const OUT_DIR = HERE;
const OUT_CHARS = join(OUT_DIR, "characters");

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface Entry { title: string; house: string; concept: string; spec: string; file: string; }

function loadCharacters(): { ch: Character; base: string }[] {
  return readdirSync(CHARS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ ch: JSON.parse(readFileSync(join(CHARS_DIR, f), "utf8")) as Character, base: f.replace(/\.json$/, "") }))
    .sort((a, b) => a.ch.name.localeCompare(b.ch.name));
}

const STYLE = `
:root { --ink:#1c1a17; --muted:#6b6257; --line:#d8cfc0; --accent:#7a2e1d; --bg:#fbf8f3; --card:#fff; }
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--ink);
  font:16px/1.55 "Iowan Old Style",Palatino,Georgia,serif; }
main { max-width:980px; margin:0 auto; padding:3rem 1.25rem 5rem; }
header.hero { text-align:center; margin-bottom:2.5rem; }
header.hero h1 { font-size:2.6rem; color:var(--accent); margin:0 0 .3rem; letter-spacing:.01em; }
header.hero p { color:var(--muted); margin:0; font-size:1.05rem; }
h2.section { font-size:1.15rem; text-transform:uppercase; letter-spacing:.08em; color:var(--muted);
  border-bottom:2px solid var(--line); padding-bottom:.35rem; margin:3rem 0 1.4rem; }
.gallery { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:1.1rem; }
a.card { display:flex; flex-direction:column; gap:.55rem; text-decoration:none; color:inherit;
  background:var(--card); border:1px solid var(--line); border-radius:10px; padding:1.1rem 1.2rem;
  transition:transform .12s ease, box-shadow .12s ease, border-color .12s ease; }
a.card:hover { transform:translateY(-3px); box-shadow:0 8px 22px rgba(60,40,20,.13); border-color:var(--accent); }
.card .name { font-size:1.25rem; font-weight:600; color:var(--accent); line-height:1.2; }
.badge { align-self:flex-start; font-size:.72rem; text-transform:uppercase; letter-spacing:.05em;
  background:#f0e7d8; color:var(--muted); border:1px solid var(--line); border-radius:999px; padding:.12rem .6rem; }
.card .concept { color:var(--ink); font-size:.95rem; flex:1; }
.card .spec { color:var(--muted); font-size:.82rem; font-variant:small-caps; letter-spacing:.03em; }
.card .go { color:var(--accent); font-size:.85rem; font-weight:600; }
.create { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:1.1rem; }
.create .tile { background:var(--card); border:1px dashed var(--line); border-radius:10px; padding:1.3rem 1.2rem; text-align:center; }
.create .tile h3 { margin:.2rem 0 .4rem; color:var(--accent); font-size:1.2rem; }
.create .tile p { color:var(--muted); font-size:.88rem; margin:0 0 1rem; min-height:2.4em; }
.create button { font:inherit; font-size:.9rem; color:var(--muted); background:#f3ece0;
  border:1px solid var(--line); border-radius:999px; padding:.4rem 1.1rem; cursor:not-allowed; }
.create .soon { display:inline-block; margin-top:.6rem; font-size:.7rem; text-transform:uppercase;
  letter-spacing:.06em; color:#9a8f7d; }
footer { text-align:center; color:var(--muted); font-size:.82rem; margin-top:4rem; }
`;

function card(e: Entry): string {
  return `<a class="card" href="characters/${esc(e.file)}">
    <span class="badge">House ${esc(e.house)}</span>
    <span class="name">${esc(e.title)}</span>
    <span class="concept">${esc(e.concept)}</span>
    ${e.spec ? `<span class="spec">${esc(e.spec)}</span>` : ""}
    <span class="go">View sheet →</span>
  </a>`;
}

const CREATE_TILES = [
  { k: "Magus", d: "A Gifted member of the Order of Hermes, built across the five creation budgets." },
  { k: "Companion", d: "A remarkable mundane ally — knight, scholar, faerie-touched, or worse." },
  { k: "Grog", d: "A covenant soldier or servant, quick to make and quick to lose." },
];

function indexHtml(entries: Entry[]): string {
  const cards = entries.map(card).join("\n");
  const tiles = CREATE_TILES.map((t) => `<div class="tile">
      <h3>${t.k}</h3>
      <p>${t.d}</p>
      <button type="button" disabled title="Not yet implemented">Create a ${t.k}</button>
      <span class="soon">Coming soon</span>
    </div>`).join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Covenant Roster — Ars Magica</title>
<style>${STYLE}</style></head>
<body><main>
  <header class="hero">
    <h1>The Covenant Roster</h1>
    <p>Characters of Mythic Europe · Ars Magica, Definitive Edition</p>
  </header>

  <h2 class="section">Members (${entries.length})</h2>
  <div class="gallery">
${cards}
  </div>

  <h2 class="section">Add to the Roster</h2>
  <div class="create">
${tiles}
  </div>

  <footer>Built with the <code>chargen</code> rules engine. Sheets are rules-legal and validated.</footer>
</main></body></html>`;
}

// ── build ──────────────────────────────────────────────────────────────────────
if (!existsSync(OUT_CHARS)) mkdirSync(OUT_CHARS, { recursive: true });
const entries: Entry[] = [];
for (const { ch, base } of loadCharacters()) {
  const file = `${kebab(base)}.html`;
  writeFileSync(join(OUT_CHARS, file), renderSheetHtml(ch), "utf8");
  const spec = [ch.favoredTechnique && ch.favoredForm ? `${ART_ABBR[ch.favoredTechnique]}${ART_ABBR[ch.favoredForm]}` : "", ch.focus ? `focus: ${ch.focus}` : ""].filter(Boolean).join(" · ");
  entries.push({ title: magusTitle(ch), house: ch.house, concept: firstSentence(ch.concept), spec, file });
}
writeFileSync(join(OUT_DIR, "index.html"), indexHtml(entries), "utf8");
console.log(`Built site: ${entries.length} character sheets + index.html`);

function firstSentence(s: string): string {
  const m = s.match(/^.*?[.!?](\s|$)/);
  const out = (m ? m[0] : s).trim();
  return out.length > 180 ? out.slice(0, 177) + "…" : out;
}
