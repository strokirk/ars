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
const chip = (el: HTMLElement, label: string) =>
  [...el.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent!.trim() === label)!;

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
    chip(el, "Perdo").click();
    await flush();
    expect(count(el)).toBeLessThan(before);
    expect(count(el)).toBeGreaterThan(0);
  });

  test("Rituals only and Formulaic only are mutually exclusive views", async () => {
    const el = mount(<SpellBrowser />);
    chip(el, "Rituals only").click();
    await flush();
    const rituals = count(el);
    chip(el, "Rituals only").click();  // toggle off
    chip(el, "Formulaic only").click();
    await flush();
    const formulaic = count(el);
    expect(rituals).toBeGreaterThan(0);
    expect(formulaic).toBeGreaterThan(rituals);
  });

  test("the Lab Total filter appears only when a character is in play", async () => {
    const plain = mount(<SpellBrowser />);
    expect(plain.textContent).not.toContain("Within my Lab Total");
    render(null, host); host.remove();

    const withChar = mount(<SpellBrowser labTotalOf={() => 15} />);
    expect(withChar.textContent).toContain("LabTotal 15");
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
      expect(el.querySelector(".tab.on")!.textContent).toBe("Spells");
      render(null, host); host.remove();
    }
    const el = mount(<Library tab="virtues" />);
    expect(el.querySelector(".tab.on")!.textContent).toBe("Virtues & Flaws");
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
