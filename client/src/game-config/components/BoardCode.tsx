import type React from "react";

interface BoardCodeProps {
  value: string;
  onChange: (value: string) => void;
  variant?: "inline" | "field" | "pill" | "minimal";
}

/**
 * Formats raw letters into XXXX-XXXX-XXXX pattern.
 * Strips anything that isn't a letter, uppercases, inserts hyphens.
 */
function formatCode(raw: string): string {
  const letters = raw.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 12);
  const parts: string[] = [];
  for (let i = 0; i < letters.length; i += 4) {
    parts.push(letters.slice(i, i + 4));
  }
  return parts.join("-");
}

/**
 * Returns just the letters (no hyphens) from a formatted code.
 */
function stripCode(formatted: string): string {
  return formatted.replace(/[^A-Z]/g, "");
}

/**
 * Inline: label and code sit side-by-side on a single row.
 */
function InlineVariant({ value, onChange }: Omit<BoardCodeProps, "variant">) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(formatCode(e.target.value));
  }

  return (
    <div
      className="flex items-center justify-between px-3 py-2"
      style={{ fontFamily: "var(--font-option)", fontWeight: "var(--font-option-weight)" as any }}
    >
      <span
        className="text-[0.6rem] text-[var(--text-muted)] uppercase tracking-[0.06em] opacity-70 shrink-0"
        style={{ fontFamily: "var(--font-label)", fontWeight: "var(--font-label-weight)" as any }}
      >
        Code
      </span>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="XXXX-XXXX-XXXX"
        maxLength={14}
        className="
          bg-transparent border-none outline-none text-right
          text-[0.78rem] tracking-[0.08em] text-[var(--text-muted)]
          placeholder:text-[var(--text-muted)] placeholder:opacity-30
          focus:text-[var(--text)]
          transition-colors
          w-[10rem]
        "
        style={{ fontFamily: "var(--font-option)", fontWeight: "var(--font-option-weight)" as any }}
      />
    </div>
  );
}

/**
 * Field: label above, full-width centered input below.
 */
function FieldVariant({ value, onChange }: Omit<BoardCodeProps, "variant">) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(formatCode(e.target.value));
  }

  return (
    <div>
      <div
        className="text-[0.68rem] text-[var(--text-muted)] mb-2 uppercase tracking-[0.06em]"
        style={{ fontFamily: "var(--font-label)", fontWeight: "var(--font-label-weight)" as any }}
      >
        Board Code
      </div>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="XXXX-XXXX-XXXX"
        maxLength={14}
        className="
          w-full bg-[var(--track)] border-none outline-none
          rounded-xl px-4 py-3
          text-[0.9rem] tracking-[0.08em] text-[var(--text)]
          text-center
          placeholder:text-[var(--text-muted)] placeholder:opacity-40
        "
        style={{ fontFamily: "var(--font-option)", fontWeight: "var(--font-option-weight)" as any }}
      />
    </div>
  );
}

/**
 * Pill: three groups of 4 character cells separated by hyphens.
 */
function PillVariant({ value, onChange }: Omit<BoardCodeProps, "variant">) {
  const letters = stripCode(value).padEnd(12, " ").slice(0, 12).split("");

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, idx: number) {
    if (e.key === "Backspace" && !letters[idx]?.trim() && idx > 0) {
      const updated = letters.map((c, i) => (i === idx - 1 ? " " : c));
      onChange(formatCode(updated.join("")));
      const inputs = document.querySelectorAll<HTMLInputElement>(".board-code-cell");
      (inputs[idx - 1] as HTMLInputElement)?.focus();
      e.preventDefault();
    }
  }

  function handleInput(char: string, idx: number) {
    const upper = char.toUpperCase().replace(/[^A-Z]/g, "");
    if (!upper) return;
    const updated = letters.map((c, i) => (i === idx ? upper : c));
    onChange(formatCode(updated.join("")));
    const inputs = document.querySelectorAll<HTMLInputElement>(".board-code-cell");
    if (idx < 11) inputs[idx + 1]?.focus();
  }

  return (
    <div>
      <div
        className="text-[0.68rem] text-[var(--text-muted)] mb-2 uppercase tracking-[0.06em]"
        style={{ fontFamily: "var(--font-label)", fontWeight: "var(--font-label-weight)" as any }}
      >
        Board Code
      </div>
      <div className="flex items-center gap-1.5">
        {letters.map((ch, i) => (
          <span key={i} className="contents">
            <input
              type="text"
              inputMode="text"
              maxLength={1}
              value={ch.trim()}
              onKeyDown={(e) => handleKeyDown(e, i)}
              onChange={(e) => handleInput(e.target.value, i)}
              className="
                board-code-cell
                w-full aspect-square bg-[var(--track)] border-none outline-none
                rounded-lg text-center text-[0.85rem] text-[var(--text)]
              "
              style={{ fontFamily: "var(--font-option)", fontWeight: "var(--font-option-weight)" as any }}
            />
            {(i === 3 || i === 7) && (
              <span className="text-[var(--text-muted)] opacity-40 text-[0.7rem] shrink-0 mx-0.5">-</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Minimal: underlined input, label to the left.
 */
function MinimalVariant({ value, onChange }: Omit<BoardCodeProps, "variant">) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(formatCode(e.target.value));
  }

  return (
    <div className="flex items-center gap-3">
      <span
        className="text-[0.68rem] text-[var(--text-muted)] uppercase tracking-[0.06em] shrink-0"
        style={{ fontFamily: "var(--font-label)", fontWeight: "var(--font-label-weight)" as any }}
      >
        Code
      </span>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="XXXX-XXXX-XXXX"
        maxLength={14}
        className="
          flex-1 bg-transparent outline-none
          border-b border-b-[var(--track)] border-t-0 border-l-0 border-r-0
          text-[0.9rem] tracking-[0.08em] text-[var(--text)]
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

export function BoardCode({ value, onChange, variant = "inline" }: BoardCodeProps) {
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
