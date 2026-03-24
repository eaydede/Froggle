import { useState } from 'react';
import { Position } from 'models';
import { ScoredWord } from '../api/gameApi';

interface ResultsWordListProps {
  foundWords: ScoredWord[];
  missedWords: ScoredWord[];
  onHoverWord: (path: Position[] | null) => void;
}

const findRelatedMissedWords = (foundWord: ScoredWord, missedWords: ScoredWord[]): ScoredWord[] => {
  const foundLower = foundWord.word.toLowerCase();
  return missedWords.filter(missed => {
    const missedLower = missed.word.toLowerCase();
    return missedLower.startsWith(foundLower) || foundLower.startsWith(missedLower);
  });
};

export const ResultsWordList = ({ foundWords, missedWords, onHoverWord }: ResultsWordListProps) => {
  const [expandedWord, setExpandedWord] = useState<string | null>(null);
  const [missedExpanded, setMissedExpanded] = useState(false);

  const totalScore = foundWords.reduce((sum, w) => sum + w.score, 0);

  const toggleExpanded = (word: string) => {
    setExpandedWord(prev => prev === word ? null : word);
  };

  return (
    <div className="results-word-list">
      <div className="results-summary">
        <span className="results-summary-count">{foundWords.length} word{foundWords.length !== 1 ? 's' : ''} found</span>
        <span className="results-summary-score">{totalScore} pts</span>
      </div>

      <div className="results-found-words">
        {foundWords.map((w) => {
          const related = findRelatedMissedWords(w, missedWords);
          const hasRelated = related.length > 0;
          const isExpanded = expandedWord === w.word;

          return (
            <div key={w.word} className="results-word-group">
              <div
                className="results-word-row"
                onMouseEnter={() => onHoverWord(w.path)}
                onMouseLeave={() => onHoverWord(null)}
              >
                <span className="results-word-text">{w.word}</span>
                <div className="results-word-right">
                  <span className="results-word-score">{w.score}</span>
                  {hasRelated && (
                    <button
                      className={`results-word-expand ${isExpanded ? 'expanded' : ''}`}
                      onClick={() => toggleExpanded(w.word)}
                    >
                      ▾
                    </button>
                  )}
                </div>
              </div>
              {isExpanded && related.length > 0 && (
                <div className="results-related-words">
                  {related.map(r => (
                    <div
                      key={r.word}
                      className="results-related-word-row"
                      onMouseEnter={() => onHoverWord(r.path)}
                      onMouseLeave={() => onHoverWord(null)}
                    >
                      <span className="results-related-word-text">{r.word}</span>
                      <span className="results-related-word-score">{r.score}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="results-missed-section">
        <button
          className="results-missed-toggle"
          onClick={() => setMissedExpanded(!missedExpanded)}
        >
          <span>{missedExpanded ? '▾' : '▸'} Missed words ({missedWords.length})</span>
        </button>
        {missedExpanded && (
          <div className="results-missed-words">
            {missedWords.map((w) => (
              <div
                key={w.word}
                className="results-word-row results-missed-word-row"
                onMouseEnter={() => onHoverWord(w.path)}
                onMouseLeave={() => onHoverWord(null)}
              >
                <span className="results-word-text">{w.word}</span>
                <span className="results-word-score">{w.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
