import type { Component, ComponentChildren } from "preact";

/**
 * The app's button, wrapping Web Awesome's `<wa-button>` so hierarchy, sizing,
 * focus and disabled states all come from one place instead of a handful of
 * `.btn` modifiers.
 *
 * The filter chips are deliberately *not* this: they are toggles carrying their
 * own Technique colours, which no button variant expresses.
 *
 * As with `ui/Select`, the custom element is registered by the app entry, so
 * under test the tag stays inert DOM that still bubbles `click`.
 */
export function Button({
  children,
  onClick,
  appearance = "outlined",
  variant = "neutral",
  size,
  disabled,
  title,
  block,
  class: klass = "",
  start,
}: {
  children: ComponentChildren;
  onClick?: () => void;
  /** "accent" fills with the variant colour; "plain" is borderless. */
  appearance?: "accent" | "filled" | "outlined" | "plain";
  variant?: "neutral" | "brand" | "danger";
  size?: "small" | "medium";
  disabled?: boolean;
  title?: string;
  /** Stretch to the full width of the container. */
  block?: boolean;
  class?: string;
  start?: Component;
}) {
  return (
    <wa-button
      class={`ui-button ${block ? "block" : ""} ${klass}`}
      appearance={appearance}
      variant={variant}
      size={size ?? "medium"}
      pill
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {start}
      {children}
    </wa-button>
  );
}
