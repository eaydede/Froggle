import { useState, useEffect } from "react";
import { BoardConfigCards, TimerConfig, LetterConfig } from "./components";
import { InkButton } from "../../shared/components/InkButton";
import type { GameConfig, BoardSize, TimerOption, MinWordLength } from "./types";
import { decodeSeedCode } from "models/seedCode";

interface GameConfigPageProps {
  title?: string;
  subtitle?: string;
  disabled?: boolean;
  defaultValues?: {
    boardSize: BoardSize;
    timer: TimerOption;
    minWordLength: MinWordLength;
  };
  code?: string;
  onCodeChange?: (code: string) => void;
  onBack?: () => void;
  onStart?: (config: GameConfig) => void;
}

export function GameConfigPage({
  title,
  subtitle,
  disabled = false,
  defaultValues,
  code,
  onCodeChange,
  onBack,
  onStart,
}: GameConfigPageProps) {
  const [boardSize, setBoardSize] = useState<BoardSize>(defaultValues?.boardSize ?? 4);
  const [timer, setTimer] = useState<TimerOption>(defaultValues?.timer ?? 60);
  const [minWordLength, setMinWordLength] = useState<MinWordLength>(defaultValues?.minWordLength ?? 3);

  // Auto-select board size when a valid code is entered
  const hasValidCode = !!(code && code.length === 14 && decodeSeedCode(code));

  useEffect(() => {
    if (code && code.length === 14) {
      const decoded = decodeSeedCode(code);
      if (decoded && [4, 5, 6].includes(decoded.boardSize)) {
        setBoardSize(decoded.boardSize as BoardSize);
      }
    }
  }, [code]);

  function handleStart() {
    onStart?.({ boardSize, timer, minWordLength });
  }

  return (
    <div className="fixed inset-0 flex items-start justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)] overflow-y-auto">
      <div className="w-full max-w-[360px] flex flex-col px-[22px] pt-[24px] pb-[22px] gap-6">
        {onBack && (
          <div className="flex items-center pt-[18px]">
            <BackButton onClick={onBack} />
          </div>
        )}

        {(title || subtitle) && <Header title={title} subtitle={subtitle} />}

        <div className="flex flex-col gap-5">
          <BoardConfigCards
            value={boardSize}
            onChange={setBoardSize}
            disabled={disabled || hasValidCode}
            code={code}
            onCodeChange={onCodeChange}
          />
          <TimerConfig value={timer} onChange={setTimer} disabled={disabled} />
          <LetterConfig value={minWordLength} onChange={setMinWordLength} disabled={disabled} />
        </div>

        <InkButton onClick={handleStart}>
          Start
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform duration-200 group-hover:translate-x-[3px]"
          >
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </InkButton>
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-1.5 bg-transparent border-none text-small text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] cursor-pointer py-1.5 pr-2 font-[family-name:var(--font-ui)] transition-colors duration-200"
      style={{ fontWeight: 500, WebkitTapHighlightColor: "transparent" }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-transform duration-200 group-hover:-translate-x-[2px]"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      Back
    </button>
  );
}

function Header({ title, subtitle }: { title?: string; subtitle?: string }) {
  return (
    <div className="text-center">
      {title && (
        <div
          className="text-caption uppercase tracking-[0.08em] text-[color:var(--ink-soft)] leading-none mb-2 font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 700 }}
        >
          {title}
        </div>
      )}
      {subtitle && (
        <div
          className="italic leading-[1.1] tracking-[-0.015em] text-display-sm font-[family-name:var(--font-display)]"
          style={{ fontWeight: 500 }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}
