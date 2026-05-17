import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGame } from '../../GameContext';
import { GameConfigPage } from './GameConfigPage';
import type { GameConfig } from './types';
import { decodeGameParams } from '../../shared/utils/gameLink';

export function ConfigRoute() {
  const {
    game,
    startGame,
    cancelGame,
    createGame,
    sharedSeed,
    boardCode,
    handleCodeChange,
    setBoardCode,
    lastConfig,
    setLastConfig,
    setDailyInfo,
  } = useGame();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [ready, setReady] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    (async () => {
      if (!game) await createGame();
      setReady(true);
    })();
  }, []);

  const sharedGame = useMemo(() => decodeGameParams(searchParams), [searchParams]);
  const isSharedGame = sharedGame !== null;

  if (!ready && !game) return null;

  const sharedDefaults = isSharedGame ? {
    boardSize: sharedGame.boardSize as 4 | 5 | 6,
    timer: sharedGame.timer as 60 | 120 | 180 | -1,
    minWordLength: sharedGame.minWordLength as 3 | 4 | 5,
  } : undefined;

  const defaults = isSharedGame ? sharedDefaults : lastConfig ?? undefined;

  const handleStart = async (config?: GameConfig) => {
    if (isSharedGame) {
      await startGame(sharedGame.timer, sharedGame.boardSize, sharedGame.minWordLength, undefined, sharedGame.seed);
    } else if (config) {
      const effectiveBoardSize = sharedSeed ? sharedSeed.boardSize : config.boardSize;
      const seed = sharedSeed?.seed;
      await startGame(config.timer, effectiveBoardSize, config.minWordLength, undefined, seed);
      setBoardCode('');
      handleCodeChange('');
      setLastConfig(config);
    }
    navigate('/game');
  };

  const handleBack = async () => {
    setBoardCode('');
    setDailyInfo(null);
    await cancelGame();
    navigate('/');
  };

  const title = isSharedGame ? 'Shared Board' : 'Free Play';

  const configKey = defaults ? `${defaults.boardSize}-${defaults.timer}-${defaults.minWordLength}` : 'default';

  return (
    <GameConfigPage
      key={configKey}
      title={title}
      subtitle="Choose your settings"
      onBack={handleBack}
      onStart={isSharedGame ? () => handleStart() : handleStart}
      disabled={isSharedGame}
      defaultValues={defaults}
      code={isSharedGame ? undefined : boardCode}
      onCodeChange={isSharedGame ? undefined : handleCodeChange}
    />
  );
}
