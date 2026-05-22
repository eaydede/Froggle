import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameState } from 'models';
import { useGame } from '../../GameContext';
import { GamePage } from './GamePage';

export function GameRoute() {
  const {
    game,
    words,
    results,
    timeRemaining,
    feedback,
    handleSubmitWord,
    cancelGame,
    endGame,
    muted,
    toggleMute,
    dailyInfo,
    cachedDailyTimedSession,
    dailyGame,
    dailyTimeRemaining,
    handleSubmitDailyWord,
    endDailyGame,
    freePlayHydrated,
  } = useGame();
  const navigate = useNavigate();
  const navigatingRef = useRef(false);

  // Daily mode dispatches to its own session-backed game state; free play
  // is also DB-backed now via /api/game/active, with GameProvider
  // hydrating React state at mount.
  const isDaily = !!dailyInfo;
  const activeGame = isDaily ? dailyGame : game;
  const activeTime = isDaily ? dailyTimeRemaining : timeRemaining;
  const activeSubmit = isDaily ? handleSubmitDailyWord : handleSubmitWord;
  const activeFinished = isDaily
    ? !!cachedDailyTimedSession?.ended_at
    : !!results;

  useEffect(() => {
    // Free-play null-game might just mean hydration hasn't settled yet
    // after a mid-game refresh. Hold the redirect until the probe is
    // done so the player isn't bounced to landing on every reload.
    if (!activeGame) {
      if (isDaily || freePlayHydrated) navigate('/');
    } else if (
      activeGame.status === GameState.Finished &&
      activeFinished &&
      !navigatingRef.current
    ) {
      navigatingRef.current = true;
      navigate(isDaily ? '/daily/results' : '/results');
    }
  }, [activeGame, activeGame?.status, activeFinished, navigate, isDaily, freePlayHydrated]);

  if (!activeGame || activeGame.status !== GameState.InProgress) return null;

  const handleEndGame = async () => {
    navigatingRef.current = true;
    if (isDaily) {
      await endDailyGame();
    } else {
      await endGame();
    }
    navigate(isDaily ? '/daily/results' : '/results');
  };

  const handleCancel = () => {
    navigatingRef.current = true;
    if (isDaily) {
      // Daily sessions can't be cancelled — the server enforces the time
      // limit independently. Treat "X" as "end and view result".
      endDailyGame().finally(() => navigate('/daily/results'));
    } else {
      cancelGame();
      navigate('/');
    }
  };

  return (
    <GamePage
      game={activeGame}
      words={isDaily ? [] : words}
      timeRemaining={activeTime}
      feedback={feedback}
      onSubmitWord={activeSubmit}
      onCancelGame={handleCancel}
      onEndGame={handleEndGame}
      muted={muted}
      onToggleMute={toggleMute}
      dailyNumber={dailyInfo?.number}
    />
  );
}
