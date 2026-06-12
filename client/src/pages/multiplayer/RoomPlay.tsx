import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameState, type Game, type Position } from 'models';
import type { MultiplayerRoom, WordSubmitResult } from 'models/multiplayer';
import { useGame } from '../../GameContext';
import { useTimer } from '../../hooks/useTimer';
import { useWordValidator } from '../../hooks/useWordValidator';
import { GamePage } from '../game/GamePage';
import { useFeedbackSounds, type FeedbackType } from '../game';
import { Cell } from '../../shared/components/Cell';
import { LobbyPlayerStrip } from './LobbyPlayerStrip';

interface RoomPlayProps {
  room: MultiplayerRoom;
  youId: string | null;
  /** Estimated `serverClock − deviceClock`, in ms (see useMultiplayerRoom).
   *  `board.startedAt` is stamped on the server clock; subtracting this offset
   *  rebases it into the device's clock so countdown/timer math against
   *  `Date.now()` is right even when the device clock is wrong. */
  clockOffsetMs: number;
  onSubmitWord: (path: Position[]) => Promise<WordSubmitResult>;
  onFinishMyBoard: () => void;
  /** Fast-forward the pre-board countdown a step. Solo-only on the server, so
   *  the tap target is only shown when the local player is alone in the room. */
  onAdvanceCountdown: () => void;
  /** Exit the room entirely, mid-round, back to the main menu. */
  onLeave: () => void;
}

