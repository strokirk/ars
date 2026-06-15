// Step bodies for the creation wizard. Each is a pure presentational component over
// the current Character + an `update(ops)` that routes through the engine. The grog
// and companion share all of these; the magus adds House fields here and an Arts &
// Spells step (see ArtsSpellsStep).
import { useState } from "preact/hooks";
import { charKind, rules, type Character, type Op } from "./engine.ts";
import { CharacteristicsAllocator } from "./components/CharacteristicsAllocator.tsx";
import { TraitPicker } from "./components/TraitPicker.tsx";
import { AbilityPicker } from "./components/AbilityPicker.tsx";
import { HOUSES, TECHNIQUES, FORMS, ART_ABBR, type Art } from "../../chargen/src/domain/glossary.ts";
import { HOUSE_PUISSANT_CHOICES } from "../../chargen/src/domain/houses.ts";
import { deriveModifiers } from "../../chargen/src/domain/modifiers.ts";
import { spellLabTotal } from "../../chargen/src/domain/labtotal.ts";
import { artXp, affinityXp } from "../../chargen/src/domain/costs.ts";

export interface StepProps {
  ch: Character;
  update: (ops: Op[]) => void;
  /** Magus only: rebuild from scratch with new House/favored picks (re-applies grants). */
  reseed?: (opts: { house?: string; favoredTechnique?: string; favoredForm?: string; puissant?: string }) => void;
}

// The early-childhood Abilities from the rulebook (all General).
const CHILDHOOD_ABILITIES = [
  "Athletics", "Awareness", "Brawl", "Charm", "Folk Ken", "Guile", "Stealth", "Survival", "Swim",
];

// Common apprenticeship Abilities — the three mandatory ones first.
const APPRENTICE_ABILITIES = [
  "Magic Theory", "Latin", "Parma Magica", "Artes Liberales", "Concentration", "Finesse", "Penetration", "Code of Hermes",
];

