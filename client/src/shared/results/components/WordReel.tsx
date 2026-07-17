import { formatClock, formatDelta } from '../timeline';
import type { TimelineEvent } from '../useTimelineReplay';

interface WordReelProps {
  events: TimelineEvent[];
  /** Index the playhead has reached (-1 before the first event). */
  currentIndex: number;
}

// Uniform row height keeps the roll a single translate — the current word is
// emphasised by weight/size/colour rather than a taller row.
const ROW_H = 40;

/**
 * The replay's focal word visual: the current event sits large and centred, the
 * previous one rides smaller above and the next peeks faintly below. As the
 * playhead advances the whole column rolls up one row, in step with the board
 * lighting the path. Misses (when shown) are woven in and struck through in the
 * invalid red, so a rejected try reads at a glance.
 */
export function WordReel({ events, currentIndex }: WordReelProps) {
  if (events.length === 0) return null;
  const idx = Math.max(0, Math.min(currentIndex, events.length - 1));

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
        {events.map((event, i) => (
          <ReelRow key={event.key} event={event} offset={i - idx} />
        ))}
      </div>
    </div>
  );
}

function ReelRow({ event, offset }: { event: TimelineEvent; offset: number }) {
  const isCurrent = offset === 0;
  const isNeighbour = Math.abs(offset) === 1;
  const opacity = isCurrent ? 1 : isNeighbour ? 0.55 : 0.28;
  const isMiss = event.kind === 'miss';

  return (
    <div
      className="flex items-center justify-center gap-2 px-2"
      style={{ height: ROW_H, opacity, transition: 'opacity 300ms ease-out' }}
    >
      {isCurrent && (
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ background: event.color }}
        />
      )}
      <span
        className={`truncate font-[family-name:var(--font-ui)] ${
          isCurrent ? 'text-xl' : 'text-sm'
        }`}
        style={{
          fontWeight: isCurrent ? 700 : 500,
          color: isMiss ? 'var(--color-invalid)' : isCurrent ? 'var(--ink)' : 'var(--ink-soft)',
          textDecoration: isMiss ? 'line-through' : undefined,
        }}
      >
        {event.word || '···'}
      </span>
      {isCurrent && (
        <span className="shrink-0 tabular-nums text-caption text-[color:var(--ink-soft)] font-[family-name:var(--font-ui)]">
          {isMiss ? (
            <span style={{ color: 'var(--color-invalid)' }}>
              {formatClock(event.timeSeconds)} · {event.reason === 'repeat' ? 'repeat' : 'not a word'}
            </span>
          ) : (
            <>
              {formatClock(event.timeSeconds)} · +{event.score}
              {event.breakBefore && event.deltaSeconds !== null && (
                <span className="text-[color:var(--ink-faint)]">
                  {' · '}
                  {formatDelta(event.deltaSeconds)} lull
                </span>
              )}
            </>
          )}
        </span>
      )}
    </div>
  );
}
