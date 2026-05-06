import { useCallback, useEffect, useRef, useState } from 'react';
import { ZEN_RANKS, type ZenRank, getZenRank } from 'models/zenRanks';

// Window the celebration state lingers after a cross before the hook self-
// clears, in sync with the strip's animation. Bumped during dev fixture
// runs so screenshot tooling can capture the steady state.
const CELEBRATION_WINDOW_MS = 1800;
const DEV_HOLD_FOREVER =
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('mockCross');

// Detects when the player crosses into a new rank and surfaces the just-
// reached rank so the page can render a celebration. The first observation
// for a given session is intentionally a no-op — resuming with an existing
// rank shouldn't fire a celebration on page load. The hook self-clears
// after CELEBRATION_WINDOW_MS so a follow-up cross can fire cleanly.
export function useZenRankCelebration(points: number, maxScore: number | null) {
  const [celebrating, setCelebrating] = useState<ZenRank | null>(null);
  const initialized = useRef(false);
  const lastRankIdx = useRef(-1);

  useEffect(() => {
    if (maxScore == null || maxScore <= 0) return;
    const rank = getZenRank(points, maxScore);
    const idx = rank ? ZEN_RANKS.findIndex((r) => r.id === rank.id) : -1;

    if (!initialized.current) {
      initialized.current = true;
      lastRankIdx.current = idx;
      return;
    }

    if (rank && idx > lastRankIdx.current) {
      setCelebrating(rank);
    }
    lastRankIdx.current = idx;
  }, [points, maxScore]);

  useEffect(() => {
    if (!celebrating) return;
    if (DEV_HOLD_FOREVER) return;
    const id = setTimeout(() => setCelebrating(null), CELEBRATION_WINDOW_MS);
    return () => clearTimeout(id);
  }, [celebrating]);

  const dismiss = useCallback(() => setCelebrating(null), []);

  // Forces the hook into an "already initialized at rankIdx" state so
  // subsequent cross-detection compares against the seeded rank rather than
  // whatever the first observation happened to be. Reserved for dev-only
  // fixture wiring; production code never touches it.
  const seed = useCallback((rankIdx: number) => {
    initialized.current = true;
    lastRankIdx.current = rankIdx;
  }, []);

  return { celebrating, dismiss, seed };
}
