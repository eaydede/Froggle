import { useEffect, useRef } from 'react';
import { RARITY_VAR } from '../../../pages/results/utils/wordRarity';
import { formatClock, type TimelineMark } from '../timeline';

interface ReplayWordListProps {
  /** Chronological find order — the timeline model's marks. */
  marks: TimelineMark[];
  /** Index of the word the playhead has reached, or -1 before the first. */
  currentIndex: number;
  /** Seek the replay to a find when its row is tapped. */
  onSelect: (index: number) => void;
}

/**
 * The replay's find list: chronological (matching the playhead), each row led
 * by the time the word was found, with the results-page rarity stripe for
 * visual continuity. The current word stays scrolled into view as the replay
 * advances, and breaks show inline so lulls read at a glance.
 */
export function ReplayWordList({ marks, currentIndex, onSelect }: ReplayWordListProps) {
  const total = marks.reduce((sum, m) => sum + m.score, 0);

  return (
    <div className="flex flex-col min-h-0 rounded-xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] overflow-hidden">
      <div
        className="flex justify-between items-center px-3 py-[9px] text-label-xs uppercase tracking-[0.08em] text-[color:var(--ink-muted)] bg-[var(--ink-whisper)] leading-none font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 700 }}
      >
        <span>
          Found<span className="tabular-nums"> · {marks.length}</span>
        </span>
        <span className="tabular-nums">{total}</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {marks.map((mark, i) => (
          <ReplayWordRow
            key={mark.word}
            mark={mark}
            first={i === 0}
            active={i === currentIndex}
            onClick={() => onSelect(i)}
          />
        ))}
      </div>
    </div>
  );
}

function ReplayWordRow({
  mark,
  first,
  active,
  onClick,
}: {
  mark: TimelineMark;
  first: boolean;
  active: boolean;
  onClick: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  return (
    <>
      {mark.breakBefore && mark.deltaSeconds !== null && (
        <div className="flex items-center gap-2 px-3 py-0.5 text-label-xs text-[color:var(--ink-faint)] font-[family-name:var(--font-ui)]">
          <span className="flex-1 border-t border-dashed border-[color:var(--ink-faint)]" />
          <span className="tabular-nums">{formatClock(mark.deltaSeconds)} break</span>
          <span className="flex-1 border-t border-dashed border-[color:var(--ink-faint)]" />
        </div>
      )}
      <div
        ref={ref}
        onClick={onClick}
        className={[
          'relative flex items-center gap-2.5 py-[7px] pr-3 pl-[14px] text-xs cursor-pointer transition-colors duration-150 font-[family-name:var(--font-ui)]',
          first || mark.breakBefore ? '' : 'border-t border-[var(--ink-border-subtle)]',
          active ? 'bg-[var(--ink-whisper)]' : 'hover:bg-[var(--ink-whisper)]',
        ].join(' ')}
        style={{ fontWeight: 500 }}
      >
        <span
          aria-hidden
          className="absolute left-0 top-[5px] bottom-[5px] w-1 rounded-r-[2px]"
          style={{ background: RARITY_VAR[mark.rarity] }}
        />
        <span className="tabular-nums text-[color:var(--ink-faint)] w-8 shrink-0">
          {formatClock(mark.timeSeconds)}
        </span>
        <span className="flex-1 min-w-0 truncate text-[color:var(--ink)]">{mark.word}</span>
        <span
          className="tabular-nums text-[11px] text-[color:var(--ink-soft)] shrink-0 font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 700 }}
        >
          +{mark.score}
        </span>
      </div>
    </>
  );
}
