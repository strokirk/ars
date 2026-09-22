// @vitest-environment jsdom
// Render tests for the creator's Abilities step: the stage meter, the always-visible
// browse list (recommended rows first, locked rows explained and hideable), and the
// specialty/template flows. Plain preact render over the real rules data, like
// browsers.test.tsx.
import { afterEach, describe, expect, test } from "vitest";
import { render } from "preact";
import { useState } from "preact/hooks";
import { AbilityPicker } from "../src/components/AbilityPicker.tsx";
import { apply, budgetsOf, type Character, type Op } from "../src/engine.ts";
import { rules } from "../src/rules.ts";
import { createGrog } from "../../chargen/src/domain/create.ts";

let host: HTMLElement;

function mount(vnode: preact.ComponentChild): HTMLElement {
  host = document.createElement("div");
  document.body.appendChild(host);
  render(vnode as never, host);
  return host;
}
afterEach(() => { render(null, host); host.remove(); });

const flush = () => new Promise((r) => setTimeout(r, 0));
const buttons = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>("button, wa-button")];
const label = (b: HTMLElement) => b.textContent!.replace(/\s+/g, " ").trim();
const button = (el: HTMLElement, text: string) => {
  const b = buttons(el).find((x) => label(x) === text);
  if (!b) throw new Error(`no button "${text}" among: ${buttons(el).map(label).join(" | ")}`);
  return b;
};
const rowTitles = (el: HTMLElement) => [...el.querySelectorAll(".option .ttl")].map((n) => n.textContent!.trim());
/** The option row carrying a given title, with its action button. */
const optionFor = (el: HTMLElement, title: string) => {
  const li = [...el.querySelectorAll<HTMLElement>(".option")].find((n) => n.querySelector(".ttl")!.textContent!.trim() === title);
  if (!li) throw new Error(`no row "${title}"`);
  return { li, meta: li.querySelector(".facts")!.textContent!, action: buttons(li)[0]! };
};

/** The picker drives a real character through the engine, exactly as the Wizard does. */
function Harness({ start, stage = "childhood" as const, recommended }: {
  start?: Character; stage?: "childhood" | "later-life"; recommended?: string[];
}) {
  const [ch, setCh] = useState<Character>(start ?? createGrog({ name: "Otto" }).character);
  const update = (ops: Op[]) => setCh(apply(ch, ops));
  const b = budgetsOf(ch);
  return (
    <AbilityPicker
      ch={ch} update={update} stage={stage}
      budget={stage === "childhood" ? b.childhood : b.laterLife}
      title="Early childhood" hint="Mundane skills."
      recommended={stage === "childhood" ? (recommended ?? ["Athletics", "Awareness"]) : recommended}
    />
  );
}

