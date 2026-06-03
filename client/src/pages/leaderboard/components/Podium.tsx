import { StatusIcon } from '../../../shared/components/StatusIcon';

export interface PodiumEntry {
  /** Competition rank — may repeat across entries when players tie. */
  rank: number;
  name: string;
  score: number;
  userId: string;
  isCurrentUser?: boolean;
  inProgress?: boolean;
}

interface PodiumProps {
  entries: PodiumEntry[];
  /** Tapping an *other* player's pillar routes to the compare page. */
  onCompare?: (userId: string) => void;
  /** Tapping the current-user pillar routes to their own results. */
  onSelfClick?: () => void;
}

/** Visual podium — 2 / 1 / 3 columns with different pillar heights. The pillar
 *  *slots* are positional (entries arrive in rank order: top scorer center,
 *  runner-up left, third right), but each pillar's place label comes from the
 *  entry's actual rank. So a tie renders as a repeated place — two "1ST"
 *  pillars — instead of silently dropping a player. A small crown sits above
 *  anyone ranked first. */
export function Podium({ entries, onCompare, onSelfClick }: PodiumProps) {
  return (
    <div className="grid items-end gap-1 mt-3.5 px-0.5 flex-shrink-0" style={{ gridTemplateColumns: '1fr 1.1fr 1fr' }}>
      <Pillar place="second" entry={entries[1]} onCompare={onCompare} onSelfClick={onSelfClick} />
      <Pillar place="first" entry={entries[0]} onCompare={onCompare} onSelfClick={onSelfClick} />
      <Pillar place="third" entry={entries[2]} onCompare={onCompare} onSelfClick={onSelfClick} />
    </div>
  );
}

// Maps a rank to its podium tier. Ranks past third (only reachable through a
// tie, e.g. 1, 2, 2 has no third) fall back to bronze.
function tierColor(rank: number): { bg: string; text: string } {
  if (rank === 1) return { bg: 'bg-[var(--podium-gold-bg)]', text: 'text-[color:var(--podium-gold)]' };
  if (rank === 2) return { bg: 'bg-[var(--podium-silver-bg)]', text: 'text-[color:var(--podium-silver)]' };
  return { bg: 'bg-[var(--podium-bronze-bg)]', text: 'text-[color:var(--podium-bronze)]' };
}

function ordinalPlace(rank: number): string {
  const tens = rank % 100;
  const ones = rank % 10;
  let suffix = 'TH';
  if (tens < 11 || tens > 13) {
    if (ones === 1) suffix = 'ST';
    else if (ones === 2) suffix = 'ND';
    else if (ones === 3) suffix = 'RD';
  }
  return `${rank}${suffix}`;
}

function Pillar({
  place,
  entry,
  onCompare,
  onSelfClick,
}: {
  place: 'first' | 'second' | 'third';
  entry?: PodiumEntry;
  onCompare?: (userId: string) => void;
  onSelfClick?: () => void;
}) {
  if (!entry) return <div />;

  // Colour follows the rank, not the slot: tied players carry the same
  // gold/silver/bronze so a co-first reads as two gold pillars. Heights and
  // text sizes stay positional — they're the podium's structural shape, with
  // the centre slot always the tallest.
  const tier = tierColor(entry.rank);
  const padding =
    place === 'first'
      ? 'pt-[14px] pb-5 px-1.5'
      : place === 'second'
        ? 'pt-[10px] pb-3 px-1.5'
        : 'pt-[10px] pb-1.5 px-1.5';
  const rankTextSize = place === 'first' ? 'text-[10px]' : 'text-[9px]';
  const rankLabel = ordinalPlace(entry.rank);

  const nameSize = place === 'first' ? 'text-[15px]' : 'text-[13px]';
  const scoreSize = place === 'first' ? 'text-[20px]' : 'text-[16px]';

  const handleClick = entry.isCurrentUser
    ? onSelfClick
    : onCompare
      ? () => onCompare(entry.userId)
      : undefined;
  const clickable = !!handleClick;
  const Comp = clickable ? 'button' : 'div';

  return (
    <Comp
      type={clickable ? 'button' : undefined}
      onClick={handleClick}
      className={[
        'relative flex flex-col items-center text-center rounded-t-[10px] border-none',
        tier.bg,
        padding,
        clickable ? 'cursor-pointer hover:-translate-y-0.5 transition-transform duration-200' : '',
      ].join(' ')}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {entry.rank === 1 && (
        <span
          aria-hidden
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[color:var(--podium-gold)] bg-[var(--surface-panel)] rounded-full p-[3px] leading-none"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="block">
            <path d="M5 16L3 5l5.5 4L12 4l3.5 5L21 5l-2 11H5zm2.7-2h8.6l.9-5.4-3 2.1L12 7l-2.2 3.7-3-2.1.9 5.4z" />
          </svg>
        </span>
      )}
      <span
        className={`tracking-[0.1em] mb-[5px] font-[family-name:var(--font-structure)] ${rankTextSize} ${tier.text}`}
        style={{ fontWeight: 800 }}
      >
        {rankLabel}
      </span>
      <span
        className={[
          'flex items-center justify-center gap-1 italic leading-[1.1] tracking-[-0.01em] text-[color:var(--ink)] mb-1.5 font-[family-name:var(--font-display)] w-full min-w-0',
          nameSize,
        ].join(' ')}
        style={{ fontWeight: 600 }}
        title={entry.name}
      >
        <span className="truncate">{entry.name}</span>
        {entry.inProgress && <StatusIcon state="in-progress" />}
      </span>
      <span
        className={[
          'tabular-nums leading-none text-[color:var(--ink)] font-[family-name:var(--font-structure)]',
          scoreSize,
        ].join(' ')}
        style={{ fontWeight: 800, letterSpacing: '-0.02em' }}
      >
        {entry.score}
      </span>
    </Comp>
  );
}
