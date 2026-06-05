import { useEffect, useRef, useState } from 'react';
import { Game, GameState } from 'models';

/**
 * @param initialElapsedMs Explicit time already elapsed since the play window
 *   opened, for callers that join an in-progress game (a multiplayer
 *   reconnect). Leave at 0 and the countdown resumes from the game's
 *   server-set startedAt instead, so a page refresh continues the round rather
 *   than restarting it. Either way the anchor is read from the wall clock once
 *   and every subsequent tick is monotonic (performance.now()), so an NTP
 *   resync mid-round can't shrink the displayed clock.
 */
export const useTimer = (
  game: Game | null,
  onTimeExpired: () => void,
  initialElapsedMs = 0,
) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  // Monotonic anchor (performance.now() terms) for when the play window
  // started. Set once per in-progress game so an NTP resync mid-round can't
  // spike elapsed time and shrink the displayed clock.
  const localStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (game && game.status === GameState.InProgress) {
      // Don't run timer for unlimited games
      if (game.config.durationSeconds <= 0) {
        setTimeRemaining(0);
        return;
      }

      // Anchor the countdown the first time we see this game in progress.
      // A multiplayer reconnect passes an explicit initialElapsedMs; everyone
      // else derives it from the server's startedAt so a page refresh resumes
      // the existing countdown instead of restarting it. After this one-time
      // read of the wall clock, all subsequent ticks use performance.now()
      // (monotonic), so an NTP resync mid-round (e.g. on Android) can't spike
      // elapsed time and shrink the displayed clock.
      if (localStartRef.current === null) {
        const elapsedMs =
          initialElapsedMs > 0 ? initialElapsedMs : Math.max(0, Date.now() - game.startedAt);
        localStartRef.current = performance.now() - elapsedMs;
      }
      const localStart = localStartRef.current;

      // Set initial value immediately to avoid stale flash
      const elapsed = performance.now() - localStart;
      const initialRemaining = Math.max(0, game.config.durationSeconds * 1000 - elapsed);
      setTimeRemaining(Math.ceil(initialRemaining / 1000));

      const interval = setInterval(() => {
        const elapsed = performance.now() - localStart;
        const remaining = Math.max(0, game.config.durationSeconds * 1000 - elapsed);
        setTimeRemaining(Math.ceil(remaining / 1000));

        if (remaining === 0) {
          clearInterval(interval);
          onTimeExpired();
        }
      }, 100);

      return () => clearInterval(interval);
    } else {
      // Reset local start when game is not in progress
      localStartRef.current = null;
      setTimeRemaining(0);
    }
  }, [game, onTimeExpired]);

  return timeRemaining;
};
