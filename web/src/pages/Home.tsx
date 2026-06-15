import { navigate } from "../router.ts";
import { drafts, deleteDraft, newId, saveDraft } from "../store.ts";
import { freshCharacter, KIND_BLURB, KIND_LABEL, isCharacterLegal, type CharacterKind } from "../engine.ts";
import { title, specLine, firstSentence, kindLabel } from "../charutil.ts";
import type { Character } from "../../../chargen/src/domain/character.ts";

// The committed covenant roster (built characters), bundled at compile time.
const rosterModules = import.meta.glob("../../../characters/*.json", { eager: true }) as Record<string, { default: Character }>;
const roster: Character[] = Object.values(rosterModules)
  .map((m) => m.default)
  .sort((a, b) => a.name.localeCompare(b.name));

const KINDS: CharacterKind[] = ["grog", "companion", "magus"];

function startNew(kind: CharacterKind) {
  // Seed a draft immediately so autosave/resume works from step 1.
  const id = newId();
  saveDraft(id, freshCharacter(kind).character);
  navigate(`/edit/${id}`);
}

export function Home() {
  return (
    <>
      <div class="hero">
        <h1>The Covenant Roster</h1>
        <p>Characters of Mythic Europe · Ars Magica, Definitive Edition</p>
      </div>

      <h2 class="section-title">Create a character</h2>
      <div class="grid three">
        {KINDS.map((k) => (
          <div class="card create-tile" key={k}>
            <h3>{KIND_LABEL[k]}</h3>
            <p>{KIND_BLURB[k]}</p>
            <button class="btn btn-primary btn-block" onClick={() => startNew(k)}>
              Create a {KIND_LABEL[k]}
            </button>
          </div>
        ))}
      </div>

      {drafts.value.length > 0 && (
        <>
          <h2 class="section-title">Your drafts</h2>
          <div class="grid">
            {drafts.value.map((d) => (
              <div class="card" key={d.id}>
                <span class="badge">{kindLabel(d.character)}{isCharacterLegal(d.character) ? " · legal" : " · in progress"}</span>
                <span class="name">{title(d.character)}</span>
                {d.character.concept && <span class="concept">{firstSentence(d.character.concept)}</span>}
                <div class="navrow">
                  <button class="btn btn-sm" onClick={() => navigate(`/edit/${d.id}`)}>Resume</button>
                  <button class="btn btn-sm" onClick={() => navigate(`/sheet/${d.id}`)}>Sheet</button>
                  <button class="btn btn-sm btn-ghost" onClick={() => { if (confirm("Delete this draft?")) deleteDraft(d.id); }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 class="section-title">Members ({roster.length})</h2>
      <div class="grid">
        {roster.map((ch) => (
          <div class="card" key={ch.name}>
            <span class="badge">{kindLabel(ch)}</span>
            <span class="name">{title(ch)}</span>
            <span class="concept">{firstSentence(ch.concept)}</span>
            {specLine(ch) && <span class="note" style="font-variant: small-caps;">{specLine(ch)}</span>}
          </div>
        ))}
      </div>

      <hr class="soft" />
      <p class="note">Built on the <code>chargen</code> rules engine — every sheet is validated against the Definitive Edition rules.</p>
    </>
  );
}
