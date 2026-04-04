import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../GameContext';
import { ResultsPage } from './ResultsPage';

export function ResultsRoute() {
  const { game, results, gameSeed, dailyInfo, setDailyInfo, createGame, cancelGame } = useGame();
  const navigate = useNavigate();

  useEffect(() => {
    if (!results || !game) navigate('/');
  }, [results, game, navigate]);

  if (!results || !game) return null;

  const handlePlayAgain = async () => {
    if (dailyInfo) {
      setDailyInfo(null);
      if (game) await cancelGame();
      navigate('/');
    } else {
      await createGame();
      navigate('/play');
    }
  };

  return <ResultsPage results={results} onPlayAgain={handlePlayAgain} game={game} gameSeed={gameSeed} dailyNumber={dailyInfo?.number} />;
}
