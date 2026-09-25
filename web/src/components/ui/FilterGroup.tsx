import type { ComponentChildren } from "preact";

/** One labelled cluster of filter controls, so a panel's groups read as separate. */
export function FilterGroup({ label, children }: { label: string; children: ComponentChildren }) {
  return (
    <div class="fgroup" role="group" aria-label={label}>
      <span class="flabel">{label}</span>
      {children}
    </div>
  );
}
