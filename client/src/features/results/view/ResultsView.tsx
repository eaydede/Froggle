import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ResultsInsights, ResultsSource, ResultPlayer } from 'models/results';
import { findWordPath } from '../../../gameplay/findWordPath';
import { IconAction } from '../../../ui/IconAction';
import { WordDefinitionSheet } from '../components/WordDefinitionSheet';
import { useDefinition } from '../hooks/useDefinition';
import { RARITY_VAR, wordRarity } from '../utils/wordRarity';
import { Board } from './components/Board';
import { ResultsHero } from './components/ResultsHero';
import { Standings } from './components/Standings';
import { ResultsTabs, type ResultsTab } from '../recap/ResultsTabs';
import { RecapView } from '../recap/RecapView';
import { RunChart } from '../recap/RunChart';
import { HighlightsView } from '../recap/HighlightsView';
import { buildFinds } from '../recap/finds';
import { useResultsInsights } from '../recap/api';
import { useRunPlayback } from '../recap/useRunPlayback';
import { useResultsMotion } from '../recap/useResultsMotion';
import { formatTime, mergeRuns, scoreAt, timedFinds } from '../recap/run';
import type {
  LoadOpponentResult,
  ResultsBoardConfig,
  ResultsRosterEntry,
  ResultsViewer,
  ResultsOpponent,
} from './types';
import '../recap/recap.css';

interface ResultsViewProps {
  source?: ResultsSource;
  insights?: ResultsInsights;
  /** The viewer's own results — board + found/missed words + display info. */
  me: ResultsViewer;
  board: string[][];
  /** Optional bottom-right adornment per cell on the board preview.
   *  Forwarded to the preview Board so modes like the gauntlet's
   *  rare-letters round can surface per-letter point values. */
  boardCellBadge?: (row: number, col: number, letter: string) => ReactNode;
  config: ResultsBoardConfig;
  /** Standings roster. Must include the viewer (entry with isYou=true).
   *  length === 1 collapses to the solo state without standings. */
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
  /** Render proportional point bars in the standings (multiplayer rooms
   *  use this to show the spread). */
  standingsShowBars?: boolean;
  /** Format the trailing standings value. Defaults to raw points; Time is
   *  Money passes a formatter that shows the clock each run bought, since
   *  that's the stat the mode ranks on. */
  standingsFormatValue?: (points: number) => string;
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
  /** Optional solo-state hero override (e.g. daily/zen want HeroScore
   *  with a mode badge / rank crown). Defaults to the unified
   *  ResultsHero in solo mode. */
  soloHero?: ReactNode;
}

export function ResultsView(props: ResultsViewProps) {
  return (
    <ResultsScreen key={JSON.stringify(props.source) ?? props.board.flat().join(',')} {...props} />
  );
}

