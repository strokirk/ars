import type { RefObject } from "preact";
import { useLayoutEffect } from "preact/hooks";

/**
 * Publish an element's live height as a CSS custom property on <html>, so other
 * sticky elements can stack below it — it wraps to two or three lines on a narrow
 * screen, so guessing a fixed height would leave a gap or an overlap.
 */
export function usePublishHeight(ref: RefObject<HTMLElement>, cssVar: string): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement.style;
    const publish = () => root.setProperty(cssVar, `${el.offsetHeight}px`);
    publish();
    const ro = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(publish);
    ro?.observe(el);
    return () => { ro?.disconnect(); root.removeProperty(cssVar); };
  }, []);
}
