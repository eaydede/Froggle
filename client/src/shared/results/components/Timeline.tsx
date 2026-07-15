import { useMemo } from 'react';
import type { Position } from 'models';
import type { ScoredWord } from '../../types';
import { findWordPath } from '../../utils/findWordPath';
import { RARITY_VAR } from '../../../pages/results/utils/wordRarity';
import { buildTimeline, formatClock, formatDelta, type TimelineMark } from '../timeline';

interface TimelineProps {
  board: string[][];
  foundWords: ScoredWord[];
  /** Mode time limit in seconds; 0 = untimed (axis ends at the last find). */
  timeLimit: number;
  highlightedWord: string | null;
  onSelectWord: (word: string, path: Position[] | null) => void;
}

export function Timeline({
  board,
  foundWords,
  timeLimit,
  highlightedWord,
  onSelectWord,
}: TimelineProps) {
  const model = useMemo(() => buildTimeline(foundWords, timeLimit), [foundWords, timeLimit]);

  if (!model.hasData) return null;

  const endSeconds =
    timeLimit > 0 ? timeLimit : model.marks[model.marks.length - 1].timeSeconds;

  return (
    <div className="flex flex-col min-h-0 h-full gap-3">
      <TimelineSummary
        wordCount={model.marks.length}
        spanSeconds={model.spanSeconds}
        longestLullSeconds={model.longestLullSeconds}
      />

      <TimelineBar
        marks={model.marks}
        breaks={model.breaks}
        endSeconds={endSeconds}
        highlightedWord={highlightedWord}
      />

      <div className="flex-1 min-h-0 overflow-y-auto -mr-1 pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ol className="flex flex-col gap-1 list-none m-0 p-0">
          {model.marks.map((mark) => (
            <TimelineRow
              key={mark.word}
              mark={mark}
              highlighted={highlightedWord === mark.word}
              onSelect={() => onSelectWord(mark.word, findWordPath(board, mark.word))}
            />
          ))}
        </ol>
      </div>
    </div>
  );
}

function TimelineSummary({
  wordCount,
  spanSeconds,
  longestLullSeconds,
}: {
  wordCount: number;
  spanSeconds: number;
  longestLullSeconds: number;
}) {
  const parts = [
    `${wordCount} ${wordCount === 1 ? 'word' : 'words'}`,
    `${formatClock(spanSeconds)} span`,
  ];
  if (longestLullSeconds > 0) parts.push(`${formatClock(longestLullSeconds)} longest lull`);

  return (
    <p className="shrink-0 text-caption text-[color:var(--ink-soft)] font-[family-name:var(--font-ui)]">
      {parts.join(' · ')}
    </p>
  );
}

function TimelineBar({
  marks,
  breaks,
  endSeconds,
  highlightedWord,
}: {
  marks: TimelineMark[];
  breaks: { startPct: number; endPct: number; durationSeconds: number }[];
  endSeconds: number;
  highlightedWord: string | null;
}) {
  // Inset so a dot centered at 0% / 100% isn't clipped by the track edge.
  const leftOf = (xPct: number) => 2 + (xPct / 100) * 96;

  return (
    <div className="shrink-0">
      <div
        className="relative h-11 rounded-xl bg-[var(--surface-card)] overflow-hidden"
        style={{ boxShadow: 'inset 0 0 0 1px var(--ink-border-subtle)' }}
      >
        {/* Break zones — hatched bands so an idle stretch reads as a pause
            rather than an empty gap the eye glosses over. */}
        {breaks.map((b, i) => (
          <div
            key={`break-${i}`}
            className="absolute inset-y-0"
            title={`${formatClock(b.durationSeconds)} break`}
            style={{
              left: `${b.startPct}%`,
              width: `${Math.max(0, b.endPct - b.startPct)}%`,
              background:
                'repeating-linear-gradient(45deg, var(--ink-trace) 0 3px, transparent 3px 7px)',
            }}
          />
        ))}

        {/* Centerline the finds sit on. */}
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[var(--ink-faint)]" />

        {/* One dot per find, colored by rarity; the selected word's dot grows
            and brightens so tapping a list row locates it on the bar. */}
        {marks.map((mark) => {
          const active = highlightedWord === mark.word;
          return (
            <div
              key={mark.word}
              className="absolute top-1/2 rounded-full"
              style={{
                left: `${leftOf(mark.xPct)}%`,
                width: active ? 10 : 6,
                height: active ? 10 : 6,
                transform: 'translate(-50%, -50%)',
                background: RARITY_VAR[mark.rarity],
                opacity: active ? 1 : 0.75,
                boxShadow: active ? '0 0 0 2px var(--surface-card)' : undefined,
              }}
            />
          );
        })}
      </div>

      <div className="mt-1 flex justify-between text-label-xs text-[color:var(--ink-faint)] font-[family-name:var(--font-ui)]">
        <span>0:00</span>
        <span>{formatClock(endSeconds)}</span>
      </div>
    </div>
  );
}

function TimelineRow({
  mark,
  highlighted,
  onSelect,
}: {
  mark: TimelineMark;
  highlighted: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      {mark.breakBefore && mark.deltaSeconds !== null && (
        <div className="flex items-center gap-2 px-1 py-0.5 text-label-xs text-[color:var(--ink-faint)] font-[family-name:var(--font-ui)]">
          <span className="flex-1 border-t border-dashed border-[color:var(--ink-faint)]" />
          <span>{formatClock(mark.deltaSeconds)} break</span>
          <span className="flex-1 border-t border-dashed border-[color:var(--ink-faint)]" />
        </div>
      )}
      <button
        type="button"
        onClick={onSelect}
        className="w-full flex items-center gap-2 rounded-lg py-1 pr-2 text-left border-0"
        style={{
          background: highlighted ? 'var(--you-highlight-bg-hi)' : 'transparent',
          borderLeft: `3px solid ${RARITY_VAR[mark.rarity]}`,
          paddingLeft: 8,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span className="tabular-nums text-caption text-[color:var(--ink-soft)] font-[family-name:var(--font-ui)] w-9 shrink-0">
          {formatClock(mark.timeSeconds)}
        </span>
        <span className="flex-1 min-w-0 truncate text-body text-[color:var(--ink)] font-[family-name:var(--font-ui)]">
          {mark.word}
        </span>
        {mark.deltaSeconds !== null && !mark.breakBefore && (
          <span className="tabular-nums text-label-xs text-[color:var(--ink-faint)] font-[family-name:var(--font-ui)]">
            {formatDelta(mark.deltaSeconds)}
          </span>
        )}
        <span className="tabular-nums text-caption text-[color:var(--ink-muted)] font-[family-name:var(--font-ui)] w-6 text-right shrink-0">
          {mark.score}
        </span>
      </button>
    </li>
  );
}
