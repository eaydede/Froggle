import { useRef, useEffect } from 'react';

export type WordListSide = 'you' | 'opp';

export interface DisplayWordRow {
  /** Stable key — pair `(word, side)` so React never reuses a row when
   *  toggling between solo and compare modes. */
  key: string;
  word: string | null; // null = missing-from-this-side dash
  score: number;
  faded?: boolean; // missed in solo mode → faded
  unique?: boolean; // present only on this side in compare mode
  highlighted?: boolean;
}

interface WordListProps {
  side: WordListSide;
  /** Header content (label + count + score) — controlled by parent so
   *  hero/compare mode toggling can swap "You · 11" ↔ "All words". */
  headerLabel: string;
  headerTrail: string;
  /** Optional footer button — used for the "All words ↔ Found only"
   *  toggle in solo mode, and the "Stop" exit in compare mode. */
  footer?: { label: string; arrow: string; onClick: () => void };
  rows: DisplayWordRow[];
  onWordTap: (word: string) => void;
  /** Scroll position synchronization for compare mode. */
  scrollSync?: { register: (el: HTMLDivElement | null) => void };
  compact?: boolean;
}

export function WordList({
  side,
  headerLabel,
  headerTrail,
  footer,
  rows,
  onWordTap,
  scrollSync,
  compact = false,
}: WordListProps) {
  const isYou = side === 'you';
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollSync) scrollSync.register(scrollRef.current);
    return () => {
      if (scrollSync) scrollSync.register(null);
    };
  }, [scrollSync]);

  // Body stays neutral on both sides — the side identity comes through
  // the colored outer border + matching tinted header. No shadow, so
  // the lists feel flat against the page rather than floating cards.
  const surface = 'var(--surface-card)';
  const headerBg = isYou ? 'var(--you-accent-soft)' : 'var(--surface-opp-header)';
  const headerBorder = isYou ? 'var(--you-accent-soft)' : 'var(--opp-accent-soft)';
  // Outer border re-uses the hero's winner-card border tokens so the
  // list outlines visually pair with the versus hero above them.
  const outerBorder = isYou ? 'var(--winner-you-border)' : 'var(--winner-opp-border)';

  return (
    <div
      className="flex flex-col min-h-0 rounded-xl overflow-hidden border"
      style={{
        background: surface,
        borderColor: outerBorder,
      }}
    >
      <div
        className="flex justify-between items-center px-3 py-[9px] uppercase font-[family-name:var(--font-structure)] text-label-xs tracking-[0.08em] leading-none text-[color:var(--ink-muted)] shrink-0"
        style={{
          fontWeight: 700,
          background: headerBg,
        }}
      >
        <span className="flex flex-1 items-center gap-1.5 min-w-0 pr-1">
          <span className="truncate">{headerLabel}</span>
        </span>
        <span className="tabular-nums shrink-0">{headerTrail}</span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0, black 10px, black calc(100% - 10px), transparent 100%)',
          maskImage:
            'linear-gradient(to bottom, transparent 0, black 10px, black calc(100% - 10px), transparent 100%)',
        }}
      >
        {rows.length === 0 ? (
          <div className="px-3 py-4 text-xs italic text-[color:var(--ink-soft)] text-center font-[family-name:var(--font-display)]">
            No words.
          </div>
        ) : (
          rows.map((row, i) => (
            <WordRow
              key={row.key}
              row={row}
              side={side}
              isFirst={i === 0}
              onTap={onWordTap}
              compact={compact}
            />
          ))
        )}
      </div>

      {footer && (
        <button
          type="button"
          onClick={footer.onClick}
          className="flex items-center justify-between px-3 py-[9px] uppercase font-[family-name:var(--font-structure)] text-label-xs tracking-[0.08em] leading-none text-[color:var(--ink-muted)] cursor-pointer transition-colors duration-150 shrink-0 hover:text-[color:var(--ink)] border-x-0 border-b-0 border-t"
          style={{
            fontWeight: 700,
            background: headerBg,
            borderTopColor: headerBorder,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span>{footer.label}</span>
          <span aria-hidden style={{ color: 'var(--ink-faint)' }}>
            {footer.arrow}
          </span>
        </button>
      )}
    </div>
  );
}

