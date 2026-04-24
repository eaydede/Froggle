import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Position } from 'models';
import type { ScoredWord } from '../../../shared/types';
import { RARITY_VAR, wordRarity } from '../utils/wordRarity';

interface WordsCardProps {
  foundWords: ScoredWord[];
  missedWords: ScoredWord[];
  /** If true the user can toggle between Found/Missed lists. When false
   *  (e.g. daily, or fixtures without a missed set) the secondary tab is
   *  hidden. */
  showMissedTab?: boolean;
  highlightedWord?: string | null;
  onHighlightWord?: (word: string | null, path: Position[] | null) => void;
}

type Mode = 'found' | 'missed';

export function WordsCard({
  foundWords,
  missedWords,
  showMissedTab = true,
  highlightedWord,
  onHighlightWord,
}: WordsCardProps) {
  const [mode, setMode] = useState<Mode>('found');
  const listRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(false);

  const active = mode === 'found' ? foundWords : missedWords;
  const activeTotal = active.reduce((sum, w) => sum + w.score, 0);
  const foundTotal = foundWords.reduce((sum, w) => sum + w.score, 0);

  // Sort by score descending, ties alphabetical — matches the mockup where
  // the legendary / epic rows lead and commons tail.
  const sorted = [...active].sort(
    (a, b) => b.score - a.score || a.word.localeCompare(b.word),
  );

  // Recompute the scroll-fade toggle whenever the list content or height
  // changes. Without the initial effect the fade lingers on short lists
  // that don't need scrolling at all.
  const updateFade = () => {
    const el = listRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.clientHeight - el.scrollTop < 2);
  };

  useLayoutEffect(() => {
    updateFade();
  }, [mode, foundWords, missedWords]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateFade);
    return () => el.removeEventListener('scroll', updateFade);
  }, []);

  const tapWord = (word: string, path: Position[]) => {
    if (!onHighlightWord) return;
    if (highlightedWord === word) {
      onHighlightWord(null, null);
    } else {
      onHighlightWord(word, path);
    }
  };

  const swapTo = (next: Mode) => {
    setMode(next);
    onHighlightWord?.(null, null);
  };

  return (
    <div className="flex flex-col min-h-0 rounded-xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] overflow-hidden">
      <SectionHeader
        label={mode === 'found' ? 'Found' : 'Missed'}
        count={active.length}
        trailing={mode === 'found' ? String(foundTotal) : null}
      />

      <div
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto"
        style={{
          WebkitMaskImage: atBottom
            ? 'none'
            : 'linear-gradient(to bottom, black calc(100% - 14px), transparent 100%)',
          maskImage: atBottom
            ? 'none'
            : 'linear-gradient(to bottom, black calc(100% - 14px), transparent 100%)',
          scrollbarWidth: 'thin',
        }}
      >
        {sorted.map((w, i) => (
          <WordRow
            key={`${w.word}-${i}`}
            word={w.word}
            score={w.score}
            first={i === 0}
            found={mode === 'found'}
            highlighted={highlightedWord === w.word}
            onTap={() => tapWord(w.word, w.path)}
          />
        ))}
      </div>

      {showMissedTab && (
        <button
          type="button"
          onClick={() => swapTo(mode === 'found' ? 'missed' : 'found')}
          className="flex items-center justify-between px-3 py-[9px] text-label-xs uppercase tracking-[0.08em] text-[color:var(--ink-soft)] bg-[var(--ink-whisper)] border-t border-[var(--ink-border-subtle)] cursor-pointer hover:text-[color:var(--ink-muted)] transition-colors duration-150 font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 700, WebkitTapHighlightColor: 'transparent' }}
        >
          <span>{mode === 'found' ? 'Missed' : 'Found'}</span>
          <span aria-hidden className="text-[color:var(--ink-faint)]">
            {mode === 'found' ? '›' : '‹'}
          </span>
        </button>
      )}
    </div>
  );
}

function SectionHeader({
  label,
  count,
  trailing,
}: {
  label: string;
  count: number;
  trailing: string | null;
}) {
  return (
    <div
      className="flex justify-between items-center px-3 py-[9px] text-label-xs uppercase tracking-[0.08em] text-[color:var(--ink-muted)] bg-[var(--ink-whisper)] leading-none font-[family-name:var(--font-structure)]"
      style={{ fontWeight: 700 }}
    >
      <span>
        {label} <span className="tabular-nums">· {count}</span>
      </span>
      {trailing !== null && <span className="tabular-nums">{trailing}</span>}
    </div>
  );
}

function WordRow({
  word,
  score,
  first,
  found,
  highlighted,
  onTap,
}: {
  word: string;
  score: number;
  first: boolean;
  found: boolean;
  highlighted: boolean;
  onTap: () => void;
}) {
  const rarity = wordRarity(score);
  return (
    <div
      onClick={onTap}
      className={[
        'relative flex justify-between items-center py-[7px] pr-3 pl-[17px] text-xs tracking-[0.02em] cursor-pointer transition-colors duration-150 font-[family-name:var(--font-ui)]',
        first ? '' : 'border-t border-[var(--ink-border-subtle)]',
        highlighted ? 'bg-[var(--ink-whisper)]' : 'hover:bg-[var(--ink-whisper)]',
        found ? 'text-[color:var(--ink)]' : 'text-[color:var(--ink-soft)]',
      ].join(' ')}
      style={{ fontWeight: 500 }}
    >
      <span
        aria-hidden
        className="absolute left-0 top-[5px] bottom-[5px] w-1 rounded-r-[2px]"
        style={{ background: RARITY_VAR[rarity], opacity: found ? 1 : 0.45 }}
      />
      <span className="tabular-nums">{word}</span>
      <span
        className={[
          'text-[11px] tabular-nums font-[family-name:var(--font-structure)]',
          found ? 'text-[color:var(--ink-soft)]' : 'text-[color:var(--ink-faint)]',
        ].join(' ')}
        style={{ fontWeight: 700 }}
      >
        +{score}
      </span>
    </div>
  );
}
