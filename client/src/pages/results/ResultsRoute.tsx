import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGame } from '../../GameContext';
import { ResultsPage } from './ResultsPage';
import { getResultsFixture } from './__fixtures__';

export function ResultsRoute() {
  const { game, results, gameSeed, dailyInfo, setDailyInfo, createGame, cancelGame } = useGame();
  const navigate = useNavigate();
  const navigatingRef = useRef(false);
  const [searchParams] = useSearchParams();

  // Dev-only fixture injection — `?mock=default` bypasses the GameContext
  // requirement so visual-regression work can render the page without
  // playing a game. Stripped from production bundles.
  const mockFixture = import.meta.env.DEV
    ? getResultsFixture(searchParams.get('mock'))
    : null;

  const effectiveResults = mockFixture?.results ?? results;
  const effectiveGame = mockFixture?.game ?? game;

  useEffect(() => {
    if (mockFixture) return;
    if ((!results || !game) && !navigatingRef.current) navigate('/');
  }, [results, game, navigate, mockFixture]);

  if (!effectiveResults || !effectiveGame) return null;

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

  // Close bails to the freeplay config (or the daily confirm page if this
  // was a daily). Skips /game since navigating back into an in-progress
  // game doesn't make sense.
  const handleClose = async () => {
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

  return (
    <ResultsPage
      results={effectiveResults}
      game={effectiveGame}
      gameSeed={gameSeed}
      onClose={handleClose}
      onPlayAgain={handlePlayAgain}
      daily={mockFixture?.daily}
    />
  );
}
