import { useState, useEffect, useRef } from 'react';
import { Game } from 'models';

interface TimerBarProps {
  game: Game;
}

export const TimerBar = ({ game }: TimerBarProps) => {
  const [remainingPercentage, setRemainingPercentage] = useState(100);
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
      setRemainingPercentage(Math.min(100, Math.max(0, (remaining / totalDuration) * 100)));
    };

    updateTimerBar();
    const interval = setInterval(updateTimerBar, 100);
    return () => clearInterval(interval);
  }, [game.config.durationSeconds]);

  const isUnlimited = game.config.durationSeconds <= 0;

  return (
    <div className="h-2 bg-[#e0e0e0] rounded overflow-hidden w-full min-w-[100px]">
      <div
        className={`h-full rounded transition-[width] duration-100 ease-linear ${
          isUnlimited ? 'bg-[#9e9e9e]' : 'bg-[hsl(122,32%,55%)]'
        }`}
        style={{ width: `${remainingPercentage}%` }}
      />
    </div>
  );
};
