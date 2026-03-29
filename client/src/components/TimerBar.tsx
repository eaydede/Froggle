import { useState, useEffect, useRef } from 'react';
import { Game } from 'models';

interface TimerBarProps {
  game: Game;
}

export const TimerBar = ({ game }: TimerBarProps) => {
  const [remainingPercentage, setRemainingPercentage] = useState(100);
  // Record local client time when the bar first mounts for this game, to avoid
  // clock-skew issues on Android browsers where device clocks run ahead of the server.
  // Use performance.now() (monotonic) to prevent NTP sync jumps from affecting the bar.
  const localStartRef = useRef<number>(performance.now());

  useEffect(() => {
    if (game.config.durationSeconds <= 0) {
      setRemainingPercentage(100);
      return;
    }

    const localStart = localStartRef.current;

    const updateTimerBar = () => {
      const elapsed = performance.now() - localStart;
      const totalDuration = game.config.durationSeconds * 1000;
      const remaining = Math.max(0, totalDuration - elapsed);
      const percentage = (remaining / totalDuration) * 100;
      setRemainingPercentage(Math.min(100, Math.max(0, percentage)));
    };

    // Initial update
    updateTimerBar();

    // Update every 100ms for smooth animation
    const interval = setInterval(updateTimerBar, 100);

    return () => clearInterval(interval);
  }, [game.config.durationSeconds]);

  const isUnlimited = game.config.durationSeconds <= 0;

  return (
    <div className="timer-bar-container">
      <div 
        className={isUnlimited ? "timer-bar-fill-unlimited" : "timer-bar-fill"}
        style={{ width: `${remainingPercentage}%` }}
      />
    </div>
  );
};
