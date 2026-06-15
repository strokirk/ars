// Small display helpers for character summaries (cards, headers).
import { type Character, charKind } from "../../chargen/src/domain/character.ts";
import { ART_ABBR } from "../../chargen/src/domain/glossary.ts";
import { KIND_LABEL } from "./engine.ts";

export function title(ch: Character): string {
  if (ch.house) {
    return ch.name.toLowerCase().includes(ch.house.toLowerCase()) ? ch.name : `${ch.name} of House ${ch.house}`;
  }
  return ch.name || "Unnamed";
}

export function firstSentence(s: string, max = 160): string {
  const m = s.match(/^.*?[.!?](\s|$)/);
  const out = (m ? m[0] : s).trim();
  return out.length > max ? out.slice(0, max - 1) + "…" : out;
}

/** A short "House · CrIg · focus" style line, kind-aware. */
export function specLine(ch: Character): string {
  const parts: string[] = [];
  if (charKind(ch) === "magus") {
    if (ch.house) parts.push(`House ${ch.house}`);
    if (ch.favoredTechnique && ch.favoredForm) parts.push(`${ART_ABBR[ch.favoredTechnique]}${ART_ABBR[ch.favoredForm]}`);
    if (ch.focus) parts.push(`focus: ${ch.focus}`);
  } else {
    const status = ch.virtues.find((v) => v.category === "Social Status");
    if (status) parts.push(status.display);
  }
  return parts.join(" · ");
}

export const kindLabel = (ch: Character): string => KIND_LABEL[charKind(ch)];
