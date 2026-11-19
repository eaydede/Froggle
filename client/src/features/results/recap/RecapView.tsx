import { useLayoutEffect, useRef, type RefObject } from 'react';
import type { ResultFind } from 'models/results';
import { RARITY_VAR, wordRarity } from '../utils/wordRarity';
import { formatTime, type RunFind } from './run';

type Word = Pick<ResultFind, 'word' | 'score'> & { time?: number | null; bonus?: string | null };
interface Cell {
  find: Word;
  side: 'you' | 'opp';
  unique: boolean;
  key: string;
}
interface Props {
  points: number;
  difficultyMode: boolean;
  difficulties: Record<string, number> | null;
  difficultyLoading: boolean;
  difficultyError: boolean;
  onRetryDifficulty: () => void;
  yours: Word[];
  theirs: Word[] | null;
  all: Word[];
  opponentName?: string;
  run: boolean;
  hasTiming: boolean;
  events: RunFind[];
  showAll: boolean;
  onShowAll: () => void;
  selected: string | null;
  currentKey: string | null;
  live: boolean;
  time: number;
  onSelect: (word: string, time?: number | null) => void;
  peek: string;
  onDefinition: () => void;
  scroller: RefObject<HTMLDivElement>;
}

export function RecapView({
  points,
  difficultyMode,
  difficulties,
  difficultyLoading,
  difficultyError,
  onRetryDifficulty,
  yours,
  theirs,
  all,
  opponentName,
  run,
  hasTiming,
  events,
  showAll,
  onShowAll,
  selected,
  currentKey,
  live,
  time,
  onSelect,
  peek,
  onDefinition,
  scroller,
}: Props) {
  const mine = new Map(yours.map((w) => [w.word, w]));
  const other = new Map(theirs?.map((w) => [w.word, w]));
  const comparing = theirs !== null;
  const previousCurrent = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (currentKey === previousCurrent.current) return;
    previousCurrent.current = currentKey;
    const el = scroller.current;
    const row = el?.querySelector<HTMLElement>('[data-current="true"]');
    if (el && row)
      el.scrollTop +=
        row.getBoundingClientRect().top -
        el.getBoundingClientRect().top -
        el.clientHeight / 2 +
        row.clientHeight / 2;
  }, [currentKey, scroller]);

  const cell = (find: Word | undefined, side: Cell['side']): Cell | null =>
    find
      ? {
          find,
          side,
          key: `${side}:${find.word}`,
          unique: comparing && !(side === 'you' ? other : mine).has(find.word),
        }
      : null;
  let rows: { key: string; cells: (Cell | null)[] }[];
  if (difficultyMode) {
    rows = difficultyLoading || difficultyError
      ? []
      : [...all]
          .sort((a, b) =>
            (difficulties?.[b.word] ?? -1) - (difficulties?.[a.word] ?? -1) ||
            a.word.localeCompare(b.word),
          )
          .map(word => ({ key: word.word, cells: [cell(word, 'you')] }));
  } else if (run && !hasTiming)
    rows = Array.from({ length: Math.max(yours.length, theirs?.length ?? 0) }, (_, index) => ({
      key: `order:${index}`,
      cells: comparing
        ? [cell(theirs![index], 'opp'), cell(yours[index], 'you')]
        : [cell(yours[index], 'you')],
    }));
  else if (run)
    rows = events.map((e) => ({
      key: e.key,
      cells: comparing
        ? [e.side === 'opp' ? cell(e, 'opp') : null, e.side === 'you' ? cell(e, 'you') : null]
        : [cell(e, 'you')],
    }));
  else if (comparing) {
    const union = new Map([...yours, ...theirs!].map((w) => [w.word, w]));
    rows = [...union.values()]
      .sort((a, b) => b.score - a.score || a.word.localeCompare(b.word))
      .map((w) => ({
        key: w.word,
        cells: [cell(other.get(w.word), 'opp'), cell(mine.get(w.word), 'you')],
      }));
  } else {
    rows = [...(showAll ? all : yours)]
      .sort(
        (a, b) =>
          b.score - a.score ||
          (showAll ? a.word.localeCompare(b.word) : (a.time ?? 0) - (b.time ?? 0)),
      )
      .map((w) => ({ key: w.word, cells: [cell(w, 'you')] }));
  }
  return (
    <div className="recap-list">
      {!run && !comparing && <div className="recap-metric-header recap-found-header">
        <span>{difficultyMode ? 'Difficulty' : showAll ? 'All words' : <>Found <span className="recap-count">· {yours.length}</span></>}</span>
        <span title={difficultyMode ? '0 = easiest, 1 = hardest' : undefined}>{difficultyMode ? '0–1' : showAll ? `${yours.length}/${all.length}` : `${points} pts`}</span>
      </div>}
      {comparing && (
        <div className="recap-compare-header">
          <span>
            {opponentName} · {theirs!.length}
          </span>
          <span>You · {yours.length}</span>
        </div>
      )}
      <div
        ref={scroller}
        id="results-words"
        aria-busy={difficultyMode && difficultyLoading}
        className="results-scroll recap-words"
        aria-label={difficultyMode ? 'Words by difficulty' : run ? 'Finds in time order' : 'Words by points'}
      >
        {difficultyMode && difficultyLoading && <p role="status" className="results-status">Loading word difficulties…</p>}
        {difficultyMode && difficultyError && <p role="alert" className="results-status">
          Couldn’t load word difficulties.<br />
          <button type="button" className="recap-difficulty-retry" onClick={onRetryDifficulty}>Retry</button>
        </p>}
        {!difficultyLoading && !difficultyError && rows.length === 0 && <p className="results-empty">No words found.</p>}
        {rows.map((row) => (
          <div key={row.key} className={comparing ? 'recap-compare-row' : ''}>
            {row.cells.map((c, i) => {
              if (!c)
                return (
                  <div key={i} className="recap-blank">
                    —
                  </div>
                );
              const { find, side, unique, key } = c;
              const current = live && currentKey === key;
              const chosen = run
                ? current || (!live && selected === find.word)
                : selected === find.word;
              const missed = (showAll || difficultyMode) && !mine.has(find.word);
              const rating = difficulties?.[find.word];
              return (
                <div
                  key={side}
                  data-flip={key}
                  data-current={current}
                  className={`recap-word ${side} ${unique ? 'unique' : ''} ${chosen ? 'selected' : ''} ${missed ? 'missed' : ''}`}
                  style={{ opacity: run && hasTiming && (find.time ?? 0) > time ? 0.3 : 1 }}
                >
                  <button
                    type="button"
                    className="recap-word-button"
                    aria-pressed={chosen}
                    aria-label={difficultyMode ? `${find.word}, difficulty ${rating == null ? 'unavailable' : rating.toFixed(2)}` : undefined}
                    onClick={() => onSelect(find.word, find.time)}
                  >
                    <span
                      className="recap-stripe"
                      style={{ background: RARITY_VAR[wordRarity(find.score)] }}
                    />
                    {run && (
                      <span className={`recap-word-time ${current ? 'current' : ''}`}>
                        {hasTiming
                          ? formatTime(find.time ?? 0)
                          : `#${(side === 'you' ? yours : theirs!).findIndex((w) => w.word === find.word) + 1}`}
                      </span>
                    )}
                    <span className="recap-word-text">{find.word}</span>
                    {!difficultyMode && find.bonus && <span className="recap-bonus">{find.bonus}</span>}
                    <span className={difficultyMode ? 'recap-word-difficulty' : 'recap-word-points'}>{difficultyMode ? (rating == null ? '—' : rating.toFixed(2)) : `+${find.score}`}</span>
                  </button>
                  {!run && chosen && (
                    <div className="recap-definition-peek">
                      <span>{peek}</span>
                      <button type="button" onClick={onDefinition}>
                        More
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {!run && !comparing && (
        <button type="button" className="recap-all" onClick={onShowAll}>
          {difficultyMode ? 'Points' : showAll ? 'Found' : 'All words'}
        </button>
      )}
    </div>
  );
}
