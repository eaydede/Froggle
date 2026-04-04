import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameState } from 'models';
import { useGame } from '../../GameContext';
import { GamePage } from './GamePage';

export function GameRoute() {
  const { game, words, results, timeRemaining, feedback, handleSubmitWord, cancelGame, endGame, muted, toggleMute, dailyInfo } = useGame();
  const navigate = useNavigate();
  const navigatingRef = useRef(false);

  useEffect(() => {
    if (!game) {
      navigate('/');
    } else if (game.status === GameState.Finished && results && !navigatingRef.current) {
      // Game finished (timer expired or server-side end) and results are ready
      navigatingRef.current = true;
      navigate('/results');
    }
  }, [game, game?.status, results, navigate]);

  if (!game || game.status !== GameState.InProgress) return null;

  const handleEndGame = async () => {
    navigatingRef.current = true;
    await endGame();
    navigate('/results');
  };

  return (
    <GamePage
      game={game}
      words={words}
      timeRemaining={timeRemaining}
      feedback={feedback}
      onSubmitWord={handleSubmitWord}
      onCancelGame={() => { navigatingRef.current = true; cancelGame(); navigate('/'); }}
      onEndGame={handleEndGame}
      muted={muted}
      onToggleMute={toggleMute}
      dailyNumber={dailyInfo?.number}
    />
  );
}
