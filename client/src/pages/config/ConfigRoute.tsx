import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GameState } from 'models';
import { useGame } from '../../GameContext';
import { GameConfigPage } from './GameConfigPage';
import type { GameConfig } from './types';
import { decodeGameParams } from '../../shared/utils/gameLink';
import {
  fetchFreePlayChallengePreview,
  type FreePlayChallengePreview,
} from '../../shared/api/gameApi';
import { ChallengeConfirmPage } from '../challenge/ChallengeConfirmPage';

export function ConfigRoute() {
  const {
    game,
    authReady,
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
    setActiveChallengeId,
  } = useGame();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [ready, setReady] = useState(false);
  const [challengePreview, setChallengePreview] = useState<FreePlayChallengePreview | null>(null);
  const initRef = useRef(false);

  // Decode shared-game params up front so the init effect can branch on
  // whether this is a challenge link.
  const sharedGame = useMemo(() => decodeGameParams(searchParams), [searchParams]);
  const isSharedGame = sharedGame !== null;
  const challengeId = sharedGame?.challengeId;

  // GameProvider hydrates an in-progress free-play row at mount; if one
  // resumed, send the player back into /game instead of dropping them on
  // the config screen for a game that's already underway. The Finished
  // case is intentionally left to fall through — the player needs a
  // start affordance to begin a fresh game once their old one's done.
  useEffect(() => {
    if (game?.status === GameState.InProgress) {
      navigate('/game', { replace: true });
    }
  }, [game?.status, navigate]);

  useEffect(() => {
    if (initRef.current) return;
    // Wait for auth so the challenge preview check goes out with a token —
    // without one the server treats us as a different (anonymous) caller
    // and won't see our prior session.
    if (challengeId && !authReady) return;
    initRef.current = true;

    const init = async () => {
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

      if (!game) await createGame();
      setReady(true);
    };

    init();
  }, [authReady, challengeId]);

  if (!ready && !game) return null;

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

  const sharedDefaults = isSharedGame ? {
    boardSize: sharedGame.boardSize as 4 | 5 | 6,
    timer: sharedGame.timer as 60 | 120 | 180 | -1,
    minWordLength: sharedGame.minWordLength as 3 | 4 | 5,
  } : undefined;

  const defaults = isSharedGame ? sharedDefaults : lastConfig ?? undefined;

  const handleStart = async (config?: GameConfig) => {
    if (isSharedGame) {
      await startGame(
        sharedGame.timer,
        sharedGame.boardSize,
        sharedGame.minWordLength,
        undefined,
        sharedGame.seed,
        sharedGame.challengeId,
      );
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
