import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGame } from '../../GameContext';
import { GameConfigPage } from './GameConfigPage';
import type { GameConfig } from './types';
import { decodeGameParams } from '../../shared/utils/gameLink';
import {
  fetchDaily,
  fetchFreePlayChallengePreview,
  type FreePlayChallengePreview,
} from '../../shared/api/gameApi';
import { ChallengeConfirmPage } from '../challenge/ChallengeConfirmPage';

export function ConfigRoute({ mode }: { mode: 'freeplay' | 'daily' }) {
  const { game, dailyInfo, cachedDailyResult, authReady, startGame, cancelGame, createGame, sharedSeed, boardCode, handleCodeChange, setBoardCode, lastConfig, setLastConfig, setDailyInfo, setActiveChallengeId } = useGame();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDaily = mode === 'daily';
  const [ready, setReady] = useState(false);
  const [challengePreview, setChallengePreview] = useState<FreePlayChallengePreview | null>(null);
  const initRef = useRef(false);

  // Check for shared game in URL params (computed before the init effect so
  // the effect can use it for the replay-redirect check).
  const sharedGame = useMemo(() => {
    if (isDaily) return null;
    return decodeGameParams(searchParams);
  }, [searchParams, isDaily]);

  const isSharedGame = sharedGame !== null;
  const challengeId = sharedGame?.challengeId;

  // Handle direct navigation: redirect to challenge results if already
  // played, create game session, fetch daily info if needed.
  useEffect(() => {
    if (initRef.current) return;
    // Wait for auth so the challenge preview check goes out with a token —
    // without one the server treats us as a different (anonymous) caller
    // and won't see our prior session.
    if (challengeId && !authReady) return;
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

      if (challengeId) {
        const preview = await fetchFreePlayChallengePreview(challengeId);
        if (preview?.alreadyPlayed) {
          navigate(`/freeplay/challenge/${challengeId}`, { replace: true });
          return;
        }
        // Fall through to render the accept screen instead of the
        // grayed-out free-play config — recipients should see who
        // challenged them before committing.
        if (preview) {
          setChallengePreview(preview);
          setReady(true);
          return;
        }
        // Preview fetch failed (challenge not found, etc.) — fall back
        // to the regular shared-board flow so the user isn't stranded.
      }

      if (!game) {
        await createGame();
      }

      setReady(true);
    };

    init();
  }, [authReady, challengeId]);

  // Don't render until initialization is complete
  if (!ready && (isDaily || !game)) return null;

  // Challenge accept page: shown when a recipient lands via a share link
  // and hasn't played yet. Distinct surface from the regular config flow
  // so the link's purpose is obvious.
  if (challengePreview && sharedGame) {
    return (
      <ChallengeConfirmPage
        ownerDisplayName={challengePreview.ownerDisplayName}
        boardSize={challengePreview.config.boardSize}
        timeLimit={challengePreview.config.timeLimit}
        minWordLength={challengePreview.config.minWordLength}
        playerCount={challengePreview.playerCount}
        onStart={async () => {
          if (!game) await createGame();
          await startGame(
            sharedGame.timer,
            sharedGame.boardSize,
            sharedGame.minWordLength,
            undefined,
            sharedGame.seed,
            sharedGame.challengeId,
          );
          // Remember which challenge this game belongs to so the
          // post-game flow can route the player into the compare view
          // against the originator automatically.
          if (sharedGame.challengeId) setActiveChallengeId(sharedGame.challengeId);
          navigate('/game');
        }}
        onBack={async () => {
          setActiveChallengeId(null);
          await cancelGame();
          navigate('/');
        }}
      />
    );
  }

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
      await startGame(sharedGame.timer, sharedGame.boardSize, sharedGame.minWordLength, undefined, sharedGame.seed, sharedGame.challengeId);
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
    setActiveChallengeId(null);
    await cancelGame();
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
