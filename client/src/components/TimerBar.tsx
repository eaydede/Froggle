import { useState, useEffect } from 'react';
import { Game } from 'models';

interface TimerBarProps {
  game: Game;
}

export const TimerBar = ({ game }: TimerBarProps) => {
  const [remainingPercentage, setRemainingPercentage] = useState(100);

  useEffect(() => {
    if (game.durationSeconds <= 0) {
      setRemainingPercentage(100);
      return;
    }

    const updateTimerBar = () => {
      const elapsed = Date.now() - game.startedAt;
      const totalDuration = game.durationSeconds * 1000;
      const remaining = Math.max(0, totalDuration - elapsed);
      const percentage = (remaining / totalDuration) * 100;
      setRemainingPercentage(Math.min(100, Math.max(0, percentage)));
    };

    // Initial update
    updateTimerBar();

    // Update every 100ms for smooth animation
    const interval = setInterval(updateTimerBar, 100);

    return () => clearInterval(interval);
  }, [game.startedAt, game.durationSeconds]);

  // Don't render if unlimited time
  if (game.durationSeconds <= 0) {
    return null;
  }

  return (
    <div className="timer-bar-container">
      <div 
        className="timer-bar-fill" 
        style={{ width: `${remainingPercentage}%` }}
      />
    </div>
  );
};