function WordRow({
  row,
  side,
  isFirst,
  onTap,
  compact,
}: {
  row: DisplayWordRow;
  side: WordListSide;
  isFirst: boolean;
  onTap: (word: string) => void;
  compact: boolean;
}) {
  // All rows — word rows + missing-side placeholders — share the same
  // geometry as WordsCard rows on the solo results page so the two
  // experiences feel like the same component. Padding, line-height, and
  // font weight all derive from WordsCard's row definition.
  const rowClass = [
    'relative flex justify-between items-center py-[7px] pr-3 pl-[17px] text-xs tracking-[0.02em] transition-colors duration-150 font-[family-name:var(--font-ui)]',
    isFirst ? '' : 'border-t border-[var(--ink-border-subtle)]',
  ].join(' ');

  if (row.word === null) {
    return (
      <div
        className={`${rowClass} justify-center`}
        style={{ fontWeight: 500, color: 'var(--ink-faint)' }}
      >
        <span>—</span>
      </div>
    );
  }

  const handleClick = () => onTap(row.word!);
  const isYouSide = side === 'you';
  const uniqueBg = row.unique
    ? isYouSide
      ? 'var(--you-accent-soft)'
      : 'var(--opp-accent-soft)'
    : undefined;
  // Shared-word highlights read as a neutral grey on both sides so the
  // selection signal doesn't compete with the side-color identity. The
  // unique-on-opp case still uses the warm row-active tint because that
  // row already has its tan tint baseline.
  const highlightBg = row.highlighted
    ? !isYouSide && row.unique
      ? 'var(--opp-accent-row-active)'
      : 'var(--ink-whisper)'
    : undefined;
  const background = highlightBg ?? uniqueBg ?? 'transparent';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`${rowClass} cursor-pointer`}
      style={{
        fontWeight: 500,
        color: row.faded ? 'var(--ink-soft)' : 'var(--ink)',
        background,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span
        aria-hidden
        className="absolute left-0 top-[5px] bottom-[5px] w-1 rounded-r-[2px]"
        style={{
          background: rarityColor(row.score),
          opacity: row.faded ? 0.45 : 1,
        }}
      />
      <span className="tabular-nums truncate min-w-0">{row.word}</span>
      <span
        className="tabular-nums font-[family-name:var(--font-structure)] shrink-0 pl-1.5"
        style={{
          // Unique words get a side-tinted, larger score readout so the
          // "only one player got this" signal lives entirely in the
          // trailing number instead of a separate badge. Line-height is
          // locked to 1 so the larger size never expands the row — the
          // row keeps WordsCard's exact baseline geometry whether the
          // word is unique or not.
          fontSize: row.unique ? '13px' : '11px',
          lineHeight: 1,
          fontWeight: row.unique ? 800 : 700,
          color: row.faded
            ? 'var(--ink-faint)'
            : row.unique
              ? isYouSide
                ? 'var(--you-accent)'
                : 'var(--opp-accent-strong)'
              : 'var(--ink-soft)',
        }}
        title={row.unique ? (isYouSide ? 'Only you found this' : 'Only they found this') : undefined}
      >
        +{row.score}
      </span>
    </div>
  );
}

function rarityColor(score: number): string {
  if (score >= 13) return 'var(--rarity-legendary)';
  if (score >= 8) return 'var(--rarity-mythic)';
  if (score >= 5) return 'var(--rarity-epic)';
  if (score >= 3) return 'var(--rarity-rare)';
  if (score >= 2) return 'var(--rarity-uncommon)';
  return 'var(--rarity-common)';
}
