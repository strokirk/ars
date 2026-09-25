import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { Button } from "./Button.tsx";

/**
 * A one-field inline editor: focused as soon as it mounts, Enter saves, Escape
 * cancels, and the suggestions stay visible as chips (a click saves that one).
 * Used to name a placeholder Ability, rename one, and set a specialty.
 */
export function TextPrompt({
  initial = "", label, placeholder, choices = [], saveLabel = "Save", allowEmpty, onSave, onCancel,
}: {
  initial?: string;
  /** Accessible name of the input. */
  label: string;
  placeholder?: string;
  choices?: readonly string[];
  saveLabel?: string;
  /** Saving an empty value is allowed (it clears the field). */
  allowEmpty?: boolean;
  onSave: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const input = useRef<HTMLInputElement>(null);
  // `autofocus` only fires on page load, not when Preact mounts the input later.
  useLayoutEffect(() => { input.current?.focus(); input.current?.select(); }, []);
  const save = (v: string) => { if (v.trim() || allowEmpty) onSave(v.trim()); };
  return (
    <div class="text-prompt">
      <div class="text-prompt-row">
        <input
          ref={input} type="text" value={value} aria-label={label} placeholder={placeholder}
          onInput={(e) => setValue((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); save(value); }
            // Stop here: an enclosing drawer would otherwise close on the same Escape.
            if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onCancel(); }
          }}
        />
        <Button size="small" variant="brand" appearance="accent" disabled={!value.trim() && !allowEmpty} onClick={() => save(value)}>{saveLabel}</Button>
        <Button size="small" appearance="plain" onClick={onCancel}>Cancel</Button>
      </div>
      {choices.length > 0 && (
        <div class="chips">
          {choices.map((c) => <Button size="small" appearance="outlined" variant="brand" key={c} onClick={() => save(c)}>{c}</Button>)}
        </div>
      )}
    </div>
  );
}
