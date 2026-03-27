import { useState } from 'react';
import { Position, Game } from 'models';
import { GameResults } from '../api/gameApi';
import { ResultsBoard } from '../components/ResultsBoard';
import { ResultsWordList } from '../components/ResultsWordList';
import { encodeBoard, formatCode } from '../utils/boardCode';

interface ResultsPageProps {
  results: GameResults | null;
  onPlayAgain: () => void;
  game: Game;
}

export const ResultsPage = ({ results, onPlayAgain, game }: ResultsPageProps) => {
  const [highlightPath, setHighlightPath] = useState<Position[] | null>(null);
  const [boardVisible, setBoardVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!results) {
    return <div className="results-loading">Loading results...</div>;
  }

  const handleShare = () => {
    const code = encodeBoard({
      board: results.board,
      boardSize: game.config.boardSize,
      timeLimit: game.config.durationSeconds,
      minWordLength: game.config.minWordLength,
    });
    const url = `${window.location.origin}/b/${formatCode(code)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback for older browsers
      prompt('Copy this link:', url);
    });
  };

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

      <div className="results-actions">
        <button onClick={onPlayAgain} className="start-button results-play-again">
          Play Again
        </button>
        <button onClick={handleShare} className="share-button">
          {copied ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              Share Board
            </>
          )}
        </button>
      </div>
    </div>
  );
};
