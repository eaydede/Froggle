interface InlineStatsProps {
  totalPlayers: number;
  avgScore: number;
  /** Omitted when the current user hasn't played today. */
  youTopPercent?: number | null;
  /** Optional override for the "you" value when topPercent can't express
   *  the user's standing (e.g. below the top-30% threshold), e.g. "#47". */
  youFallback?: string;
}

/** Dot-separated micro-stats strip that sits between the podium and the
 *  full list. Designed to be borderless and visually light so it doesn't
 *  compete with the podium for attention. */
export function InlineStats({ totalPlayers, avgScore, youTopPercent, youFallback }: InlineStatsProps) {
  const youValue =
    youTopPercent !== undefined && youTopPercent !== null
      ? `Top ${youTopPercent}%`
      : youFallback;

  return (
    <div className="flex items-center justify-center gap-2.5 py-2.5 flex-shrink-0 font-[family-name:var(--font-structure)]">
      <StatItem value={totalPlayers.toLocaleString()} label="players" />
      <Dot />
      <StatItem label="avg" value={avgScore.toLocaleString()} />
      {youValue && (
        <>
          <Dot />
          <StatItem label="you" value={youValue} valueTone="you" />
        </>
      )}
    </div>
  );
}

function StatItem({
  label,
  value,
  valueTone,
}: {
  label: string;
  value: string;
  valueTone?: 'you';
}) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span
        className="text-[9px] uppercase tracking-[0.08em] text-[color:var(--ink-soft)]"
        style={{ fontWeight: 700 }}
      >
        {label}
      </span>
      <span
        className="text-[12px] tabular-nums tracking-[-0.01em]"
        style={{
          fontWeight: 700,
          color: valueTone === 'you' ? 'var(--compare-you)' : 'var(--ink)',
        }}
      >
        {value}
      </span>
    </span>
  );
}

function Dot() {
  return (
    <span
      aria-hidden
      className="w-[3px] h-[3px] rounded-full bg-[var(--ink-faint)]"
    />
  );
}
