import { useCallback, useEffect, useRef, useState } from 'react';
import { ZEN_TIERS, type ZenTier, getZenTier } from 'models/zenTiers';

// Window the celebration state lingers after a cross before the hook self-
// clears, in sync with the strip's animation. Bumped during dev fixture
// runs so screenshot tooling can capture the steady state.
const CELEBRATION_WINDOW_MS = 1800;
const DEV_HOLD_FOREVER =
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('mockCross');

// Detects when the player crosses into a new tier and surfaces the just-
// reached tier so the page can render a celebration. The first observation
// for a given session is intentionally a no-op — resuming with an existing
// tier shouldn't fire a celebration on page load. The hook self-clears
// after CELEBRATION_WINDOW_MS so a follow-up cross can fire cleanly.
export function useZenTierCelebration(points: number, maxScore: number | null) {
  const [celebrating, setCelebrating] = useState<ZenTier | null>(null);
  const initialized = useRef(false);
  const lastTierIdx = useRef(-1);

  useEffect(() => {
    if (maxScore == null || maxScore <= 0) return;
    const tier = getZenTier(points, maxScore);
    const idx = tier ? ZEN_TIERS.findIndex((t) => t.id === tier.id) : -1;

    if (!initialized.current) {
      initialized.current = true;
      lastTierIdx.current = idx;
      return;
    }

    if (tier && idx > lastTierIdx.current) {
      setCelebrating(tier);
    }
    lastTierIdx.current = idx;
  }, [points, maxScore]);

  useEffect(() => {
    if (!celebrating) return;
    if (DEV_HOLD_FOREVER) return;
    const id = setTimeout(() => setCelebrating(null), CELEBRATION_WINDOW_MS);
    return () => clearTimeout(id);
  }, [celebrating]);

  const dismiss = useCallback(() => setCelebrating(null), []);

  // Forces the hook into an "already initialized at tierIdx" state so
  // subsequent cross-detection compares against the seeded tier rather than
  // whatever the first observation happened to be. Reserved for dev-only
  // fixture wiring; production code never touches it.
  const seed = useCallback((tierIdx: number) => {
    initialized.current = true;
    lastTierIdx.current = tierIdx;
  }, []);

  return { celebrating, dismiss, seed };
}
