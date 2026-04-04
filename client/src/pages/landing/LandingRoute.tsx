import { useNavigate } from 'react-router-dom';
import { useGame } from '../../GameContext';
import { LandingPage } from './LandingPage';
import { fetchDaily } from '../../shared/api/gameApi';
import { loadDailyResult, hasPlayedDaily, clearDailyResult } from '../../shared/utils/dailyStorage';
import type { DailyResults } from './types';

export function LandingRoute() {
  const { cachedDaily, createGame, setDailyInfo } = useGame();
  const navigate = useNavigate();

  const handleFreePlay = async () => {
    setDailyInfo(null);
    await createGame();
    navigate('/play');
  };

  const handleDaily = async () => {
    const info = await fetchDaily();
    setDailyInfo(info);
    await createGame();
    navigate('/daily');
  };

  const handleDailyResults = async () => {
    const info = await fetchDaily();
    const savedResult = loadDailyResult(info.date);

    if (savedResult) {
      const savedFlat = savedResult.board.flat().join(',');
      const expectedFlat = info.board.flat().join(',');
      if (savedFlat !== expectedFlat) {
        clearDailyResult(info.date);
        setDailyInfo(info);
        await createGame();
        navigate('/daily');
        return;
      }
    }

    setDailyInfo(info);
    navigate('/daily/results');
  };

  if (!cachedDaily) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-[400px] text-center">
          <h1 className="text-[1.35rem] tracking-[-0.025em]" style={{ fontFamily: "'Merriweather', Georgia, serif", fontWeight: 900 }}>
            Froggle
          </h1>
        </div>
      </div>
    );
  }

  const todayResult = hasPlayedDaily(cachedDaily.date) ? loadDailyResult(cachedDaily.date) : null;

  let dailyResultsData: DailyResults | null = null;
  if (todayResult) {
    const longest = todayResult.foundWords.reduce(
      (best, w) => w.word.length > best.length ? w.word : best, ''
    );
    dailyResultsData = {
      words: todayResult.wordCount,
      points: todayResult.score,
      longestWord: longest,
    };
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <LandingPage
        dailyConfig={{
          puzzleNumber: cachedDaily.number,
          boardSize: cachedDaily.config.boardSize,
          timer: cachedDaily.config.timeLimit,
          minWordLength: cachedDaily.config.minWordLength,
        }}
        dailyResults={dailyResultsData}
        onDailyClick={todayResult ? handleDailyResults : handleDaily}
        onFreePlayClick={handleFreePlay}
      />
    </div>
  );
}
