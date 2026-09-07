// Web Awesome (web components) supplies the controls a stylesheet cannot fix —
// chiefly the dropdown, whose popup a native <select> hands to the OS, which
// renders it in the platform's style and takes no CSS at all. Registered here
// once, cherry-picked to the components we actually use.
//
// Only the token theme is imported: `native.css` is a page-wide reset and
// `utilities.css` a class framework, and this app already has its own of both.
import "@awesome.me/webawesome/dist/styles/themes/default.css";
import "@awesome.me/webawesome/dist/components/select/select.js";
import "@awesome.me/webawesome/dist/components/option/option.js";
import { registerIconLibrary } from "@awesome.me/webawesome/dist/webawesome.js";

// A component's own chrome (the chevron, an option's tick, the clear button) is
// drawn with <wa-icon library="system">, which otherwise resolves against Font
// Awesome's CDN at runtime. Serving the handful we need inline keeps the app a
// self-contained static bundle that makes no icon requests.
const SYSTEM_ICONS: Record<string, string> = {
  "chevron-down": '<path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  "chevron-up": '<path d="M4 10l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  "chevron-left": '<path d="M10 4l-4 4 4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  "chevron-right": '<path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  check: '<path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  xmark: '<path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  "circle-xmark": '<circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
};

registerIconLibrary("system", {
  // An unknown name resolves to an empty icon rather than a failed request.
  resolver: (name: string) =>
    `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">${SYSTEM_ICONS[name] ?? ""}</svg>`,
    )}`,
});
