import { HOT_LETTER_MULTIPLIER } from 'models/gauntlet';

// Today's-specifics card for the bonus (hot-letter) round. The tile on
// the right renders in the full hot-letter palette — same lavender
// backdrop + edges the player sees on the in-game board — so the tile
// is the visual anchor: "this is what to hunt for, and this is exactly
// how it'll look."
export function BonusLetterCard({ letter }: { letter: string }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] px-4 py-4 flex items-center justify-between gap-3">
      <div className="flex flex-col">
        <span
          className="text-caption uppercase tracking-[0.06em] text-[color:var(--ink-muted)] font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 700 }}
        >
          Today's bonus letter
        </span>
        <span
          className="text-base mt-0.5 text-[color:var(--ink)]"
          style={{ fontWeight: 700 }}
        >
          Words with it score {HOT_LETTER_MULTIPLIER}×
        </span>
      </div>
      <div
        className="flex items-center justify-center rounded-xl"
        style={{
          width: 56,
          height: 56,
          backgroundColor: 'var(--hot-letter-bg)',
          color: 'var(--hot-letter-fg)',
          fontFamily: 'var(--font-cell)',
          fontWeight: 800,
          fontSize: '2rem',
          boxShadow:
            '0 3px 0 0 var(--hot-letter-edge), 0 4px 0 0 var(--hot-letter-edge-deep), 0 6px 10px var(--hot-letter-glow)',
        }}
        aria-label={`Bonus letter ${letter}`}
      >
        {letter}
      </div>
    </div>
  );
}
