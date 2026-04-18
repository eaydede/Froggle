import { useState, useMemo } from 'react';
import { Position, Game } from 'models';
import type { GameResults } from '../../shared/types';
import { ResultsBoard } from './components/ResultsBoard';
import { ResultsWordList } from './components/ResultsWordList';
import { LongestWordBanner } from './components/LongestWordBanner';
import { ScoreSquares } from './components/ScoreSquares';
import { DefinitionPanel } from './components/DefinitionPanel';
import { ShareMenu } from './components/ShareMenu';
import { generateShareText } from './utils/shareResults';
import { encodeGameLink } from '../../shared/utils/gameLink';

interface ResultsPageProps {
  results: GameResults | null;
  onPlayAgain: () => void;
  onBack: () => void;
  game: Game;
  gameSeed?: number | null;
  dailyNumber?: number;
}

export const ResultsPage = ({ results, onPlayAgain, onBack, game, gameSeed, dailyNumber }: ResultsPageProps) => {
  const [highlightPath, setHighlightPath] = useState<Position[] | null>(null);
  const [highlightedWordInfo, setHighlightedWordInfo] = useState<{ word: string; score: number } | null>(null);
  const [boardMinimized, setBoardMinimized] = useState(true);

  const totalScore = results?.foundWords.reduce((sum, w) => sum + w.score, 0) || 0;

  const longestFoundWordData = useMemo(() => {
    if (!results || results.foundWords.length === 0) return null;
    return results.foundWords.reduce((best, w) =>
      w.word.length > best.word.length ? w : best,
    );
  }, [results]);

  const sortedFoundWords = useMemo(() => {
    if (!results) return [];
    return [...results.foundWords].sort((a, b) => a.score - b.score);
  }, [results]);

  if (!results) {
    return <div className="text-center p-10 text-lg text-[var(--text-mid)]">Loading results...</div>;
  }

  const isDaily = dailyNumber !== undefined;
  const gameLink = !isDaily && gameSeed != null ? encodeGameLink({
    boardSize: game.config.boardSize,
    seed: gameSeed,
    timer: game.config.durationSeconds,
    minWordLength: game.config.minWordLength,
  }) : null;

  const getResultsText = () => {
    if (isDaily) {
      return generateShareText(results.foundWords, { daily: { number: dailyNumber! } });
    }
    return generateShareText(results.foundWords, { gameLink: gameLink || undefined });
  };

  const toggleLongestWord = () => {
    if (!longestFoundWordData) return;
    const isAlreadySelected = highlightedWordInfo?.word === longestFoundWordData.word;
    if (isAlreadySelected) {
      setHighlightPath(null);
      setHighlightedWordInfo(null);
    } else {
      setHighlightPath(longestFoundWordData.path);
      setHighlightedWordInfo({ word: longestFoundWordData.word, score: longestFoundWordData.score });
    }
  };

  return (
    <div className="py-2.5">
      {/* Header matches the daily/leaderboard pattern — chevron on the left,
          title centered — and replaces the App-level title so the back
          button can sit inline with "Froggle". */}
      <div className="flex items-center justify-center relative mb-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="absolute left-[18px] top-1/2 -translate-y-1/2 text-lg cursor-pointer leading-none flex bg-transparent border-none text-[var(--text-muted)]"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          &#8249;
        </button>
        <h1 className="m-0 text-[length:var(--text-title)] tracking-[-0.025em] text-[var(--text)] font-[family-name:var(--font-heading)] [font-weight:var(--font-heading-weight)]">
          Froggle
        </h1>
      </div>

      <div className={boardMinimized ? 'flex flex-row gap-4 items-start h-[440px]' : 'flex flex-col gap-4 h-auto'}>
        <div className={`flex flex-col min-w-0 max-h-full ${boardMinimized ? 'w-1/2 shrink-0' : 'w-full max-w-[500px]'}`}>
          <div className="relative cursor-pointer" onClick={() => setBoardMinimized(!boardMinimized)}>
            <ResultsBoard board={results.board} highlightPath={highlightPath} minimized={boardMinimized} />
          </div>

          {longestFoundWordData && (
            <LongestWordBanner
              word={longestFoundWordData.word}
              path={longestFoundWordData.path}
              score={longestFoundWordData.score}
              highlighted={highlightedWordInfo?.word === longestFoundWordData.word}
              onToggle={toggleLongestWord}
            />
          )}

          {totalScore > 0 && (
            <ScoreSquares
              words={sortedFoundWords}
              highlightedWord={highlightedWordInfo?.word ?? null}
            />
          )}

          {boardMinimized && highlightedWordInfo && (
            <DefinitionPanel word={highlightedWordInfo.word} />
          )}
        </div>

        <div className={`flex-1 min-w-0 max-h-full flex flex-col ${!boardMinimized ? 'max-h-[300px]' : ''}`}>
          <ResultsWordList
            foundWords={results.foundWords}
            missedWords={results.missedWords}
            onHoverWord={setHighlightPath}
            onWordSelect={setHighlightedWordInfo}
            selectedWord={highlightedWordInfo?.word ?? null}
            compact={boardMinimized}
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2.5 mt-5">
        <button
          onClick={onPlayAgain}
          className="w-full max-w-[400px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white border-none rounded-xl py-3.5 text-[length:var(--text-body)] cursor-pointer select-none transition-all duration-200 font-[family-name:var(--font-button)] [font-weight:var(--font-button-weight)]"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {isDaily ? 'Home' : 'Play Again'}
        </button>
        <ShareMenu getText={getResultsText} />
      </div>
    </div>
  );
};