// Active board view. Wraps the shared GamePage with the same player chips
// the lobby shows (avatar + name, no live scores) so you can see who's in
// without a leaderboard distraction. A shared "get ready" countdown plays
// before the board goes live, and a Leave control is always available so a
// player can bail out mid-round.
export function RoomPlay({
  room,
  youId,
  clockOffsetMs,
  onSubmitWord,
  onFinishMyBoard,
  onAdvanceCountdown,
  onLeave,
}: RoomPlayProps) {
  const { muted, toggleMute } = useGame();
  const board = room.currentBoard;
  // The board's start instant rebased onto this device's clock, so every
  // comparison below (and the play timer inside GamePage) can use the raw
  // local `Date.now()` and still agree with the server's schedule even if the
  // device clock is off. Null when there's no board yet.
  const startedAtLocal = board ? board.startedAt - clockOffsetMs : 0;
  const me = useMemo(() => room.players.find((p) => p.id === youId) ?? null, [room, youId]);
  const [feedback, setFeedback] = useState<
    { type: FeedbackType; path: Position[]; bonus?: string | null } | null
  >(null);

  // Wall-clock ticker driving the pre-board countdown and the spectator
  // "time left" readout (both are display-only; the play timer inside
  // GamePage stays on its own monotonic clock). It runs only while one of
  // those readouts is on screen — during active play neither is shown, so
  // re-rendering the board 4×/sec would be pure waste.
  const [now, setNow] = useState(() => Date.now());

  const validator = useWordValidator();
  useEffect(() => {
    validator.setSource(board?.salt ?? '', board?.wordHashes ?? []);
  }, [board?.salt, board?.wordHashes, validator]);
  useEffect(() => {
    validator.setSubmitted(me?.foundWords ?? []);
  }, [me?.foundWords, validator]);

  const { playValid, playInvalid, playDuplicate } = useFeedbackSounds(0, 0, 2);

  const flashFeedback = useCallback(
    (path: Position[], outcome: { valid: boolean; reason?: string }) => {
      let type: FeedbackType;
      if (outcome.valid) {
        type = 'valid';
        if (!muted) playValid();
      } else if (outcome.reason === 'repeat') {
        type = 'duplicate';
        if (!muted) playDuplicate();
      } else {
        type = 'invalid';
        if (!muted) playInvalid();
      }
      setFeedback({ type, path });
      setTimeout(() => setFeedback(null), 200);
    },
    [muted, playValid, playInvalid, playDuplicate],
  );

  const submittingRef = useRef(false);
  const handleSubmit = useCallback(
    async (path: Position[]) => {
      if (!board || !me || me.status !== 'playing') return;
      const word = path
        .map((p) => board.board[p.row]?.[p.col] ?? '')
        .join('')
        .toUpperCase();

      const local = validator.isArmed()
        ? validator.validate(word)
        : { valid: false as const, reason: 'invalid' as const };
      flashFeedback(path, local);
      if (!local.valid) {
        if (!validator.isArmed() && !submittingRef.current) {
          submittingRef.current = true;
          const remote = await onSubmitWord(path);
          submittingRef.current = false;
          flashFeedback(path, remote);
        }
        return;
      }
      validator.recordSubmitted(word);
      onSubmitWord(path).catch(() => {});
    },
    [board, me, validator, flashFeedback, onSubmitWord],
  );

  // True during the shared pre-board countdown. While counting the board
  // isn't InProgress yet, so neither timer in GamePage runs early.
  const counting = !!board && me?.status === 'playing' && now < startedAtLocal;

  // Run the wall-clock ticker only while it feeds a visible readout: the
  // countdown, or the spectator "time left" panel once the player is done.
  const needsTick = counting || (!!board && me?.status !== 'playing');
  useEffect(() => {
    if (!needsTick) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [needsTick]);

  const game: Game | null = useMemo(() => {
    if (!board) return null;
    const ended = board.endedAt !== null || me?.status !== 'playing';
    const live = !ended && !counting;
    return {
      board: board.board,
      startedAt: startedAtLocal,
      status: live ? GameState.InProgress : GameState.Finished,
      config: {
        durationSeconds: board.config.durationSeconds,
        boardSize: board.config.boardSize,
        minWordLength: board.config.minWordLength,
      },
    };
  }, [board, me?.status, counting, startedAtLocal]);

  const finishedRef = useRef(false);
  const onTimerExpire = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinishMyBoard();
  }, [onFinishMyBoard]);

  useEffect(() => {
    finishedRef.current = false;
  }, [board?.startedAt]);

  // A player who reconnects mid-round sees the game flip to InProgress with a
  // start already in the past; hand the timer that elapsed time so it resumes
  // the shared clock instead of restarting from full. For a player present
  // from the countdown this is ~0. startedAtLocal is the server's schedule
  // rebased onto this device's clock — consistent with the countdown/spectator
  // readouts above, which compare the same value against the local clock.
  const initialElapsedMs = board ? Math.max(0, Date.now() - startedAtLocal) : 0;
  const timeRemaining = useTimer(game, onTimerExpire, initialElapsedMs);

  if (!board || !game || !me) return null;

  const isSpectating = me.status !== 'playing';
  const countdownNum = Math.max(0, Math.ceil((startedAtLocal - now) / 1000));
  // Only a solo player (alone in the room, so also the host) may cut their own
  // countdown short — the server enforces the same, this just hides the tap
  // target when others are present and a shared countdown isn't ours to rush.
  const canAdvanceCountdown =
    room.players.filter((p) => p.connected).length <= 1 && room.hostId === youId;
  const spectatorSecondsLeft =
    board.config.durationSeconds <= 0
      ? -1
      : Math.max(0, Math.ceil((startedAtLocal + board.config.durationSeconds * 1000 - now) / 1000));

  return (
    <div className="fixed inset-0 flex items-start justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)] overflow-y-auto">
      <div className="w-full max-w-[500px] flex flex-col items-stretch px-4 pt-3 pb-4 gap-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <LobbyPlayerStrip players={room.players} youId={youId} />
          </div>
          <LeaveButton onClick={onLeave} />
        </div>

        {counting ? (
          <CountdownView
            size={board.board.length}
            count={countdownNum}
            onAdvance={canAdvanceCountdown ? onAdvanceCountdown : undefined}
          />
        ) : isSpectating ? (
          <SpectatorView board={board.board} secondsLeft={spectatorSecondsLeft} />
        ) : (
          <GamePage
            game={game}
            words={[]}
            timeRemaining={timeRemaining}
            feedback={feedback}
            onSubmitWord={handleSubmit}
            onCancelGame={onFinishMyBoard}
            onEndGame={onFinishMyBoard}
            muted={muted}
            onToggleMute={toggleMute}
            modeLabel={`Room · ${room.code}`}
          />
        )}
      </div>
    </div>
  );
}

function LeaveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-1 shrink-0 bg-transparent border-0 cursor-pointer text-caption text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] transition-colors py-1.5 px-1"
      style={{ fontWeight: 600, WebkitTapHighlightColor: 'transparent' }}
      aria-label="Leave the game"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      Leave
    </button>
  );
}

