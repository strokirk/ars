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
  // Web Awesome ships ES modules whose components share chunks. Pre-bundling them
  // means adding one more component import re-optimises mid-session and loads a
  // second copy — "wa-icon has already been used with this registry". Served as-is,
  // every component resolves the same chunk URLs.
  optimizeDeps: { exclude: ["@awesome.me/webawesome"] },
  build: { outDir: "dist", chunkSizeWarningLimit: 1500 },
});
