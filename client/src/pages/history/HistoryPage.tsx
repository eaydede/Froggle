import { useMemo } from 'react';
import type { FreePlayHistoryEntry } from '../../shared/api/gameApi';

interface HistoryPageProps {
  entries: FreePlayHistoryEntry[] | null;
  onBack: () => void;
  /** Single tap target per row. The page picks solo or challenge by
   *  reading entry.playerCount itself and dispatches to the caller. */
  onOpenEntry: (entry: FreePlayHistoryEntry) => void;
}

export function HistoryPage({ entries, onBack, onOpenEntry }: HistoryPageProps) {
  const grouped = useMemo(() => groupEntries(entries), [entries]);

  return (
    <div className="fixed inset-0 flex items-start justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)] overflow-y-auto">
      <div className="w-full max-w-[360px] min-h-full flex flex-col pb-[22px] px-[22px] pt-[24px]">
        <div className="flex items-center pt-[18px]">
          <BackButton onClick={onBack} />
        </div>

        <div className="px-1 pt-5 pb-4">
          <Hero count={entries?.length ?? null} />
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-5">
          {entries === null ? (
            <LoadingState />
          ) : entries.length === 0 ? (
            <EmptyState />
          ) : (
            grouped.map((group) => (
              <DateGroup
                key={group.date}
                group={group}
                onOpenEntry={onOpenEntry}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface DateBucket {
  date: string;
  label: string;
  newCount: number;
  entries: FreePlayHistoryEntry[];
}

function groupEntries(entries: FreePlayHistoryEntry[] | null): DateBucket[] {
  if (!entries) return [];
  const buckets = new Map<string, DateBucket>();
  for (const entry of entries) {
    const d = new Date(entry.completedAt);
    const dateKey = d.toISOString().slice(0, 10);
    const existing = buckets.get(dateKey);
    if (existing) {
      existing.entries.push(entry);
      existing.newCount += entry.newResults;
    } else {
      buckets.set(dateKey, {
        date: dateKey,
        label: formatDateHeader(d),
        newCount: entry.newResults,
        entries: [entry],
      });
    }
  }
  return Array.from(buckets.values());
}

function formatDateHeader(d: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';

  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const weekday = d.toLocaleString('en-US', { weekday: 'short' }).toUpperCase();
  return `${month} ${d.getDate()} · ${weekday}`;
}

function Hero({ count }: { count: number | null }) {
  return (
    <div className="text-center">
      <div
        className="text-display-sm italic leading-[1.1] tracking-[-0.015em] font-[family-name:var(--font-display)]"
        style={{ fontWeight: 500 }}
      >
        Your history
      </div>
      {count !== null && count > 0 && (
        <div
          className="mt-1.5 text-xs tabular-nums text-[color:var(--ink-soft)]"
          style={{ fontWeight: 500 }}
        >
          <span
            className="text-[color:var(--ink-muted)] font-[family-name:var(--font-structure)] tracking-[-0.01em]"
            style={{ fontWeight: 700 }}
          >
            {count}
          </span>{' '}
          {count === 1 ? 'game' : 'games'} played
        </div>
      )}
    </div>
  );
}

function DateGroup({
  group,
  onOpenEntry,
}: {
  group: DateBucket;
  onOpenEntry: (entry: FreePlayHistoryEntry) => void;
}) {
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2 px-1">
        <span
          className="text-label-xs uppercase tracking-[0.1em] leading-none text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 700 }}
        >
          {group.label}
        </span>
        {group.newCount > 0 && (
          <span
            className="text-label-xs tabular-nums leading-none px-1.5 py-[2px] rounded-full font-[family-name:var(--font-structure)]"
            style={{
              fontWeight: 700,
              background: 'var(--accent)',
              color: 'var(--ink-inverse)',
            }}
          >
            {group.newCount > 9 ? '9+' : group.newCount} new
          </span>
        )}
      </div>
      <ol className="list-none p-0 m-0 flex flex-col gap-1.5">
        {group.entries.map((entry) => (
          <li key={entry.sessionId} className="min-w-0">
            <HistoryRow entry={entry} onOpenEntry={onOpenEntry} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function HistoryRow({
  entry,
  onOpenEntry,
}: {
  entry: FreePlayHistoryEntry;
  onOpenEntry: (entry: FreePlayHistoryEntry) => void;
}) {
  const isMulti = entry.playerCount > 1;
  const isFirst = isMulti && entry.rank === 1;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenEntry(entry)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenEntry(entry);
        }
      }}
      className="rounded-xl group relative w-full flex items-stretch bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] cursor-pointer hover:border-[var(--ink-border)] hover:bg-[var(--ink-whisper)] active:scale-[0.99] transition-all duration-150 overflow-hidden"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Left identity stripe — gold when 1st, transparent otherwise.
          The win signal lives on the row edge so line 1 stays uncluttered. */}
      <span
        aria-hidden
        className="shrink-0"
        style={{
          width: '4px',
          background: isFirst ? 'var(--podium-gold)' : 'transparent',
        }}
      />

      {/* Left visual — diagonal-highlighted mini grid that mirrors the
          config page's MiniGrid vocabulary. Same outer footprint across
          board sizes; cells scale to fit so the 5×5 looks denser than
          the 4×4 within an identical box. */}
      <div
        className="shrink-0 flex items-center justify-center pl-3 pr-3 py-2.5"
        style={{ width: '56px' }}
      >
        <BoardGlyph size={entry.boardSize} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-1 pr-2 py-2.5">
        {/* Line 1 — points + words. Players moved to the right cluster
            so "did anyone else play this?" lives next to the chevron. */}
        <div className="flex items-baseline gap-2 min-w-0">
          <span
            className="text-xl tabular-nums leading-none text-[color:var(--ink)] font-[family-name:var(--font-structure)]"
            style={{ fontWeight: 800 }}
          >
            {entry.points}
          </span>
          <span
            className="text-label-xs uppercase tracking-[0.06em] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)] -ml-1"
            style={{ fontWeight: 700 }}
          >
            pts
          </span>
          <span
            className="text-xs tabular-nums text-[color:var(--ink-soft)]"
            style={{ fontWeight: 500 }}
          >
            · {entry.wordCount} {entry.wordCount === 1 ? 'word' : 'words'}
          </span>
        </div>

        {/* Line 2 — config chips. Board-size chip stays alongside the
            glyph so the explicit "5×5" reading is still available on
            scan, even when the glyph alone would be enough. */}
        <div className="flex flex-wrap items-center gap-1">
          <Chip>
            {entry.boardSize}×{entry.boardSize}
          </Chip>
          <Chip>{formatTimer(entry.timeLimit)}</Chip>
          <Chip>min {entry.minWordLength}</Chip>
        </div>
      </div>

      {/* Right cluster — new-results pill stacked over the player-count
          chip, then chevron. Pushes "did anyone else play this?" to the
          natural read-end of the row, next to the affordance to enter. */}
      <div className="shrink-0 flex items-center gap-2 pr-3 pl-1">
        <div className="flex flex-col items-end gap-1 min-w-0">
          {entry.newResults > 0 && (
            <span
              className="text-label-xs tabular-nums leading-none px-1.5 py-[2px] rounded-full font-[family-name:var(--font-structure)] shrink-0"
              aria-label={`${entry.newResults} new ${entry.newResults === 1 ? 'result' : 'results'}`}
              style={{
                fontWeight: 800,
                background: 'var(--accent)',
                color: 'var(--ink-inverse)',
              }}
            >
              {entry.newResults > 9 ? '9+' : entry.newResults}
              {' new'}
            </span>
          )}
          {isMulti && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded-full bg-[var(--ink-whisper)] border border-[var(--ink-border-subtle)] text-label-xs tabular-nums text-[color:var(--ink-muted)] leading-none font-[family-name:var(--font-structure)]"
              style={{ fontWeight: 700 }}
              aria-label={`${entry.playerCount} ${entry.playerCount === 1 ? 'player' : 'players'}`}
            >
              <PlayersIcon /> {entry.playerCount}
            </span>
          )}
        </div>
        <Chevron />
      </div>
    </div>
  );
}

function PlayersIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <path d="M17 20v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 20v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// Mirrors the config page's MiniGrid (selected state): same diagonal
// highlight pattern, same softer --ink-mid weight, same gap and rounding
// — so the history row reads in the same visual language as the board
// picker the user just saw.
const BOARD_GLYPH_HIGHLIGHTS: Record<number, number[]> = {
  4: [0, 5, 10, 15],
  5: [0, 6, 12, 18, 24],
  6: [0, 7, 14, 21, 28, 35],
};

function BoardGlyph({ size }: { size: number }) {
  const total = size * size;
  const highlights = BOARD_GLYPH_HIGHLIGHTS[size] ?? [];
  return (
    <div
      aria-hidden
      className="grid"
      style={{
        // Fixed outer footprint — cells scale to fit. Bigger boards get
        // smaller cells, smaller boards get larger cells, so the glyph
        // occupies the same room in the row regardless of size.
        width: '32px',
        height: '32px',
        gridTemplateColumns: `repeat(${size}, 1fr)`,
        gridTemplateRows: `repeat(${size}, 1fr)`,
        gap: 2,
      }}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className="rounded-[1.5px]"
          style={{
            background: highlights.includes(i) ? 'var(--ink-mid)' : 'var(--ink-faint)',
          }}
        />
      ))}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-[2px] rounded-full bg-[var(--ink-whisper)] border border-[var(--ink-border-subtle)] text-label-xs tabular-nums uppercase tracking-[0.06em] text-[color:var(--ink-muted)] leading-none font-[family-name:var(--font-structure)]"
      style={{ fontWeight: 600 }}
    >
      {children}
    </span>
  );
}

function formatTimer(seconds: number): string {
  if (seconds <= 0) return '∞';
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 gap-2.5">
      <div
        className="text-caption uppercase tracking-[0.08em] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 700 }}
      >
        Empty
      </div>
      <p
        className="text-small italic text-[color:var(--ink-muted)] leading-[1.5] max-w-[260px] font-[family-name:var(--font-display)]"
        style={{ fontWeight: 500 }}
      >
        Finish a free-play game and it'll show up here.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-10">
      <div
        className="text-caption uppercase tracking-[0.08em] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 700 }}
      >
        Loading…
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-1.5 bg-transparent border-none text-small text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] cursor-pointer py-1.5 pr-2 font-[family-name:var(--font-ui)] transition-colors duration-200"
      style={{ fontWeight: 500, WebkitTapHighlightColor: 'transparent' }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-transform duration-200 group-hover:-translate-x-[2px]"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      Back
    </button>
  );
}

function Chevron() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      // Darker baseline (--ink-muted) so the affordance is legible
      // without hover.
      className="shrink-0 text-[color:var(--ink-muted)] group-hover:text-[color:var(--ink)] group-hover:translate-x-[2px] transition-[transform,color] duration-200"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
