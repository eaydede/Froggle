interface RoomResultsHeroProps {
  points: number;
  wordCount: number;
  rank: number;
  totalPlayers: number;
  /** True when the viewer is the sole top scorer. */
  isWinner: boolean;
  /** True when the viewer shares the top score with someone else. */
  isTie: boolean;
  /** Winner's display name (for the "N behind X" line when you didn't win). */
  winnerName: string;
  /** Points between 1st and 2nd — the headline closeness signal. */
  topMargin: number;
  /** Points between the viewer and the winner (0 when you won). */
  behindBy: number;
  /** Nobody scored this round. */
  scoreless: boolean;
}

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
const ordinal = (n: number) => ORDINALS[n - 1] ?? `${n}th`;

// Celebratory results hero for a multiplayer round. Rewards the winner
// with a gold trophy + "You won", and always leads with how close it was
// (won by N / N behind / a photo-finish flag) so the margin — not just the
// raw score — is the story. Drops into ResultsView's hero slot, so it has
// to live within the fixed hero height.
export function RoomResultsHero({
  points,
  wordCount,
  rank,
  totalPlayers,
  isWinner,
  isTie,
  winnerName,
  topMargin,
  behindBy,
  scoreless,
}: RoomResultsHeroProps) {
  // A genuinely tight finish — small absolute gap with someone actually
  // scoring — earns the "photo finish" flag for everyone.
  const photoFinish = !scoreless && totalPlayers > 1 && topMargin > 0 && topMargin <= 3;

  let statusLabel: string;
  let statusColor: string;
  let showTrophy = false;
  if (scoreless) {
    statusLabel = 'No words found';
    statusColor = 'var(--ink-soft)';
  } else if (isWinner) {
    statusLabel = 'You won';
    statusColor = 'var(--podium-gold-deep)';
    showTrophy = true;
  } else if (isTie) {
    statusLabel = 'Tied for 1st';
    statusColor = 'var(--podium-gold-deep)';
    showTrophy = true;
  } else {
    statusLabel = `${ordinal(rank)} of ${totalPlayers}`;
    statusColor = 'var(--ink-muted)';
  }

  let marginLabel: string;
  if (scoreless) {
    marginLabel = `${totalPlayers} players · a clean slate`;
  } else if (photoFinish) {
    marginLabel = isWinner ? `Photo finish — won by ${topMargin}` : `Photo finish — ${behindBy} behind`;
  } else if (isWinner) {
    marginLabel = topMargin > 0 ? `Won by ${topMargin} · ${wordCount} words` : `${wordCount} words`;
  } else if (isTie) {
    marginLabel = `Dead heat · ${wordCount} words`;
  } else {
    marginLabel = `${behindBy} behind ${winnerName} · ${wordCount} words`;
  }

  return (
    <section className="shrink-0 box-border flex flex-col items-center justify-center text-center pt-2 pb-1 h-[82px]">
      <div
        className="inline-flex items-center gap-1.5 text-label-xs uppercase tracking-[0.12em] font-[family-name:var(--font-structure)] leading-none"
        style={{ fontWeight: 800, color: statusColor }}
      >
        {showTrophy && <TrophyIcon />}
        {statusLabel}
      </div>

      <div className="inline-flex items-baseline gap-1.5 leading-none mt-1.5">
        <span
          className="text-[2.5rem] tabular-nums font-[family-name:var(--font-structure)]"
          style={{
            fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 0.95,
            color: isWinner ? 'var(--podium-gold-deep)' : 'var(--ink)',
          }}
        >
          {points}
        </span>
        <span
          className="text-label-xs uppercase tracking-[0.1em] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 700 }}
        >
          pts
        </span>
      </div>

      <div
        className="mt-1 text-xs tabular-nums leading-none"
        style={{ fontWeight: 500, color: photoFinish ? 'var(--podium-gold-deep)' : 'var(--ink-muted)' }}
      >
        {marginLabel}
      </div>
    </section>
  );
}

function TrophyIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 4h10v2h3v3a4 4 0 0 1-4 4h-.4A5 5 0 0 1 13 16v2h3v2H8v-2h3v-2a5 5 0 0 1-2.6-3H8a4 4 0 0 1-4-4V6h3V4zm0 4H6v1a2 2 0 0 0 2 2V8zm10 0v3a2 2 0 0 0 2-2V8h-2z" />
    </svg>
  );
}
