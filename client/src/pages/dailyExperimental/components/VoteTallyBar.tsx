import type { VoteSentiment } from 'models/experimental';
import type { ExperimentalVoteTallies } from '../../../shared/api/dailyExperimentalApi';

// A three-segment horizontal bar showing the all-time sentiment breakdown for
// an experimental mode. Sits under the VoteControl and only appears once the
// viewer has voted themselves. Widths are proportional to counts; the
// viewer's own segment gets a subtle inner outline so they can see where
// their vote lives without doing any math. Deliberately understated — this is
// a receipt for their vote, not a leaderboard.

interface VoteTallyBarProps {
  tallies: ExperimentalVoteTallies;
  own: VoteSentiment | null;
}

const SEGMENTS: {
  sentiment: VoteSentiment;
  color: string;
  label: string;
}[] = [
  { sentiment: 'down', color: 'var(--vote-tally-down)', label: 'Did not enjoy it' },
  { sentiment: 'meh', color: 'var(--vote-tally-meh)', label: 'It was okay' },
  { sentiment: 'up', color: 'var(--vote-tally-up)', label: 'Enjoyed it' },
];

export function VoteTallyBar({ tallies, own }: VoteTallyBarProps) {
  const total = tallies.up + tallies.meh + tallies.down;
  if (total === 0) return null;

  return (
    <div
      className="flex overflow-hidden rounded-full"
      // Matches the VoteControl button row width (3 × 38 + 2 × 6 gap) so the
      // bar tucks visually under the faces.
      style={{ width: 126, height: 6 }}
      role="img"
      aria-label={`Vote tally: ${tallies.up} enjoyed, ${tallies.meh} okay, ${tallies.down} did not enjoy.`}
    >
      {SEGMENTS.map((seg) => {
        const count = tallies[seg.sentiment];
        if (count === 0) return null;
        const pct = (count / total) * 100;
        const isOwn = own === seg.sentiment;
        return (
          <div
            key={seg.sentiment}
            title={seg.label}
            className="h-full"
            style={{
              width: `${pct}%`,
              background: seg.color,
              // Inner outline highlights the viewer's own segment. Uses inset
              // box-shadow so it stays inside the bar's rounded clip and
              // doesn't need any extra layout.
              boxShadow: isOwn ? 'inset 0 0 0 1.5px rgba(255,255,255,0.7)' : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
