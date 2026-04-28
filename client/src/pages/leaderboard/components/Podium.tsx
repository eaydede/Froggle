import { StatusIcon } from '../../../shared/components/StatusIcon';

export interface PodiumEntry {
  rank: 1 | 2 | 3;
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

/** Visual podium — 2 / 1 / 3 columns with different pillar heights. The
 *  shape itself encodes the ranking so we don't need border colors or
 *  explicit number badges. A small crown sits above first. */
export function Podium({ entries, onCompare, onSelfClick }: PodiumProps) {
  const byRank = new Map(entries.map((e) => [e.rank, e]));
  return (
    <div className="grid items-end gap-1 mt-3.5 px-0.5 flex-shrink-0" style={{ gridTemplateColumns: '1fr 1.1fr 1fr' }}>
      <Pillar place="second" entry={byRank.get(2)} onCompare={onCompare} onSelfClick={onSelfClick} />
      <Pillar place="first" entry={byRank.get(1)} onCompare={onCompare} onSelfClick={onSelfClick} />
      <Pillar place="third" entry={byRank.get(3)} onCompare={onCompare} onSelfClick={onSelfClick} />
    </div>
  );
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

  const tint =
    place === 'first'
      ? 'bg-[var(--podium-gold-bg)]'
      : place === 'second'
        ? 'bg-[var(--podium-silver-bg)]'
        : 'bg-[var(--podium-bronze-bg)]';
  const padding =
    place === 'first'
      ? 'pt-[14px] pb-5 px-1.5'
      : place === 'second'
        ? 'pt-[10px] pb-3 px-1.5'
        : 'pt-[10px] pb-1.5 px-1.5';
  const rankText =
    place === 'first'
      ? 'text-[10px] text-[color:var(--podium-gold)]'
      : place === 'second'
        ? 'text-[9px] text-[color:var(--podium-silver)]'
        : 'text-[9px] text-[color:var(--podium-bronze)]';
  const rankLabel = place === 'first' ? '1ST' : place === 'second' ? '2ND' : '3RD';

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
        tint,
        padding,
        clickable ? 'cursor-pointer hover:-translate-y-0.5 transition-transform duration-200' : '',
      ].join(' ')}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {place === 'first' && (
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
        className={`tracking-[0.1em] mb-[5px] font-[family-name:var(--font-structure)] ${rankText}`}
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
