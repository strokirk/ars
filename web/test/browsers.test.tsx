// @vitest-environment jsdom
// Render tests for the browsing UIs: they mount against the real rules data and their
// filters actually narrow the list. Plain preact render — no testing-library needed.
import { afterEach, describe, expect, test } from "vitest";
import { render } from "preact";
import { SpellBrowser } from "../src/components/SpellBrowser.tsx";
import { TraitBrowser } from "../src/components/TraitBrowser.tsx";
import { CopyBox } from "../src/components/ui/CopyBox.tsx";
import { Library } from "../src/pages/Library.tsx";

let host: HTMLElement;

function mount(vnode: preact.ComponentChild): HTMLElement {
  host = document.createElement("div");
  document.body.appendChild(host);
  render(vnode as never, host);
  return host;
}

/** Let preact flush the re-render queued by an event. */
const flush = () => new Promise((r) => setTimeout(r, 0));

const rows = (el: HTMLElement) => [...el.querySelectorAll(".option .ttl")].map((n) => n.textContent!.trim());
const count = (el: HTMLElement) => Number(el.querySelector("p.note")!.textContent!.match(/^\d+/)![0]);
const buttons = (el: HTMLElement) => [...el.querySelectorAll<HTMLButtonElement>("button")];
/** Match a chip by its visible text (icons contribute none), trimmed. */
const chip = (el: HTMLElement, label: string) => {
  const b = buttons(el).find((x) => x.textContent!.replace(/\s+/g, " ").trim() === label);
  if (!b) throw new Error(`no chip "${label}" among: ${buttons(el).map((x) => JSON.stringify(x.textContent!.replace(/\s+/g, " ").trim())).join(", ")}`);
  return b;
};
/** Art chips carry the full Art name in title= so the abbreviation can't confuse the match. */
const artChip = (el: HTMLElement, art: string) =>
  buttons(el).find((b) => b.getAttribute("title") === art)!;
const group = (el: HTMLElement) => [...el.querySelectorAll(".group-head")].map((n) => n.textContent!.trim());

afterEach(() => {
  render(null, host);
  host.remove();
});

