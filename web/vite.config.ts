import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

// Static SPA. We import the chargen engine (TypeScript, with explicit .ts specifiers)
// and the repo's data/*.json directly, so Vite needs to resolve files above web/.
export default defineConfig({
  plugins: [preact()],
  server: { fs: { allow: [".."] } },
  build: { outDir: "dist", chunkSizeWarningLimit: 1500 },
});
