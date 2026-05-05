import { useEffect, useState } from 'react';
import { ZEN_TIERS, getNextZenTier, getZenTier, type ZenTier } from 'models/zenTiers';
import { TierLadderSheet } from './TierLadderSheet';

interface TierStripProps {
  points: number;
  /** Theoretical max for the day's board. Null on legacy session rows;
   *  in that case the strip is hidden so the layout stays clean. */
  maxScore: number | null;
  /** When non-null, the strip plays a brief celebration treatment for the
   *  given tier — dot pulse, bar flash, "TIER UP" tag. The parent owns the
   *  state so the celebration trigger lines up with the actual cross. */
  celebrating?: ZenTier | null;
}

const CELEBRATION_TAG_MS = 1800;
// When the dev mockCross fixture is active, freeze the tag in place so
// screenshot tooling can capture it. Stripped from production builds.
const DEV_MOCK_CROSS_PRESENT =
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('mockCross');

// One-row tier indicator placed in the play HUD's top header, sitting in
// the center column between the back button and the End button. Tapping
// opens the full ladder. The strip handles its own celebration treatment
// when a cross is signalled — the dot pulses, the bar flashes, and a short
// "TIER UP" tag overlays the next-tier hint, all inline so the board is
// never obstructed.
export function TierStrip({ points, maxScore, celebrating }: TierStripProps) {
  const [ladderOpen, setLadderOpen] = useState(false);
  const [tagVisible, setTagVisible] = useState(false);

  useEffect(() => {
    if (!celebrating) return;
    setTagVisible(true);
    if (DEV_MOCK_CROSS_PRESENT) return;
    const id = setTimeout(() => setTagVisible(false), CELEBRATION_TAG_MS);
    return () => clearTimeout(id);
  }, [celebrating]);

  if (maxScore == null || maxScore <= 0) return null;

  const current = getZenTier(points, maxScore);
  const next = getNextZenTier(points, maxScore);

  const accent = current?.colorToken ?? next?.tier.colorToken ?? '--ink-faint';

  let fill = 1;
  if (next) {
    const nextScore = next.tier.threshold * maxScore;
    const prevScore = current ? current.threshold * maxScore : 0;
    const span = nextScore - prevScore;
    fill = span > 0 ? Math.min(1, Math.max(0, (points - prevScore) / span)) : 0;
  }

  const atTop = !next;
  const isCelebrating = !!celebrating && tagVisible;

  return (
    <>
      <button
        type="button"
        onClick={() => setLadderOpen(true)}
        aria-label="View tier ladder"
        className="w-full min-w-0 flex items-center gap-2.5 px-3 py-2.5 mb-3 rounded-xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] hover:border-[var(--ink-border)] active:bg-[var(--ink-whisper)] transition-colors duration-150 cursor-pointer relative overflow-hidden"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        {isCelebrating && (
          <span
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              animation: 'zen-tier-strip-flash 1.6s ease',
              background: `var(${celebrating!.colorToken})`,
              opacity: 0,
            }}
          />
        )}
        <TierDot colorToken={accent} dim={!current} celebrating={isCelebrating} />
        <span
          className="text-[10px] uppercase tracking-[0.1em] text-[color:var(--ink-muted)] leading-none shrink-0 font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 700 }}
        >
          {current?.name ?? 'Unranked'}
        </span>
        <div
          className="flex-1 min-w-0 h-[5px] rounded-full bg-[var(--ink-whisper)] overflow-hidden relative"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(fill * 100)}
          aria-label={
            atTop
              ? `Top tier: ${current?.name ?? ''}`
              : `${Math.round(fill * 100)}% toward ${next?.tier.name ?? ''}`
          }
        >
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out"
            style={{
              width: `${fill * 100}%`,
              backgroundColor: `var(${accent})`,
              boxShadow: atTop ? `0 0 8px var(${accent})` : undefined,
            }}
          />
        </div>
        {isCelebrating ? (
          <span
            className="text-[9px] uppercase tracking-[0.14em] leading-none shrink-0 font-[family-name:var(--font-structure)] tabular-nums"
            style={{
              fontWeight: 800,
              color: `var(${celebrating!.colorToken})`,
              animation: DEV_MOCK_CROSS_PRESENT
                ? 'zen-tier-strip-tag-hold 0.4s ease forwards'
                : 'zen-tier-strip-tag 1.6s ease',
            }}
          >
            Tier up
          </span>
        ) : (
          <NextHint
            nextName={next?.tier.name}
            pointsToNext={next?.pointsToNext}
            atTop={atTop}
            topColorToken={current?.colorToken}
          />
        )}
        <ChevronIcon />
      </button>
      <TierLadderSheet
        open={ladderOpen}
        onClose={() => setLadderOpen(false)}
        points={points}
        maxScore={maxScore}
      />
    </>
  );
}

function TierDot({
  colorToken,
  dim,
  celebrating,
}: {
  colorToken: string;
  dim: boolean;
  celebrating: boolean;
}) {
  return (
    <span
      aria-hidden
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{
        backgroundColor: `var(${colorToken})`,
        opacity: dim ? 0.45 : 1,
        animation: celebrating ? 'zen-tier-strip-dot 1.6s ease' : undefined,
      }}
    />
  );
}

function NextHint({
  nextName,
  pointsToNext,
  atTop,
  topColorToken,
}: {
  nextName?: string;
  pointsToNext?: number;
  atTop: boolean;
  topColorToken?: string;
}) {
  if (atTop) {
    return (
      <span
        className="text-[10px] uppercase tracking-[0.12em] leading-none shrink-0 font-[family-name:var(--font-structure)]"
        style={{
          fontWeight: 800,
          color: topColorToken ? `var(${topColorToken})` : 'var(--ink)',
        }}
      >
        Peak
      </span>
    );
  }
  if (!nextName || !pointsToNext) return null;
  return (
    <span
      className="text-[10px] uppercase tracking-[0.06em] leading-none text-[color:var(--ink-soft)] shrink-0 font-[family-name:var(--font-structure)] tabular-nums"
      style={{ fontWeight: 600 }}
    >
      +{pointsToNext} {nextName}
    </span>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="text-[color:var(--ink-faint)] shrink-0"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

// Re-export so consumers can iterate the ladder when needed.
export { ZEN_TIERS };
