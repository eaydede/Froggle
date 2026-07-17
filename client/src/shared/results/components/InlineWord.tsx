import type { TimelineEvent } from '../useTimelineReplay';

/**
 * The replay's current word, shown inline beside the timeline: the word itself
 * coloured by its point value (rarity), with its +score — so the player reads
 * "what I got, how rare, how many points" at a glance. Misses show struck
 * through in the invalid red. A quick fade plays as each word swaps in.
 */
export function InlineWord({ current }: { current: TimelineEvent | null }) {
  return (
    <div className="h-8 w-full flex items-baseline overflow-hidden">
      {current && (
        <div
          key={current.key}
          className="word-swap-in flex items-baseline gap-1 min-w-0"
        >
          <span
            className="truncate text-lg font-[family-name:var(--font-ui)] leading-none"
            style={{
              color: current.color,
              fontWeight: 800,
              textDecoration: current.kind === 'miss' ? 'line-through' : undefined,
            }}
          >
            {current.word || '···'}
          </span>
          {current.kind === 'find' && (
            <span
              className="shrink-0 text-caption tabular-nums text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)] leading-none [font-weight:700]"
            >
              +{current.score}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
