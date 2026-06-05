import { useEffect, useRef, useState } from 'react';
import { Game, GameState } from 'models';

/**
 * @param initialElapsedMs Time already elapsed since the play window opened,
 *   for callers that join an in-progress game (a multiplayer reconnect). Leave
 *   at 0 for a locally started game: the countdown then anchors to the first
 *   local render, never to the server's wall clock, so a device whose clock is
 *   skewed ahead of the server doesn't lose that skew (or expire instantly).
 *   Only pass a value derived from a clock you trust to be roughly server-
 *   synced; otherwise the skew leaks straight into this offset.
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
      // performance.now() is monotonic, so the running clock is immune to wall-
      // clock jumps; the only wall-clock input is the caller-supplied
      // initialElapsedMs (0 for a fresh local start), which back-dates the
      // anchor so a reconnecting player resumes mid-countdown instead of
      // restarting from full.
      if (localStartRef.current === null) {
        localStartRef.current = performance.now() - Math.max(0, initialElapsedMs);
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
