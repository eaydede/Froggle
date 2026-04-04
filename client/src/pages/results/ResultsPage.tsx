import { useState, useMemo, useRef, useEffect } from 'react';
import { Position, Game } from 'models';
import type { GameResults } from '../../shared/types';
import { ResultsBoard } from './components/ResultsBoard';
import { ResultsWordList } from './components/ResultsWordList';
import { generateShareText } from './utils/shareResults';
import { useDefinition } from './hooks/useDefinition';
import { encodeSeedCode } from 'models/seedCode';

const SCORE_SQUARE_STYLES: Record<number, React.CSSProperties> = {
  1: { backgroundColor: '#B0B0B0' },
  2: { backgroundColor: '#6AAB6A' },
  3: { background: 'linear-gradient(135deg, #7DA8F7, #5B8AF7)' },
  5: { background: 'linear-gradient(135deg, #B96EF7, #9333EA)', boxShadow: '0 0 3px rgba(168,85,247,0.35)' },
  11: { background: 'linear-gradient(135deg, #E8BD50, #C4900A)', boxShadow: '0 0 4px rgba(212,160,48,0.45)', animation: 'gold-glow-square 3s ease-in-out infinite', position: 'relative', overflow: 'visible' },
};

interface ResultsPageProps {
  results: GameResults | null;
  onPlayAgain: () => void;
  game: Game;
  gameSeed?: number | null;
  dailyNumber?: number;
}

