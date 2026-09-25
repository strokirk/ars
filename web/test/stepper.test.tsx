// @vitest-environment jsdom
// The editable Stepper (Arts): a typed score is clamped to [min, max] and snaps back.
import { expect, test } from "vitest";
import { render } from "preact";
import { Stepper } from "../src/components/ui/Stepper.tsx";

test("editable Stepper takes a typed score, clamped", () => {
  const host = document.createElement("div");
  const got: number[] = [];
  render(<Stepper editable value={3} min={0} max={10} label="Creo" onChange={(v) => got.push(v)} />, host);
  const input = host.querySelector<HTMLInputElement>('input[aria-label="Creo"]')!;
  const type = (v: string) => { input.value = v; input.dispatchEvent(new Event("change")); };
  type("8"); type("99"); type("-4");
  expect(got).toEqual([8, 10, 0]);
  type("3"); // unchanged value: no onChange
  expect(got).toHaveLength(3);
  render(null, host);
});
