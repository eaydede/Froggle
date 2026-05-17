import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Position } from 'models';
import { IconAction } from '../components/IconAction';
import { findWordPath } from '../utils/findWordPath';
import { WordsCard } from '../../pages/results/components/WordsCard';
import { WordDefinitionPanel } from '../../pages/results/components/WordDefinitionPanel';
import { Board } from './components/Board';
import { ResultsHero } from './components/ResultsHero';
import { Standings } from './components/Standings';
import { Placeholders } from './components/Placeholders';
import { WordList, type DisplayWordRow } from './components/WordList';
import type {
  LoadOpponentError,
  LoadOpponentResult,
  ResultsBoardConfig,
  ResultsOpponent,
  ResultsRosterEntry,
  ResultsViewer,
} from './types';

interface ResultsViewProps {
  /** The viewer's own results — board + found/missed words + display info. */
  me: ResultsViewer;
  board: string[][];
  config: ResultsBoardConfig;
  /** Standings roster. Must include the viewer (entry with isYou=true).
   *  length === 1 collapses to the solo state (no standings panel; right
   *  column becomes the share prompt). */
  roster: ResultsRosterEntry[];
  /** Loader for the selected opponent's full word list. Resolves
   *  synchronously for pre-loaded data (free-play challenge), async for
   *  daily / zen which fetch on demand. */
  loadOpponent?: (id: string) => Promise<LoadOpponentResult>;
  /** Pre-selected opponent — used when arriving from a "compare with X"
   *  link (?compare=USER_ID, ?compare=owner). */
  initialOpponentId?: string | null;
  /** Standings header label — "Standings" vs "Leaderboard". */
  standingsHeader?: string;
  /** Source label in the compare prompt ("Tap any name in the X"). */
  compareSourceLabel?: string;
  /** Per-word find percent — when provided, WordsCard renders the
   *  popularity affordance in solo mode. */
  findPercents?: Record<string, number>;
  popularityStyle?: 'inline';
  /** Custom topbar. If omitted, a default Close/Label/Share bar is
   *  rendered using the topbar fields below. */
  topbar?: ReactNode;
  topbarLabel?: string;
  topbarOnClose?: () => void;
  topbarOnShare?: () => void;
  topbarShareCopied?: boolean;
  topbarOnLabelClick?: () => void;
  /** Bottom CTA row (Home/Leaderboard, or Play again). */
  bottomActions: ReactNode;
  /** Right-column placeholder when the viewer is the only player in the
   *  roster. Free-play defaults to a Share nudge; daily/zen pass 'wait'
   *  since there's nothing to share — comparisons surface as other
   *  players finish today's puzzle. */
  soloPlaceholderVariant?: 'share' | 'wait';
  /** Optional solo-state hero override (e.g. daily/zen want HeroScore
   *  with a mode badge / rank crown). Defaults to the unified
   *  ResultsHero in solo mode. */
  soloHero?: ReactNode;
}

