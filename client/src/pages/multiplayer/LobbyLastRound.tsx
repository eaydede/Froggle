import type { LastRoundSummary } from 'models/multiplayer';
import { avatarColor, avatarInitial } from '../../shared/multiplayer/avatar';

interface LobbyLastRoundProps {
  lastRound: LastRoundSummary;
  /** Whether the winner is the viewer — flips the avatar to the "you"
   *  green so the card reads consistently with the player strip. */
  isYouWinner: boolean;
  onSeeResults: () => void;
}

// "Last Round" trophy card from the mock — celebrates the previous
// board's winner with a gold-dashed frame and a streak badge. Only shown
// in multiplayer once a board has completed; hidden entirely in solo play
// where there's no one to win against.
export function LobbyLastRound({ lastRound, isYouWinner, onSeeResults }: LobbyLastRoundProps) {
  return (
    <button
      type="button"
      onClick={onSeeResults}
      className="trophy-card w-full text-left rounded-[18px] px-4 pt-2.5 pb-3 group block transition-colors"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="inline-flex items-center gap-1.5 text-label-xs uppercase tracking-[0.16em]"
          style={{ color: 'var(--podium-gold-deep)', fontWeight: 800 }}
        >
          <TrophyIcon />
          Last Round
        </span>
        <span
          className="text-label-xs uppercase tracking-[0.1em] text-[color:var(--ink-soft)] group-hover:text-[color:var(--ink)] transition-colors inline-flex items-center gap-1"
          style={{ fontWeight: 600 }}
        >
          See Results
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform group-hover:translate-x-[2px]"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <span
          className="inline-flex items-center justify-center rounded-full shrink-0 text-[11px]"
          style={{
            width: 28,
            height: 28,
            fontWeight: 700,
            color: 'var(--ink-inverse)',
            background: avatarColor(lastRound.winnerId, { isYou: isYouWinner }),
          }}
        >
          {avatarInitial(lastRound.winnerName)}
        </span>
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span
            className="text-[15px] leading-none truncate text-[color:var(--ink)]"
            style={{ fontWeight: 700 }}
          >
            {isYouWinner ? 'You' : lastRound.winnerName}
          </span>
          <span
            className="text-[13px] tabular-nums"
            style={{ color: 'var(--podium-gold-deep)', fontWeight: 800 }}
          >
            {lastRound.points}
          </span>
          <span
            className="text-label-xs uppercase tracking-[0.1em] text-[color:var(--ink-soft)]"
            style={{ fontWeight: 600 }}
          >
            pts
          </span>
        </div>
        {lastRound.streak > 1 && (
          <span
            className="ml-auto inline-flex items-center gap-1 rounded-full"
            title={`Won ${lastRound.streak} in a row`}
            style={{
              padding: '3px 8px 3px 6px',
              fontSize: 10,
              lineHeight: 1,
              fontWeight: 800,
              color: 'var(--on-gold)',
              background: 'var(--podium-gold)',
            }}
          >
            <SparkIcon />×{lastRound.streak} streak
          </span>
        )}
      </div>
    </button>
  );
}

function TrophyIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 4h10v2h3v3a4 4 0 0 1-4 4h-.4A5 5 0 0 1 13 16v2h3v2H8v-2h3v-2a5 5 0 0 1-2.6-3H8a4 4 0 0 1-4-4V6h3V4zm0 4H6v1a2 2 0 0 0 2 2V8zm10 0v3a2 2 0 0 0 2-2V8h-2z" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="9" height="8" viewBox="0 0 24 20" fill="currentColor" aria-hidden>
      <path d="M2 4l5 4 5-7 5 7 5-4-2 14H4L2 4z" />
    </svg>
  );
}
