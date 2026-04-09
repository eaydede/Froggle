import { useNavigate } from 'react-router-dom';
import { useGame } from '../../GameContext';
import { LandingPage } from './LandingPage';
import { fetchDaily } from '../../shared/api/gameApi';
import { scoreWord } from 'engine/scoring';
import type { DailyResults } from './types';

export function LandingRoute() {
  const { cachedDaily, cachedDailyResult, dailyResultLoaded, createGame, setDailyInfo, displayName, updateDisplayName } = useGame();
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
    setDailyInfo(info);
    navigate('/daily/results');
  };

  if (!cachedDaily || !dailyResultLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-[400px] text-center">
          <h1 className="text-[1.35rem] tracking-[-0.025em]" style={{ fontFamily: 'var(--font-heading)', fontWeight: 'var(--font-heading-weight)' as any }}>
            Froggle
          </h1>
        </div>
      </div>
    );
  }

  const hasPlayed = cachedDailyResult !== null;

  let dailyResultsData: DailyResults | null = null;
  if (hasPlayed && cachedDailyResult) {
    const words = cachedDailyResult.found_words;
    const longest = words.reduce((best, w) => w.length > best.length ? w : best, '');
    const totalScore = words.reduce((sum, w) => sum + scoreWord(w), 0);
    dailyResultsData = {
      words: words.length,
      points: totalScore,
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
        onDailyClick={hasPlayed ? handleDailyResults : handleDaily}
        onFreePlayClick={handleFreePlay}
        displayName={displayName}
        onDisplayNameChange={updateDisplayName}
      />
    </div>
  );
}