export function ResultsView({
  me,
  board,
  config,
  roster,
  loadOpponent,
  initialOpponentId,
  standingsHeader = 'Standings',
  compareSourceLabel = 'standings',
  findPercents,
  popularityStyle,
  topbar,
  topbarLabel,
  topbarOnClose,
  topbarOnShare,
  topbarShareCopied,
  topbarOnLabelClick,
  bottomActions,
  soloHero,
  soloPlaceholderVariant = 'share',
}: ResultsViewProps) {
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null);
  const [highlightPath, setHighlightPath] = useState<Position[] | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<ResultsOpponent | null>(null);
  const [opponentLoading, setOpponentLoading] = useState(false);
  const [opponentError, setOpponentError] = useState<LoadOpponentError | null>(null);
  const loadedInitialRef = useRef<string | null>(null);

  const meRow = roster.find((r) => r.isYou) ?? null;
  const isMulti = roster.length > 1;

  const handleHighlight = (word: string | null, path: Position[] | null) => {
    setHighlightedWord(word ? word.toUpperCase() : null);
    setHighlightPath(path);
  };

  const clearOpponent = () => {
    setOpponentId(null);
    setOpponent(null);
    setOpponentError(null);
    setOpponentLoading(false);
    setHighlightedWord(null);
    setHighlightPath(null);
  };

  const handleSelectOpponent = async (id: string) => {
    if (!loadOpponent) return;
    if (opponentId === id) {
      clearOpponent();
      return;
    }
    // Keep the previous opponent's data visible while loading so the
    // versus hero + aligned word lists don't collapse to solo for a
    // frame between selections.
    setOpponentId(id);
    setOpponentError(null);
    setOpponentLoading(true);
    setHighlightedWord(null);
    setHighlightPath(null);

    const result = await loadOpponent(id);
    setOpponentLoading(false);
    if (result.ok) {
      setOpponent(result.opponent);
    } else {
      setOpponent(null);
      setOpponentError(result.error);
    }
  };

  useEffect(() => {
    if (!initialOpponentId || !loadOpponent) return;
    if (loadedInitialRef.current === initialOpponentId) return;
    loadedInitialRef.current = initialOpponentId;
    void handleSelectOpponent(initialOpponentId);
    // handleSelectOpponent intentionally stays local; this effect is
    // keyed only by the URL-provided opponent and loader availability.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOpponentId, loadOpponent]);

  // When the hero is in versus mode, the highlighted-word path comes from
  // an on-the-fly solve over the shared board so opponent-only words
  // light up too.
  const comparePathByWord = useMemo(
    () => (opponent ? buildComparePathMap(board, me, opponent) : null),
    [opponent, board, me],
  );

  const activeHighlightPath = useMemo(() => {
    if (!opponent || !comparePathByWord || !highlightedWord) return highlightPath;
    return comparePathByWord.get(highlightedWord) ?? null;
  }, [opponent, comparePathByWord, highlightedWord, highlightPath]);

  const youCompareRows = useMemo(
    () => (opponent ? alignedRows(me, opponent, 'you', highlightedWord) : null),
    [opponent, me, highlightedWord],
  );
  const oppCompareRows = useMemo(
    () => (opponent ? alignedRows(me, opponent, 'opp', highlightedWord) : null),
    [opponent, me, highlightedWord],
  );

  const scrollSync = useScrollSync(!!opponent);

  const opponentRosterRow = opponent
    ? roster.find((r) => r.id === opponent.id) ?? null
    : null;

  return (
    <div className="fixed inset-0 flex justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)] overflow-hidden">
      <main
        className="w-full max-w-[360px] box-border flex flex-col p-4 gap-3"
        style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}
      >
        {topbar ?? (
          <DefaultTopbar
            label={topbarLabel ?? ''}
            onClose={topbarOnClose ?? (() => {})}
            onShare={topbarOnShare ?? (() => {})}
            shareCopied={!!topbarShareCopied}
            onLabelClick={topbarOnLabelClick}
          />
        )}

        {opponent && meRow && opponentRosterRow ? (
          <ResultsHero
            me={{
              displayName: 'You',
              points: me.points,
              wordCount: me.wordCount,
            }}
            myRank={meRow.rank}
            totalPlayers={roster.length}
            opponent={{
              displayName: opponent.displayName,
              points: opponent.points,
              wordCount: opponent.wordCount,
            }}
            oppRank={opponentRosterRow.rank}
            compact
          />
        ) : (
          soloHero ?? (
            <ResultsHero
              me={{
                displayName: me.displayName,
                points: me.points,
                wordCount: me.wordCount,
              }}
              myRank={meRow?.rank ?? 1}
              totalPlayers={roster.length}
              opponent={null}
              oppRank={null}
              compact
            />
          )
        )}

        <section className="flex items-stretch gap-2 shrink-0 box-border">
          {isMulti && (
            <Standings
              rows={roster}
              selectedId={opponentId}
              onSelect={handleSelectOpponent}
              header={standingsHeader}
              compact
              maxHeight="190px"
            />
          )}
          <div className={isMulti ? '' : 'flex-1 flex justify-center'}>
            <Board
              board={board}
              highlightPath={activeHighlightPath}
              config={config}
              compact
            />
          </div>
        </section>

        <section className="flex justify-between items-stretch gap-2 flex-1 min-h-0 box-border">
          <div className="w-1/2 flex flex-col min-h-0">
            {opponent && youCompareRows ? (
              <WordList
                side="you"
                headerLabel={`You · ${me.wordCount}`}
                headerTrail={String(me.points)}
                rows={youCompareRows}
                onWordTap={(w) => {
                  const normalized = w.toUpperCase();
                  setHighlightedWord((prev) =>
                    prev === normalized ? null : normalized,
                  );
                  setHighlightPath(null);
                }}
                scrollSync={scrollSync.left}
                compact
              />
            ) : (
              <WordsCard
                foundWords={me.foundWords}
                missedWords={me.missedWords}
                showMissedTab={me.missedWords.length > 0}
                highlightedWord={highlightedWord}
                onHighlightWord={handleHighlight}
                findPercents={findPercents}
                popularityStyle={popularityStyle}
              />
            )}
          </div>
          <div className="w-1/2 flex flex-col min-h-0">
            {opponent && oppCompareRows ? (
              <WordList
                side="opp"
                headerLabel={`${opponent.displayName} · ${opponent.wordCount}`}
                headerTrail={String(opponent.points)}
                footer={{ label: 'Stop', arrow: '›', onClick: clearOpponent }}
                rows={oppCompareRows}
                onWordTap={(w) => {
                  const normalized = w.toUpperCase();
                  setHighlightedWord((prev) =>
                    prev === normalized ? null : normalized,
                  );
                  setHighlightPath(null);
                }}
                scrollSync={scrollSync.right}
                compact
              />
            ) : (
              <Placeholders
                variant={isMulti ? 'compare' : soloPlaceholderVariant}
                onShare={!isMulti && soloPlaceholderVariant === 'share' ? topbarOnShare : undefined}
                compact
                compareSourceLabel={compareSourceLabel}
                definitionSlot={
                  opponentLoading ? (
                    <InlineStatus label="Loading comparison" />
                  ) : opponentError ? (
                    <InlineStatus label={opponentErrorLabel(opponentError)} />
                  ) : highlightedWord ? (
                    <WordDefinitionPanel word={highlightedWord} fitContainer />
                  ) : undefined
                }
              />
            )}
          </div>
        </section>

        <div className="shrink-0">{bottomActions}</div>
      </main>
    </div>
  );
}

