import { useEffect, useRef, useState } from 'react';
import { Game, GameState } from 'models';

export const useTimer = (game: Game | null, onTimeExpired: () => void) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  // Track the local client timestamp when the game was first seen as InProgress.
  // Using the server's startedAt directly causes the timer to run fast on devices
  // (e.g. Android browsers) whose clocks are ahead of the server clock.
  const localStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (game && game.status === GameState.InProgress) {
      // Don't run timer for unlimited games
      if (game.config.durationSeconds <= 0) {
        setTimeRemaining(0);
        return;
      }

      // Record a client-local start time the first time we see this game in progress.
      if (localStartRef.current === null) {
        localStartRef.current = Date.now();
      }
      const localStart = localStartRef.current;

      // Set initial value immediately to avoid stale flash
      const elapsed = Date.now() - localStart;
      const initialRemaining = Math.max(0, game.config.durationSeconds * 1000 - elapsed);
      setTimeRemaining(Math.ceil(initialRemaining / 1000));

      const interval = setInterval(() => {
        const elapsed = Date.now() - localStart;
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
