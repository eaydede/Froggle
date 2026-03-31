import { useState, useEffect, useRef } from 'react';
import { getDailyInfo, getDailyDatePST } from '../utils/daily';
import { hasPlayedDaily, loadDailyResult } from '../utils/dailyStorage';

interface StartPageProps {
  onSinglePlayer: () => void;
  onDaily: () => void;
  onDailyResults: () => void;
}

const PRIME_TIMEOUT_MS = 3000;

export const StartPage = ({ onSinglePlayer, onDaily, onDailyResults }: StartPageProps) => {
  const dailyInfo = getDailyInfo();
  const todayDate = getDailyDatePST();
  const alreadyPlayed = hasPlayedDaily(todayDate);
  const todayResult = alreadyPlayed ? loadDailyResult(todayDate) : null;
  const [primed, setPrimed] = useState(false);
  const primeTimer = useRef<NodeJS.Timeout | null>(null);

  const longestWord = todayResult?.foundWords.reduce(
    (longest, w) => w.word.length > longest.length ? w.word : longest,
    '',
  ) || '';

  useEffect(() => {
    return () => { if (primeTimer.current) clearTimeout(primeTimer.current); };
  }, []);

  const handleDailyClick = () => {
    if (alreadyPlayed) { onDailyResults(); return; }
    if (primed) {
      setPrimed(false);
      if (primeTimer.current) clearTimeout(primeTimer.current);
      onDaily();
    } else {
      setPrimed(true);
      primeTimer.current = setTimeout(() => setPrimed(false), PRIME_TIMEOUT_MS);
    }
  };

  const clearPrime = () => {
    if (primed) { setPrimed(false); if (primeTimer.current) clearTimeout(primeTimer.current); }
  };

  return (
    <div className="start-screen" onClick={clearPrime}>
      <div className="menu-buttons">
        <button
          onClick={(e) => { e.stopPropagation(); handleDailyClick(); }}
          className={`menu-button daily-button daily-large ${alreadyPlayed ? 'daily-played' : ''} ${primed ? 'daily-primed' : ''}`}
        >
          <span className="daily-number">#{dailyInfo.number}</span>
          <span className="daily-title">
            {primed ? 'Start Daily' : 'Daily Puzzle'}
          </span>
          {alreadyPlayed && <span className="daily-button-status">View Results</span>}
        </button>
        {todayResult && (
          <div className="daily-today-summary">
            <span>{todayResult.wordCount}W</span>
            <span className="daily-today-sep">&middot;</span>
            <span>{todayResult.score}pts</span>
            {longestWord && (
              <>
                <span className="daily-today-sep">&middot;</span>
                <span className="daily-today-longest">{longestWord}</span>
              </>
            )}
          </div>
        )}
        <button onClick={onSinglePlayer} className="menu-button play-button">Play</button>
      </div>
    </div>
  );
};