function DefaultTopbar({
  label,
  onClose,
  onShare,
  shareCopied,
  onLabelClick,
}: {
  label: string;
  onClose: () => void;
  onShare: () => void;
  shareCopied: boolean;
  onLabelClick?: () => void;
}) {
  return (
    <header
      className="grid items-center gap-2 shrink-0"
      style={{ gridTemplateColumns: '32px 1fr 32px' }}
    >
      <IconAction onClick={onClose} label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </IconAction>
      <div className="flex justify-center min-w-0">
        <button
          type="button"
          onClick={onLabelClick}
          disabled={!onLabelClick}
          className="truncate font-[family-name:var(--font-structure)] uppercase text-label-xs tracking-[0.08em] text-[color:var(--ink-muted)] border-0 bg-transparent px-2 py-1"
          style={{
            fontWeight: 700,
            cursor: onLabelClick ? 'pointer' : 'default',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {label}
        </button>
      </div>
      <IconAction onClick={onShare} label={shareCopied ? 'Copied to clipboard' : 'Share'}>
        {shareCopied ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        )}
      </IconAction>
    </header>
  );
}

function InlineStatus({ label }: { label: string }) {
  return (
    <div
      className="w-full h-full flex items-center justify-center text-center rounded-xl px-3 py-2 text-[10px] italic leading-[1.35] text-[color:var(--ink-soft)] font-[family-name:var(--font-display)]"
      style={{ border: '1.5px dashed var(--ink-faint)', background: 'transparent' }}
    >
      {label}
    </div>
  );
}

function opponentErrorLabel(error: string): string {
  if (error === 'unplayed') return "Finish today's puzzle first.";
  if (error === 'opponent-missing') return "That player doesn't have a result yet.";
  if (error === 'forbidden') return 'Pick another player to compare.';
  return "Couldn't load that comparison.";
}

function buildComparePathMap(
  board: string[][],
  me: ResultsViewer,
  opponent: ResultsOpponent,
): Map<string, Position[]> {
  const map = new Map<string, Position[]>();
  const allWords = new Set<string>();
  for (const w of me.foundWords) allWords.add(w.word.toUpperCase());
  for (const w of opponent.foundWords) allWords.add(w.word.toUpperCase());
  for (const word of allWords) {
    const path = findWordPath(board, word);
    if (path) map.set(word, path);
  }
  return map;
}

function alignedRows(
  me: ResultsViewer,
  opponent: ResultsOpponent,
  side: 'you' | 'opp',
  highlightedWord: string | null,
): DisplayWordRow[] {
  const youMap = new Map(me.foundWords.map((w) => [w.word.toUpperCase(), w]));
  const oppMap = new Map(
    opponent.foundWords.map((w) => [w.word.toUpperCase(), w]),
  );
  const union = new Set<string>([...youMap.keys(), ...oppMap.keys()]);

  const entries = Array.from(union).map((word) => {
    const youWord = youMap.get(word);
    const oppWord = oppMap.get(word);
    const score = Math.max(youWord?.score ?? 0, oppWord?.score ?? 0);
    return { word, score, youWord, oppWord };
  });
  entries.sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));

  return entries.map((e) => {
    const onThisSide = side === 'you' ? e.youWord : e.oppWord;
    const onOtherSide = side === 'you' ? e.oppWord : e.youWord;
    if (!onThisSide) {
      return { key: `${side}:${e.word}`, word: null, score: e.score };
    }
    return {
      key: `${side}:${e.word}`,
      word: e.word,
      score: e.score,
      unique: !onOtherSide,
      highlighted: highlightedWord === e.word,
    };
  });
}

