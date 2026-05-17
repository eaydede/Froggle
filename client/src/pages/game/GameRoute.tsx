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
  } = useGame();
  const navigate = useNavigate();
  const navigatingRef = useRef(false);

  // Daily mode dispatches to its own session-backed game state; free play
  // continues to use the in-memory GameController session.
  const isDaily = !!dailyInfo;
  const activeGame = isDaily ? dailyGame : game;
  const activeTime = isDaily ? dailyTimeRemaining : timeRemaining;
  const activeSubmit = isDaily ? handleSubmitDailyWord : handleSubmitWord;
  const activeFinished = isDaily
    ? !!cachedDailyTimedSession?.ended_at
    : !!results;

  useEffect(() => {
    if (!activeGame) {
      navigate('/');
    } else if (
      activeGame.status === GameState.Finished &&
      activeFinished &&
      !navigatingRef.current
    ) {
      navigatingRef.current = true;
      navigate(isDaily ? '/daily/results' : '/results');
    }
  }, [activeGame, activeGame?.status, activeFinished, navigate, isDaily]);

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
