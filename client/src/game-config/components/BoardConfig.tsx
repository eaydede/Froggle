import { useState, useRef, useEffect } from "react";
import { usePillPosition } from "../use-pill-position";
import { MiniGrid } from "./MiniGrid";
import type { BoardSize } from "../types";

const OPTIONS: { size: BoardSize; label: string; sub: string }[] = [
  { size: 4, label: "4 × 4", sub: "Classic" },
  { size: 5, label: "5 × 5", sub: "Big" },
  { size: 6, label: "6 × 6", sub: "Mega" },
];

/**
 * Formats raw letters into XXXX-XXXX-XXXX pattern.
 */
function formatCode(raw: string): string {
  const letters = raw.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 12);
  const parts: string[] = [];
  for (let i = 0; i < letters.length; i += 4) {
    parts.push(letters.slice(i, i + 4));
  }
  return parts.join("-");
}

interface BoardConfigProps {
  value: BoardSize;
  onChange: (size: BoardSize) => void;
  disabled?: boolean;
  code?: string;
  onCodeChange?: (code: string) => void;
}

export function BoardConfig({ value, onChange, disabled, code, onCodeChange }: BoardConfigProps) {
  const selectedIndex = OPTIONS.findIndex((o) => o.size === value);
  const { trackRef, pillLeft } = usePillPosition(selectedIndex, OPTIONS.length);
  const inputRef = useRef<HTMLInputElement>(null);

  const [codeOpen, setCodeOpen] = useState(false);
  const [internalCode, setInternalCode] = useState("");
  const codeValue = code ?? internalCode;
  const setCodeValue = onCodeChange ?? setInternalCode;

  // Track animation triggers per option so re-selecting the same one re-pops
  const [animKeys, setAnimKeys] = useState<Record<BoardSize, number>>({
    4: 0,
    5: 0,
    6: 0,
  });

  function handleSelect(size: BoardSize) {
    if (disabled) return;
    onChange(size);
    setAnimKeys((prev) => ({ ...prev, [size]: prev[size] + 1 }));
  }

  function toggleCode() {
    const next = !codeOpen;
    setCodeOpen(next);
    if (!next) {
      setCodeValue("");
    }
  }

  // Focus input when opened
  useEffect(() => {
    if (codeOpen) {
      // Small delay to let the animation start before focusing
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [codeOpen]);

  return (
    <div>
      {/* Label row with code toggle */}
      <div className="flex items-center justify-between mb-2">
        <div
          className="text-[0.68rem] text-[var(--label-color)] uppercase tracking-[0.06em]"
          style={{ fontFamily: "var(--font-label)", fontWeight: "var(--font-label-weight)" as any }}
        >
          Board
        </div>

        <div className="flex items-center gap-1.5">
          {/* Code input — slides in from right */}
          <div
            className="overflow-hidden transition-all duration-700 ease-in-out"
            style={{
              width: codeOpen ? 160 : 0,
              opacity: codeOpen ? 1 : 0,
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={codeValue}
              onChange={(e) => setCodeValue(formatCode(e.target.value))}
              placeholder="XXXX-XXXX-XXXX"
              maxLength={14}
              className="
                w-full bg-transparent border-none outline-none
                text-[0.68rem] tracking-[0.06em] text-[var(--text)]
                text-right
                placeholder:text-[var(--text-muted)] placeholder:opacity-40
              "
              style={{ fontFamily: "var(--font-option)", fontWeight: "var(--font-option-weight)" as any }}
            />
          </div>

          {/* + / × toggle button */}
          <button
            type="button"
            onClick={toggleCode}
            className="
              flex items-center justify-center
              size-[1.1rem] rounded-full
              bg-transparent border-none cursor-pointer
              text-[var(--text-muted)] hover:text-[var(--text)]
              transition-all duration-200
              select-none
            "
            style={{ WebkitTapHighlightColor: "transparent" }}
            aria-label={codeOpen ? "Close code input" : "Enter board code"}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="transition-transform duration-300 ease-in-out"
              style={{ transform: codeOpen ? "rotate(45deg)" : "rotate(0deg)" }}
            >
              <line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Segmented control */}
      <div
        ref={trackRef}
        className="grid grid-cols-3 bg-[var(--track)] rounded-xl p-[3px] relative"
      >
        {/* Sliding pill */}
        <div
          className="seg-pill absolute top-[3px] h-[calc(100%-6px)] bg-[var(--card)] rounded-[10px] pointer-events-none z-0"
          style={{
            width: `calc(33.333% - 2px)`,
            left: pillLeft,
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.08), 0 1px 1px rgba(0,0,0,0.04)",
          }}
        />

        {OPTIONS.map((opt) => {
          const isSelected = opt.size === value;
          return (
            <button
              key={opt.size}
              type="button"
              onClick={() => handleSelect(opt.size)}
              className={`
                seg-btn relative z-1 bg-transparent border-none rounded-[10px]
                cursor-pointer flex flex-col items-center text-center
                select-none
                py-[0.7rem] px-[0.3rem] pb-[0.55rem]
                transition-colors duration-250
                ${isSelected ? "text-[var(--text)]" : "text-[var(--text-muted)]"}
                ${disabled && !isSelected ? "opacity-20" : ""}
              `}
              style={{ WebkitTapHighlightColor: "transparent", fontFamily: "var(--font-option)", fontWeight: "var(--font-option-weight)" as any }}
            >
              {/* Grid centered vertically */}
              <div className="flex-1 flex items-center">
                <MiniGrid
                  size={opt.size}
                  selected={isSelected}
                  animationKey={animKeys[opt.size]}
                />
              </div>
              {/* Label pinned to bottom */}
              <span className="text-[0.78rem] leading-none mt-[0.3rem]">
                {opt.label}
              </span>
              <span
                className={`
                  text-[0.52rem] mt-[0.05rem] transition-colors duration-250
                  ${isSelected ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}
                `}
              >
                {opt.sub}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