describe("AbilityPicker", () => {
  test("the stage meter names the pool and what is left of it", async () => {
    const el = mount(<Harness />);
    expect(el.querySelector(".stage-head .meter")!.textContent).toContain("0/45 xp");
    expect(el.querySelector(".stage-head .meter")!.textContent).toContain("45 left");

    optionFor(el, "Athletics").action.click();
    await flush();
    const meter = el.querySelector(".stage-head .meter")!;
    expect(meter.textContent).toContain("5/45 xp");
    expect(meter.textContent).toContain("40 left");
  });

  test("a taken row prints what the next point costs, and the stepper raises it", async () => {
    const el = mount(<Harness />);
    optionFor(el, "Athletics").action.click();
    await flush();
    expect(el.querySelector(".char-row .cost")!.textContent).toBe("+1 = 10 xp");

    el.querySelector<HTMLElement>('.stepper button[aria-label="increase Athletics"]')!.click();
    await flush();
    expect(el.querySelector(".char-row .cost")!.textContent).toBe("+1 = 15 xp");
    expect(el.querySelector(".stage-head .meter")!.textContent).toContain("15/45 xp");
  });

  test("the age cap stops the stepper and says why", async () => {
    const el = mount(<Harness />);
    optionFor(el, "Athletics").action.click();
    await flush();
    const plus = () => el.querySelector<HTMLButtonElement>('.stepper button[aria-label="increase Athletics"]')!;
    for (let i = 1; i < 5; i++) { plus().click(); await flush(); }
    expect(el.querySelector(".char-row .cost")!.textContent).toBe("max");
    expect(plus().disabled).toBe(true);
    expect(plus().title).toMatch(/caps Abilities at 5/);
  });

  test("the full list of what childhood can actually take is visible immediately, recommended first", async () => {
    const el = mount(<Harness />);
    // No search, no click needed — every General Ability is already there (locked
    // rows start hidden, so the list isn't 74 rows of mostly "Locked").
    expect(rowTitles(el).length).toBeGreaterThan(0);
    expect(rowTitles(el).length).toBeLessThan(rules.abilities.length);
    expect(rowTitles(el)).not.toContain("Single Weapon");
    expect(rowTitles(el).slice(0, 2)).toEqual(["Athletics", "Awareness"]);
    expect(optionFor(el, "Athletics").li.querySelector(".badge-tag")!.textContent).toBe("Recommended");
  });

  test("'Show locked' reveals what this stage refuses, with the engine's own reason", async () => {
    const el = mount(<Harness />);
    expect(rowTitles(el)).not.toContain("Single Weapon");
    button(el, "Show locked").click();
    await flush();
    expect(rowTitles(el).length).toBe(rules.abilities.length);
    const martial = optionFor(el, "Single Weapon");
    expect(label(martial.action)).toBe("Locked");
    expect(martial.action.getAttribute("disabled")).not.toBeNull();
    expect(martial.meta).toMatch(/can't be learned in childhood/);
    // ...and it sorts below everything actually takeable.
    expect(rowTitles(el).indexOf("Single Weapon")).toBeGreaterThan(rowTitles(el).indexOf("Swim"));
  });

  test("the type filter narrows the always-visible list (and implies showing locked rows)", async () => {
    const el = mount(<Harness />);
    button(el, "Show locked").click();
    await flush();
    button(el, "Martial").click();
    await flush();
    expect(rowTitles(el)).toEqual(["Bows", "Great Weapon", "Single Weapon", "Thrown Weapon"]);
  });

  test("search narrows it too, without any extra step to reveal the list", async () => {
    const el = mount(<Harness />);
    const input = el.querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = "swim";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await flush();
    expect(rowTitles(el)).toEqual(["Swim"]);
  });

  test("an already-taken row says so instead of offering a second copy", async () => {
    const el = mount(<Harness />);
    optionFor(el, "Awareness").action.click();
    await flush();

    const row = optionFor(el, "Awareness");
    expect(label(row.action)).toBe("Added");
    expect(row.meta).toContain("already here at 1");
  });

  test("a placeholder row asks for the specific name before adding it", async () => {
    const el = mount(<Harness />);
    const lore = optionFor(el, "(Area) Lore");
    expect(label(lore.action)).toBe("Name it…");
    lore.action.click();
    await flush();

    const input = el.querySelector<HTMLInputElement>('.name-it input[type="text"]')!;
    expect(el.querySelector(".name-it label")!.textContent).toBe("Which area?");
    input.value = "Provence";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await flush();
    button(el, "Add").click();
    await flush();

    expect(el.querySelector(".char-row .nm")!.textContent).toContain("Provence Lore");
  });

  test("a specialty can be typed onto a taken Ability", async () => {
    const el = mount(<Harness />);
    optionFor(el, "Athletics").action.click();
    await flush();

    button(el, "add specialty").click();
    await flush();
    const input = el.querySelector<HTMLInputElement>(".spec-edit input")!;
    expect(input.placeholder).toMatch(/acrobatics/);
    input.value = "jumping";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await flush();
    button(el, "Save").click();
    await flush();

    expect(el.querySelector(".char-row .nm small")!.textContent).toContain("spec: jumping");
    // Setting a specialty must not disturb the score it was set on.
    expect(el.querySelector(".stage-head .meter")!.textContent).toContain("5/45 xp");
  });

  test("later life offers the stages a character has already spent an Ability in", async () => {
    const started = apply(createGrog({ name: "Otto" }).character, [
      { op: "ability", name: "Awareness", score: 2, stage: "childhood" },
    ]);
    const el = mount(<Harness start={started} stage="later-life" />);
    expect(optionFor(el, "Awareness").meta).toContain("already in Childhood");
  });
});
