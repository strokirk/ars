// Guards against the failure that took down every icon: a second copy of preact.
// When `lucide-preact` resolves a different preact than the app, it gets its own
// `preact/hooks` module whose `currentComponent` our renderer never sets, and the
// icons die inside useContext with "Cannot read properties of undefined
// (reading 'context')". vite.config.ts dedupes for the bundle; this catches the
// node_modules layout that causes it.
import { describe, expect, test } from "vitest";
import { createRequire } from "node:module";
import { dirname } from "node:path";

const req = createRequire(import.meta.url);

describe("preact instance", () => {
  test("lucide-preact resolves the same preact as the app", () => {
    const app = req.resolve("preact");
    const fromLucide = req.resolve("preact", { paths: [dirname(req.resolve("lucide-preact"))] });
    expect(fromLucide).toBe(app);
  });

  test("only one preact version is installed", () => {
    const versions = new Set(
      ["preact", "lucide-preact", "@preact/signals"].map((pkg) => {
        const paths = pkg === "preact" ? undefined : [dirname(req.resolve(pkg))];
        return req(req.resolve("preact/package.json", paths ? { paths } : undefined)).version as string;
      }),
    );
    expect([...versions]).toHaveLength(1);
  });
});
