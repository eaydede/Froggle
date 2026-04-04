type CardMode = 'light' | 'dark';

export interface DailyPuzzleConfig {
  puzzleNumber: number;
  boardSize: number;
  timer: number;
  minWordLength: number;
}

export interface DailyResults {
  words: number;
  points: number;
  longestWord: string;
}

interface DailyPuzzleCardProps {
  config: DailyPuzzleConfig;
  results: DailyResults | null;
  onClick: () => void;
  mode?: CardMode;
}

function formatTimer(seconds: number): string {
  if (!isFinite(seconds)) return "∞";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function DailyPuzzleCard({ config, results, onClick, mode = 'light' }: DailyPuzzleCardProps) {
  const completed = results !== null;
  const dark = mode === 'dark';

  // Color tokens per mode × state
  const bg = completed
    ? dark ? '#3A3A3C' : 'var(--card)'
    : dark ? 'var(--accent)' : 'var(--accent)';

  const textColor = completed
    ? dark ? '#E5E5E7' : 'var(--text)'
    : 'white';

  const subtitleColor = completed
    ? dark ? 'rgba(255,255,255,0.45)' : 'var(--text-muted)'
    : 'rgba(255,255,255,0.5)';

  const watermarkColor = completed
    ? dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
    : 'rgba(255,255,255,0.15)';

  const shadow = completed
    ? dark
      ? '0 0 0 1px rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.3)'
      : '0 0 0 1px rgba(0,0,0,0.04), 0 4px 24px rgba(107,155,125,0.18)'
    : dark
      ? '0 4px 24px rgba(0,0,0,0.4)'
      : '0 4px 24px rgba(107,155,125,0.30)';

  const borderLeft = completed
    ? dark ? '3px solid var(--accent)' : '3px solid var(--accent)'
    : undefined;

  // Result box colors
  const resultBoxBg = dark ? 'rgba(255,255,255,0.08)' : 'var(--track)';
  const resultValueColor = dark ? '#E5E5E7' : 'var(--text)';
  const resultLabelColor = dark ? 'rgba(255,255,255,0.4)' : 'var(--text-muted)';

  // Config tag colors
  const tagBg = dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.12)';
  const tagColor = dark ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.7)';

  return (
    <div
      onClick={onClick}
      className="rounded-2xl relative overflow-hidden select-none transition-all duration-200 active:scale-[0.985] active:duration-[60ms] cursor-pointer sm:p-6"
      style={{
        padding: '1.35rem',
        WebkitTapHighlightColor: 'transparent',
        backgroundColor: bg,
        color: textColor,
        boxShadow: shadow,
        borderLeft,
      }}
    >
      {/* Watermark */}
      <span
        className="absolute top-4 right-5 text-[2rem] font-bold leading-none tracking-[-0.03em]"
        style={{ color: watermarkColor }}
      >
        #{config.puzzleNumber}
      </span>

      {/* Title */}
      <div className="mb-3">
        <div className="text-[0.95rem] font-bold">
          {completed ? `Daily Puzzle #${config.puzzleNumber}` : 'Daily Puzzle'}
        </div>
        <div className="text-[0.68rem] font-medium mt-0.5" style={{ color: subtitleColor }}>
          {completed ? 'Completed today' : 'A new board every day'}
        </div>
      </div>

      {/* Config tags (unplayed) */}
      {!completed && (
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-[0.6rem] font-semibold rounded-md" style={{ padding: '0.22rem 0.5rem', background: tagBg, color: tagColor }}>
            {config.boardSize}×{config.boardSize}
          </span>
          <span className="text-[0.6rem] font-semibold rounded-md" style={{ padding: '0.22rem 0.5rem', background: tagBg, color: tagColor }}>
            {formatTimer(config.timer)}
          </span>
          <span className="text-[0.6rem] font-semibold rounded-md" style={{ padding: '0.22rem 0.5rem', background: tagBg, color: tagColor }}>
            {config.minWordLength}+ letters
          </span>
        </div>
      )}

      {/* Results (completed) */}
      {completed && (
        <div className="flex gap-1.5">
          <ResultBox value={String(results.words)} label="Words" shrinkable bg={resultBoxBg} valueColor={resultValueColor} labelColor={resultLabelColor} />
          <ResultBox value={String(results.points)} label="Points" shrinkable bg={resultBoxBg} valueColor={resultValueColor} labelColor={resultLabelColor} />
          <ResultBox value={results.longestWord} label="Longest" bg={resultBoxBg} valueColor={resultValueColor} labelColor={resultLabelColor} />
        </div>
      )}
    </div>
  );
}

function ResultBox({ value, label, shrinkable, bg, valueColor, labelColor }: {
  value: string; label: string; shrinkable?: boolean;
  bg: string; valueColor: string; labelColor: string;
}) {
  return (
    <div
      className={`rounded-[10px] text-center ${shrinkable ? 'flex-1 min-w-0' : 'flex-1 shrink-0'}`}
      style={{ padding: shrinkable ? '0.55rem 0.3rem' : '0.55rem 0.75rem', backgroundColor: bg }}
    >
      <div className="text-[1rem] font-bold leading-[1.1] truncate" style={{ color: valueColor }}>{value}</div>
      <div className="text-[0.48rem] font-semibold uppercase tracking-[0.04em] mt-0.5" style={{ color: labelColor }}>{label}</div>
    </div>
  );
}
