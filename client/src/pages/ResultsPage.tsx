import { useState, useMemo, useRef, useEffect } from 'react';
import { Position, Game } from 'models';
import { GameResults } from '../api/gameApi';
import { ResultsBoard } from '../components/ResultsBoard';
import { ResultsWordList, getScoreColor } from '../components/ResultsWordList';
import { encodeBoard, encodeBoardOnly, formatCode } from '../utils/boardCode';
import { generateShareText } from '../utils/shareResults';
import { useDefinition } from '../hooks/useDefinition';

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
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shareOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [shareOpen]);

  const { definition, loading: definitionLoading } = useDefinition(highlightedWordInfo?.word ?? null);

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

  const canNativeShare = !!navigator.share;

  const getGameUrl = () => {
    const code = encodeBoard({
      board: results.board,
      boardSize: game.config.boardSize,
      timeLimit: game.config.durationSeconds,
      minWordLength: game.config.minWordLength,
    });
    return `${window.location.origin}/g/${formatCode(code)}`;
  };

  const getBoardUrl = () => {
    const code = encodeBoardOnly(results.board, game.config.boardSize);
    return `${window.location.origin}/b/${formatCode(code)}`;
  };

  const getResultsText = () => {
    return generateShareText(results.foundWords, { gameLink: getGameUrl() });
  };

  const copyToClipboard = (text: string, type: 'game' | 'board' | 'results') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    }).catch(() => {
      prompt('Copy:', text);
    });
  };

  const nativeShare = async (text: string) => {
    try {
      await navigator.share({ text });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.error('Share failed:', e);
      }
    }
    setShareOpen(false);
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
                      className={`results-word-square score-tier-${w.score} ${highlightedWordInfo?.word === w.word ? 'square-highlighted' : ''}`}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
          {highlightedWordInfo && (
            <div className="results-definition">
              {definitionLoading ? (
                <div className="results-definition-loading">...</div>
              ) : definition ? (
                <>
                  <div className="results-definition-header">
                    <span className="results-definition-word">{definition.word}</span>
                    {definition.phonetic && (
                      <span className="results-definition-phonetic">{definition.phonetic}</span>
                    )}
                  </div>
                  {definition.meanings.map((meaning, i) => (
                    <div key={i} className="results-definition-meaning">
                      <span className="results-definition-pos">{meaning.partOfSpeech}</span>
                      <ol className="results-definition-list">
                        {meaning.definitions.map((def, j) => (
                          <li key={j}>
                            {def.definition}
                            {def.example && (
                              <span className="results-definition-example">"{def.example}"</span>
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </>
              ) : (
                <div className="results-definition-none">
                  <span className="results-definition-word">{highlightedWordInfo.word.toLowerCase()}</span>
                  <span className="results-definition-unavailable">Definition not available</span>
                </div>
              )}
            </div>
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
        <div className="share-wrapper" ref={shareRef}>
          <button onClick={() => setShareOpen(!shareOpen)} className="share-button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Share
          </button>
          {shareOpen && (
            <div className="share-popover">
              <div className="share-popover-option">
                <div className="share-popover-option-text">
                  <span className="share-popover-option-label">Results</span>
                  <span className="share-popover-option-desc">Emoji score summary</span>
                </div>
                <div className="share-popover-actions">
                  {canNativeShare && (
                    <button
                      className="share-popover-action"
                      onClick={() => nativeShare(getResultsText())}
                      title="Share"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                      </svg>
                    </button>
                  )}
                  <button
                    className="share-popover-action"
                    onClick={() => copyToClipboard(getResultsText(), 'results')}
                    title="Copy"
                  >
                    {copiedType === 'results' ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="share-popover-option">
                <div className="share-popover-option-text">
                  <span className="share-popover-option-label">Game</span>
                  <span className="share-popover-option-desc">Link with board & settings</span>
                </div>
                <div className="share-popover-actions">
                  {canNativeShare && (
                    <button
                      className="share-popover-action"
                      onClick={() => nativeShare(getGameUrl())}
                      title="Share"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                      </svg>
                    </button>
                  )}
                  <button
                    className="share-popover-action"
                    onClick={() => copyToClipboard(getGameUrl(), 'game')}
                    title="Copy"
                  >
                    {copiedType === 'game' ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="share-popover-option">
                <div className="share-popover-option-text">
                  <span className="share-popover-option-label">Board</span>
                  <span className="share-popover-option-desc">Link with board only</span>
                </div>
                <div className="share-popover-actions">
                  {canNativeShare && (
                    <button
                      className="share-popover-action"
                      onClick={() => nativeShare(getBoardUrl())}
                      title="Share"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                      </svg>
                    </button>
                  )}
                  <button
                    className="share-popover-action"
                    onClick={() => copyToClipboard(getBoardUrl(), 'board')}
                    title="Copy"
                  >
                    {copiedType === 'board' ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
