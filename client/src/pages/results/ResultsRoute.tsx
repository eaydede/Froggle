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

  // Back skips the game page since navigating back into an in-progress
  // game doesn't make sense: go to the freeplay config, or to the daily
  // stats page if this was a daily.
  const handleBack = async () => {
    navigatingRef.current = true;
    if (dailyInfo) {
      setDailyInfo(null);
      if (game) await cancelGame();
      navigate('/daily');
    } else {
      if (game) await cancelGame();
      navigate('/play');
    }
  };

  return <ResultsPage results={results} onPlayAgain={handlePlayAgain} onBack={handleBack} game={game} gameSeed={gameSeed} dailyNumber={dailyInfo?.number} />;
}