// Pre-board countdown. Mirrors GamePage's vertical layout (timer row +
// word-display spacers, then a full-width board) so the board sits exactly
// where the real one will appear and nothing jumps when play begins. The
// tiles are intentionally blank — a letter preview would let players scout
// the board before the clock starts.
function CountdownView({
  size,
  count,
  onAdvance,
}: {
  size: number;
  count: number;
  /** When set (solo player), the board area becomes a tap target that pulls
   *  the countdown forward a step, so the round can start sooner. */
  onAdvance?: () => void;
}) {
  return (
    <div
      className="w-full max-w-[500px] mx-auto flex flex-col items-center"
      style={{ '--board-size': size } as React.CSSProperties}
    >
      {/* Spacers matching GamePage's timer row + word display so the board
          below lines up with the live board. */}
      <div className="w-full h-8" aria-hidden />
      <div className="h-9 my-2" aria-hidden />

      <div className="w-full relative">
        <BlankBoard size={size} />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
          <div
            className="rounded-2xl px-5 py-3 flex flex-col items-center gap-1"
            style={{ background: 'color-mix(in srgb, var(--surface-panel) 78%, transparent)' }}
          >
            <div
              className="text-caption uppercase tracking-[0.12em] text-[color:var(--ink-muted)] font-[family-name:var(--font-structure)]"
              style={{ fontWeight: 700 }}
            >
              Get ready
            </div>
            <div
              key={count}
              className="font-[family-name:var(--font-display)] tabular-nums"
              style={{
                fontSize: '4rem',
                fontWeight: 800,
                lineHeight: 1,
                color: 'var(--logo-dot)',
                animation: 'countdown-pop 1s cubic-bezier(0.22,1,0.36,1) both',
              }}
            >
              {count > 0 ? count : 'Go!'}
            </div>
            {onAdvance && count > 0 && (
              <div
                className="text-caption text-[color:var(--ink-muted)] font-[family-name:var(--font-structure)]"
                style={{ fontWeight: 600 }}
              >
                Tap to start sooner
              </div>
            )}
          </div>
        </div>
        {onAdvance && count > 0 && (
          <button
            type="button"
            onClick={onAdvance}
            aria-label="Start sooner"
            className="absolute inset-0 bg-transparent border-0 cursor-pointer"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          />
        )}
      </div>
    </div>
  );
}

// Blank board matching the live Board's grid (full width, square, 8px
// gaps, dice tiles) but with no letters — used behind the countdown so the
// layout is identical without revealing the puzzle.
function BlankBoard({ size }: { size: number }) {
  return (
    <div
      className="flex flex-col w-full aspect-square box-border"
      style={{ gap: '8px', containerType: 'inline-size', '--board-size': size } as React.CSSProperties}
    >
      {Array.from({ length: size }, (_, r) => (
        <div key={r} className="flex flex-1" style={{ gap: '8px' }}>
          {Array.from({ length: size }, (_, c) => (
            <Cell key={c} letter="" state="default" size="responsive" variant="dice" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Static board preview shown while the player is finished but the round is
// still live.
function SpectatorView({ board, secondsLeft }: { board: string[][]; secondsLeft: number }) {
  return (
    <div className="flex flex-col items-center gap-4 pt-4">
      <div
        className="text-caption uppercase tracking-[0.08em] text-[color:var(--ink-muted)] font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 700 }}
      >
        Waiting for others
      </div>
      <div
        className="font-[family-name:var(--font-display)] tabular-nums"
        style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--ink)' }}
      >
        {secondsLeft < 0 ? '∞' : secondsLeft > 0 ? `${secondsLeft}s left` : 'Finishing…'}
      </div>
      <StaticBoard board={board} dim />
    </div>
  );
}

function StaticBoard({ board, dim }: { board: string[][]; dim?: boolean }) {
  return (
    <div
      className={`grid gap-1.5 ${dim ? 'opacity-40' : ''}`}
      style={{
        gridTemplateColumns: `repeat(${board.length}, minmax(0, 1fr))`,
        width: '100%',
        maxWidth: 280,
      }}
    >
      {board.flatMap((row, r) =>
        row.map((letter, c) => (
          <div
            key={`${r}-${c}`}
            className="aspect-square flex items-center justify-center rounded-md"
            style={{
              background: 'var(--ink-whisper)',
              border: '1px solid var(--ink-border-subtle)',
              fontFamily: 'var(--font-cell)',
              fontWeight: 700,
              color: 'var(--ink)',
              fontSize: '1.1rem',
            }}
          >
            {letter.toUpperCase()}
          </div>
        )),
      )}
    </div>
  );
}
