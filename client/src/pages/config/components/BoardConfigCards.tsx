import { useState, useRef, useEffect } from "react";
import { MiniGrid } from "./MiniGrid";
import { useDisabledShake } from "../hooks/useDisabledShake";
import type { BoardSize } from "../types";

const OPTIONS: { size: BoardSize; label: string; sub: string }[] = [
  { size: 4, label: "4 × 4", sub: "Classic" },
  { size: 5, label: "5 × 5", sub: "Big" },
  { size: 6, label: "6 × 6", sub: "Mega" },
];

function formatCode(raw: string): string {
  const letters = raw.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 12);
  const parts: string[] = [];
  for (let i = 0; i < letters.length; i += 4) {
    parts.push(letters.slice(i, i + 4));
  }
  return parts.join("-");
}

interface BoardConfigCardsProps {
  value: BoardSize;
  onChange: (size: BoardSize) => void;
  disabled?: boolean;
  code?: string;
  onCodeChange?: (code: string) => void;
}

export function BoardConfigCards({ value, onChange, disabled, code, onCodeChange }: BoardConfigCardsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [codeOpen, setCodeOpen] = useState(false);
  const [internalCode, setInternalCode] = useState("");
  const codeValue = code ?? internalCode;
  const setCodeValue = onCodeChange ?? setInternalCode;

  const { shakeKey, shakeStyle, triggerShake } = useDisabledShake();

  const [animKeys, setAnimKeys] = useState<Record<BoardSize, number>>({
    4: 0,
    5: 0,
    6: 0,
  });

  function handleSelect(size: BoardSize) {
    if (disabled) { triggerShake(); return; }
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

  useEffect(() => {
    if (codeOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [codeOpen]);

  return (
    <div>
      {/* Label row with code toggle */}
      <div className="flex items-center justify-between mb-2.5">
        <span
          className="text-caption uppercase tracking-[0.06em] text-[color:var(--ink-muted)] leading-none font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 700 }}
        >
          Board
        </span>

        <div className="flex items-center gap-1.5">
          <div
            className="overflow-hidden transition-all duration-700 ease-in-out"
            style={{
              width: codeOpen ? 160 : 0,
              opacity: codeOpen ? 1 : 0,
            }}
          >
            <input
              ref={inputRef}
              id="board-code"
              name="board-code"
              type="text"
              autoComplete="off"
              value={codeValue}
              onChange={(e) => setCodeValue(formatCode(e.target.value))}
              placeholder="XXXX-XXXX-XXXX"
              maxLength={14}
              className="w-full bg-transparent border-none outline-none text-caption tracking-[0.06em] text-[color:var(--ink)] text-right placeholder:text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)]"
              style={{ fontWeight: 600 }}
            />
          </div>

          <button
            type="button"
            onClick={toggleCode}
            className="flex items-center justify-center size-[1.5rem] rounded-full bg-transparent border-none cursor-pointer text-[color:var(--ink-soft)] hover:text-[color:var(--ink)] transition-colors duration-200 select-none"
            style={{ WebkitTapHighlightColor: "transparent" }}
            aria-label={codeOpen ? "Close code input" : "Enter board code"}
          >
            <svg
              width="14"
              height="14"
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

      {/* Cards */}
      <div key={shakeKey} className="grid grid-cols-3 gap-2" style={shakeStyle}>
        {OPTIONS.map((opt) => {
          const isSelected = opt.size === value;
          return (
            <button
              key={opt.size}
              type="button"
              onClick={() => handleSelect(opt.size)}
              className={[
                "rounded-xl flex flex-col items-center text-center select-none py-4 px-2 gap-[0.3rem] transition-all duration-200 cursor-pointer",
                "bg-[var(--surface-card)]",
                isSelected
                  ? "border border-[var(--ink)] shadow-[var(--shadow-card)]"
                  : "border border-[var(--ink-border-subtle)] hover:shadow-[var(--shadow-card)]",
                disabled && isSelected ? "opacity-70" : "",
                disabled && !isSelected ? "opacity-40" : "",
              ].join(" ")}
              style={{
                WebkitTapHighlightColor: "transparent",
                fontFamily: "var(--font-ui)",
              }}
            >
              <div className="flex-1 flex items-center">
                <MiniGrid
                  size={opt.size}
                  selected={isSelected}
                  animationKey={animKeys[opt.size]}
                  disabled={disabled}
                />
              </div>
              <span
                className={[
                  "text-small leading-none mt-[0.3rem] font-[family-name:var(--font-structure)] tabular-nums",
                  isSelected ? "text-[color:var(--ink)]" : "text-[color:var(--ink-muted)]",
                ].join(" ")}
                style={{ fontWeight: 700 }}
              >
                {opt.label}
              </span>
              <span
                className={[
                  "text-label-xs uppercase tracking-[0.04em] transition-colors duration-200",
                  isSelected ? "text-[color:var(--ink-muted)]" : "text-[color:var(--ink-soft)]",
                ].join(" ")}
                style={{ fontWeight: 600 }}
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
