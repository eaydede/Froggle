import type React from "react";

interface RoomCodeProps {
  value: string;
  onChange: (value: string) => void;
  variant?: "inline" | "field" | "pill" | "minimal";
}

/**
 * Inline: label and code sit side-by-side on a single row,
 * code appears as plain editable text.
 */
function InlineVariant({ value, onChange }: Omit<RoomCodeProps, "variant">) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2"
      style={{ fontFamily: "var(--font-option)", fontWeight: "var(--font-option-weight)" as any }}
    >
      <span
        className="text-[0.6rem] text-[var(--text-muted)] uppercase tracking-[0.06em] opacity-70"
        style={{ fontFamily: "var(--font-label)", fontWeight: "var(--font-label-weight)" as any }}
      >
        Room Code
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder="------"
        maxLength={6}
        className="
          bg-transparent border-none outline-none text-right
          text-[0.78rem] tracking-[0.18em] text-[var(--text-muted)]
          placeholder:text-[var(--text-muted)] placeholder:opacity-30
          focus:text-[var(--text)]
          transition-colors
          w-[7rem]
        "
        style={{ fontFamily: "var(--font-option)", fontWeight: "var(--font-option-weight)" as any }}
      />
    </div>
  );
}

/**
 * Field: traditional labeled input with the label above
 * and a bordered input below.
 */
function FieldVariant({ value, onChange }: Omit<RoomCodeProps, "variant">) {
  return (
    <div>
      <div
        className="text-[0.68rem] text-[var(--text-muted)] mb-2 uppercase tracking-[0.06em]"
        style={{ fontFamily: "var(--font-label)", fontWeight: "var(--font-label-weight)" as any }}
      >
        Room Code
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder="ENTER CODE"
        maxLength={6}
        className="
          w-full bg-[var(--track)] border-none outline-none
          rounded-xl px-4 py-3
          text-[0.9rem] tracking-[0.15em] text-[var(--text)]
          text-center
          placeholder:text-[var(--text-muted)] placeholder:opacity-40
        "
        style={{ fontFamily: "var(--font-option)", fontWeight: "var(--font-option-weight)" as any }}
      />
    </div>
  );
}

/**
 * Pill: each character gets its own cell in a row of boxes,
 * like a verification code input.
 */
function PillVariant({ value, onChange }: Omit<RoomCodeProps, "variant">) {
  const maxLen = 6;
  const chars = value.padEnd(maxLen, " ").slice(0, maxLen).split("");

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, idx: number) {
    const inputs = e.currentTarget.parentElement?.querySelectorAll("input");
    if (!inputs) return;

    if (e.key === "Backspace" && !value[idx] && idx > 0) {
      const updated = chars.map((c, i) => (i === idx - 1 ? " " : c)).join("").trimEnd();
      onChange(updated);
      (inputs[idx - 1] as HTMLInputElement).focus();
      e.preventDefault();
    }
  }

  function handleInput(char: string, idx: number) {
    const upper = char.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!upper) return;
    const updated = chars.map((c, i) => (i === idx ? upper : c)).join("").trimEnd();
    onChange(updated);

    // Advance focus
    const inputs = document.querySelectorAll<HTMLInputElement>(".room-code-cell");
    if (idx < maxLen - 1) inputs[idx + 1]?.focus();
  }

  return (
    <div>
      <div
        className="text-[0.68rem] text-[var(--text-muted)] mb-2 uppercase tracking-[0.06em]"
        style={{ fontFamily: "var(--font-label)", fontWeight: "var(--font-label-weight)" as any }}
      >
        Room Code
      </div>
      <div className="flex gap-1.5">
        {chars.map((ch, i) => (
          <input
            key={i}
            type="text"
            inputMode="text"
            maxLength={1}
            value={ch.trim()}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onChange={(e) => handleInput(e.target.value, i)}
            className="
              room-code-cell
              w-full aspect-square bg-[var(--track)] border-none outline-none
              rounded-lg text-center text-[1rem] text-[var(--text)]
            "
            style={{ fontFamily: "var(--font-option)", fontWeight: "var(--font-option-weight)" as any }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Minimal: just an underlined text input with no background,
 * label to the left.
 */
function MinimalVariant({ value, onChange }: Omit<RoomCodeProps, "variant">) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="text-[0.68rem] text-[var(--text-muted)] uppercase tracking-[0.06em] shrink-0"
        style={{ fontFamily: "var(--font-label)", fontWeight: "var(--font-label-weight)" as any }}
      >
        Room Code
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder="------"
        maxLength={6}
        className="
          flex-1 bg-transparent outline-none
          border-b border-b-[var(--track)] border-t-0 border-l-0 border-r-0
          text-[0.9rem] tracking-[0.2em] text-[var(--text)]
          text-center pb-1
          placeholder:text-[var(--text-muted)] placeholder:opacity-30
          focus:border-b-[var(--accent)]
          transition-colors
        "
        style={{ fontFamily: "var(--font-option)", fontWeight: "var(--font-option-weight)" as any }}
      />
    </div>
  );
}

export function RoomCode({ value, onChange, variant = "inline" }: RoomCodeProps) {
  switch (variant) {
    case "inline":
      return <InlineVariant value={value} onChange={onChange} />;
    case "field":
      return <FieldVariant value={value} onChange={onChange} />;
    case "pill":
      return <PillVariant value={value} onChange={onChange} />;
    case "minimal":
      return <MinimalVariant value={value} onChange={onChange} />;
  }
}
