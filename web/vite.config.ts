import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import yaml from "@rollup/plugin-yaml";

// Static SPA. We import the chargen engine (TypeScript, with explicit .ts specifiers)
// and the repo's data/*.json directly, so Vite needs to resolve files above web/.
export default defineConfig({
  // data/*.yaml (the hand-maintained guideline metadata) is parsed at build time and
  // bundled as a plain object — the app never ships a YAML parser.
  plugins: [preact(), yaml()],
  // Force a single preact instance. Any second copy (a hoisting quirk, a peer
  // resolved to a different patch version, a half-migrated node_modules) gives
  // every hook-using dependency its own `preact/hooks` module, whose
  // `currentComponent` is never set by our renderer — icons from lucide-preact
  // then die in useContext with "Cannot read properties of undefined
  // (reading 'context')".
  resolve: { dedupe: ["preact", "preact/hooks", "preact/jsx-runtime", "preact/compat", "@preact/signals"] },
  server: { fs: { allow: [".."] } },
  build: { outDir: "dist", chunkSizeWarningLimit: 1500 },
});
