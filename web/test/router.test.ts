// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { matchRoute } from "../src/router.ts";

describe("matchRoute", () => {
  test("maps each route to its handler", () => {
    expect(matchRoute("/")).toEqual({ name: "home" });
    expect(matchRoute("/new/magus")).toEqual({ name: "new", param: "magus" });
    expect(matchRoute("/edit/abc123")).toEqual({ name: "edit", param: "abc123" });
    expect(matchRoute("/sheet/abc123")).toEqual({ name: "sheet", param: "abc123" });
    expect(matchRoute("/roster/corvus-of-tytalus")).toEqual({ name: "roster", param: "corvus-of-tytalus" });
  });

  test("share links keep their whole base64 payload, slashes and all", () => {
    // Base64url shouldn't contain "/", but a stale link might — don't truncate it.
    expect(matchRoute("/c/eyJhIjox/more")).toEqual({ name: "share", param: "eyJhIjox/more" });
  });

  test("bare and unknown paths", () => {
    expect(matchRoute("/new")).toEqual({ name: "notfound" });   // kind is required
    expect(matchRoute("/nonsense")).toEqual({ name: "notfound" });
    expect(matchRoute("//")).toEqual({ name: "home" });
  });
});