export const ResultsPage = ({ results, onPlayAgain, game, gameSeed, dailyNumber }: ResultsPageProps) => {
  const [highlightPath, setHighlightPath] = useState<Position[] | null>(null);
  const [highlightedWordInfo, setHighlightedWordInfo] = useState<{ word: string; score: number } | null>(null);
  const [boardMinimized, setBoardMinimized] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const [resultsCopied, setResultsCopied] = useState(false);
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

  const totalScore = results?.foundWords.reduce((sum, w) => sum + w.score, 0) || 0;

  const sortedFoundWords = useMemo(() => {
    if (!results) return [];
    return [...results.foundWords].sort((a, b) => a.score - b.score);
  }, [results]);

  if (!results) {
    return <div className="text-center p-10 text-lg text-[#555]">Loading results...</div>;
  }

  const isDaily = dailyNumber !== undefined;
  const seedCode = !isDaily && gameSeed != null ? encodeSeedCode(game.config.boardSize, gameSeed) : null;

  const getResultsText = () => {
    if (isDaily) {
      return generateShareText(results.foundWords, { daily: { number: dailyNumber! } });
    }
    return generateShareText(results.foundWords, { gameLink: seedCode || undefined });
  };

  const handleCopyCode = () => {
    if (!seedCode) return;
    navigator.clipboard.writeText(seedCode).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }).catch(() => {
      prompt('Copy code:', seedCode);
    });
  };

  const canNativeShare = !!navigator.share;

  const handleNativeShare = () => {
    navigator.share({ text: getResultsText() }).catch(() => {});
    setShareOpen(false);
  };

  const handleCopyResults = () => {
    const text = getResultsText();
    navigator.clipboard.writeText(text).then(() => {
      setResultsCopied(true);
      setTimeout(() => setResultsCopied(false), 2000);
    }).catch(() => {
      prompt('Copy results:', text);
    });
  };

  return (
    <div className="py-2.5">
      <div className={boardMinimized ? 'flex flex-row gap-4 items-start h-[440px]' : 'flex flex-col gap-4 h-auto'}>
        {/* Board section */}
        <div className={`flex flex-col min-w-0 max-h-full ${boardMinimized ? 'w-1/2 shrink-0' : 'w-full max-w-[500px]'}`}>
          {seedCode && (
            <div
              className="flex items-center justify-center gap-1.5 pt-1 pb-2 cursor-pointer text-[#999] hover:text-[#666] active:text-[#333] transition-colors duration-150 select-none"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              onClick={handleCopyCode}
            >
              <span className="text-xs font-semibold tracking-wider" style={{ fontFamily: "'Inter', sans-serif" }}>{seedCode}</span>
              {codeCopied ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </div>
          )}
          <div className="relative cursor-pointer" onClick={() => setBoardMinimized(!boardMinimized)}>
            <ResultsBoard board={results.board} highlightPath={highlightPath} minimized={boardMinimized} />
          </div>

          {/* Score visualization */}
          {totalScore > 0 && (
            <>
              <div className="flex items-start gap-1.5 mt-4">
                <span className="text-[10px] font-bold text-[#bbb] leading-[8px] shrink-0 w-3.5">W:</span>
                <div className="flex flex-wrap gap-1">
                  {sortedFoundWords.map((w, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-[2px] transition-transform duration-200"
                      style={{
                        ...(SCORE_SQUARE_STYLES[w.score] || { backgroundColor: '#8BA89B' }),
                        ...(highlightedWordInfo?.word === w.word ? { transform: 'scale(1.6)', zIndex: 1 } : {}),
                      }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Definition */}
          {boardMinimized && highlightedWordInfo && (
            <div className="mt-4 p-3 text-[13px] text-[#444] flex-1 overflow-y-auto min-h-0" style={{ fontFamily: "'Merriweather', Georgia, serif", fontWeight: 400, lineHeight: '19.5px' }}>
              {definitionLoading ? (
                <div className="text-[#aaa] italic">...</div>
              ) : definition ? (
                <>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="font-black text-base text-[#222]">{definition.word}</span>
                    {definition.phonetic && (
                      <span className="text-[13px] text-[#888] italic">{definition.phonetic}</span>
                    )}
                  </div>
                  {definition.meanings.map((meaning, i) => (
                    <div key={i} className="mb-2">
                      <span className="italic text-[#666] text-xs">{meaning.partOfSpeech}</span>
                      <ol className="mt-0.5 pl-[18px] font-normal">
                        {meaning.definitions.map((def, j) => (
                          <li key={j} className="mb-0.5">
                            {def.definition}
                            {def.example && (
                              <span className="block italic text-[#888] mt-px text-xs">"{def.example}"</span>
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </>
              ) : (
                <div className="flex flex-col gap-1">
                  <span className="font-black text-base text-[#222]">{highlightedWordInfo.word.toLowerCase()}</span>
                  <span className="italic text-[#aaa] text-xs">Definition not available</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Word list section */}
        <div className={`flex-1 min-w-0 max-h-full flex flex-col ${!boardMinimized ? 'max-h-[300px]' : ''}`}>
          <ResultsWordList
            foundWords={results.foundWords}
            missedWords={results.missedWords}
            onHoverWord={setHighlightPath}
            onWordSelect={setHighlightedWordInfo}
            compact={boardMinimized}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-2.5 mt-5">
        <button
          onClick={onPlayAgain}
          className="w-full max-w-[400px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white border-none rounded-xl py-3.5 text-[0.85rem] cursor-pointer select-none transition-all duration-200"
          style={{ WebkitTapHighlightColor: "transparent", fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}
        >
          {isDaily ? 'Home' : 'Play Again'}
        </button>
        <div className="relative" ref={shareRef}>
          <button
            onClick={() => setShareOpen(!shareOpen)}
            className="flex items-center gap-1.5 py-2 px-4 text-[13px] bg-transparent border border-[#ddd] rounded-md text-[#888] cursor-pointer transition-all duration-150 hover:border-[#aaa] hover:text-[#555]"
            style={{ fontFamily: "'Merriweather', Georgia, serif", fontWeight: 600 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Share Results
          </button>
          {shareOpen && (
            <div className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 bg-white border border-[#e0e0e0] rounded-[10px] shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden min-w-[170px] z-10">
              {canNativeShare && (
                <button
                  className="flex items-center gap-2 w-full py-2.5 px-3.5 bg-transparent border-none text-[13px] font-semibold text-[#555] cursor-pointer transition-colors duration-100 text-left whitespace-nowrap hover:bg-[#f5f5f5] active:bg-[#eee]"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  onClick={handleNativeShare}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  Share to...
                </button>
              )}
              <button
                className={`flex items-center gap-2 w-full py-2.5 px-3.5 bg-transparent border-none text-[13px] font-semibold text-[#555] cursor-pointer transition-colors duration-100 text-left whitespace-nowrap hover:bg-[#f5f5f5] active:bg-[#eee] ${canNativeShare ? 'border-t border-t-[#f0f0f0]' : ''}`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                onClick={handleCopyResults}
              >
                {resultsCopied ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy to clipboard
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
