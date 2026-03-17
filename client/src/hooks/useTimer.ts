import { useEffect, useState } from 'react';
import { Game, GameState } from 'models';

export const useTimer = (game: Game | null, onTimeExpired: () => void) => {
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (game && game.status === GameState.InProgress) {
      // Don't run timer for unlimited games
      if (game.config.durationSeconds <= 0) {
        setTimeRemaining(0);
        return;
      }

      const interval = setInterval(() => {
        const elapsed = Date.now() - game.startedAt;
        const remaining = Math.max(0, game.config.durationSeconds * 1000 - elapsed);
        setTimeRemaining(Math.ceil(remaining / 1000));
        
        if (remaining === 0) {
          clearInterval(interval);
          onTimeExpired();
        }
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [game, onTimeExpired]);

  return timeRemaining;
};
