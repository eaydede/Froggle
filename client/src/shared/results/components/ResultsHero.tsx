export interface HeroPlayer {
  displayName: string;
  points: number;
  wordCount: number;
}

interface ResultsHeroProps {
  me: HeroPlayer;
  myRank: number;
  totalPlayers: number;
  opponent: HeroPlayer | null;
  oppRank: number | null;
  compact?: boolean;
}

// Fixed-height hero so toggling between solo and versus modes doesn't
// reflow the rows below it. Reserved space accommodates whichever layout
// is taller.
export function ResultsHero({
  me,
  myRank,
  totalPlayers,
  opponent,
  oppRank,
  compact = false,
}: ResultsHeroProps) {
  return (
    <section className={`shrink-0 box-border flex items-center justify-center ${compact ? 'pt-2 pb-1 h-[82px]' : 'pt-3 pb-2 h-[96px]'}`}>
      {opponent && oppRank !== null ? (
        <VersusHero
          me={me}
          myRank={myRank}
          opponent={opponent}
          oppRank={oppRank}
          compact={compact}
        />
      ) : (
        <SoloHero player={me} rank={myRank} totalPlayers={totalPlayers} compact={compact} />
      )}
    </section>
  );
}

function SoloHero({
  player,
  rank,
  totalPlayers,
  compact,
}: {
  player: HeroPlayer;
  rank: number;
  totalPlayers: number;
  compact: boolean;
}) {
  // "Rank 1 of 1" reads as filler when nobody else has played — drop
  // the rank phrase entirely until there's someone to be ranked against.
  const showRank = totalPlayers > 1;
  return (
    <div className="text-center">
      <div className="inline-flex items-baseline gap-1.5 leading-none">
        <span
          className={`${compact ? 'text-[2.5rem]' : 'text-display-lg'} tabular-nums font-[family-name:var(--font-structure)]`}
          style={{ fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 0.95 }}
        >
          {player.points}
        </span>
        <span
          className="text-label-xs uppercase tracking-[0.1em] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 700 }}
        >
          pts
        </span>
      </div>
      <div
        className="flex items-center justify-center gap-2 mt-1.5 text-xs text-[color:var(--ink-muted)] tabular-nums"
        style={{ fontWeight: 500 }}
      >
        <span>
          {player.wordCount} {player.wordCount === 1 ? 'word' : 'words'}
          {showRank ? ` · rank ${rank} of ${totalPlayers}` : ''}
        </span>
      </div>
    </div>
  );
}

