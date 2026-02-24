import { useEffect, useState } from 'react';
import { Game, GameStatus } from 'models';

export const useTimer = (game: Game | null, onTimeExpired: () => void) => {
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (game && game.status === GameStatus.InProgress) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - game.startedAt;
        const remaining = Math.max(0, game.durationSeconds * 1000 - elapsed);
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
