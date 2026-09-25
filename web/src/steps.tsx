// Step bodies for the creation wizard. Each is a pure presentational component over
// the current Character + an `update(ops)` that routes through the engine. The grog
// and companion share all of these; the magus adds House fields here and an Arts &
// Spells step (see ArtsSpellsStep).
import { useState } from "preact/hooks";
import { budgetsOf, charKind, defaultAge, type Character, type Op } from "./engine.ts";
import { CharacteristicsAllocator } from "./components/CharacteristicsAllocator.tsx";
import { TraitPicker } from "./components/TraitPicker.tsx";
import { AbilityPicker } from "./components/AbilityPicker.tsx";
import { SpellBrowser } from "./components/SpellBrowser.tsx";
import { Select } from "./components/ui/Select.tsx";
import { RadioCards } from "./components/ui/RadioCards.tsx";
import { Collapsible } from "./components/ui/Collapsible.tsx";
import { Button } from "./components/ui/Button.tsx";
import { Stepper } from "./components/ui/Stepper.tsx";
import { ArtBadge, FormIcon } from "./components/ui/ArtBadge.tsx";
import { HOUSES, TECHNIQUES, FORMS, ART_ABBR, type Art, type Technique } from "../../chargen/src/domain/glossary.ts";
import { TECHNIQUE_COLOR } from "./lib/arts.ts";
import { HOUSE_PUISSANT_CHOICES } from "../../chargen/src/domain/houses.ts";
import { deriveModifiers } from "../../chargen/src/domain/modifiers.ts";
import { spellLabTotal } from "../../chargen/src/domain/labtotal.ts";
import { artXp, affinityXp } from "../../chargen/src/domain/costs.ts";
import { rules } from "./engine.ts";
import { BonusXp } from "./components/BonusXp.tsx";
import { abilityXp } from "../../chargen/src/domain/costs.ts";
import type { SpellRow } from "../../chargen/src/data/types.ts";

export interface StepProps {
  ch: Character;
  update: (ops: Op[]) => void;
  /** Magus only: rebuild from scratch with new House/Puissant picks (re-applies grants). */
  reseed?: (opts: { house?: string; puissant?: string }) => void;
}

// A one-line gloss per House, for the picker cards — paraphrased from
// md/02-the-order-of-hermes/02-the-houses-of-hermes.md, not the free benefit
// (that's whatever `chargen/src/domain/houses.ts` grants — see the Virtue it adds).
const HOUSE_BLURB: Record<string, string> = {
  Bjornaer: "Shapeshifters bonded to an animal heartbeast; avoid familiars, wary of other shapeshifters.",
  Bonisagus: "The Founder's own lineage — masters of Magic Theory and Order politics.",
  Criamon: "Secretive mystics pursuing the Enigma; inscrutable even to other magi.",
  "Ex Miscellanea": "A disorganized grab-bag of hedge traditions — easy to join, hard to pin down.",
  Flambeau: "Fire and destruction specialists, the Order's aggressive, chivalrous shock troops.",
  Guernicus: "The Order's judges and investigators, enforcing the Code of Hermes.",
  Jerbiton: "Artists and diplomats who keep the Order tied to mundane society.",
  Mercere: "Messengers of the Order — even the unGifted are recognized as magi.",
  Merinita: "Faerie-obsessed and often isolated, drawn to the mysteries of Arcadia.",
  Tremere: "A disciplined, hierarchical lineage built on strategy and Certamen dueling.",
  Tytalus: "Thrive on conflict and challenge, endlessly testing themselves and their elders.",
  Verditius: "Unmatched item enchanters, though most can't cast spells without tools.",
};

// The early-childhood Abilities from the rulebook (all General).
const CHILDHOOD_ABILITIES = [
  "Athletics", "Awareness", "Brawl", "Charm", "Folk Ken", "Guile", "Stealth", "Survival", "Swim",
];

// Common apprenticeship Abilities — the three mandatory ones first.
const APPRENTICE_ABILITIES = [
  "Magic Theory", "Latin", "Parma Magica", "Artes Liberales", "Concentration", "Finesse", "Penetration", "Code of Hermes",
];

// Later life has no rulebook-mandated list — this is a generalist's starter set
// (social + practical Generals), not tailored to any one concept.
const LATER_LIFE_ABILITIES = [
  "Etiquette", "Bargain", "Leadership", "Intrigue", "Ride", "Profession (Type)",
];

