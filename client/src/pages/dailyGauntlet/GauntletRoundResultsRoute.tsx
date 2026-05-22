import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { GAUNTLET_ROUND_COUNT } from 'models/gauntlet';
import { useGame } from '../../GameContext';
import {
  fetchGauntletCompare,
  fetchGauntletLeaderboard,
  fetchGauntletRoundResult,
  type GauntletLeaderboardResponse,
  type GauntletRoundResultResponse,
} from '../../shared/api/gauntletApi';
import type {
  LoadOpponentResult,
  ResultsRosterEntry,
} from '../../shared/results/types';
import { scoreGauntletWord } from '../../shared/utils/gauntletScore';
import { findWordPath } from '../../shared/utils/findWordPath';
import { ResultsView } from '../../shared/results/ResultsView';
import { IconAction } from '../../shared/components/IconAction';
import { DateChip } from '../../shared/components/DateChip';
import { ActionButton } from '../../shared/results/components/ActionButton';
import { roundTitle, modifierDescription } from './modifierDisplay';

// Per-round results, presented through the same shared ResultsView the
// timed daily and free play use. Round-specific tweaks are confined to
// the topbar label, the bottom-action pair (Home + Next round / See
// standings), and a Cell-decoration callback that surfaces the round's
// modifier visually on the board preview.
export function GauntletRoundResultsRoute() {
  const { round } = useParams<{ round: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromStandings = searchParams.get('from') === 'standings';
  const { authReady, displayName } = useGame();
  const roundIndex = Number(round);
  const [result, setResult] = useState<GauntletRoundResultResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<GauntletLeaderboardResponse | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!authReady || !Number.isFinite(roundIndex)) return;
    let cancelled = false;
    (async () => {
      const today = new Date().toLocaleDateString('en-CA', {
        timeZone: 'America/Los_Angeles',
      });
      const [r, lb] = await Promise.all([
        fetchGauntletRoundResult(today, roundIndex),
        fetchGauntletLeaderboard(today).catch(() => null),
      ]);
      if (cancelled) return;
      setResult(r);
      setLeaderboard(lb);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, roundIndex]);

  // Same render-time navigate guard as the play route — the redirect
  // is deferred to an effect so it doesn't fire during render.
  useEffect(() => {
    if (loaded && !result) {
      navigate('/daily/gauntlet', { replace: true });
    }
  }, [loaded, result, navigate]);

  if (!loaded || !result) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)]" />
    );
  }

  const modifier = result.modifier;
  // For hot-letter rounds, mark every word that contains the hot letter
  // so the post-round list reflects the same purple bonus indicator the
  // player saw flash during play.
  const hotLetter =
    modifier.kind === 'hotLetter' ? modifier.letter.toUpperCase() : null;
  const bonusFor = (word: string): string | null => {
    if (!hotLetter || modifier.kind !== 'hotLetter') return null;
    return word.toUpperCase().includes(hotLetter) ? `${modifier.multiplier}×` : null;
  };
  // Resolve a path for every found word so tap-to-replay actually
  // animates on the preview board. The server returns word strings
  // without paths (missed_words ship with paths, found_words don't), so
  // we re-derive against the stored board. findWordPath returns null
  // for words it can't trace, which is acceptable — they just won't
  // animate, same as the daily today.
  const foundWords = result.found_words.map((word) => ({
    word,
    path: findWordPath(result.board, word) ?? [],
    score: scoreGauntletWord(word, modifier),
    bonus: bonusFor(word),
  }));
  const missedWords = result.missed_words.map((m) => ({
    word: m.word,
    path: m.path,
    score: m.score,
    bonus: bonusFor(m.word),
  }));
  const totalPoints = foundWords.reduce((sum, w) => sum + w.score, 0);

  // Per-round roster comes from the leaderboard endpoint, filtered to
  // this round. If the player tapped into a round mid-gauntlet before
  // anyone else has finished it, the list collapses to just the viewer
  // and ResultsView falls back to the solo presentation automatically.
  const currentUserId = leaderboard?.currentUserId ?? null;
  const roundEntries = leaderboard?.perRound.filter((r) => r.roundIndex === roundIndex) ?? [];
  const roster: ResultsRosterEntry[] = roundEntries.length > 0
    ? roundEntries
        .slice()
        .sort((a, b) => a.rank - b.rank)
        .map((r) => ({
          id: r.userId,
          rank: r.rank,
          displayName: r.userId === currentUserId
            ? (displayName || r.displayName || 'You')
            : r.displayName,
          points: r.points,
          isYou: r.userId === currentUserId,
        }))
    : [
        {
          id: 'me',
          rank: 1,
          displayName: displayName || 'You',
          points: totalPoints,
          isYou: true,
        },
      ];

  const loadOpponent = async (userId: string): Promise<LoadOpponentResult> => {
    const today = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Los_Angeles',
    });
    const cmp = await fetchGauntletCompare(today, roundIndex, userId);
    if (!cmp.ok) return { ok: false, error: cmp.error };
    return {
      ok: true,
      opponent: {
        id: userId,
        displayName: cmp.data.them.displayName,
        points: cmp.data.them.points,
        wordCount: cmp.data.them.wordCount,
        foundWords: cmp.data.them.foundWords,
      },
    };
  };

  const isLastRound = roundIndex >= GAUNTLET_ROUND_COUNT - 1;
  // From the standings page, all rounds are finished — "Next round" jumps
  // to the next round's results (not confirm). From the mid-play flow,
  // the next round is unstarted by definition, so it goes to confirm.
  const advance = () => {
    if (isLastRound) {
      navigate('/daily/gauntlet/results');
      return;
    }
    if (fromStandings) {
      navigate(`/daily/gauntlet/round/${roundIndex + 1}/results?from=standings`);
      return;
    }
    navigate(`/daily/gauntlet/round/${roundIndex + 1}`);
  };

  // Back nav: from standings, both X and the secondary action route back
  // to the standings page; from the mid-play flow, X exits to home and
  // the secondary action stays "Home" as well.
  const onClose = () =>
    fromStandings ? navigate('/daily/gauntlet/results') : navigate('/');

  // For the rare-letters round, surface the per-cell point values on
  // the preview board so a player reading their results can match a
  // word's score to the letters that produced it.
  const boardCellBadge =
    modifier.kind === 'rareLetters'
      ? (_r: number, _c: number, letter: string) => {
          let total = 0;
          for (const ch of letter.toUpperCase()) total += modifier.values[ch] ?? 0;
          return total > 0 ? total : null;
        }
      : undefined;

  return (
    <ResultsView
      me={{
        displayName: displayName || 'You',
        points: totalPoints,
        wordCount: foundWords.length,
        foundWords,
        missedWords,
      }}
      board={result.board}
      boardCellBadge={boardCellBadge}
      config={result.config}
      roster={roster}
      loadOpponent={loadOpponent}
      standingsHeader="Round leaderboard"
      compareSourceLabel="leaderboard"
      soloPlaceholderVariant="wait"
      topbar={
        <GauntletTopbar
          label={`Gauntlet R${roundIndex + 1} · ${roundTitle(result.roundKind)}`}
          onClose={onClose}
          rulePopover={modifierDescription(modifier)}
        />
      }
      bottomActions={
        <GauntletBottomActions
          isLastRound={isLastRound}
          fromStandings={fromStandings}
          onBack={onClose}
          onAdvance={advance}
        />
      }
    />
  );
}

