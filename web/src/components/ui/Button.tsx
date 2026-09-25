import type { Component, ComponentChildren } from "preact";

/**
 * The app's button, wrapping Web Awesome's `<wa-button>` so hierarchy, sizing,
 * focus and disabled states all come from one place instead of a handful of
 * `.btn` modifiers.
 *
 * Pass `color` for a chip that carries its own colour (a Technique, a
 * Virtue/Flaw polarity) instead of the fixed "brand" palette: it overrides the
 * brand tokens on this instance only (custom properties pierce the shadow
 * root), so `appearance="accent"` fills with it and `"outlined"` borders with
 * it, the same "on/off" language every other chip already uses.
 *
 * As with `ui/Select`, the custom element is registered by the app entry, so
 * under test the tag stays inert DOM that still bubbles `click`.
 */
export function Button({
  children,
  onClick,
  appearance = "outlined",
  variant = "neutral",
  color,
  size,
  disabled,
  title,
  block,
  class: klass = "",
  start,
  pressed,
  expanded,
}: {
  children: ComponentChildren;
  onClick?: () => void;
  /** "accent" fills with the variant colour; "plain" is borderless. */
  appearance?: "accent" | "filled" | "filled-outlined" | "outlined" | "plain";
  /** Toggle state, exposed as aria-pressed. */
  pressed?: boolean;
  /** Disclosure state, exposed as aria-expanded. */
  expanded?: boolean;
  variant?: "neutral" | "brand" | "danger";
  /** A CSS colour (e.g. a Technique's) to recolour this instance instead of `variant`. */
  color?: string;
  size?: "small" | "medium";
  disabled?: boolean;
  title?: string;
  /** Stretch to the full width of the container. */
  block?: boolean;
  class?: string;
  start?: Component;
}) {
  const style = color
    ? {
        "--wa-color-brand-fill-loud": color,
        "--wa-color-brand-border-loud": color,
        "--wa-color-brand-on-loud": "#fff",
        "--wa-color-brand-on-quiet": color,
      }
    : undefined;
  return (
    <wa-button
      class={`ui-button ${block ? "block" : ""} ${klass}`}
      appearance={appearance}
      variant={color ? "brand" : variant}
      size={size === "small" ? "s" : "m"}
      pill
      disabled={disabled}
      aria-pressed={pressed}
      aria-expanded={expanded}
      title={title}
      style={style}
      onClick={onClick}
    >
      {start}
      {children}
    </wa-button>
  );
}
