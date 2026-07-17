import { RARITY_VAR } from '../../../pages/results/utils/wordRarity';
import { formatClock, formatDelta, type TimelineMark } from '../timeline';

interface WordReelProps {
  marks: TimelineMark[];
  /** Index the playhead has reached (-1 before the first find). */
  currentIndex: number;
}

// Uniform row height keeps the roll a single translate — the current word is
// emphasised by weight/size/colour rather than a taller row.
const ROW_H = 40;

/**
 * The replay's focal word visual: the current find sits large and centred, the
 * previous find rides smaller above it and the next peeks faintly below. As the
 * playhead advances the whole column rolls up one row, in step with the board
 * lighting the path — so the sequence reads as motion, while the scrubber below
 * keeps the whole-game overview and the seek.
 */
export function WordReel({ marks, currentIndex }: WordReelProps) {
  if (marks.length === 0) return null;
  const idx = Math.max(0, Math.min(currentIndex, marks.length - 1));

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        WebkitMaskImage:
          'linear-gradient(to bottom, transparent, black 22%, black 78%, transparent)',
        maskImage:
          'linear-gradient(to bottom, transparent, black 22%, black 78%, transparent)',
      }}
    >
      <div
        className="absolute inset-x-0 top-1/2 transition-transform duration-300 ease-out"
        style={{ transform: `translateY(${-(idx * ROW_H + ROW_H / 2)}px)` }}
      >
        {marks.map((mark, i) => (
          <ReelRow key={mark.word} mark={mark} offset={i - idx} />
        ))}
      </div>
    </div>
  );
}

function ReelRow({ mark, offset }: { mark: TimelineMark; offset: number }) {
  const isCurrent = offset === 0;
  const isNeighbour = Math.abs(offset) === 1;
  const opacity = isCurrent ? 1 : isNeighbour ? 0.55 : 0.28;

  return (
    <div
      className="flex items-center justify-center gap-2 px-2"
      style={{ height: ROW_H, opacity, transition: 'opacity 300ms ease-out' }}
    >
      {isCurrent && (
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ background: RARITY_VAR[mark.rarity] }}
        />
      )}
      <span
        className={`truncate font-[family-name:var(--font-ui)] ${
          isCurrent ? 'text-xl text-[color:var(--ink)]' : 'text-sm text-[color:var(--ink-soft)]'
        }`}
        style={{ fontWeight: isCurrent ? 700 : 500 }}
      >
        {mark.word}
      </span>
      {isCurrent && (
        <span className="shrink-0 tabular-nums text-caption text-[color:var(--ink-soft)] font-[family-name:var(--font-ui)]">
          {formatClock(mark.timeSeconds)} · +{mark.score}
          {mark.breakBefore && mark.deltaSeconds !== null && (
            <span className="text-[color:var(--ink-faint)]">
              {' · '}
              {formatDelta(mark.deltaSeconds)} lull
            </span>
          )}
        </span>
      )}
    </div>
  );
}