describe("SpellBrowser", () => {
  test("lists spells on first render, with no search typed", () => {
    const el = mount(<SpellBrowser />);
    // The old picker showed nothing until you typed a name — this is the fix.
    expect(rows(el).length).toBeGreaterThan(0);
    expect(count(el)).toBeGreaterThan(300);
  });

  test("a Technique chip narrows the list", async () => {
    const el = mount(<SpellBrowser />);
    const before = count(el);
    artChip(el, "Perdo").click();
    await flush();
    expect(count(el)).toBeLessThan(before);
    expect(count(el)).toBeGreaterThan(0);
  });

  test("a Form chip narrows the list independently of Technique", async () => {
    const el = mount(<SpellBrowser />);
    artChip(el, "Ignem").click();
    await flush();
    const ignem = count(el);
    artChip(el, "Creo").click();
    await flush();
    expect(count(el)).toBeLessThan(ignem);
    expect(count(el)).toBeGreaterThan(0);
  });

  test("Rituals only and Formulaic only are mutually exclusive views", async () => {
    const el = mount(<SpellBrowser />);
    chip(el, "▸ More filters").click();
    await flush();
    chip(el, "Rituals only").click();
    await flush();
    const rituals = count(el);
    chip(el, "Rituals only").click();  // toggle off
    await flush();
    chip(el, "Formulaic only").click();
    await flush();
    const formulaic = count(el);
    expect(rituals).toBeGreaterThan(0);
    expect(formulaic).toBeGreaterThan(rituals);
  });

  test("the extra filters are collapsed until asked for, and count themselves", async () => {
    const el = mount(<SpellBrowser />);
    expect(el.querySelector('select[aria-label="Range"]')).toBeNull();
    chip(el, "▸ More filters").click();
    await flush();
    const range = el.querySelector<HTMLSelectElement>('select[aria-label="Range"]')!;
    const before = count(el);
    range.value = "Touch";
    range.dispatchEvent(new Event("change", { bubbles: true }));
    await flush();
    expect(count(el)).toBeLessThan(before);
    expect(el.textContent).toContain("More filters (1)");
  });

  test("Clear all resets every filter", async () => {
    const el = mount(<SpellBrowser />);
    const all = count(el);
    artChip(el, "Perdo").click();
    await flush();
    expect(count(el)).toBeLessThan(all);
    chip(el, "Clear all").click();
    await flush();
    expect(count(el)).toBe(all);
  });

  test("grouping splits the list under canonically ordered headings", async () => {
    const el = mount(<SpellBrowser />);
    expect(group(el)).toEqual([]);   // "none" by default
    const select = el.querySelector<HTMLSelectElement>('select[aria-label="Group spells"]')!;
    select.value = "technique";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await flush();
    const heads = group(el).map((h) => h.split(/\s+/)[0]);
    expect(heads.length).toBeGreaterThan(1);
    // Canonical Technique order, not first-appearance.
    expect(heads).toEqual([...heads].sort(
      (a, b) => ["Creo", "Intellego", "Muto", "Perdo", "Rego"].indexOf(a) - ["Creo", "Intellego", "Muto", "Perdo", "Rego"].indexOf(b),
    ));
  });

  test("the Lab Total filter appears only when a character is in play", async () => {
    const plain = mount(<SpellBrowser />);
    expect(plain.textContent).not.toContain("Within my Lab Total");
    render(null, host); host.remove();

    const withChar = mount(<SpellBrowser labTotalOf={() => 15} />);
    expect(withChar.textContent).toContain("Lab Total 15");
    const before = count(withChar);
    chip(withChar, "Within my Lab Total").click();
    await flush();
    expect(count(withChar)).toBeLessThan(before);
  });

  test("renders a caller-supplied action per row", () => {
    const el = mount(<SpellBrowser action={() => <button class="learn">Learn</button>} />);
    expect(el.querySelectorAll("button.learn").length).toBe(rows(el).length);
  });

  test("reports an empty result rather than a blank list", async () => {
    const el = mount(<SpellBrowser />);
    const input = el.querySelector("input")!;
    input.value = "zzzz-no-such-spell";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await flush();
    expect(el.textContent).toContain("No spells match these filters.");
  });
});

describe("TraitBrowser", () => {
  test("switches between Virtues and Flaws", async () => {
    const el = mount(<TraitBrowser />);
    const virtues = count(el);
    chip(el, "Flaws").click();
    await flush();
    expect(el.textContent).toMatch(/\d+ flaws/);
    expect(count(el)).not.toBe(virtues);
  });

  test("a size chip narrows the list", async () => {
    const el = mount(<TraitBrowser />);
    const before = count(el);
    chip(el, "Major").click();
    await flush();
    expect(count(el)).toBeLessThan(before);
  });

  test("honours a caller-supplied eligibility filter", () => {
    const el = mount(<TraitBrowser filter={(r) => r.category === "Hermetic"} />);
    expect(rows(el).length).toBeGreaterThan(0);
    expect(count(el)).toBeLessThan(100);
  });
});

describe("Library", () => {
  test("defaults to the spells tab and falls back for an unknown tab", () => {
    for (const tab of [undefined, "nonsense"]) {
      const el = mount(<Library tab={tab} />);
      expect(el.querySelector(".tab.on")!.textContent!.trim()).toBe("Spells");
      render(null, host); host.remove();
    }
    const el = mount(<Library tab="virtues" />);
    expect(el.querySelector(".tab.on")!.textContent!.trim()).toBe("Virtues & Flaws");
  });
});

describe("CopyBox", () => {
  test("shows the text inline for copying instead of downloading it", () => {
    const el = mount(<CopyBox text={"# Otto\n\nA grog."} label="Markdown sheet" />);
    expect(el.querySelector("textarea")!.value).toBe("# Otto\n\nA grog.");
    expect(el.textContent).toContain("Copy");
    // No filename → no save-to-disk escape hatch.
    expect(el.textContent).not.toContain("Save file");
  });

  test("offers a file save only when given a filename", () => {
    const el = mount(<CopyBox text="x" label="JSON" filename="otto.json" />);
    expect(el.textContent).toContain("Save file");
  });
});
