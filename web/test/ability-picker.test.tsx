// @vitest-environment jsdom
// Render tests for the creator's Abilities step: the per-stage taken list with its
// meter, the catalogue (recommended rows first, locked rows explained and hideable),
// and the naming/renaming/specialty flows. Plain preact render over the real rules
// data, like browsers.test.tsx. The catalogue sits in a <wa-drawer>, which stays
// inert under test, so its rows are in the DOM whether or not it is "open".
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
const type = async (input: HTMLInputElement, value: string) => {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
};
const key = async (target: Element, k: string) => {
  target.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
  await flush();
};
const takenNames = (el: HTMLElement) => [...el.querySelectorAll(".taken-rows .char-row .nm")].map((n) => n.textContent!);

/** The picker drives a real character through the engine, exactly as the Wizard does. */
function Harness({ start, stage = "childhood" as const, recommended }: {
  start?: Character; stage?: "childhood" | "later-life"; recommended?: string[];
}) {
  const [ch, setCh] = useState<Character>(start ?? createGrog({ name: "Otto" }).character);
  const update = (ops: Op[]) => setCh(apply(ch, ops));
  const b = budgetsOf(ch);
  return (
    <AbilityPicker
      ch={ch} update={update}
      stages={[{
        stage, title: "Early childhood", hint: "Mundane skills.",
        budget: stage === "childhood" ? b.childhood : b.laterLife,
        recommended: stage === "childhood" ? (recommended ?? ["Athletics", "Awareness"]) : recommended,
      }]}
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
    expect(el.querySelector(".char-row .cost")!.textContent).toBe("5/15 · +1 = 10 xp");

    el.querySelector<HTMLElement>('.stepper button[aria-label="increase Athletics"]')!.click();
    await flush();
    expect(el.querySelector(".char-row .cost")!.textContent).toBe("15/30 · +1 = 15 xp");
    expect(el.querySelector(".stage-head .meter")!.textContent).toContain("15/45 xp");
  });

  test("raising a score past the age cap is allowed, flagged on the row rather than stopped", async () => {
    const el = mount(<Harness />);
    optionFor(el, "Athletics").action.click();
    await flush();
    const plus = () => el.querySelector<HTMLButtonElement>('.stepper button[aria-label="increase Athletics"]')!;
    for (let i = 1; i < 6; i++) { plus().click(); await flush(); }
    expect(el.querySelector(".char-row .age-cap")!.textContent).toMatch(/over cap/);
    expect(plus().title).toMatch(/beyond the usual cap/);
    expect(plus().disabled).toBe(false);
  });

  test("the stage is ticked done only when its pool is spent exactly, not while overspent", async () => {
    const el = mount(<Harness />);
    const done = () => el.querySelector(".stage-check")!.classList.contains("done");
    optionFor(el, "Athletics").action.click();
    await flush();
    const plus = () => el.querySelector<HTMLButtonElement>('.stepper button[aria-label="increase Athletics"]')!;
    for (let i = 1; i < 4; i++) { plus().click(); await flush(); } // score 4 = 50 xp of 45
    expect(el.querySelector(".stage-head .meter")!.classList.contains("over")).toBe(true);
    expect(done()).toBe(false);
  });

  test("the catalogue lists what childhood can actually take, recommended first", async () => {
    const el = mount(<Harness />);
    // Locked rows start hidden, so the list isn't 74 rows of mostly "Locked".
    expect(rowTitles(el).length).toBeGreaterThan(0);
    expect(rowTitles(el).length).toBeLessThan(rules.abilities.length);
    expect(rowTitles(el)).not.toContain("Single Weapon");
    expect(rowTitles(el).slice(0, 2)).toEqual(["Athletics", "Awareness"]);
    expect(optionFor(el, "Athletics").li.querySelector(".badge-tag")!.textContent).toBe("Recommended");
  });

  test("'Show locked' reveals what this stage refuses, with the engine's own reason — but still lets you take it", async () => {
    const el = mount(<Harness />);
    expect(rowTitles(el)).not.toContain("Single Weapon");
    button(el, "Filters").click();
    await flush();
    button(el, "Show locked").click();
    await flush();
    expect(rowTitles(el).length).toBe(rules.abilities.length);
    const martial = optionFor(el, "Single Weapon");
    expect(label(martial.action)).toBe("Add ⚠");
    expect(martial.action.getAttribute("disabled")).toBeNull();
    expect(martial.meta).toMatch(/aren't usually learned in childhood/);
    // ...and it sorts below everything actually takeable.
    expect(rowTitles(el).indexOf("Single Weapon")).toBeGreaterThan(rowTitles(el).indexOf("Swim"));
  });

  test("the type filter narrows the list (and implies showing locked rows)", async () => {
    const el = mount(<Harness />);
    button(el, "Filters").click();
    await flush();
    button(el, "Show locked").click();
    await flush();
    button(el, "Martial").click();
    await flush();
    expect(rowTitles(el)).toEqual(["Bows", "Great Weapon", "Single Weapon", "Thrown Weapon"]);
  });

  test("search narrows it, and Enter adds the top hit", async () => {
    const el = mount(<Harness />);
    const input = el.querySelector<HTMLInputElement>('input[type="search"]')!;
    await type(input, "swim");
    expect(rowTitles(el)).toEqual(["Swim"]);
    await key(input, "Enter");
    expect(takenNames(el).join()).toContain("Swim");
  });

  test("an already-taken row says so instead of offering a second copy", async () => {
    const el = mount(<Harness />);
    optionFor(el, "Awareness").action.click();
    await flush();

    const row = optionFor(el, "Awareness");
    expect(label(row.action)).toBe("Added");
    expect(row.meta).toContain("already here at 1");
  });

  test("a placeholder row is named in place, focused, with Enter to add and Escape to cancel", async () => {
    const el = mount(<Harness />);
    const lore = optionFor(el, "(Area) Lore");
    expect(label(lore.action)).toBe("Add");
    lore.action.click();
    await flush();

    const input = el.querySelector<HTMLInputElement>(".option.naming input")!;
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute("aria-label")).toBe("Which area?");
    await key(input, "Escape");
    expect(el.querySelector(".option.naming")).toBeNull();

    optionFor(el, "(Area) Lore").action.click();
    await flush();
    const again = el.querySelector<HTMLInputElement>(".option.naming input")!;
    await type(again, "Provense");
    await key(again, "Enter");
    expect(takenNames(el).join()).toContain("Provense Lore");
  });

  test("a named Ability can be renamed in place, keeping its score and specialty", async () => {
    const start = apply(createGrog({ name: "Otto" }).character, [
      { op: "ability", name: "Provense Lore", score: 2, stage: "childhood", specialty: "geography" },
    ]);
    const el = mount(<Harness start={start} />);
    // A data row's own name is fixed; only a typed-in one offers renaming.
    el.querySelector<HTMLElement>(".ab-name")!.click();
    await flush();
    const input = el.querySelector<HTMLInputElement>('.char-row input[aria-label="Rename Provense Lore"]')!;
    expect(document.activeElement).toBe(input);
    await type(input, "Provence Lore");
    await key(input, "Enter");
    expect(takenNames(el)[0]).toContain("Provence Lore");
    expect(el.querySelector(".spec-tag")!.textContent).toBe("geography");
    expect(el.querySelector(".stepper .val")!.textContent).toBe("2");
  });

  test("a specialty is set from its suggestion chips or typed, without disturbing the score", async () => {
    const el = mount(<Harness />);
    optionFor(el, "Athletics").action.click();
    await flush();

    const tag = () => el.querySelector<HTMLElement>(".spec-tag")!;
    expect(tag().textContent).toBe("+ specialty");
    tag().click();
    await flush();
    button(el.querySelector(".spec-popover")!, "acrobatics").click();
    await flush();
    expect(tag().textContent).toBe("acrobatics");

    tag().click();
    await flush();
    const input = el.querySelector<HTMLInputElement>(".spec-popover input")!;
    expect(document.activeElement).toBe(input);
    await type(input, "jumping");
    await key(input, "Enter");
    expect(tag().textContent).toBe("jumping");
    expect(el.querySelector(".stage-head .meter")!.textContent).toContain("5/45 xp");

    // Saving it empty clears it.
    tag().click();
    await flush();
    await type(el.querySelector<HTMLInputElement>(".spec-popover input")!, "");
    await key(el.querySelector(".spec-popover input")!, "Enter");
    expect(tag().textContent).toBe("+ specialty");
  });

  test("a second stage's xp adds to the same Ability: one combined score, ± spending this stage's share", async () => {
    const started = apply(createGrog({ name: "Otto" }).character, [
      { op: "ability", name: "Athletics", score: 1, stage: "childhood", specialty: "running" },
    ]);
    const el = mount(<Harness start={started} stage="later-life" />);
    optionFor(el, "Athletics").action.click(); // buys the next point: 10 xp here on top of childhood's 5
    await flush();
    expect(el.querySelector(".stepper .val")!.textContent).toBe("2");
    expect(el.querySelector(".char-row .cost")!.textContent).toBe("15/30 · +1 = 15 xp");
    expect(el.querySelector(".char-row small")!.textContent).toContain("10 xp here + 5 in Childhood");
    expect(el.querySelector(".spec-tag")!.textContent).toBe("running");
    expect(el.querySelector(".stage-head .meter")!.textContent).toContain("10/75 xp");

    el.querySelector<HTMLElement>('.stepper button[aria-label="decrease Athletics"]')!.click();
    await flush();
    // Refunding all of this stage's xp drops its row; childhood's Athletics 1 remains.
    expect(el.querySelector(".stage-head .meter")!.textContent).toContain("0/75 xp");
    expect(takenNames(el)).toEqual([]);
  });

  test("later life offers the stages a character has already spent an Ability in", async () => {
    const started = apply(createGrog({ name: "Otto" }).character, [
      { op: "ability", name: "Awareness", score: 2, stage: "childhood" },
    ]);
    const el = mount(<Harness start={started} stage="later-life" />);
    expect(optionFor(el, "Awareness").meta).toContain("already in Childhood");
  });
});
