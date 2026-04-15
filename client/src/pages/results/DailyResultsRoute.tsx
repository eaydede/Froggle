import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameState } from 'models';
import { useGame } from '../../GameContext';
import { fetchDailyResult } from '../../shared/api/gameApi';
import { scoreWord } from 'engine/scoring';
import { ResultsPage } from './ResultsPage';

export function DailyResultsRoute() {
  const { dailyInfo, setDailyInfo, cancelGame, game } = useGame();
  const navigate = useNavigate();
  const [serverResult, setServerResult] = useState<{ found_words: any[]; board: string[][] } | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!dailyInfo || fetchedRef.current) {
      if (!dailyInfo) navigate('/');
      return;
    }
    fetchedRef.current = true;

    fetchDailyResult(dailyInfo.date)
      .then((result) => {
        if (result) {
          setServerResult(result);
        } else {
          navigate('/');
        }
        setLoading(false);
      })
      .catch(() => {
        navigate('/');
        setLoading(false);
      });
  }, [dailyInfo, navigate]);

  if (loading || !dailyInfo || !serverResult) return null;

  const handlePlayAgain = async () => {
    setDailyInfo(null);
    if (game) await cancelGame();
    navigate('/');
  };

  const handleBack = () => navigate('/daily');

  return (
    <ResultsPage
      results={{
        board: serverResult.board,
        foundWords: serverResult.found_words.map(word => ({
          word,
          path: [],
          score: scoreWord(word),
        })),
        missedWords: [],
      }}
      onPlayAgain={handlePlayAgain}
      onBack={handleBack}
      game={{
        board: serverResult.board,
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
