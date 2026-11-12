interface HeroScoreProps {
  points: number;
  words: number;
  /** Which stat headlines the hero. Defaults to 'points'. */
  primary?: 'points' | 'words';
  /** Optional run-level metadata rendered inline next to the subtitle
   *  (e.g. a mode badge). Sits alongside the secondary stat so callers
   *  can describe the run without adding a new vertical line. */
  accessory?: React.ReactNode;
  /** Renders above the headline value as a small italic crown — used for
   *  achievement labels (Daily Zen rank) that share the hero's prominence
   *  without competing with the numeric stat for size. */
  crown?: React.ReactNode;
}

export function HeroScore({ points, words, primary = 'points', accessory, crown }: HeroScoreProps) {
  const heroValue = primary === 'words' ? words : points;
  const heroSuffix = primary === 'words' ? (words === 1 ? 'word' : 'words') : 'pts';
  const subtitleValue = primary === 'words' ? points : words;
  const subtitleLabel = primary === 'words' ? (points === 1 ? 'pt' : 'pts') : (words === 1 ? 'word' : 'words');

  return (
    <div className="text-center pt-3 pb-2.5">
      {crown && <div className="mb-1">{crown}</div>}
      <div className="inline-flex items-baseline gap-1.5 leading-none">
        <span
          className="text-display-xl font-[family-name:var(--font-structure)] tabular-nums leading-[0.95] tracking-[-0.04em]"
          style={{ fontWeight: 800 }}
        >
          {heroValue}
        </span>
        <span
          className="text-xs uppercase tracking-[0.08em] text-[color:var(--ink-soft)]"
          style={{ fontWeight: 700 }}
        >
          {heroSuffix}
        </span>
      </div>
      <div
        className="flex items-center justify-center gap-2 text-xs text-[color:var(--ink-muted)] mt-1.5"
        style={{ fontWeight: 500 }}
      >
        <span className="tabular-nums">
          {subtitleValue} {subtitleLabel}
        </span>
        {accessory && (
          <>
            <span aria-hidden className="w-[3px] h-[3px] rounded-full bg-[var(--ink-faint)]" />
            {accessory}
          </>
        )}
      </div>
    </div>
  );
}
