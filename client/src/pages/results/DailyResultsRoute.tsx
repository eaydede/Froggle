import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameState } from 'models';
import { useGame } from '../../GameContext';
import { loadDailyResult } from '../../shared/utils/dailyStorage';
import { ResultsPage } from './ResultsPage';

export function DailyResultsRoute() {
  const { dailyInfo, setDailyInfo, cancelGame, game } = useGame();
  const navigate = useNavigate();

  const savedResult = dailyInfo ? loadDailyResult(dailyInfo.date) : null;

  useEffect(() => {
    if (!dailyInfo || !savedResult) navigate('/');
  }, [dailyInfo, savedResult, navigate]);

  if (!dailyInfo || !savedResult) return null;

  const handlePlayAgain = async () => {
    setDailyInfo(null);
    if (game) await cancelGame();
    navigate('/');
  };

  return (
    <ResultsPage
      results={{
        board: savedResult.board,
        foundWords: savedResult.foundWords,
        missedWords: savedResult.missedWords,
      }}
      onPlayAgain={handlePlayAgain}
      game={{
        board: savedResult.board,
        startedAt: 0,
        status: GameState.Finished,
        config: {
          durationSeconds: dailyInfo.config.timeLimit,
          boardSize: dailyInfo.config.boardSize,
          minWordLength: dailyInfo.config.minWordLength,
        },
      }}
      gameSeed={dailyInfo.seed}
      dailyNumber={dailyInfo.number}
    />
  );
}
