import { useEffect, useMemo, useRef, useState } from 'react';
import { Board as BoardComponent } from '../../game/components/Board';
import type { FeedbackType } from '../../game/components/Board';
import type { Position, Board as BoardType } from 'models';
import { generateBoardFromConfig, generateBaselineDiceBoard } from '../../../shared/calibration/pool';
import type { PoolConfig } from '../../../shared/calibration/types';
import { findAllWords } from '../../../shared/calibration/solver';
import { useMainDictionary } from '../useMainDictionary';

interface TestBoardPanelProps {
  size: number;
  config: PoolConfig;
  dictReady: boolean;
}

interface FoundEntry {
  word: string;
  score: number;
}

function scoreWord(word: string): number {
  // Mirrors engine/scoring.ts (Fibonacci-by-length, capped at 8+).
  const len = word.length;
  if (len <= 3) return 1;
  if (len === 4) return 2;
  if (len === 5) return 3;
  if (len === 6) return 5;
  if (len === 7) return 8;
  return 13;
}

// Match GamePage: hold colored feedback for 800ms, then it implicitly fades
// (we just clear; the game's fade animation isn't reproduced here).
const FEEDBACK_HOLD_MS = 800;

export const TestBoardPanel = ({ size, config, dictReady }: TestBoardPanelProps) => {
  const { dict, prefixes, common, loading: dictLoading, error: dictError } = useMainDictionary();
  const [board, setBoard] = useState<BoardType | null>(null);
  const [generationKey, setGenerationKey] = useState(0);
  const [feedback, setFeedback] = useState<{ type: FeedbackType; path: Position[] } | null>(null);
  const [found, setFound] = useState<FoundEntry[]>([]);
  const [generator, setGenerator] = useState<'current' | 'baseline'>('current');
  const [showAllWords, setShowAllWords] = useState(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // All findable words on the current board, with their score and whether
  // they're in the MIT-10k common-word list. Recomputed only when the board
  // changes — solver runs on the main thread, ~10–60ms depending on size.
  const allWords = useMemo<Array<FoundEntry & { common: boolean }>>(() => {
    if (!board || !dict || !prefixes) return [];
    const words = findAllWords(board, dict, prefixes, 3);
    return words
      .map(w => ({ word: w, score: scoreWord(w), common: common?.has(w) ?? false }))
      .sort((a, b) => b.word.length - a.word.length || a.word.localeCompare(b.word));
  }, [board, dict, prefixes, common]);

  const allWordsCommonCount = useMemo(() => allWords.filter(w => w.common).length, [allWords]);

  // Auto-clear feedback after a short hold so the board doesn't stay stuck on
  // the last word's color. Mirrors GamePage's behavior in spirit.
  useEffect(() => {
    if (!feedback) return;
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), FEEDBACK_HOLD_MS);
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, [feedback]);

  const handleGenerate = () => {
    const next = generator === 'baseline'
      ? generateBaselineDiceBoard(size)
      : generateBoardFromConfig(size, config);
    setBoard(next);
    setFound([]);
    setFeedback(null);
    setShowAllWords(false);
    setGenerationKey(k => k + 1);
  };

  const handleSubmit = (path: Position[]) => {
    if (!board || !dict) return;
    const word = path.map(p => board[p.row]?.[p.col] ?? '').join('').toLowerCase();
    if (word.length < 3) {
      setFeedback({ type: 'invalid', path });
      return;
    }
    if (found.some(f => f.word === word)) {
      setFeedback({ type: 'duplicate', path });
      return;
    }
    if (!dict.has(word)) {
      setFeedback({ type: 'invalid', path });
      return;
    }
    setFound(f => [{ word, score: scoreWord(word) }, ...f]);
    setFeedback({ type: 'valid', path });
  };

  const stats = useMemo(() => {
    let totalScore = 0, longest = 0;
    for (const f of found) {
      totalScore += f.score;
      if (f.word.length > longest) longest = f.word.length;
    }
    return { totalScore, longest, count: found.length };
  }, [found]);

  return (
    <section className="bg-white border border-[color:var(--track)] rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold m-0">Test board</h2>
          <p className="text-[11px] text-[color:var(--text-muted)] m-0 mt-0.5 leading-snug">
            Swipe to form words. Validates against enable1, scores Fibonacci-by-length (3=1, 4=2, 5=3, 6=5, 7=8, 8+=13).
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => setGenerator('current')}
              className={`px-2 py-1 rounded border-none cursor-pointer ${
                generator === 'current'
                  ? 'bg-[color:var(--accent)] text-white'
                  : 'bg-[color:var(--track)] text-[color:var(--text)] hover:bg-[color:var(--dot)]'
              }`}
            >current</button>
            <button
              type="button"
              onClick={() => setGenerator('baseline')}
              className={`px-2 py-1 rounded border-none cursor-pointer ${
                generator === 'baseline'
                  ? 'bg-[color:var(--accent)] text-white'
                  : 'bg-[color:var(--track)] text-[color:var(--text)] hover:bg-[color:var(--dot)]'
              }`}
            >baseline</button>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!dictReady || dictLoading}
            className="px-3 py-1 text-xs rounded bg-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] text-white border-none cursor-pointer disabled:opacity-50"
          >
            Generate
          </button>
        </div>
      </div>

      {dictError && <p className="text-xs text-red-600 m-0">Dictionary error: {dictError}</p>}

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px] gap-4 items-start">
        <div className="max-w-[460px] mx-auto w-full">
          {board ? (
            <BoardComponent
              key={generationKey}
              board={board}
              onSubmitWord={handleSubmit}
              feedback={feedback}
            />
          ) : (
            <div className="aspect-square w-full flex items-center justify-center bg-[color:var(--track)] rounded-lg text-sm text-[color:var(--text-muted)]">
              {dictLoading ? 'Loading dictionary…' : 'Click Generate to roll a board.'}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 text-xs">
          <div className="flex justify-between font-mono text-[color:var(--text-muted)]">
            <span>words</span><span>{stats.count}</span>
          </div>
          <div className="flex justify-between font-mono text-[color:var(--text-muted)]">
            <span>score</span><span>{stats.totalScore}</span>
          </div>
          <div className="flex justify-between font-mono text-[color:var(--text-muted)]">
            <span>longest</span><span>{stats.longest}</span>
          </div>
          <div className="border-t border-[color:var(--track)] pt-2">
            <div className="text-[11px] font-medium mb-1">Found</div>
            <ul className="m-0 p-0 list-none flex flex-col gap-0.5 max-h-[200px] overflow-y-auto">
              {found.length === 0 && <li className="text-[color:var(--text-muted)] italic">no words yet</li>}
              {found.map((f) => (
                <li key={f.word} className="flex justify-between font-mono">
                  <span>{f.word.toUpperCase()}</span>
                  <span className="text-[color:var(--text-muted)]">+{f.score}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {board && (
        <div className="border-t border-[color:var(--track)] pt-3">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div>
              <button
                type="button"
                onClick={() => setShowAllWords(v => !v)}
                className="text-xs font-medium text-[color:var(--accent)] cursor-pointer bg-transparent border-none p-0 underline"
              >
                {showAllWords ? 'Hide solution' : 'Show all words on this board'}
              </button>
              <span className="text-[11px] text-[color:var(--text-muted)] ml-2">
                {allWords.length} total · {allWordsCommonCount} common (highlighted)
              </span>
            </div>
            {showAllWords && (
              <span className="text-[10px] text-[color:var(--text-muted)] italic">
                spoilers — clears on Generate
              </span>
            )}
          </div>
          {showAllWords && (
            <ul className="m-0 p-0 list-none grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-0.5 max-h-[280px] overflow-y-auto text-[11px] font-mono">
              {allWords.map(w => (
                <li
                  key={w.word}
                  className={`flex justify-between ${
                    w.common
                      ? 'text-[color:var(--text)] font-semibold'
                      : 'text-[color:var(--text-muted)]'
                  }`}
                  title={w.common ? 'In MIT 10k common words' : 'In enable1 only'}
                >
                  <span>{w.word.toUpperCase()}</span>
                  <span className="opacity-60">+{w.score}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};
