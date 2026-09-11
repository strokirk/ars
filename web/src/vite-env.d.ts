/// <reference types="vite/client" />

// data/*.yaml is parsed at build time by @rollup/plugin-yaml. The shapes live in
// lib/guidelines.ts, which casts this `any` to the typed model in one place.
declare module "*.yaml" {
  const data: any;
  export default data;
}
