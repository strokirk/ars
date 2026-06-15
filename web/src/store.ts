// Draft persistence (localStorage) + shareable-link encoding. No backend — a finished
// character round-trips through a base64 hash so a build can be shared on a static site.
import { signal } from "@preact/signals";
import type { Character } from "../../chargen/src/domain/character.ts";

export interface Draft {
  id: string;
  character: Character;
  updated: number; // epoch ms
}

const KEY = "ars-drafts-v1";

function read(): Draft[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Draft[]) : [];
  } catch {
    return [];
  }
}

/** Reactive list of saved drafts, newest first. */
export const drafts = signal<Draft[]>(read().sort((a, b) => b.updated - a.updated));

function persist(list: Draft[]): void {
  drafts.value = [...list].sort((a, b) => b.updated - a.updated);
  try { localStorage.setItem(KEY, JSON.stringify(drafts.value)); } catch { /* quota / private mode */ }
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function getDraft(id: string): Draft | undefined {
  return drafts.value.find((d) => d.id === id);
}

export function saveDraft(id: string, character: Character): void {
  const list = read();
  const i = list.findIndex((d) => d.id === id);
  const entry: Draft = { id, character, updated: Date.now() };
  if (i >= 0) list[i] = entry;
  else list.push(entry);
  persist(list);
}

export function deleteDraft(id: string): void {
  persist(read().filter((d) => d.id !== id));
}

// ── shareable links ──────────────────────────────────────────────────────────
export function encodeCharacter(ch: Character): string {
  const bytes = new TextEncoder().encode(JSON.stringify(ch));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeCharacter(data: string): Character | null {
  try {
    const b64 = data.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as Character;
  } catch {
    return null;
  }
}
