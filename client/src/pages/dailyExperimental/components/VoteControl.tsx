import type { VoteSentiment } from 'models/experimental';

// A three-way reaction on an experimental mode: frown / meh / smile. The prompt
// asks how the *experience* felt, not whether the idea is good — a lightweight
// daily signal, not a public score. Tallies are never shown to players; the
// control only reflects the viewer's own current vote, which they can change.
interface VoteControlProps {
  value: VoteSentiment | null;
  onVote: (sentiment: VoteSentiment) => void;
  disabled?: boolean;
}

type Mood = 'sad' | 'neutral' | 'happy';

// Left-to-right worst → best, so the row reads like a rating scale.
const OPTIONS: Array<{ sentiment: VoteSentiment; mood: Mood; label: string }> = [
  { sentiment: 'down', mood: 'sad', label: 'Did not enjoy it' },
  { sentiment: 'meh', mood: 'neutral', label: 'It was okay' },
  { sentiment: 'up', mood: 'happy', label: 'Enjoyed it' },
];

export function VoteControl({ value, onVote, disabled = false }: VoteControlProps) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className="text-caption uppercase tracking-[0.08em] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 700 }}
      >
        How was it?
      </span>
      <div className="flex items-center gap-1.5">
        {OPTIONS.map((opt) => (
          <VoteButton
            key={opt.sentiment}
            active={value === opt.sentiment}
            disabled={disabled}
            label={opt.label}
            mood={opt.mood}
            onClick={() => onVote(opt.sentiment)}
          />
        ))}
      </div>
    </div>
  );
}

function VoteButton({
  active,
  disabled,
  label,
  mood,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  mood: Mood;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={`inline-flex items-center justify-center rounded-full border transition-all duration-150 active:scale-95 disabled:cursor-not-allowed ${
        active
          ? 'border-transparent bg-[var(--ink)] text-[color:var(--ink-inverse)]'
          : 'border-[var(--ink-border-subtle)] bg-[var(--surface-card)] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] hover:border-[var(--ink-mid)]'
      }`}
      style={{ width: 38, height: 38, WebkitTapHighlightColor: 'transparent' }}
    >
      <FaceGlyph mood={mood} />
    </button>
  );
}

const MOUTHS: Record<Mood, string> = {
  // y grows downward: a control point below the endpoints dips the middle into
  // a smile; above lifts it into a frown; a flat line reads neutral.
  happy: 'M8.5 14 Q 12 17 15.5 14',
  neutral: 'M8.5 15 L 15.5 15',
  sad: 'M8.5 15.5 Q 12 12.5 15.5 15.5',
};

function FaceGlyph({ mood }: { mood: Mood }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="10" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="1.1" fill="currentColor" stroke="none" />
      <path d={MOUTHS[mood]} />
    </svg>
  );
}