function ResultsScreen({
  me,
  board,
  boardCellBadge,
  config,
  roster,
  loadOpponent,
  initialOpponentId,
  standingsHeader = 'Standings',
  standingsShowBars = false,
  standingsFormatValue,
  topbar,
  topbarLabel,
  topbarOnClose,
  topbarOnShare,
  topbarShareCopied,
  topbarOnLabelClick,
  bottomActions,
  soloHero,
  source,
  insights: providedInsights,
}: ResultsViewProps) {
  const {
    insights,
    error: insightsError,
    loading: insightsLoading,
  } = useResultsInsights(source, providedInsights);
  const [view, setView] = useState<ResultsTab>('recap');
  const [run, setRun] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<ResultsOpponent | null>(null);
  const [opponentLoading, setOpponentLoading] = useState(false);
  const [opponentError, setOpponentError] = useState<string | null>(null);
  const [sheetWord, setSheetWord] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const request = useRef(0);
  const initialLoaded = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);
  const { body, comparisonLayer, captureRows, captureComparison } = useResultsMotion(
    view,
    run,
    opponent?.id ?? null,
  );

  const meRow = roster.find((r) => r.isYou);
  const recordedMe = insights?.players.find((p) => p.isYou);
  const recordedOpponent = insights?.players.find((p) => p.id === opponent?.id);
  const yours = useMemo(() => buildFinds(me.foundWords, recordedMe), [me.foundWords, recordedMe]);
  const theirs = useMemo(
    () => (opponent ? buildFinds(opponent.foundWords, recordedOpponent) : null),
    [opponent, recordedOpponent],
  );
  const all = [
    ...yours,
    ...me.missedWords.map((w) => ({ ...w, word: w.word.toUpperCase(), time: null })),
  ];
  const yourRun = timedFinds(yours, 'you');
  const oppRun = theirs ? timedFinds(theirs, 'opp') : null;
  const hasTiming =
    !!recordedMe && yourRun !== null && (!opponent || (!!recordedOpponent && oppRun !== null));
  const duration = Math.max(
    1,
    config.timeLimit,
    recordedMe?.duration ?? 0,
    recordedOpponent?.duration ?? 0,
    recordedMe?.timeLimit ?? 0,
    recordedOpponent?.timeLimit ?? 0,
  );
  const playback = useRunPlayback(duration);
  const live =
    run &&
    view === 'recap' &&
    hasTiming &&
    (playback.playing || playback.scrubbing || playback.time < duration);
  const events = mergeRuns(yourRun ?? [], oppRun ?? []);
  const current = live ? events.filter((f) => f.time <= playback.time).slice(-1)[0] : null;
  const focus = live ? (current?.word ?? null) : selected;
  const highlightPath = useMemo(() => (focus ? findWordPath(board, focus) : null), [board, focus]);
  const focusScore =
    all.find((w) => w.word === focus)?.score ?? theirs?.find((w) => w.word === focus)?.score;
  const highlightColor = focusScore ? RARITY_VAR[wordRarity(focusScore)] : null;
  const { definition, loading: definitionLoading } = useDefinition(selected);
  const sheet = useDefinition(sheetWord);
  const reset = () => {
    playback.reset();
    setSelected(null);
  };
  const selectView = (tab: ResultsTab) => {
    if (tab !== view) {
      reset();
      setView(tab);
    }
  };
  const selectRun = (next: boolean) => {
    if (next !== run) {
      captureRows();
      reset();
      setRun(next);
      setShowAll(false);
    }
  };
  const clearOpponent = () => {
    request.current++;
    if (opponent) captureComparison();
    setOpponentId(null);
    setOpponent(null);
    setOpponentError(null);
    setOpponentLoading(false);
    reset();
  };
  const selectOpponent = async (id: string) => {
    if (id === meRow?.id) return;
    if (id === opponentId) {
      clearOpponent();
      return;
    }
    if (!loadOpponent) return;
    const version = ++request.current;
    playback.seek(playback.time);
    setOpponentId(id);
    setOpponentLoading(true);
    setOpponentError(null);
    try {
      const result = await loadOpponent(id);
      if (request.current !== version) return;
      if (result.ok) {
        captureComparison();
        reset();
        setShowAll(false);
        setView('recap');
        setOpponent(result.opponent);
      } else {
        setOpponentId(opponent?.id ?? null);
        setOpponentError(opponentErrorLabel(result.error));
      }
    } catch {
      if (request.current === version) {
        setOpponentId(opponent?.id ?? null);
        setOpponentError("Couldn't load that comparison.");
      }
    } finally {
      if (request.current === version) setOpponentLoading(false);
    }
  };
  useEffect(() => {
    if (!initialOpponentId || !loadOpponent || initialLoaded.current) return;
    initialLoaded.current = true;
    void selectOpponent(initialOpponentId);
  }, [initialOpponentId, loadOpponent]);
  const selectWord = (word: string, time?: number | null) => {
    const same = selected === word;
    setSelected(same ? null : word);
    if (run && hasTiming && time != null)
      playback.seek(same ? duration : Math.min(duration, time + 0.4));
  };
  const fallbackPlayer: ResultPlayer = {
    id: meRow?.id ?? 'you',
    displayName: 'You',
    isYou: true,
    finds: yours,
    duration: config.timeLimit,
    timeLimit: config.timeLimit,
  };
  const players = insights?.players ?? [fallbackPlayer];
  const playerCount = insights?.players.length ?? Math.max(1, roster.length);
  const nowMe = live
    ? {
        ...me,
        points: scoreAt(yourRun!, playback.time),
        wordCount: yourRun!.filter((f) => f.time <= playback.time).length,
      }
    : me;
  const nowOpponent =
    opponent && live
      ? {
          ...opponent,
          points: scoreAt(oppRun!, playback.time),
          wordCount: oppRun!.filter((f) => f.time <= playback.time).length,
        }
      : opponent;
  const opponentRow = roster.find((r) => r.id === opponent?.id);

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
        <div className="shrink-0">
          {!opponent && !live && soloHero ? (
            soloHero
          ) : (
            <ResultsHero
              me={nowMe}
              myRank={meRow?.rank ?? null}
              totalPlayers={roster.length}
              opponent={nowOpponent}
              oppRank={opponentRow?.rank ?? null}
              compact
              liveSubtitle={
                live && !opponent
                  ? `${formatTime(playback.time)} · ${nowMe.wordCount} of ${me.wordCount} words`
                  : undefined
              }
            />
          )}
        </div>
        <section className="flex items-stretch gap-2 shrink-0 box-border">
          {roster.length > 1 && (
            <Standings
              rows={roster}
              selectedId={opponentId}
              onSelect={selectOpponent}
              header={standingsHeader}
              compact
              maxHeight="160px"
              showBars={standingsShowBars}
              formatValue={standingsFormatValue}
            />
          )}
          <div className={roster.length > 1 ? '' : 'flex-1 flex justify-center'}>
            <Board
              board={board}
              highlightPath={highlightPath}
              highlightColor={highlightColor}
              config={config}
              compact
              cellBadge={boardCellBadge}
            />
          </div>
        </section>
        <section className="results-recap">
          <ResultsTabs
            view={view}
            onView={selectView}
            run={run}
            onRun={selectRun}
            canRun={!insightsLoading}
            comparing={opponentId !== null}
            onExit={clearOpponent}
            meta={`${playerCount} ${playerCount === 1 ? 'player' : 'players'}`}
          />
          {opponentLoading && (
            <div role="status" className="results-comparison-status">
              Loading comparison…
            </div>
          )}
          {opponentError && (
            <div role="alert" className="results-status">
              {opponentError}
            </div>
          )}
          <div className="results-view-region">
            <div
              ref={body}
              id="results-panel"
              role="tabpanel"
              aria-busy={opponentLoading}
              aria-labelledby={`results-tab-${view}`}
              className="results-view-body"
            >
              {view === 'recap' && (
                <>
                  {run &&
                    (hasTiming ? (
                      <RunChart
                        you={yourRun!}
                        opponent={opponent ? oppRun : null}
                        duration={duration}
                        yourFinish={recordedMe?.duration ?? duration}
                        opponentFinish={recordedOpponent?.duration ?? duration}
                        time={playback.time}
                        playing={playback.playing}
                        live={live}
                        onPlay={() => {
                          setSelected(null);
                          if (playback.time >= duration && scroller.current)
                            scroller.current.scrollTop = 0;
                          playback.toggle();
                        }}
                        onScrub={(time) => {
                          setSelected(null);
                          playback.seek(time);
                        }}
                        onScrubbing={playback.setScrubbing}
                      />
                    ) : (
                      <p className="results-status">
                        {insightsError ? (
                          'Couldn’t load run data. Try reloading this page.'
                        ) : (
                          <>
                            Timestamps weren’t recorded for this game.
                            <br />
                            Showing find order.
                          </>
                        )}
                      </p>
                    ))}
                  <RecapView
                    yours={yours}
                    theirs={theirs}
                    all={all}
                    opponentName={opponent?.displayName}
                    run={run}
                    hasTiming={hasTiming}
                    events={events}
                    showAll={showAll}
                    onShowAll={() => {
                      setShowAll(!showAll);
                      setSelected(null);
                      if (scroller.current) scroller.current.scrollTop = 0;
                    }}
                    selected={selected}
                    currentKey={current?.key ?? null}
                    live={live}
                    time={playback.time}
                    onSelect={selectWord}
                    peek={
                      definitionLoading
                        ? 'Looking up…'
                        : (definition?.meanings[0]?.definitions[0]?.definition ??
                          'No definition found')
                    }
                    onDefinition={() => {
                      setSheetWord(selected);
                      setSheetOpen(true);
                    }}
                    scroller={scroller}
                  />
                </>
              )}
              {view === 'highlights' &&
                (insightsLoading ? (
                  <p className="results-status">Loading highlights…</p>
                ) : insightsError ? (
                  <p role="alert" className="results-status">
                    Couldn’t load the field’s highlights.
                  </p>
                ) : (
                  <HighlightsView
                    players={players}
                    selected={selected}
                    onSelect={selectWord}
                    onCompare={selectOpponent}
                  />
                ))}
            </div>
            <div ref={comparisonLayer} className="results-transition-layer" aria-hidden="true" />
          </div>
        </section>
        <div className="shrink-0">{bottomActions}</div>
      </main>
      <WordDefinitionSheet
        open={sheetOpen}
        word={sheetWord ?? ''}
        definition={sheet.definition}
        loading={sheet.loading}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}

function opponentErrorLabel(error: string): string {
  if (error === 'unplayed') return "Finish today's puzzle first.";
  if (error === 'opponent-missing') return "That player doesn't have a result yet.";
  if (error === 'forbidden') return 'Pick another player to compare.';
  return "Couldn't load that comparison.";
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
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
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
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        )}
      </IconAction>
    </header>
  );
}
