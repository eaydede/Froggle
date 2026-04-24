interface HeroScoreProps {
  points: number;
  words: number;
}

export function HeroScore({ points, words }: HeroScoreProps) {
  return (
    <div className="text-center pt-3.5 pb-2.5">
      <div className="inline-flex items-baseline gap-1.5 leading-none">
        <span
          className="text-display-xl font-[family-name:var(--font-structure)] tabular-nums leading-[0.95] tracking-[-0.04em]"
          style={{ fontWeight: 800 }}
        >
          {points}
        </span>
        <span
          className="text-xs uppercase tracking-[0.08em] text-[color:var(--ink-soft)]"
          style={{ fontWeight: 700 }}
        >
          pts
        </span>
      </div>
      <div className="text-xs text-[color:var(--ink-muted)] tabular-nums mt-1.5" style={{ fontWeight: 500 }}>
        {words} {words === 1 ? 'word' : 'words'}
      </div>
    </div>
  );
}
