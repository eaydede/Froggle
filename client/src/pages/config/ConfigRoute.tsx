import { useNavigate } from 'react-router-dom';
import { useGame } from '../../GameContext';
import { GameConfigPage } from './GameConfigPage';
import type { GameConfig } from './types';

export function ConfigRoute({ mode }: { mode: 'freeplay' | 'daily' }) {
  const { dailyInfo, startGame, cancelGame, sharedSeed, boardCode, handleCodeChange, setBoardCode, lastConfig, setLastConfig, setDailyInfo } = useGame();
  const navigate = useNavigate();
  const isDaily = mode === 'daily';

  const dailyDefaults = isDaily && dailyInfo ? {
    boardSize: dailyInfo.config.boardSize as 4 | 5 | 6,
    timer: dailyInfo.config.timeLimit as 60 | 120 | -1,
    minWordLength: dailyInfo.config.minWordLength as 3 | 4 | 5,
  } : undefined;

  const handleStart = async (config?: GameConfig) => {
    if (isDaily && dailyInfo) {
      await startGame(dailyInfo.config.timeLimit, dailyInfo.config.boardSize, dailyInfo.config.minWordLength, undefined, dailyInfo.seed);
    } else if (config) {
      setLastConfig(config);
      const effectiveBoardSize = sharedSeed ? sharedSeed.boardSize : config.boardSize;
      const seed = sharedSeed?.seed;
      await startGame(config.timer, effectiveBoardSize, config.minWordLength, undefined, seed);
      setBoardCode('');
      handleCodeChange('');
    }
    navigate('/game');
  };

  const handleBack = async () => {
    setBoardCode('');
    setDailyInfo(null);
    await cancelGame();
    navigate('/');
  };

  return (
    <div className="flex flex-1 items-center justify-center">
      <GameConfigPage
        title={isDaily ? 'Daily Puzzle' : 'Free Play'}
        subtitle="Choose your settings"
        card={false}
        onBack={handleBack}
        onStart={isDaily ? () => handleStart() : handleStart}
        disabled={isDaily}
        defaultValues={isDaily ? dailyDefaults : lastConfig ?? undefined}
        code={isDaily ? undefined : boardCode}
        onCodeChange={isDaily ? undefined : handleCodeChange}
      />
    </div>
  );
}
