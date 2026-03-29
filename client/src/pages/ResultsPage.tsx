import { useState, useMemo } from 'react';
import { Position, Game } from 'models';
import { GameResults } from '../api/gameApi';
import { ResultsBoard } from '../components/ResultsBoard';
import { ResultsWordList, getScoreColor } from '../components/ResultsWordList';
import { encodeBoard, encodeBoardOnly, formatCode } from '../utils/boardCode';
import { generateShareText } from '../utils/shareResults';

interface ResultsPageProps {
  results: GameResults | null;
  onPlayAgain: () => void;
  game: Game;
}

export const ResultsPage = ({ results, onPlayAgain, game }: ResultsPageProps) => {
  const [highlightPath, setHighlightPath] = useState<Position[] | null>(null);
  const [highlightedWordInfo, setHighlightedWordInfo] = useState<{ word: string; score: number } | null>(null);
  const [boardMinimized, setBoardMinimized] = useState(true);
  const [copiedType, setCopiedType] = useState<'game' | 'board' | 'results' | null>(null);

  const scoreBreakdown = useMemo(() => {
    if (!results) return [];
    const tiers: Record<number, number> = {};
    for (const w of results.foundWords) {
      tiers[w.score] = (tiers[w.score] || 0) + w.score;
    }
    return Object.entries(tiers)
      .map(([score, total]) => ({ score: Number(score), total }))
      .sort((a, b) => a.score - b.score);
  }, [results]);

  const totalScore = results?.foundWords.reduce((sum, w) => sum + w.score, 0) || 0;

  // Sort found words by score ascending to match the line graph order
  const sortedFoundWords = useMemo(() => {
    if (!results) return [];
    return [...results.foundWords].sort((a, b) => a.score - b.score);
  }, [results]);

  if (!results) {
    return <div className="results-loading">Loading results...</div>;
  }

  const handleShareGame = () => {
    const code = encodeBoard({
      board: results.board,
      boardSize: game.config.boardSize,
      timeLimit: game.config.durationSeconds,
      minWordLength: game.config.minWordLength,
    });
    const url = `${window.location.origin}/g/${formatCode(code)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedType('game');
      setTimeout(() => setCopiedType(null), 2000);
    }).catch(() => {
      prompt('Copy this link:', url);
    });
  };

  const handleShareBoard = () => {
    const code = encodeBoardOnly(results.board, game.config.boardSize);
    const url = `${window.location.origin}/b/${formatCode(code)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedType('board');
      setTimeout(() => setCopiedType(null), 2000);
    }).catch(() => {
      prompt('Copy this link:', url);
    });
  };

  const handleShareResults = () => {
    const gameCode = encodeBoard({
      board: results.board,
      boardSize: game.config.boardSize,
      timeLimit: game.config.durationSeconds,
      minWordLength: game.config.minWordLength,
    });
    const gameLink = `${window.location.origin}/g/${formatCode(gameCode)}`;
    const text = generateShareText(results.foundWords, { gameLink });
    navigator.clipboard.writeText(text).then(() => {
      setCopiedType('results');
      setTimeout(() => setCopiedType(null), 2000);
    }).catch(() => {
      prompt('Copy your results:', text);
    });
  };

  return (
    <div className={`results-page ${boardMinimized ? 'results-minimized' : 'results-maximized'}`}>
      <div className="results-content">
        <div className="results-board-section">
          <div
            className="results-board-wrapper"
            onClick={() => setBoardMinimized(!boardMinimized)}
            style={{ cursor: 'pointer' }}
          >
            <ResultsBoard board={results.board} highlightPath={highlightPath} />
          </div>
          {totalScore > 0 && (
            <>
              <div className="results-visual-row">
                <span className="results-visual-label">P:</span>
                <div className="results-score-bar">
                  {scoreBreakdown.map(({ score, total }) => (
                    <div
                      key={score}
                      className="results-score-bar-segment"
                      style={{
                        width: `${(total / totalScore) * 100}%`,
                        backgroundColor: getScoreColor(score),
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="results-visual-row">
                <span className="results-visual-label">W:</span>
                <div className="results-word-squares">
                  {sortedFoundWords.map((w, i) => (
                    <div
                      key={i}
                      className={`results-word-square ${highlightedWordInfo?.word === w.word ? 'square-highlighted' : ''}`}
                      style={{ backgroundColor: getScoreColor(w.score) }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="results-list-section">
          <ResultsWordList
            foundWords={results.foundWords}
            missedWords={results.missedWords}
            onHoverWord={setHighlightPath}
            onWordSelect={setHighlightedWordInfo}
            compact={boardMinimized}
          />
        </div>
      </div>

      <div className="results-actions">
        <button onClick={onPlayAgain} className="start-button results-play-again">
          Play Again
        </button>
        <div className="share-buttons">
          <button onClick={handleShareResults} className="share-button">
            {copiedType === 'results' ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Share Results
              </>
            )}
          </button>
          <button onClick={handleShareGame} className="share-button">
            {copiedType === 'game' ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Share Game
              </>
            )}
          </button>
          <button onClick={handleShareBoard} className="share-button">
            {copiedType === 'board' ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    </div>
  );
};
