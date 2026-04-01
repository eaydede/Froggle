import { useState } from "react";
import { BoardConfigCards, TimerConfig, LetterConfig } from "./components";
import type { GameConfig, BoardSize, TimerOption, MinWordLength } from "./types";
import "./game-config.css";

interface GameConfigPageProps {
  title?: string;
  subtitle?: string;
  card?: boolean;
  onBack?: () => void;
  onStart?: (config: GameConfig) => void;
}

export function GameConfigPage({ title, subtitle, card = true, onBack, onStart }: GameConfigPageProps) {
  const [boardSize, setBoardSize] = useState<BoardSize>(4);

  const [timer, setTimer] = useState<TimerOption>(60);
  const [minWordLength, setMinWordLength] = useState<MinWordLength>(3);

  function handleStart() {
    onStart?.({ boardSize, timer, minWordLength });
  }

  return (
    <div
      className={`
        w-full max-w-[400px]
        ${card
          ? "bg-[var(--card)] rounded-[20px] p-7 sm:p-9 shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_4px_24px_rgba(0,0,0,0.06)]"
          : "p-0"
        }
      `}
    >
      {/* Header */}
      {(title || subtitle || onBack) && (
        <div className="mb-8 relative">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="
                absolute left-0 top-0.5
                flex items-center justify-center
                bg-transparent border-none cursor-pointer
                text-[var(--text-muted)] hover:text-[var(--text)]
                transition-colors duration-200 select-none
              "
              style={{ WebkitTapHighlightColor: "transparent" }}
              aria-label="Back"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5L7 10L12 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          <div className="text-center" style={{ fontFamily: 'var(--font-heading)', fontWeight: 'var(--font-heading-weight)' as any }}>
            {title && (
              <h1 className="text-[1.35rem] tracking-[-0.025em]">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-[0.75rem] text-[var(--text-muted)] mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Config sections */}
      <div className="flex flex-col gap-6">
        <BoardConfigCards value={boardSize} onChange={setBoardSize} />
        <TimerConfig value={timer} onChange={setTimer} />
        <LetterConfig value={minWordLength} onChange={setMinWordLength} />
      </div>

      {/* Start button */}
      <button
        type="button"
        onClick={handleStart}
        className="
          start-btn
          w-full bg-[var(--text)] text-white border-none rounded-xl
          py-3.5 mt-8
          text-[0.85rem]
          cursor-pointer select-none
          transition-all duration-200
          hover:bg-[#333]
          active:bg-[#222]
        "
        style={{ WebkitTapHighlightColor: "transparent", fontFamily: 'var(--font-heading)', fontWeight: 'var(--font-heading-weight)' as any }}
      >
        Start Game
      </button>
    </div>
  );
}
