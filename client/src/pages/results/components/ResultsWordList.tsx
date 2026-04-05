import { useState, useEffect, useMemo } from 'react';
import { Position } from 'models';
import type { ScoredWord } from '../../../shared/types';

interface ResultsWordListProps {
  foundWords: ScoredWord[];
  missedWords: ScoredWord[];
  onHoverWord: (path: Position[] | null) => void;
  onWordSelect?: (info: { word: string; score: number } | null) => void;
  selectedWord?: string | null;
  compact?: boolean;
}

interface CombinedWord extends ScoredWord {
  found: boolean;
}

export const SCORE_COLORS: Record<number, string> = {
  1: '#B0B0B0',
  2: '#6AAB6A',
  3: '#6B9BF7',
  5: '#A855F7',
  11: '#D4A030',
};

export const getScoreColor = (score: number): string => {
  return SCORE_COLORS[score] || '#8BA89B';
};

const WORD_FONT: React.CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontWeight: 800,
};

const SCORE_DOT_STYLES: Record<number, React.CSSProperties> = {
  1: { backgroundColor: '#B0B0B0' },
  2: { backgroundColor: '#6AAB6A' },
  3: { background: 'linear-gradient(135deg, #7DA8F7, #5B8AF7)' },
  5: { background: 'linear-gradient(135deg, #B96EF7, #9333EA)', boxShadow: '0 0 3px rgba(168,85,247,0.3)' },
  11: { background: 'linear-gradient(135deg, #E8BD50, #C4900A)', boxShadow: '0 0 3px rgba(212,160,48,0.4)', animation: 'gold-glow-dot 3s ease-in-out infinite' },
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
      className={`flex justify-between items-center py-1.5 px-3 rounded cursor-default transition-colors duration-150 hover:bg-[var(--track)] ${isHighlighted ? 'bg-[var(--track)]' : ''}`}
      onClick={onTap}
    >
      <span
        className="text-[13px] uppercase tracking-wide"
        style={{ ...WORD_FONT, color: found ? 'var(--text)' : 'var(--text-muted)' }}
      >
        {word}
      </span>
      <div className="flex items-center gap-[3px]">
        {found && (
          <span
            className="w-[7px] h-[7px] rounded-full shrink-0"
            style={SCORE_DOT_STYLES[score] || { backgroundColor: '#8BA89B' }}
          />
        )}
        <span
          className="text-xs min-w-[14px] text-right"
          style={{ ...WORD_FONT, color: found ? getScoreColor(score) : '#ddd' }}
        >
          {score}
        </span>
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

export const ResultsWordList = ({ foundWords, missedWords, onHoverWord, onWordSelect, selectedWord: externalSelectedWord, compact = false }: ResultsWordListProps) => {
  const [showAll, setShowAll] = useState(false);
  const [expandedWord, setExpandedWord] = useState<string | null>(null);
  const [internalHighlightedWord, setInternalHighlightedWord] = useState<string | null>(null);

  // Clear internal state when external selection changes
  useEffect(() => {
    setInternalHighlightedWord(null);
  }, [externalSelectedWord]);

  const highlightedWord = externalSelectedWord ?? internalHighlightedWord;

  const handleWordTap = (word: string, path: Position[], score: number) => {
    if (highlightedWord === word) {
      setInternalHighlightedWord(null);
      onHoverWord(null);
      onWordSelect?.(null);
    } else {
      setInternalHighlightedWord(word);
      onHoverWord(path);
      onWordSelect?.({ word, score });
    }
  };

  const totalScore = foundWords.reduce((sum, w) => sum + w.score, 0);

  const allWords = useMemo(() => {
    const combined: CombinedWord[] = [
      ...foundWords.map(w => ({ ...w, found: true })),
      ...missedWords.map(w => ({ ...w, found: false })),
    ];
    combined.sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));
    return combined;
  }, [foundWords, missedWords]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Summary bar */}
      <div
        className={`flex justify-between items-center py-2 px-3 rounded-lg mb-1.5 cursor-pointer select-none transition-colors duration-150 hover:bg-[var(--track)] active:bg-[var(--track)] ${showAll ? 'bg-[var(--track)]' : 'bg-[var(--card)]'}`}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        onClick={() => setShowAll(!showAll)}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--text)]" style={WORD_FONT}>
            {showAll
              ? `${foundWords.length}/${foundWords.length + missedWords.length}`
              : compact
                ? `${foundWords.length}W`
                : `${foundWords.length} Words`
            }
          </span>
          <span className="text-sm text-[hsl(122,32%,55%)]" style={WORD_FONT}>
            {compact ? `${totalScore}pts` : `${totalScore} pts`}
          </span>
        </div>
        <span
          className="text-sm text-[#999] transition-transform duration-200"
          style={{ transform: showAll ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          ▾
        </span>
      </div>

      {/* Word list */}
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
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
              <div key={fw.word} className="flex flex-col">
                  <div
                  className={`flex justify-between items-center py-1.5 px-3 rounded cursor-default transition-colors duration-150 hover:bg-[var(--track)] ${highlightedWord === fw.word ? 'bg-[var(--track)]' : ''}`}
                  onClick={() => handleWordTap(fw.word, fw.path, fw.score)}
                >
                  <div className="flex items-center">
                    <span className="text-[13px] uppercase tracking-wide text-[var(--text)]" style={WORD_FONT}>
                      {fw.word}
                    </span>
                    {hasRelated && (
                      <button
                        className={`bg-transparent border-none cursor-pointer text-xs text-[#999] py-0.5 px-1 leading-none transition-all duration-200 hover:text-[#666] ${isExpanded ? 'rotate-180' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setExpandedWord(isExpanded ? null : fw.word); }}
                      >
                        ▾
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-[3px]">
                    <span
                      className="w-[7px] h-[7px] rounded-full shrink-0"
                      style={SCORE_DOT_STYLES[fw.score] || { backgroundColor: '#8BA89B' }}
                    />
                    <span className="text-xs min-w-[14px] text-right" style={{ ...WORD_FONT, color: getScoreColor(fw.score) }}>
                      {fw.score}
                    </span>
                  </div>
                </div>
                {isExpanded && (
                  <div className="py-0.5 pl-6 pr-3 flex flex-col">
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
