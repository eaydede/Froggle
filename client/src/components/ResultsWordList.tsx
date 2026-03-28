import { useState, useMemo } from 'react';
import { Position } from 'models';
import { ScoredWord } from '../api/gameApi';

interface ResultsWordListProps {
  foundWords: ScoredWord[];
  missedWords: ScoredWord[];
  onHoverWord: (path: Position[] | null) => void;
  onWordSelect?: (info: { word: string; score: number } | null) => void;
  compact?: boolean;
}

interface CombinedWord extends ScoredWord {
  found: boolean;
}

export const SCORE_COLORS: Record<number, string> = {
  1: '#8BA89B',
  2: '#5A9E9E',
  3: '#003dffa1',
  5: '#bd65ffd9',
  11: '#C4A24E',
};

export const getScoreColor = (score: number): string => {
  return SCORE_COLORS[score] || '#8BA89B';
};

const WordRow = ({ word, path, score, found, isHighlighted, onTap }: {
  word: string;
  path: Position[];
  score: number;
  found: boolean;
  isHighlighted?: boolean;
  onTap?: () => void;
}) => {
  return (
    <div
      className={`results-word-row ${found ? 'results-word-found' : 'results-word-missed'} ${isHighlighted ? 'results-word-highlighted' : ''}`}
      onClick={onTap}
    >
      <span className="results-word-text">{word}</span>
      <div className="results-word-right">
        {found && <span className="results-score-dot" style={{ backgroundColor: getScoreColor(score) }} />}
        <span className="results-word-score" style={found ? { color: getScoreColor(score) } : undefined}>{score}</span>
      </div>
    </div>
  );
};

const findRelatedMissedWords = (foundWord: ScoredWord, missedWords: ScoredWord[]): ScoredWord[] => {
  const foundLower = foundWord.word.toLowerCase();
  return missedWords.filter(missed => {
    const missedLower = missed.word.toLowerCase();
    return missedLower.startsWith(foundLower) || foundLower.startsWith(missedLower);
  });
};

export const ResultsWordList = ({ foundWords, missedWords, onHoverWord, onWordSelect, compact = false }: ResultsWordListProps) => {
  const [showAll, setShowAll] = useState(false);
  const [expandedWord, setExpandedWord] = useState<string | null>(null);
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null);

  const handleWordTap = (word: string, path: Position[], score: number) => {
    if (highlightedWord === word) {
      setHighlightedWord(null);
      onHoverWord(null);
      onWordSelect?.(null);
    } else {
      setHighlightedWord(word);
      onHoverWord(path);
      onWordSelect?.({ word, score });
    }
  };

  const totalScore = foundWords.reduce((sum, w) => sum + w.score, 0);

  // Expanded view: all words sorted by score desc
  const allWords = useMemo(() => {
    const combined: CombinedWord[] = [
      ...foundWords.map(w => ({ ...w, found: true })),
      ...missedWords.map(w => ({ ...w, found: false })),
    ];
    combined.sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));
    return combined;
  }, [foundWords, missedWords]);

  return (
    <div className="results-word-list">
      <div className="results-summary-bar">
        <div className="results-summary-left">
          <span className="results-summary-count">
            {showAll 
              ? `${foundWords.length}/${foundWords.length + missedWords.length}` 
              : compact 
                ? `${foundWords.length}W`
                : `${foundWords.length} Words`
            }
          </span>
          <span className="results-summary-score">{compact ? `${totalScore}pts` : `${totalScore} pts`}</span>
        </div>
        <button
          className={`results-show-all-btn ${showAll ? 'active' : ''}`}
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="14" y2="12" />
              <line x1="4" y1="18" x2="10" y2="18" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          )}
        </button>
      </div>

      <div className="results-combined-list">
        {showAll ? (
          allWords.map((w) => (
            <WordRow
              key={`${w.word}-${w.found}`}
              word={w.word}
              path={w.path}
              score={w.score}
              found={w.found}
              isHighlighted={highlightedWord === w.word}
              onTap={() => handleWordTap(w.word, w.path, w.score)}
            />
          ))
        ) : (
          foundWords.map((fw) => {
            const related = findRelatedMissedWords(fw, missedWords);
            const hasRelated = related.length > 0;
            const isExpanded = expandedWord === fw.word;

            return (
              <div key={fw.word} className="results-word-group">
                <div
                  className={`results-word-row results-word-found ${highlightedWord === fw.word ? 'results-word-highlighted' : ''}`}
                  onClick={() => handleWordTap(fw.word, fw.path, fw.score)}
                >
                  <div className="results-word-left">
                    <span className="results-word-text">{fw.word}</span>
                    {hasRelated && (
                      <button
                        className={`results-word-expand ${isExpanded ? 'expanded' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setExpandedWord(isExpanded ? null : fw.word); }}
                      >
                        ▾
                      </button>
                    )}
                  </div>
                  <div className="results-word-right">
                    <span className="results-score-dot" style={{ backgroundColor: getScoreColor(fw.score) }} />
                    <span className="results-word-score" style={{ color: getScoreColor(fw.score) }}>{fw.score}</span>
                  </div>
                </div>
                {isExpanded && (
                  <div className="results-related-words">
                    {related.map(rw => (
                      <WordRow
                        key={rw.word}
                        word={rw.word}
                        path={rw.path}
                        score={rw.score}
                        found={false}
                        isHighlighted={highlightedWord === rw.word}
                        onTap={() => handleWordTap(rw.word, rw.path, rw.score)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