function GauntletTopbar({
  label,
  onClose,
  rulePopover,
}: {
  label: string;
  onClose: () => void;
  rulePopover: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <header
      className="grid items-center gap-2 shrink-0 relative"
      style={{ gridTemplateColumns: '32px 1fr 32px' }}
    >
      <IconAction onClick={onClose} label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </IconAction>
      <div className="flex justify-center min-w-0">
        <DateChip label={label} />
      </div>
      <IconAction onClick={() => setOpen((v) => !v)} label="Scoring rule">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </IconAction>
      {open && (
        <div className="absolute top-full right-0 mt-2 z-20 max-w-[280px] rounded-xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] px-3 py-3">
          <div
            className="text-caption uppercase tracking-[0.06em] text-[color:var(--ink-muted)] mb-1 font-[family-name:var(--font-structure)]"
            style={{ fontWeight: 700 }}
          >
            Scoring rule
          </div>
          <p className="text-small text-[color:var(--ink)] leading-[1.5] m-0">{rulePopover}</p>
        </div>
      )}
    </header>
  );
}

function GauntletBottomActions({
  isLastRound,
  fromStandings,
  onBack,
  onAdvance,
}: {
  isLastRound: boolean;
  fromStandings: boolean;
  onBack: () => void;
  onAdvance: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <ActionButton
        onClick={onBack}
        label={fromStandings ? 'Back' : 'Home'}
        icon={
          fromStandings ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11l9-8 9 8" />
              <path d="M5 10v10h14V10" />
              <path d="M9 20v-6h6v6" />
            </svg>
          )
        }
      />
      <ActionButton
        onClick={onAdvance}
        label={isLastRound ? (fromStandings ? 'See standings' : 'See standings') : 'Next round'}
        primary
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        }
      />
    </div>
  );
}

