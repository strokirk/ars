// @vitest-environment jsdom
// The budget strip's per-pool "±" bonus control. The <wa-dialog> stays inert under
// test, so its body is in the DOM whether or not it is "open".
import { afterEach, expect, test } from "vitest";
import { render } from "preact";
import { useState } from "preact/hooks";
import { BudgetBar } from "../src/components/BudgetBar.tsx";
import { BonusXp } from "../src/components/BonusXp.tsx";
import { apply, budgetsOf, type Character, type Op } from "../src/engine.ts";
import { stepsFor, metersFor } from "../src/lib/wizard-steps.ts";
import { rules } from "../src/rules.ts";
import { createMagus } from "../../chargen/src/domain/create.ts";

let host: HTMLElement;
afterEach(() => { render(null, host); host.remove(); });
const flush = () => new Promise((r) => setTimeout(r, 0));

function Harness() {
  const [ch, setCh] = useState<Character>(createMagus({ name: "Aelia", house: "Merinita" }, rules).character);
  const update = (ops: Op[]) => setCh(apply(ch, ops));
  const step = stepsFor("magus").find((s) => s.key === "abilities")!;
  return <BudgetBar meters={metersFor(step, budgetsOf(ch))} bonus={(m) => m.pool && <BonusXp ch={ch} update={update} pool={m.pool} cap={m.cap} />} />;
}

test("a manual bonus added through a pool's ± control raises that pool's cap", async () => {
  host = document.createElement("div");
  document.body.appendChild(host);
  render(<Harness />, host);
  const pool = (label: string) => [...host.querySelectorAll<HTMLElement>(".pool")].find((p) => p.querySelector(".pool-label span")!.textContent!.startsWith(label))!;
  const left = (label: string) => pool(label).querySelector(".pool-label > b")!.textContent;
  const laterBefore = left("Later life");
  expect(left("Childhood")).toBe("45 left");

  const dialog = pool("Childhood").querySelector("wa-dialog")!;
  const amount = dialog.querySelector<HTMLInputElement>('input[aria-label="Bonus amount"]')!;
  amount.value = "15";
  amount.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
  [...dialog.querySelectorAll<HTMLElement>("button, wa-button")].find((b) => b.textContent === "Add")!.click();
  await flush();

  expect(left("Childhood")).toBe("60 left");
  expect(pool("Childhood").querySelector(".pool-bonus small")!.getAttribute("title")).toBe("60 = 45 + 15");
  expect(left("Later life")).toBe(laterBefore);
});
