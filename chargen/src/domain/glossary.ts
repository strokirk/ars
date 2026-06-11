// Fixed vocabulary of Ars Magica (Definitive Edition): Characteristics, the five
// Techniques and ten Forms (collectively "Arts"), and the Hermetic Houses. Pure
// constants + tiny helpers — no I/O, safe to import anywhere (incl. a web app).

export const CHARACTERISTICS = [
  "Int", "Per", "Str", "Sta", "Pre", "Com", "Dex", "Qik",
] as const;
export type Characteristic = (typeof CHARACTERISTICS)[number];

export const CHARACTERISTIC_NAMES: Record<Characteristic, string> = {
  Int: "Intelligence", Per: "Perception", Str: "Strength", Sta: "Stamina",
  Pre: "Presence", Com: "Communication", Dex: "Dexterity", Qik: "Quickness",
};

export const TECHNIQUES = ["Creo", "Intellego", "Muto", "Perdo", "Rego"] as const;
export type Technique = (typeof TECHNIQUES)[number];

export const FORMS = [
  "Animal", "Aquam", "Auram", "Corpus", "Herbam",
  "Ignem", "Imaginem", "Mentem", "Terram", "Vim",
] as const;
export type Form = (typeof FORMS)[number];

export type Art = Technique | Form;
export const ARTS: readonly Art[] = [...TECHNIQUES, ...FORMS];

export const ART_ABBR: Record<Art, string> = {
  Creo: "Cr", Intellego: "In", Muto: "Mu", Perdo: "Pe", Rego: "Re",
  Animal: "An", Aquam: "Aq", Auram: "Au", Corpus: "Co", Herbam: "He",
  Ignem: "Ig", Imaginem: "Im", Mentem: "Me", Terram: "Te", Vim: "Vi",
};

export function isTechnique(x: string): x is Technique {
  return (TECHNIQUES as readonly string[]).includes(x);
}
export function isForm(x: string): x is Form {
  return (FORMS as readonly string[]).includes(x);
}
export function isArt(x: string): x is Art {
  return (ARTS as readonly string[]).includes(x);
}
export function isCharacteristic(x: string): x is Characteristic {
  return (CHARACTERISTICS as readonly string[]).includes(x);
}

/** Two-letter Tech+Form code, e.g. Creo+Ignem -> "CrIg". */
export function techForm(t: Technique, f: Form): string {
  return ART_ABBR[t] + ART_ABBR[f];
}

export const HOUSES = [
  "Bjornaer", "Bonisagus", "Criamon", "Ex Miscellanea", "Flambeau",
  "Guernicus", "Jerbiton", "Mercere", "Merinita", "Tremere",
  "Tytalus", "Verditius",
] as const;
export type House = (typeof HOUSES)[number];

export type Stage = "childhood" | "later-life" | "apprenticeship" | "post-gauntlet" | "free";
export const XP_STAGES: readonly Stage[] = ["childhood", "later-life", "apprenticeship", "post-gauntlet"];