function VersusHero({
  me,
  myRank,
  opponent,
  oppRank,
  compact,
}: {
  me: HeroPlayer;
  myRank: number;
  opponent: HeroPlayer;
  oppRank: number;
  compact: boolean;
}) {
  const diff = me.points - opponent.points;
  const youWins = diff > 0;
  const oppWins = diff < 0;
  const deltaLabel = diff === 0 ? 'tie' : diff > 0 ? `+${diff}` : String(diff);
  const deltaColor = diff === 0
    ? 'var(--ink-soft)'
    : diff > 0
      ? 'var(--rarity-rare)'
      : 'var(--opp-accent-strong)';
  const oppInitial = opponent.displayName.charAt(0).toUpperCase() || '?';

  return (
    <div
      className="w-full grid items-stretch gap-1"
      // minmax(0, 1fr) lets long display names truncate inside the cell
      // instead of widening it (default `1fr` is `minmax(auto, 1fr)` and
      // grows to content width).
      style={{ gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)' }}
    >
      <VersusCard
        side="you"
        name="You"
        score={me.points}
        wordCount={me.wordCount}
        rank={myRank}
        isWinner={youWins}
        align="left"
        compact={compact}
      />
      <div className={`flex flex-col items-center justify-center self-stretch ${compact ? 'px-0.5' : 'px-1'}`}>
        <span
          className="italic font-[family-name:var(--font-display)] text-xs"
          style={{ color: 'var(--ink-faint)' }}
        >
          vs
        </span>
        <span
          className="font-[family-name:var(--font-structure)] tabular-nums mt-1 text-label-xs leading-none"
          style={{ fontWeight: 700, color: deltaColor }}
        >
          {deltaLabel}
        </span>
      </div>
      <VersusCard
        side="opp"
        name={opponent.displayName}
        initial={oppInitial}
        score={opponent.points}
        wordCount={opponent.wordCount}
        rank={oppRank}
        isWinner={oppWins}
        align="right"
        compact={compact}
      />
    </div>
  );
}

function VersusCard({
  side,
  name,
  initial,
  score,
  wordCount,
  rank,
  isWinner,
  align,
  compact,
}: {
  side: 'you' | 'opp';
  name: string;
  initial?: string;
  score: number;
  wordCount: number;
  rank: number;
  isWinner: boolean;
  align: 'left' | 'right';
  compact: boolean;
}) {
  const accent = side === 'you' ? 'var(--you-accent)' : 'var(--opp-accent)';
  const showInitial = initial !== undefined;
  const initialChar = side === 'you' ? 'Y' : initial ?? '?';
  // Two distinct winner palettes — viewer-side wins use a blue tint so
  // the highlight never collides with the opponent's tan accent on the
  // facing card. Opp-side wins keep the warm tint that pairs with the
  // tan accent.
  const winnerBg = side === 'you' ? 'var(--winner-you-bg)' : 'var(--winner-opp-bg)';
  const winnerBorder = side === 'you' ? 'var(--winner-you-border)' : 'var(--winner-opp-border)';

  return (
    <div
      className={`relative rounded-lg transition-all ${compact ? 'px-2 py-1' : 'px-2.5 py-1.5'}`}
      style={{
        textAlign: align,
        background: isWinner ? winnerBg : 'transparent',
        border: `1px solid ${isWinner ? winnerBorder : 'transparent'}`,
      }}
    >
      {isWinner && (
        <span
          aria-hidden
          className="absolute"
          style={{ top: '-7px', [align === 'left' ? 'right' : 'left']: '6px' } as React.CSSProperties}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill={winnerBorder}
            stroke={winnerBorder}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 18h20" />
            <path d="M3 8l4 6 5-8 5 8 4-6v10H3z" />
          </svg>
        </span>
      )}
      <div
        className={`flex items-center gap-1.5 min-w-0 ${align === 'right' ? 'justify-end' : ''}`}
      >
        {align === 'left' && <Initial char={initialChar} accent={accent} />}
        {align === 'right' && <RankBadge rank={rank} />}
        <span
          className="uppercase truncate font-[family-name:var(--font-structure)] text-label-xs tracking-[0.12em] leading-none text-[color:var(--ink-soft)] min-w-0"
          style={{ fontWeight: 700 }}
          title={name}
        >
          {name}
        </span>
        {align === 'left' && <RankBadge rank={rank} />}
        {align === 'right' && showInitial && (
          <Initial char={initialChar} accent={accent} />
        )}
      </div>
      <div className="inline-flex items-baseline gap-1 mt-1 leading-none">
        <span
          className={`${compact ? 'text-[1.9rem]' : 'text-display-md'} tabular-nums font-[family-name:var(--font-structure)]`}
          style={{ fontWeight: 800 }}
        >
          {score}
        </span>
        <span
          className="text-label-xs uppercase tracking-[0.1em] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 700 }}
        >
          pts
        </span>
      </div>
      <div
        className="tabular-nums text-[color:var(--ink-muted)] text-label-xs mt-1 truncate"
        style={{ fontWeight: 500 }}
      >
        {wordCount} {wordCount === 1 ? 'word' : 'words'}
      </div>
    </div>
  );
}

function Initial({ char, accent }: { char: string; accent: string }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-[color:var(--ink-inverse)] font-[family-name:var(--font-structure)]"
      style={{
        width: '14px',
        height: '14px',
        background: accent,
        fontSize: '8px',
        fontWeight: 800,
      }}
    >
      {char}
    </span>
  );
}

// Small pill rendered next to the player's name in the versus hero —
// reads as "rank N" without needing to occupy a full label row below.
function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className="inline-flex items-center tabular-nums font-[family-name:var(--font-structure)] text-[color:var(--ink-muted)] bg-[var(--ink-whisper)] leading-none"
      style={{
        fontSize: '9px',
        fontWeight: 700,
        padding: '2px 5px',
        borderRadius: '999px',
        letterSpacing: '0.04em',
      }}
    >
      #{rank}
    </span>
  );
}