export function ConceptStep({ ch, update, reseed }: StepProps) {
  const kind = charKind(ch);
  const houseChoices = ch.house ? HOUSE_PUISSANT_CHOICES[ch.house] : undefined;
  // The choice isn't stored on the character — it shows up as the granted Virtue.
  const puissant = houseChoices?.find((c) => ch.virtues.some((v) => v.display === `Puissant ${c}`)) ?? "";
  const [pickingHouse, setPickingHouse] = useState(!ch.house);
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

      {kind === "magus" && reseed && (
        <>
          <hr class="soft" />
          <div class="field">
            <label>House</label>
            {pickingHouse ? (
              <>
                <RadioCards
                  name="house" value={ch.house ?? ""}
                  onChange={(house) => { reseed({ house }); setPickingHouse(false); }}
                  options={HOUSES.map((h) => ({ value: h, label: h, blurb: HOUSE_BLURB[h] }))}
                />
                {ch.house && <Button size="small" appearance="plain" onClick={() => setPickingHouse(false)}>Cancel</Button>}
              </>
            ) : (
              <div class="radio-card on">
                <span>
                  <span class="rc-name">{ch.house}</span>
                  <span class="rc-blurb">{HOUSE_BLURB[ch.house!]}</span>
                </span>
                <Button size="small" appearance="plain" onClick={() => setPickingHouse(true)}>Change</Button>
              </div>
            )}
          </div>
          {houseChoices && (
            <div class="field">
              <label>House benefit (Puissant)</label>
              <Select
                label="House benefit" value={puissant} onChange={(choice) => reseed({ puissant: choice })}
                options={houseChoices.map((c) => ({ value: c, label: c }))}
              />
            </div>
          )}
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
  const kind = charKind(ch);
  const magus = kind === "magus";
  const b = budgetsOf(ch);
  const mods = deriveModifiers(ch);
  const granted = ch.abilities.filter((a) => a.stage === "free");
  const min = b.apprenticeship.minimums;
  const setLaterLifeYears = (years: number) =>
    update([{ op: "meta", fields: { laterLifeYears: years, age: defaultAge(kind, years) } }]);
  return (
    <div>
      <p class="note">
        Age <b>{ch.age}</b> — 5 (childhood) + {ch.laterLifeYears} (later life){magus ? " + 15 (apprenticeship)" : ""}.
        It isn't set directly: change Later-life years below, and it follows. Age caps the maximum score of any
        Ability (higher past 30 — see the meter above each row).
      </p>
      <div class="field">
        <label>Native Language (spoken vernacular — free, score 5)</label>
        <input type="text" value={ch.nativeLanguage ?? ""} placeholder="e.g. German, French, Italian" onInput={(e) => update([{ op: "native-language", value: (e.target as HTMLInputElement).value }])} />
        <p class="note">Worth 75 xp, but granted outright — it doesn't touch the childhood pool.</p>
      </div>

      {granted.length > 0 && (
        <section class="stage">
          <header class="stage-head"><h3>Granted free</h3></header>
          <div class="taken-rows">
            {granted.map((a) => (
              <div class="char-row" key={a.name}>
                <span class="nm">{a.name} <small>{a.type ?? "—"} · {ch.house ? `House ${ch.house}` : "a Virtue"}, off-budget</small></span>
                <span class="val">{a.score}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <AbilityPicker
        ch={ch} update={update} stage="childhood" budget={b.childhood}
        title="Early childhood"
        hint="Mundane skills picked up as a child — General Abilities only."
        recommended={CHILDHOOD_ABILITIES}
        collapsible
      />
      <hr class="soft" />
      <AbilityPicker
        ch={ch} update={update} stage="later-life" budget={b.laterLife}
        title={`Later life (${ch.laterLifeYears} yrs × ${mods.laterLifeXpPerYear} xp${b.laterLife.cap > ch.laterLifeYears * mods.laterLifeXpPerYear ? " + bonus" : ""})`}
        hint={magus
          ? "The years before apprenticeship — General Abilities only."
          : "Academic, Martial and Supernatural Abilities open up here only if a Virtue enables them."}
        recommended={LATER_LIFE_ABILITIES}
        collapsible
        extra={
          <div class="field">
            <label>Later-life years {magus ? "(pre-apprenticeship)" : ""}</label>
            <input
              type="number" min={0} value={ch.laterLifeYears}
              onInput={(e) => setLaterLifeYears(Number((e.target as HTMLInputElement).value))}
            />
          </div>
        }
      />
      {magus && (
        <>
          <hr class="soft" />
          <AbilityPicker
            ch={ch} update={update} stage="apprenticeship" budget={b.apprenticeship}
            title="Apprenticeship Abilities"
            hint={
              <>
                Shares the 240-xp pool with Arts, so the meter counts both. Mandatory:{" "}
                <Mandatory ok={min.magicTheory} label="Magic Theory" />{" "}
                <Mandatory ok={min.latin} label="Latin" />{" "}
                <Mandatory ok={min.parmaMagica} label="Parma Magica" />
              </>
            }
            recommended={APPRENTICE_ABILITIES}
            collapsible
          />
        </>
      )}
      <hr class="soft" />
      <BonusXp ch={ch} update={update} pools={magus ? ["childhood", "later-life", "apprenticeship"] : ["childhood", "later-life"]} />
    </div>
  );
}

/** One mandatory-Ability tick in the apprenticeship blurb. */
function Mandatory({ ok, label }: { ok: boolean; label: string }) {
  return <span style={`color:var(--${ok ? "ok" : "err"});`}>{ok ? "\u2713" : "\u2717"} {label}</span>;
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
          {["Loyal", "Brave"].map((t) => <Button size="small" variant="brand" appearance="outlined" key={t} onClick={() => add(t, 3)}>+ {t} (+3)</Button>)}
        </div>
      )}
      {ch.personality.length > 0 && (
        <div style="margin-bottom:.8rem;">
          {ch.personality.map((p) => (
            <div class="char-row" key={p.trait}>
              <span class="nm">{p.trait}</span>
              <span class="val">{p.value > 0 ? `+${p.value}` : p.value}</span>
              <Button size="small" appearance="plain" onClick={() => update([{ op: "personality", trait: p.trait, value: 0 }])}>remove</Button>
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
        <Button variant="brand" appearance="accent" onClick={() => { add(trait, value); setTrait(""); }}>Add</Button>
      </div>
      <p class="note">Personality Traits range −3…+3. {kind === "grog" ? "Grogs should have a score in Loyal; warriors in Brave." : "These guide roleplaying; a Personality Flaw is mirrored by a ±3 trait."}</p>
      <hr class="soft" />
      <div class="field">
        <label>Reputation</label>
        <input type="text" value={ch.reputation ?? ""} placeholder="e.g. Honest Merchant 2 (local)" onInput={(e) => update([{ op: "meta", fields: { reputation: (e.target as HTMLInputElement).value || null } }])} />
      </div>
      <div class="field">
        <label>Notes &amp; Description (Markdown)</label>
        <textarea rows={6} value={ch.notes} placeholder="Appearance, goals, history, GM notes…" onInput={(e) => update([{ op: "notes", value: (e.target as HTMLTextAreaElement).value }])} />
      </div>
    </div>
  );
}

// ── magus-only: Arts & Spells ────────────────────────────────────────────────
export function ArtsSpellsStep({ ch, update }: StepProps) {
  const mods = deriveModifiers(ch);
  const setArt = (art: Art, score: number) => update([{ op: "art", name: art, score: Math.max(0, score) }]);
  const artXpOf = (art: Art, score: number) => {
    const raw = artXp(score);
    return mods.affinityArt.has(art) ? affinityXp(raw) : raw;
  };
  const labTotalOf = (s: SpellRow) =>
    spellLabTotal(ch, mods, { technique: s.technique as never, form: s.form as never, requisites: s.requisites }).total;
  const known = new Set(ch.spells.map((s) => s.name.toLowerCase()));

  const artControl = (art: Art) => {
    const score = ch.arts[art] ?? 0;
    return (
      <div class="art-row" key={art}>
        <span class="artname" style={TECHNIQUE_COLOR[art as Technique] ? `--tech:${TECHNIQUE_COLOR[art as Technique]}` : undefined}>
          <FormIcon form={art} size={14} /> {art}
        </span>
        <Stepper editable value={score} min={0} label={art} onChange={(v) => setArt(art, v)} />
        <small>{artXpOf(art, score)} xp</small>
      </div>
    );
  };

  const techSummary = TECHNIQUES.filter((t) => (ch.arts[t] ?? 0) > 0)
    .map((t) => `${ART_ABBR[t]} ${ch.arts[t]}`).join(" · ") || "none yet";

  const formSummary = FORMS.filter((f) => (ch.arts[f] ?? 0) > 0)
    .map((f) => `${ART_ABBR[f]} ${ch.arts[f]}`).join(" · ") || "none yet";

  return (
    <div>
      <div class="arts-grid">
        <Collapsible summary={<h3 style="font-size:1rem; margin:.2rem 0;">Techniques <span class="art-shorthand">{techSummary}</span></h3>}>
          {TECHNIQUES.map((t) => artControl(t))}
        </Collapsible>
        <Collapsible summary={<h3 style="font-size:1rem; margin:.2rem 0;">Forms <span class="art-shorthand">{formSummary}</span></h3>}>
          {FORMS.map((f) => artControl(f))}
        </Collapsible>
      </div>
      <hr class="soft" />
      <div class="spells-head">
        <h3>Spells (≤{budgetsOf(ch).apprenticeship.spells.cap} levels, each within its Lab Total)</h3>
        <details class="help-pop">
          <summary aria-label="What are Lab Total and Casting Total?" title="What are Lab Total and Casting Total?">?</summary>
          <div class="help-pop-body">
            <p>
              <b>Lab Total</b> (what caps a spell you can <em>learn</em> here) = Technique + Form + Intelligence +
              Magic Theory + Aura (3, typically). It's the number the "Learn" button checks against a spell's level.
            </p>
            <p>
              <b>Casting Total</b> (what matters once you're <em>playing</em>, not at creation) = Technique + Form +
              Stamina − Encumbrance + Aura, plus a die roll, compared against the spell's level to see if it's cast.
            </p>
            <p>
              Both are built from the same Technique/Form/Art scores you're setting on this page — split xp between a
              Technique and a Form for higher totals in that combination, rather than spreading thin.
            </p>
            <p class="note">
              This app is <b>not exhaustive</b>: it applies Puissant Art/Ability and Affinity to these totals, but many
              more Virtues and Flaws shift them further — Magical Focus, Deficient Technique/Form, Elemental Magic,
              Flexible/Restricted Formulaic Magic, a low Arts score's requisite penalty, and dozens more. Treat every
              computed total here as a floor, not the final word — check your Virtues and Flaws by hand too.
            </p>
          </div>
        </details>
      </div>
      {ch.spells.length > 0 && (
        <ul class="trait-list">
          {ch.spells.map((s) => (
            <li key={s.name}>
              <details class="trait-row">
                <summary>
                  <ArtBadge technique={s.technique} form={s.form} level={s.level} />
                  <span class="tr-name">{s.name}</span>
                  <span class="mastery" onClick={(e) => e.preventDefault()} title="Spell Mastery — costs xp like an Ability">
                    <small>Mastery{s.mastery ? ` · ${abilityXp(s.mastery)} xp` : ""}</small>
                    <Stepper value={s.mastery ?? 0} min={0} label={`${s.name} Mastery`} onChange={(v) => update([{ op: "mastery", name: s.name, score: v }])} />
                  </span>
                  <button
                    class="x" title="remove"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); update([{ op: "remove", kind: "spell", name: s.name }]); }}
                  >×</button>
                </summary>
                <p class="tr-desc">{rules.spell(s.name)?.description ?? "No description available."}</p>
              </details>
            </li>
          ))}
        </ul>
      )}
      <BonusXp ch={ch} update={update} pools={["apprenticeship", "spells", "mastery"]} />
      <SpellBrowser
        labTotalOf={labTotalOf}
        action={(s) => {
          const lt = labTotalOf(s);
          const reachable = (s.level ?? 0) <= lt;
          const taken = known.has(s.name.toLowerCase());
          return (
            <Button
              size="small" variant="brand" appearance="accent"
              disabled={taken}
              title={taken ? "Already learned" : reachable ? "" : `Level ${s.level} exceeds your Lab Total of ${lt}`}
              onClick={() => update([{ op: "spell", name: s.name }])}
            >
              {taken ? "Known" : reachable ? "Learn" : "Learn ⚠"}
            </Button>
          );
        }}
      />
    </div>
  );
}
