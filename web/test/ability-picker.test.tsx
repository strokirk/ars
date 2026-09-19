// @vitest-environment jsdom
// Render tests for the creator's Abilities step: the stage meter, the quick-add
// chips, and the browse list refusing what the stage can't take. Plain preact
// render over the real rules data, like browsers.test.tsx.
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
  return { meta: li.querySelector(".facts")!.textContent!, action: buttons(li)[0]! };
};

/** The picker drives a real character through the engine, exactly as the Wizard does. */
function Harness({ start, stage = "childhood" as const }: { start?: Character; stage?: "childhood" | "later-life" }) {
  const [ch, setCh] = useState<Character>(start ?? createGrog({ name: "Otto" }).character);
  const update = (ops: Op[]) => setCh(apply(ch, ops));
  const b = budgetsOf(ch);
  return (
    <AbilityPicker
      ch={ch} update={update} stage={stage}
      budget={stage === "childhood" ? b.childhood : b.laterLife}
      title="Early childhood" hint="Mundane skills."
      suggestions={stage === "childhood" ? ["Athletics", "Awareness"] : undefined}
    />
  );
}

describe("AbilityPicker", () => {
  test("the stage meter names the pool and what is left of it", async () => {
    const el = mount(<Harness />);
    expect(el.querySelector(".stage-head .meter")!.textContent).toContain("0/45 xp");
    expect(el.querySelector(".stage-head .meter")!.textContent).toContain("45 left");

    button(el, "+ Athletics").click();
    await flush();
    const meter = el.querySelector(".stage-head .meter")!;
    expect(meter.textContent).toContain("5/45 xp");
    expect(meter.textContent).toContain("40 left");
  });

  test("a taken row prints what the next point costs, and the stepper raises it", async () => {
    const el = mount(<Harness />);
    button(el, "+ Athletics").click();
    await flush();
    expect(el.querySelector(".char-row .cost")!.textContent).toBe("+1 = 10 xp");

    el.querySelector<HTMLElement>('.stepper button[aria-label="increase Athletics"]')!.click();
    await flush();
    expect(el.querySelector(".char-row .cost")!.textContent).toBe("+1 = 15 xp");
    expect(el.querySelector(".stage-head .meter")!.textContent).toContain("15/45 xp");
  });

  test("the age cap stops the stepper and says why", async () => {
    const el = mount(<Harness />);
    button(el, "+ Athletics").click();
    await flush();
    const plus = () => el.querySelector<HTMLButtonElement>('.stepper button[aria-label="increase Athletics"]')!;
    for (let i = 1; i < 5; i++) { plus().click(); await flush(); }
    expect(el.querySelector(".char-row .cost")!.textContent).toBe("max");
    expect(plus().disabled).toBe(true);
    expect(plus().title).toMatch(/caps Abilities at 5/);
  });

  test("the list stays folded until asked for, then answers the type filter", async () => {
    const el = mount(<Harness />);
    expect(rowTitles(el)).toHaveLength(0);
    button(el, "+ Add an Ability").click();
    await flush();
    expect(rowTitles(el).length).toBe(rules.abilities.length);

    button(el, "Martial").click();
    await flush();
    expect(rowTitles(el)).toEqual(["Bows", "Great Weapon", "Single Weapon", "Thrown Weapon"]);
  });

  test("childhood locks non-General rows with the engine's own reason", async () => {
    const el = mount(<Harness />);
    button(el, "+ Add an Ability").click();
    await flush();

    const martial = optionFor(el, "Single Weapon");
    expect(label(martial.action)).toBe("Locked");
    expect(martial.action.getAttribute("disabled")).not.toBeNull();
    expect(martial.meta).toMatch(/can't be learned in childhood/);
    // ...and they sort below everything a child could actually pick up.
    expect(rowTitles(el).indexOf("Single Weapon")).toBeGreaterThan(rowTitles(el).indexOf("Swim"));
  });

  test("an already-taken row says so instead of offering a second copy", async () => {
    const el = mount(<Harness />);
    button(el, "+ Awareness").click();
    await flush();
    button(el, "+ Add an Ability").click();
    await flush();

    const row = optionFor(el, "Awareness");
    expect(label(row.action)).toBe("Added");
    expect(row.meta).toContain("already here at 1");
  });

  test("a placeholder row asks for the specific name before adding it", async () => {
    const el = mount(<Harness />);
    button(el, "+ Add an Ability").click();
    await flush();

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
    button(el, "+ Athletics").click();
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
    button(el, "+ Add an Ability").click();
    await flush();
    expect(optionFor(el, "Awareness").meta).toContain("already in Childhood");
  });
});
