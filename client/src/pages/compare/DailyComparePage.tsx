import { useMemo, useState } from 'react';
import type { DailyCompareResponse } from '../../shared/api/gameApi';
import { findWordPath } from '../../shared/utils/findWordPath';
import { ComparePlayerPanel } from './components/ComparePlayerPanel';

interface DailyComparePageProps {
  data: DailyCompareResponse;
  onBack: () => void;
  onShare?: () => void;
}

export function DailyComparePage({ data, onBack, onShare }: DailyComparePageProps) {
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null);

  const sharedWords = useMemo(() => {
    const mine = new Set(data.me.foundWords.map((w) => w.word.toUpperCase()));
    const shared = new Set<string>();
    for (const w of data.them.foundWords) {
      if (mine.has(w.word.toUpperCase())) shared.add(w.word.toUpperCase());
    }
    return shared;
  }, [data]);

  const highlightPath = useMemo(() => {
    if (!highlightedWord) return null;
    return findWordPath(data.board, highlightedWord);
  }, [highlightedWord, data.board]);

  const handleWordTap = (word: string) => {
    setHighlightedWord((prev) => (prev === word ? null : word));
  };

  const mins = Math.floor(data.config.timeLimit / 60);
  const secs = data.config.timeLimit % 60;
  const timer = isFinite(data.config.timeLimit)
    ? `${mins}:${String(secs).padStart(2, '0')}`
    : '∞';

  return (
    <div className="fixed inset-0 flex justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)] overflow-hidden">
      <div className="w-full max-w-[360px] min-h-0 flex flex-col px-[22px] pt-[14px] pb-5">
        <Topbar onBack={onBack} onShare={onShare} />

        <div className="grid grid-cols-2 gap-2 pt-3 pb-2.5">
          <PlayerHero side="you" name="You" score={data.me.points} words={data.me.wordCount} />
          <PlayerHero
            side="them"
            name={data.them.displayName}
            score={data.them.points}
            words={data.them.wordCount}
          />
        </div>

        <div
          className="flex justify-center gap-1.5 pb-2 text-[10px] uppercase tracking-[0.06em] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 600 }}
        >
          <span>{data.config.boardSize}×{data.config.boardSize}</span>
          <span className="opacity-50">·</span>
          <span>{timer}</span>
          <span className="opacity-50">·</span>
          <span>min {data.config.minWordLength}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 flex-1 min-h-0 px-0.5" style={{ gridTemplateRows: '1fr' }}>
          <ComparePlayerPanel
            side="you"
            board={data.board}
            highlightPath={highlightPath}
            words={data.me.foundWords}
            sharedWords={sharedWords}
            highlightedWord={highlightedWord}
            onWordTap={handleWordTap}
          />
          <ComparePlayerPanel
            side="them"
            board={data.board}
            highlightPath={highlightPath}
            words={data.them.foundWords}
            sharedWords={sharedWords}
            highlightedWord={highlightedWord}
            onWordTap={handleWordTap}
          />
        </div>

        <button
          type="button"
          onClick={onBack}
          className="group flex items-center justify-center gap-1.5 mt-3.5 py-2.5 bg-transparent border-none cursor-pointer text-[11px] uppercase tracking-[0.06em] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] transition-colors duration-150 font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 600, WebkitTapHighlightColor: 'transparent' }}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform duration-200 group-hover:-translate-x-[2px]"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to leaderboard
        </button>
      </div>
    </div>
  );
}

function Topbar({ onBack, onShare }: { onBack: () => void; onShare?: () => void }) {
  return (
    <div
      className="grid items-center gap-2.5 pt-3.5"
      style={{ gridTemplateColumns: '32px 1fr 32px' }}
    >
      <IconAction label="Back" onClick={onBack}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </IconAction>
      <div
        className="text-center text-[11px] uppercase tracking-[0.1em] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 700 }}
      >
        Comparison
      </div>
      {onShare ? (
        <IconAction label="Share" onClick={onShare}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </IconAction>
      ) : (
        <span aria-hidden />
      )}
    </div>
  );
}

function IconAction({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="w-8 h-8 flex items-center justify-center rounded-[10px] bg-transparent border-none cursor-pointer text-[color:var(--ink-soft)] hover:bg-[var(--ink-whisper)] hover:text-[color:var(--ink)] transition-colors duration-200 [&>svg]:w-4 [&>svg]:h-4"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {children}
    </button>
  );
}

function PlayerHero({
  side,
  name,
  score,
  words,
}: {
  side: 'you' | 'them';
  name: string;
  score: number;
  words: number;
}) {
  return (
    <div className="flex flex-col items-center gap-[1px] min-w-0">
      <div
        className="uppercase tracking-[0.06em] text-[10px] leading-none truncate max-w-full font-[family-name:var(--font-structure)]"
        style={{
          fontWeight: 700,
          color: side === 'you' ? 'var(--compare-you)' : 'var(--compare-them)',
        }}
        title={name}
      >
        {name}
      </div>
      <div
        className="mt-0.5 text-[32px] leading-[0.95] tracking-[-0.03em] tabular-nums text-[color:var(--ink)] font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 800 }}
      >
        {score}
      </div>
      <div
        className="text-[9px] tabular-nums text-[color:var(--ink-soft)]"
        style={{ fontWeight: 500 }}
      >
        {words} {words === 1 ? 'word' : 'words'}
      </div>
    </div>
  );
}
