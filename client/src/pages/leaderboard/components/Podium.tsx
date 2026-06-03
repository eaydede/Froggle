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

/** Visual podium — top scorer centre, runner-up left, third right. Every
 *  size cue (height, colour, name/score type) is keyed to the entry's *rank*,
 *  not its slot, so the common 1/2/3 case still steps down center-tall while
 *  tied players become visually identical: a co-first is two equal gold
 *  pillars, a co-second two equal silver. Columns are equal width for the same
 *  reason. A crown sits above anyone ranked first. */
export function Podium({ entries, onCompare, onSelfClick }: PodiumProps) {
  return (
    <div className="grid items-end gap-1 mt-3.5 px-0.5 flex-shrink-0" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
      <Pillar entry={entries[1]} onCompare={onCompare} onSelfClick={onSelfClick} />
      <Pillar entry={entries[0]} onCompare={onCompare} onSelfClick={onSelfClick} />
      <Pillar entry={entries[2]} onCompare={onCompare} onSelfClick={onSelfClick} />
    </div>
  );
}

// All of a pillar's visual weight — colour, height, and type scale — keyed to
// rank so equal ranks look equal. Ranks past third (only reachable through a
// tie, e.g. 1, 2, 2 has no third) fall back to the third-place treatment.
function tierStyle(rank: number): {
  bg: string;
  text: string;
  padding: string;
  rankSize: string;
  nameSize: string;
  scoreSize: string;
} {
  if (rank === 1) {
    return {
      bg: 'bg-[var(--podium-gold-bg)]',
      text: 'text-[color:var(--podium-gold)]',
      padding: 'pt-[14px] pb-5 px-1.5',
      rankSize: 'text-[10px]',
      nameSize: 'text-[15px]',
      scoreSize: 'text-[20px]',
    };
  }
  if (rank === 2) {
    return {
      bg: 'bg-[var(--podium-silver-bg)]',
      text: 'text-[color:var(--podium-silver)]',
      padding: 'pt-[10px] pb-3 px-1.5',
      rankSize: 'text-[9px]',
      nameSize: 'text-[13px]',
      scoreSize: 'text-[16px]',
    };
  }
  return {
    bg: 'bg-[var(--podium-bronze-bg)]',
    text: 'text-[color:var(--podium-bronze)]',
    padding: 'pt-[10px] pb-1.5 px-1.5',
    rankSize: 'text-[9px]',
    nameSize: 'text-[13px]',
    scoreSize: 'text-[16px]',
  };
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
  entry,
  onCompare,
  onSelfClick,
}: {
  entry?: PodiumEntry;
  onCompare?: (userId: string) => void;
  onSelfClick?: () => void;
}) {
  if (!entry) return <div />;

  const tier = tierStyle(entry.rank);
  const rankLabel = ordinalPlace(entry.rank);

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
        tier.padding,
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
        className={`tracking-[0.1em] mb-[5px] font-[family-name:var(--font-structure)] ${tier.rankSize} ${tier.text}`}
        style={{ fontWeight: 800 }}
      >
        {rankLabel}
      </span>
      <span
        className={[
          'flex items-center justify-center gap-1 italic leading-[1.1] tracking-[-0.01em] text-[color:var(--ink)] mb-1.5 font-[family-name:var(--font-display)] w-full min-w-0',
          tier.nameSize,
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
          tier.scoreSize,
        ].join(' ')}
        style={{ fontWeight: 800, letterSpacing: '-0.02em' }}
      >
        {entry.score}
      </span>
    </Comp>
  );
}
