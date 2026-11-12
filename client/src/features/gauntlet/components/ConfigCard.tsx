// 3-up summary of the round's board size, time limit, and minimum word
// length. Used on the confirm page so the player sees the round's
// physical parameters before they tap start.

function formatTimer(seconds: number): string {
  if (!isFinite(seconds)) return '∞';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function ConfigCard({
  boardSize,
  timeLimit,
  minWordLength,
}: {
  boardSize: number;
  timeLimit: number;
  minWordLength: number;
}) {
  return (
    <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] overflow-hidden">
      <div className="grid grid-cols-3 px-3 py-3">
        <ConfigItem label="Board" value={`${boardSize}×${boardSize}`} divider />
        <ConfigItem label="Time" value={formatTimer(timeLimit)} divider />
        <ConfigItem label="Letters" value={String(minWordLength)} />
      </div>
    </div>
  );
}

function ConfigItem({
  label,
  value,
  divider,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <div className="relative text-center py-1 px-2">
      <div
        className="text-label-xs uppercase tracking-[0.06em] text-[color:var(--ink-soft)] leading-none mb-1.5"
        style={{ fontWeight: 600 }}
      >
        {label}
      </div>
      <div
        className="text-xl leading-none tabular-nums tracking-[-0.01em] text-[color:var(--ink)]"
        style={{ fontWeight: 700 }}
      >
        {value}
      </div>
      {divider && (
        <span
          aria-hidden
          className="absolute right-0 top-[15%] bottom-[15%] w-px bg-[var(--ink-border-subtle)]"
        />
      )}
    </div>
  );
}
