interface ConfigChipsProps {
  boardSize: number;
  timeLimit: number;
  minWordLength: number;
}

function formatTimer(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '∞';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}:00` : `${m}:${String(s).padStart(2, '0')}`;
}

export function ConfigChips({ boardSize, timeLimit, minWordLength }: ConfigChipsProps) {
  return (
    <div
      className="flex justify-center gap-1.5 text-[10px] uppercase tracking-[0.04em] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)]"
      style={{ fontWeight: 600 }}
    >
      <span>{boardSize}×{boardSize}</span>
      <span className="opacity-50">·</span>
      <span>{formatTimer(timeLimit)}</span>
      <span className="opacity-50">·</span>
      <span>min {minWordLength}</span>
    </div>
  );
}
