import { getDailyInfo, getDailyDatePST } from '../utils/daily';
import { hasPlayedDaily, loadDailyResult } from '../utils/dailyStorage';

interface StartPageProps {
  onSinglePlayer: () => void;
  onDaily: () => void;
  onDailyResults: () => void;
}

export const StartPage = ({ onSinglePlayer, onDaily, onDailyResults }: StartPageProps) => {
  const dailyInfo = getDailyInfo();
  const todayDate = getDailyDatePST();
  const alreadyPlayed = hasPlayedDaily(todayDate);
  const todayResult = alreadyPlayed ? loadDailyResult(todayDate) : null;

  const longestWord = todayResult?.foundWords.reduce(
    (longest, w) => w.word.length > longest.length ? w.word : longest,
    '',
  ) || '';

  return (
    <div className="start-screen">
      <div className="menu-buttons">
        <button onClick={alreadyPlayed ? onDailyResults : onDaily} className="menu-button daily-button">
          <span className="daily-button-label">Daily #{dailyInfo.number}</span>
          {alreadyPlayed ? (
            <span className="daily-button-status">View Results</span>
          ) : (
            <span className="daily-button-status">Play</span>
          )}
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

        <button onClick={onSinglePlayer} className="menu-button">
          Play
        </button>
      </div>
    </div>
  );
};
