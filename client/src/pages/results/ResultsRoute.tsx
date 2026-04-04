import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../GameContext';
import { ResultsPage } from './ResultsPage';

export function ResultsRoute() {
  const { game, results, gameSeed, dailyInfo, setDailyInfo, createGame, cancelGame } = useGame();
  const navigate = useNavigate();
  const navigatingRef = useRef(false);

  useEffect(() => {
    if ((!results || !game) && !navigatingRef.current) navigate('/');
  }, [results, game, navigate]);

  if (!results || !game) return null;

  const handlePlayAgain = async () => {
    navigatingRef.current = true;
    if (dailyInfo) {
      setDailyInfo(null);
      if (game) await cancelGame();
      navigate('/');
    } else {
      navigate('/play');
      await createGame();
    }
  };

  return <ResultsPage results={results} onPlayAgain={handlePlayAgain} game={game} gameSeed={gameSeed} dailyNumber={dailyInfo?.number} />;
}
