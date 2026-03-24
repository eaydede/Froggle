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

const WordRow = ({ word, path, score, onHoverWord, className, children }: {
  word: string;
  path: Position[];
  score: number;
  onHoverWord: (path: Position[] | null) => void;
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={`results-word-row ${className || ''}`}
      onMouseEnter={() => onHoverWord(path)}
      onMouseLeave={() => onHoverWord(null)}
    >
      <span className="results-word-text">{word}</span>
      <div className="results-word-right">
        {children}
        <span className="results-word-score">{score}</span>
      </div>
    </div>
  );
};

export const ResultsWordList = ({ foundWords, missedWords, onHoverWord }: ResultsWordListProps) => {
  const [expandedWord, setExpandedWord] = useState<string | null>(null);
  const [foundExpanded, setFoundExpanded] = useState(true);
  const [missedExpanded, setMissedExpanded] = useState(false);

  const totalScore = foundWords.reduce((sum, w) => sum + w.score, 0);

  const toggleExpanded = (word: string) => {
    setExpandedWord(prev => prev === word ? null : word);
  };

  return (
    <div className="results-word-list">
      <div className="results-section">
        <button
          className="results-section-toggle"
          onClick={() => setFoundExpanded(!foundExpanded)}
        >
          <span>{foundExpanded ? '▾' : '▸'} {foundWords.length} word{foundWords.length !== 1 ? 's' : ''} found</span>
          <span className="results-section-score">{totalScore} pts</span>
        </button>
        {foundExpanded && (
          <div className="results-scrollable-list">
            {foundWords.map((w) => {
              const related = findRelatedMissedWords(w, missedWords);
              const hasRelated = related.length > 0;
              const isExpanded = expandedWord === w.word;

              return (
                <div key={w.word} className="results-word-group">
                  <WordRow word={w.word} path={w.path} score={w.score} onHoverWord={onHoverWord}>
                    {hasRelated && (
                      <button
                        className={`results-word-expand ${isExpanded ? 'expanded' : ''}`}
                        onClick={() => toggleExpanded(w.word)}
                      >
                        ▾
                      </button>
                    )}
                  </WordRow>
                  {isExpanded && related.length > 0 && (
                    <div className="results-related-words">
                      {related.map(r => (
                        <WordRow
                          key={r.word}
                          word={r.word}
                          path={r.path}
                          score={r.score}
                          onHoverWord={onHoverWord}
                          className="results-related-word-row"
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="results-section">
        <button
          className="results-section-toggle"
          onClick={() => setMissedExpanded(!missedExpanded)}
        >
          <span>{missedExpanded ? '▾' : '▸'} Missed words ({missedWords.length})</span>
        </button>
        {missedExpanded && (
          <div className="results-scrollable-list">
            {missedWords.map((w) => (
              <WordRow
                key={w.word}
                word={w.word}
                path={w.path}
                score={w.score}
                onHoverWord={onHoverWord}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