function useScrollSync(active: boolean) {
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  // Per-side "ignore the next scroll event" flags. When we programmatically
  // set scrollTop on the other side, that write queues a scroll event we
  // must drop so it doesn't echo back. A single shared flag would also
  // swallow legitimate follow-up scrolls from the active side that fire
  // before rAF clears it — which is what made momentum scrolling stutter.
  const ignoreNextRef = useRef({ left: false, right: false });

  const sync = (source: 'left' | 'right') => {
    if (!active) return;
    if (ignoreNextRef.current[source]) {
      ignoreNextRef.current[source] = false;
      return;
    }
    const from = source === 'left' ? leftRef.current : rightRef.current;
    const to = source === 'left' ? rightRef.current : leftRef.current;
    if (!from || !to) return;
    if (to.scrollTop !== from.scrollTop) {
      ignoreNextRef.current[source === 'left' ? 'right' : 'left'] = true;
      to.scrollTop = from.scrollTop;
    }
  };

  return {
    left: {
      register: (el: HTMLDivElement | null) => {
        if (leftRef.current) leftRef.current.onscroll = null;
        leftRef.current = el;
        if (el) el.onscroll = () => sync('left');
      },
    },
    right: {
      register: (el: HTMLDivElement | null) => {
        if (rightRef.current) rightRef.current.onscroll = null;
        rightRef.current = el;
        if (el) el.onscroll = () => sync('right');
      },
    },
  };
}
