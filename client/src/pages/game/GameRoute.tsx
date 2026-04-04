import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameState } from 'models';
import { useGame } from '../../GameContext';
import { GamePage } from './GamePage';

export function GameRoute() {
  const { game, words, timeRemaining, feedback, handleSubmitWord, cancelGame, endGame, muted, toggleMute, dailyInfo } = useGame();
  const navigate = useNavigate();

  useEffect(() => {
    if (!game || game.status !== GameState.InProgress) {
      navigate(game?.status === GameState.Finished ? '/results' : '/');
    }
  }, [game, game?.status, navigate]);

  if (!game || game.status !== GameState.InProgress) return null;

  const handleEndGame = async () => {
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
      onCancelGame={() => { cancelGame(); navigate('/'); }}
      onEndGame={handleEndGame}
      muted={muted}
      onToggleMute={toggleMute}
      dailyNumber={dailyInfo?.number}
    />
  );
}
