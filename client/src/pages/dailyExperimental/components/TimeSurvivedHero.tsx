import { formatClock } from '../experimentalUtils';

// Solo hero for Time is Money: the headline stat is the total time played
// (base clock + banked seconds), with points/words as the supporting line.
// Mirrors HeroScore's layout so it sits flush with the rest of the results UI.
interface TimeSurvivedHeroProps {
  seconds: number;
  points: number;
  words: number;
}

export function TimeSurvivedHero({ seconds, points, words }: TimeSurvivedHeroProps) {
  return (
    <div className="text-center pt-3 pb-2.5">
      <div className="inline-flex items-baseline gap-1.5 leading-none">
        <span
          className="text-display-xl font-[family-name:var(--font-structure)] tabular-nums leading-[0.95] tracking-[-0.04em]"
          style={{ fontWeight: 800 }}
        >
          {formatClock(seconds)}
        </span>
        <span
          className="text-xs uppercase tracking-[0.08em] text-[color:var(--ink-soft)]"
          style={{ fontWeight: 700 }}
        >
          played
        </span>
      </div>
      <div
        className="flex items-center justify-center gap-2 text-xs text-[color:var(--ink-muted)] mt-1.5"
        style={{ fontWeight: 500 }}
      >
        <span className="tabular-nums">
          {points} {points === 1 ? 'pt' : 'pts'}
        </span>
        <span aria-hidden className="w-[3px] h-[3px] rounded-full bg-[var(--ink-faint)]" />
        <span className="tabular-nums">
          {words} {words === 1 ? 'word' : 'words'}
        </span>
      </div>
    </div>
  );
}
