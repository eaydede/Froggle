import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGame } from '../../GameContext';
import { GameConfigPage } from './GameConfigPage';
import type { GameConfig } from './types';
import { decodeGameParams } from '../../shared/utils/gameLink';
import { fetchDaily } from '../../shared/api/gameApi';

export function ConfigRoute({ mode }: { mode: 'freeplay' | 'daily' }) {
  const { dailyInfo, cachedDailyResult, startGame, sharedSeed, boardCode, handleCodeChange, setBoardCode, lastConfig, setLastConfig, setDailyInfo } = useGame();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDaily = mode === 'daily';
  const [ready, setReady] = useState(false);
  const initRef = useRef(false);

  // Handle direct navigation: fetch daily info if needed. The server
  // session is now created lazily by /api/game/start, so the config page
  // no longer pre-allocates one — there's nothing to clean up if the
  // player navigates away before clicking Start.
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      if (isDaily) {
        const info = dailyInfo ?? await fetchDaily();
        // Use cached result from GameContext (already fetched on mount)
        if (cachedDailyResult) {
          setDailyInfo(info);
          navigate('/daily/results', { replace: true });
          return;
        }
        setDailyInfo(info);
      }

      setReady(true);
    };

    init();
  }, []);

  // Check for shared game in URL params
  const sharedGame = useMemo(() => {
    if (isDaily) return null;
    return decodeGameParams(searchParams);
  }, [searchParams, isDaily]);

  const isSharedGame = sharedGame !== null;

  // Daily redirects to /daily/results if the player has already played,
  // so we wait for the init effect to settle before rendering. Free play
  // has no async init step and can render immediately.
  if (isDaily && !ready) return null;

  const dailyDefaults = isDaily && dailyInfo ? {
    boardSize: dailyInfo.config.boardSize as 4 | 5 | 6,
    timer: dailyInfo.config.timeLimit as 60 | 120 | 180 | -1,
    minWordLength: dailyInfo.config.minWordLength as 3 | 4 | 5,
  } : undefined;

  const sharedDefaults = isSharedGame ? {
    boardSize: sharedGame.boardSize as 4 | 5 | 6,
    timer: sharedGame.timer as 60 | 120 | 180 | -1,
    minWordLength: sharedGame.minWordLength as 3 | 4 | 5,
  } : undefined;

  const defaults = isDaily ? dailyDefaults : isSharedGame ? sharedDefaults : lastConfig ?? undefined;

  const handleStart = async (config?: GameConfig) => {
    if (isDaily && dailyInfo) {
      await startGame(dailyInfo.config.timeLimit, dailyInfo.config.boardSize, dailyInfo.config.minWordLength, undefined, dailyInfo.seed);
    } else if (isSharedGame) {
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

  const handleBack = () => {
    setBoardCode('');
    setDailyInfo(null);
    navigate('/');
  };

  const isLocked = isDaily || isSharedGame;
  const title = isDaily ? 'Daily Puzzle' : isSharedGame ? 'Shared Board' : 'Free Play';

  // Key forces remount when defaults change (e.g., daily info loaded after mount)
  const configKey = defaults ? `${defaults.boardSize}-${defaults.timer}-${defaults.minWordLength}` : 'default';

  return (
    <GameConfigPage
      key={configKey}
      title={title}
      subtitle="Choose your settings"
      onBack={handleBack}
      onStart={isLocked ? () => handleStart() : handleStart}
      disabled={isLocked}
      defaultValues={defaults}
      code={isLocked ? undefined : boardCode}
      onCodeChange={isLocked ? undefined : handleCodeChange}
    />
  );
}