export function ConceptStep({ ch, update, reseed }: StepProps) {
  const kind = charKind(ch);
  const houseChoices = ch.house ? HOUSE_PUISSANT_CHOICES[ch.house] : undefined;
  return (
    <div>
      <div class="field">
        <label>Name</label>
        <input type="text" value={ch.name} placeholder="e.g. Brother Anselm" onInput={(e) => update([{ op: "meta", fields: { name: (e.target as HTMLInputElement).value } }])} />
      </div>
      <div class="field">
        <label>Concept — a sentence on who they are</label>
        <textarea value={ch.concept} placeholder="A grizzled turb sergeant who distrusts magi but would die for the covenant." onInput={(e) => update([{ op: "meta", fields: { concept: (e.target as HTMLTextAreaElement).value } }])} />
      </div>
      <div class="field" style="display:flex; gap:.8rem;">
        <div style="flex:1;">
          <label>Age</label>
          <input type="number" min={kind === "magus" ? 25 : 5} value={ch.age} onInput={(e) => update([{ op: "meta", fields: { age: Number((e.target as HTMLInputElement).value) } }])} />
        </div>
        <div style="flex:1;">
          <label>Later-life years {kind === "magus" ? "(pre-apprenticeship)" : ""}</label>
          <input type="number" min={0} value={ch.laterLifeYears} onInput={(e) => update([{ op: "meta", fields: { laterLifeYears: Number((e.target as HTMLInputElement).value) } }])} />
        </div>
      </div>

      {kind === "magus" && reseed && (
        <>
          <hr class="soft" />
          <div class="field">
            <label>House</label>
            <select value={ch.house} onChange={(e) => reseed({ house: (e.target as HTMLSelectElement).value })}>
              {HOUSES.map((h) => <option value={h} key={h}>{h}</option>)}
            </select>
          </div>
          {houseChoices && (
            <div class="field">
              <label>House benefit (Puissant)</label>
              <select onChange={(e) => reseed({ puissant: (e.target as HTMLSelectElement).value })}>
                {houseChoices.map((c) => <option value={c} key={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div class="field" style="display:flex; gap:.8rem;">
            <div style="flex:1;">
              <label>Favored Technique</label>
              <select value={ch.favoredTechnique ?? ""} onChange={(e) => update([{ op: "meta", fields: { favoredTechnique: (e.target as HTMLSelectElement).value } }])}>
                <option value="">—</option>
                {TECHNIQUES.map((t) => <option value={t} key={t}>{t}</option>)}
              </select>
            </div>
            <div style="flex:1;">
              <label>Favored Form</label>
              <select value={ch.favoredForm ?? ""} onChange={(e) => update([{ op: "meta", fields: { favoredForm: (e.target as HTMLSelectElement).value } }])}>
                <option value="">—</option>
                {FORMS.map((f) => <option value={f} key={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div class="field">
            <label>Magical Focus (optional, free text)</label>
            <input type="text" value={ch.focus ?? ""} placeholder="e.g. fire, the dead, self-transformation" onInput={(e) => update([{ op: "meta", fields: { focus: (e.target as HTMLInputElement).value } }])} />
          </div>
        </>
      )}
    </div>
  );
}

export function CharacteristicsStep({ ch, update }: StepProps) {
  return <CharacteristicsAllocator ch={ch} update={update} />;
}

export function VirtuesStep({ ch, update }: StepProps) {
  return <TraitPicker ch={ch} update={update} />;
}

export function AbilitiesStep({ ch, update }: StepProps) {
  const magus = charKind(ch) === "magus";
  return (
    <div>
      <div class="field">
        <label>Native Language (spoken vernacular — score 5, 75 xp)</label>
        <input type="text" value={ch.nativeLanguage ?? ""} placeholder="e.g. German, French, Italian" onInput={(e) => update([{ op: "native-language", value: (e.target as HTMLInputElement).value }])} />
      </div>
      <h3 style="font-size:1rem; margin:1rem 0 .4rem;">Early childhood (45 xp)</h3>
      <p class="note" style="margin:0 0 .6rem;">Mundane skills picked up as a child. Tap to add, then adjust the score.</p>
      <AbilityPicker ch={ch} update={update} stage="childhood" suggestions={CHILDHOOD_ABILITIES} />
      <hr class="soft" />
      <h3 style="font-size:1rem; margin:1rem 0 .4rem;">Later life ({ch.laterLifeYears} yrs × {deriveModifiers(ch).laterLifeXpPerYear} xp)</h3>
      <p class="note" style="margin:0 0 .6rem;">Any Abilities the character can learn. {magus ? "Before apprenticeship this is General Abilities only." : "Academic/Arcane/Martial/Supernatural need an enabling Virtue."}</p>
      <AbilityPicker ch={ch} update={update} stage="later-life" />
      {magus && (
        <>
          <hr class="soft" />
          <h3 style="font-size:1rem; margin:1rem 0 .4rem;">Apprenticeship Abilities <span class="note">(shares the 240-xp pool with Arts)</span></h3>
          <p class="note" style="margin:0 0 .6rem;">Mandatory: Magic Theory, Latin, Parma Magica (each ≥1). Also consider Artes Liberales, Concentration, Finesse, Penetration, Code of Hermes.</p>
          <AbilityPicker ch={ch} update={update} stage="apprenticeship" suggestions={APPRENTICE_ABILITIES} searchable />
        </>
      )}
    </div>
  );
}

export function PersonalityStep({ ch, update }: StepProps) {
  const kind = charKind(ch);
  const [trait, setTrait] = useState("");
  const [value, setValue] = useState(3);
  const add = (t: string, v: number) => { if (t.trim()) update([{ op: "personality", trait: t.trim(), value: v }]); };
  return (
    <div>
      {kind === "grog" && (
        <div class="chips" style="margin-bottom:.8rem;">
          {["Loyal", "Brave"].map((t) => <button class="chip-toggle" key={t} onClick={() => add(t, 3)}>+ {t} (+3)</button>)}
        </div>
      )}
      {ch.personality.length > 0 && (
        <div style="margin-bottom:.8rem;">
          {ch.personality.map((p) => (
            <div class="char-row" key={p.trait}>
              <span class="nm">{p.trait}</span>
              <span class="val">{p.value > 0 ? `+${p.value}` : p.value}</span>
              <button class="btn btn-sm btn-ghost" onClick={() => update([{ op: "personality", trait: p.trait, value: 0 }])}>remove</button>
            </div>
          ))}
        </div>
      )}
      <div class="field" style="display:flex; gap:.6rem; align-items:flex-end;">
        <div style="flex:1;">
          <label>Trait</label>
          <input type="text" value={trait} placeholder="e.g. Gruff, Pious, Curious" onInput={(e) => setTrait((e.target as HTMLInputElement).value)} />
        </div>
        <div style="width:6rem;">
          <label>Value</label>
          <input type="number" min={-3} max={3} value={value} onInput={(e) => setValue(Number((e.target as HTMLInputElement).value))} />
        </div>
        <button class="btn btn-primary" onClick={() => { add(trait, value); setTrait(""); }}>Add</button>
      </div>
      <p class="note">Personality Traits range −3…+3. {kind === "grog" ? "Grogs should have a score in Loyal; warriors in Brave." : "These guide roleplaying; a Personality Flaw is mirrored by a ±3 trait."}</p>
    </div>
  );
}

// ── magus-only: Arts & Spells ────────────────────────────────────────────────
export function ArtsSpellsStep({ ch, update }: StepProps) {
  const [query, setQuery] = useState("");
  const mods = deriveModifiers(ch);
  const setArt = (art: Art, score: number) => update([{ op: "art", name: art, score: Math.max(0, score) }]);
  const artXpOf = (art: Art, score: number) => {
    const raw = artXp(score);
    return mods.affinityArt.has(art) ? affinityXp(raw) : raw;
  };
  const results = query.trim()
    ? rules.filterSpells({ search: query.trim(), isGeneral: false }).slice(0, 30)
    : [];

  const artControl = (art: Art) => {
    const score = ch.arts[art] ?? 0;
    return (
      <div class="char-row" key={art}>
        <span class="nm">{art} <small>{ART_ABBR[art]} · {artXpOf(art, score)} xp</small></span>
        <span class="stepper">
          <button type="button" disabled={score <= 0} onClick={() => setArt(art, score - 1)}>−</button>
          <span class="val">{score}</span>
          <button type="button" onClick={() => setArt(art, score + 1)}>+</button>
        </span>
      </div>
    );
  };

  return (
    <div>
      <h3 style="font-size:1rem; margin:.2rem 0 .4rem;">Techniques</h3>
      {TECHNIQUES.map((t) => artControl(t))}
      <h3 style="font-size:1rem; margin:1rem 0 .4rem;">Forms</h3>
      {FORMS.map((f) => artControl(f))}
      <hr class="soft" />
      <h3 style="font-size:1rem; margin:1rem 0 .4rem;">Spells (≤120 levels)</h3>
      {ch.spells.length > 0 && (
        <div class="taken">
          {ch.spells.map((s) => (
            <span class="taken-chip" key={s.name}>
              {s.name} ({ART_ABBR[s.technique]}{ART_ABBR[s.form]} {s.level})
              <button class="x" onClick={() => update([{ op: "remove", kind: "spell", name: s.name }])}>×</button>
            </span>
          ))}
        </div>
      )}
      <div class="toolbar">
        <input type="text" placeholder="Search spells to learn…" value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
      </div>
      {query.trim() && (
        <ul class="option-list">
          {results.map((s) => {
            const lt = spellLabTotal(ch, mods, { technique: s.technique as never, form: s.form as never, requisites: s.requisites });
            const ok = (s.level ?? 0) <= lt.total;
            return (
              <li class="option" key={s.name}>
                <div class="meta">
                  <div class="ttl">{s.name} <span class="sz">{s.tech_abbr}{s.form_abbr} {s.level} · LabTotal {lt.total}</span></div>
                  <div class="desc clamp">{s.description}</div>
                </div>
                <button class="btn btn-sm btn-primary" title={ok ? "" : `Level ${s.level} exceeds your Lab Total of ${lt.total}`} onClick={() => update([{ op: "spell", name: s.name }])}>
                  {ok ? "Learn" : "Learn ⚠"}
                </button>
              </li>
            );
          })}
          {results.length === 0 && <li class="note">No matches.</li>}
        </ul>
      )}
      <p class="note">Highest learnable level = Technique + Form + Int + Magic Theory + 3 (aura 3), plus your Virtues. Split xp between a Technique and a Form for higher totals.</p>
    </div>
  );
}
