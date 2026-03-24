import { useState } from 'react';
import { Position } from 'models';
import { GameResults } from '../api/gameApi';
import { ResultsBoard } from '../components/ResultsBoard';
import { ResultsWordList } from '../components/ResultsWordList';

interface ResultsPageProps {
  results: GameResults | null;
  onPlayAgain: () => void;
}

export const ResultsPage = ({ results, onPlayAgain }: ResultsPageProps) => {
  const [highlightPath, setHighlightPath] = useState<Position[] | null>(null);
  const [boardVisible, setBoardVisible] = useState(false);

  if (!results) {
    return <div className="results-loading">Loading results...</div>;
  }

  return (
    <div className="results-page">
      <div className="results-board-toggle-mobile">
        <button
          className="results-section-toggle"
          onClick={() => setBoardVisible(!boardVisible)}
        >
          <span>{boardVisible ? '▾ Hide Board' : '▸ Show Board'}</span>
        </button>
      </div>

      <div className="results-content">
        <div className={`results-board-section ${boardVisible ? 'results-board-visible' : ''}`}>
          <ResultsBoard board={results.board} highlightPath={highlightPath} />
        </div>
        <div className="results-list-section">
          <ResultsWordList
            foundWords={results.foundWords}
            missedWords={results.missedWords}
            onHoverWord={setHighlightPath}
          />
        </div>
      </div>

      <button onClick={onPlayAgain} className="start-button results-play-again">
        Play Again
      </button>
    </div>
  );
};
