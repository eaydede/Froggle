import { useEffect, useMemo, useState } from 'react';
import type { InvalidSubmission } from 'models';
import type { MultiplayerRoom } from 'models/multiplayer';
import { assignCompetitionRanks } from 'models/ranking';
import { ActionButton } from '../../shared/results/components/ActionButton';
import { Standings } from '../../shared/results/components/Standings';
import { ResultsView } from '../../shared/results/ResultsView';
import type {
  LoadOpponentResult,
  ResultsRosterEntry,
  ResultsViewer,
} from '../../shared/results/types';
import { findWordPath } from '../../shared/utils/findWordPath';
import { scoreWord } from '../../shared/utils/score';
import { fetchRoomWords, shareRoomChallenge } from '../../shared/api/multiplayerApi';
import { encodeGameLink } from '../../shared/utils/gameLink';
import { useShareText } from '../results/hooks/useShareText';
import { RoomResultsHero } from './RoomResultsHero';

interface RoomResultsProps {
  room: MultiplayerRoom;
  youId: string | null;
  isHost: boolean;
  onStartNext: () => void;
  onReturnToLobby: () => void;
  /** Non-host: step back to the lobby view to wait for the next round. */
  onBackToLobby: () => void;
  onLeave: () => void;
}

// Multi-player results screen. Reuses the shared ResultsView (so board
// preview, standings, and compare-by-tapping-a-player all match the
// daily/challenge experience) but feeds it from the live room state and
// swaps the bottom CTA for round-flow buttons.
export function RoomResults({
  room,
  youId,
  isHost,
  onStartNext,
  onReturnToLobby,
  onBackToLobby,
  onLeave,
}: RoomResultsProps) {
  const board = room.currentBoard;

  // The board's full found-able word list — fetched once the round has
  // ended so the word list can show missed words, exactly like the daily
  // and challenge results pages. Keyed on the board's start so it refetches
  // for each new round.
  const [allWords, setAllWords] = useState<string[]>([]);
  const boardStartedAt = board?.startedAt ?? null;
  useEffect(() => {
    if (boardStartedAt === null) return;
    let cancelled = false;
    fetchRoomWords(room.code)
      .then((words) => {
        if (!cancelled) setAllWords(words);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [room.code, boardStartedAt]);

  // Rank only the players who were dealt into this board. Late joiners sit
  // in lobby status server-side and never played this round, so including
  // them would inflate the player count and shuffle ranks with phantom
  // zero-score entrants. (Older boards without the set fall back to the
  // full roster.)
  const ranked = useMemo(() => {
    const ids = board?.participantIds;
    // Only the boards missing the set entirely (undefined) fall back to the
    // full roster. An *empty* set is meaningful — it means nobody was dealt
    // in — so it must filter to nobody rather than being treated as "no set"
    // (an empty array is truthy), which would rank the whole roster.
    const participants = ids === undefined
      ? room.players
      : room.players.filter((p) => ids.includes(p.id));
    return rankByPoints(participants);
  }, [room.players, board]);
  const me = ranked.find((p) => p.id === youId) ?? null;

  // Outcome the hero needs: who won, by how much, and how far back you
  // landed — the closeness story, not just the raw score.
  const outcome = useMemo(() => {
    const topPoints = ranked[0]?.points ?? 0;
    const below = ranked.filter((p) => p.points < topPoints);
    const secondPoints = below.length ? below[0].points : topPoints;
    const rank1Count = ranked.filter((p) => p.rank === 1).length;
    return {
      topPoints,
      topMargin: topPoints - secondPoints,
      winnerName: ranked[0]?.displayName ?? '',
      rank1Count,
      scoreless: topPoints === 0,
    };
  }, [ranked]);

  const roster: ResultsRosterEntry[] = useMemo(
    () =>
      ranked.map((p) => ({
        id: p.id,
        rank: p.rank,
        displayName: p.displayName,
        points: p.points,
        isYou: p.id === youId,
        leftEarly: p.left,
      })),
    [ranked, youId],
  );

  const viewer: ResultsViewer | null = useMemo(() => {
    if (!me || !board) return null;
    return {
      displayName: me.displayName,
      points: me.points,
      wordCount: me.wordCount,
      foundWords: me.foundWords.map((word, i) => ({
        word,
        score: scoreWord(word),
        path: findWordPath(board.board, word) ?? [],
        timeSeconds: me.foundWordTimes?.[i] ?? null,
      })),
      // Every found-able word the viewer didn't get. Paths + scores are
      // derived client-side (same as found words) so the word list shows
      // the full found/missed breakdown like other results pages.
      missedWords: (() => {
        const got = new Set(me.foundWords.map((w) => w.toUpperCase()));
        return allWords
          .filter((w) => !got.has(w.toUpperCase()))
          .map((word) => ({
            word,
            score: scoreWord(word),
            path: findWordPath(board.board, word) ?? [],
          }));
      })(),
      invalidSubmissions: me.invalidSubmissions,
    };
  }, [me, board, allWords]);

  // Share the just-played board as an async challenge. The board's results
  // are persisted as free_play_sessions when it ends, so the server can
  // promote the caller's row into a challenge — recipients then play the same
  // seeded board on their own time and land on the shared leaderboard, exactly
  // like a solo free-play challenge. Minted lazily on tap so a results render
  // never fires the request.
  const { share, copied } = useShareText(async () => {
    const minted = await shareRoomChallenge(room.code);
    if (!minted) return 'Froggle';
    return `Froggle challenge — ${encodeGameLink({
      boardSize: minted.config.boardSize,
      seed: minted.seed,
      timer: minted.config.timeLimit,
      minWordLength: minted.config.minWordLength,
      challengeId: minted.challengeId,
    })}`;
  });

  const loadOpponent = async (id: string): Promise<LoadOpponentResult> => {
    const opp = room.players.find((p) => p.id === id);
    if (!opp || !board) return { ok: false, error: 'opponent-missing' };
    return {
      ok: true,
      opponent: {
        id: opp.id,
        displayName: opp.displayName,
        points: opp.points,
        wordCount: opp.wordCount,
        foundWords: opp.foundWords.map((word, i) => ({
          word,
          score: scoreWord(word),
          timeSeconds: opp.foundWordTimes[i] ?? null,
        })),
        invalidSubmissions: opp.invalidSubmissions,
      },
    };
  };

  if (!board) return null;

  // A player who joined mid-round isn't in this board's participant set, so
  // they have no "you" row to anchor the personal scoresheet. Rather than
  // render nothing, show them the round's standings as a spectator with the
  // same round-flow controls, so the screen isn't blank and (if they've
  // since become host) they can still start the next round.
  if (!me || !viewer) {
    return (
      <SpectatorResults
        roomCode={room.code}
        roster={roster}
        isHost={isHost}
        onStartNext={onStartNext}
        onReturnToLobby={onReturnToLobby}
        onBackToLobby={onBackToLobby}
        onLeave={onLeave}
      />
    );
  }

  // A room of one is a single-player game under the hood — drop the
  // competitive framing (no "you won" hero, no standings, no rank) so it reads
  // like the solo results page. ResultsView already collapses standings for a
  // roster of one; here we also swap the hero and offer Share + Play again.
  const isSolo = roster.length <= 1;

  const isWinner = me.rank === 1 && outcome.rank1Count === 1 && !outcome.scoreless;
  const isTie = me.rank === 1 && outcome.rank1Count > 1 && !outcome.scoreless;
  const hero = (
    <RoomResultsHero
      points={me.points}
      wordCount={me.wordCount}
      rank={me.rank}
      totalPlayers={roster.length}
      isWinner={isWinner}
      isTie={isTie}
      winnerName={outcome.winnerName}
      topMargin={outcome.topMargin}
      behindBy={outcome.topPoints - me.points}
      scoreless={outcome.scoreless}
    />
  );

  // Standings inside ResultsView is the per-player roster, so a separate
  // PlayersStrip on this screen would just duplicate that information.
  // The room's players are visible on every other screen via the strip,
  // and on results they're visible via Standings.
  return (
    <ResultsView
      me={viewer}
      board={board.board}
      config={{
        boardSize: board.config.boardSize,
        minWordLength: board.config.minWordLength,
        timeLimit: board.config.durationSeconds,
      }}
      roster={roster}
      loadOpponent={loadOpponent}
      standingsHeader="Standings"
      standingsShowBars
      compareSourceLabel="standings"
      topbarLabel={isSolo ? 'Free Play' : `Room · ${room.code}`}
      topbarOnClose={onLeave}
      topbarOnShare={share}
      topbarShareCopied={copied}
      soloHero={isSolo ? undefined : hero}
      bottomActions={
        <BottomActions
          isHost={isHost}
          onStartNext={onStartNext}
          onReturnToLobby={onReturnToLobby}
          onBackToLobby={onBackToLobby}
          nextLabel={isSolo ? 'Play again' : 'Next round'}
        />
      }
      soloPlaceholderVariant="share"
    />
  );
}

interface BottomActionsProps {
  isHost: boolean;
  onStartNext: () => void;
  onReturnToLobby: () => void;
  onBackToLobby: () => void;
  /** Label for the host's primary action — "Next round" with others present,
   *  "Play again" when solo. */
  nextLabel?: string;
}

function BottomActions({
  isHost,
  onStartNext,
  onReturnToLobby,
  onBackToLobby,
  nextLabel = 'Next round',
}: BottomActionsProps) {
  if (!isHost) {
    // Non-hosts can't start the next round, but they shouldn't be stuck on
    // the scoresheet — give them a real, full-width button back to the
    // lobby to wait. The single-column grid stretches the button the same
    // way the host's two-column row fills each cell.
    return (
      <div className="grid grid-cols-1">
        <ActionButton
          onClick={onBackToLobby}
          label="Back to lobby"
          primary
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          }
        />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      <ActionButton
        onClick={onReturnToLobby}
        label="Lobby"
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        }
      />
      <ActionButton
        onClick={onStartNext}
        label={nextLabel}
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

interface SpectatorResultsProps {
  roomCode: string;
  roster: ResultsRosterEntry[];
  isHost: boolean;
  onStartNext: () => void;
  onReturnToLobby: () => void;
  onBackToLobby: () => void;
  onLeave: () => void;
}

// Shown to a player who joined while the board was already in progress.
// They didn't play this round, so there's no personal scoresheet to anchor
// the full ResultsView — instead of a blank screen they get the round's
// final standings and the same round-flow controls, which frames the wait
// for the next board (and lets them start it if they've become host).
function SpectatorResults({
  roomCode,
  roster,
  isHost,
  onStartNext,
  onReturnToLobby,
  onBackToLobby,
  onLeave,
}: SpectatorResultsProps) {
  return (
    <div className="fixed inset-0 flex items-start justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)] overflow-y-auto">
      <div className="w-full max-w-[500px] min-h-full flex flex-col items-stretch px-4 pt-3 pb-4 gap-4">
        <div className="flex items-center justify-between">
          <div
            className="text-caption uppercase tracking-[0.08em] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)]"
            style={{ fontWeight: 700 }}
          >
            Room · {roomCode}
          </div>
          <button
            type="button"
            onClick={onLeave}
            aria-label="Leave the room"
            className="bg-transparent border-0 cursor-pointer p-1 text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] transition-colors"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col items-center gap-1 pt-6 text-center">
          <div
            className="text-caption uppercase tracking-[0.08em] text-[color:var(--ink-muted)] font-[family-name:var(--font-structure)]"
            style={{ fontWeight: 700 }}
          >
            Round finished
          </div>
          <div
            className="italic leading-[1.1] tracking-[-0.015em] text-display-sm font-[family-name:var(--font-display)]"
            style={{ fontWeight: 500 }}
          >
            You joined mid-round
          </div>
          <p className="text-sm text-[color:var(--ink-muted)] leading-relaxed">
            You'll be dealt into the next board. Here's how this one finished.
          </p>
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          <Standings
            rows={roster}
            selectedId={null}
            onSelect={() => {}}
            header="Standings"
            showBars
            maxHeight="50vh"
          />
        </div>

        <div className="mt-auto">
          <BottomActions
            isHost={isHost}
            onStartNext={onStartNext}
            onReturnToLobby={onReturnToLobby}
            onBackToLobby={onBackToLobby}
          />
        </div>
      </div>
    </div>
  );
}

interface RankedPlayer {
  id: string;
  displayName: string;
  rank: number;
  points: number;
  wordCount: number;
  foundWords: string[];
  foundWordTimes: number[];
  invalidSubmissions: InvalidSubmission[];
  left: boolean;
}

function rankByPoints(
  players: {
    id: string;
    displayName: string;
    points: number;
    wordCount: number;
    foundWords: string[];
    foundWordTimes: number[];
    invalidSubmissions: InvalidSubmission[];
    left: boolean;
  }[],
): RankedPlayer[] {
  const sorted = [...players].sort((a, b) => b.points - a.points);
  return assignCompetitionRanks(sorted, (p) => p.points).map(({ item: p, rank }) => ({
    id: p.id,
    displayName: p.displayName,
    rank,
    points: p.points,
    wordCount: p.wordCount,
    foundWords: p.foundWords,
    foundWordTimes: p.foundWordTimes,
    invalidSubmissions: p.invalidSubmissions,
    left: p.left,
  }));
}
