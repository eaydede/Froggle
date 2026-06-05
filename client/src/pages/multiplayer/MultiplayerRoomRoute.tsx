import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GameState } from 'models';
import { useGame } from '../../GameContext';
import { InkButton } from '../../shared/components/InkButton';
import { useMultiplayerRoom } from '../../shared/multiplayer/useMultiplayerRoom';
import { fetchMultiplayerRoom } from '../../shared/api/multiplayerApi';
import { copyToClipboard } from '../../shared/utils/clipboard';
import { FreePlayLobbyPage } from './FreePlayLobbyPage';
import { RoomPlay } from './RoomPlay';
import { RoomResults } from './RoomResults';
import { RoomToast } from './RoomToast';

type PrecheckState = 'checking' | 'ok' | 'not-found' | 'error';

// Single entry for /play/room/:code. Validates the code via HTTP before
// opening a socket so a typo or expired link surfaces as a clear "room
// not found" screen instead of a flickering loading state.
export function MultiplayerRoomRoute() {
  const { code: rawCode } = useParams<{ code: string }>();
  const code = (rawCode ?? '').toUpperCase();
  const navigate = useNavigate();
  const { session, profileReady, game, createGame, startGame } = useGame();
  const [precheck, setPrecheck] = useState<PrecheckState>('checking');
  // Lets the host reopen the just-finished board's scoresheet from the
  // lobby's "Last Round" card without leaving the room.
  const [viewingLastResults, setViewingLastResults] = useState(false);
  // A non-host can step back to the lobby view from the results screen
  // while the room is still in 'results' (they're just waiting for the
  // host's next move). Cleared whenever the room leaves 'results'.
  const [exitedResults, setExitedResults] = useState(false);
  // Transient host-handover notice (someone left and the role moved).
  const [toast, setToast] = useState<string | null>(null);
  const prevHostRef = useRef<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!code) {
      setPrecheck('not-found');
      return;
    }
    let cancelled = false;
    // Reset so switching rooms (Join a room) shows the loading screen
    // instead of briefly rendering the previous room's state.
    setPrecheck('checking');
    setViewingLastResults(false);
    setExitedResults(false);
    // New room → forget the previous room's host so the handover toast
    // doesn't fire on the switch.
    prevHostRef.current = null;
    setToast(null);
    fetchMultiplayerRoom(code)
      .then((room) => {
        if (cancelled) return;
        setPrecheck(room ? 'ok' : 'not-found');
      })
      .catch(() => {
        if (!cancelled) setPrecheck('error');
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const {
    room,
    youId,
    isHost,
    status,
    errorReason,
    updateNextConfig,
    setVisibility,
    startBoard,
    endBoardForRoom: _endBoardForRoom,
    returnToLobby,
    submitWord,
    finishMyBoard,
    leaveRoom,
    nudgeHost,
    nudge,
  } = useMultiplayerRoom({
    roomCode: code,
    accessToken: session?.access_token,
    // Wait for auth to settle (profileReady implies it) so the session token
    // is available at connect — the server derives the moderated display name
    // from it. A token refresh afterwards doesn't redial.
    enabled: precheck === 'ok' && profileReady,
  });

  // Surface an incoming nudge (host only) as a transient toast, reusing
  // the same slot as the host-handover notice.
  useEffect(() => {
    if (!nudge) return;
    setToast(`${nudge.from} nudged you — start the round?`);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4500);
  }, [nudge]);

  // Notice the player when the host role moves to someone else (the prior
  // host left). The board itself keeps running server-side, so this is the
  // only signal that the room's controls just changed hands.
  const hostId = room?.hostId ?? null;
  useEffect(() => {
    if (!hostId) return;
    const prev = prevHostRef.current;
    prevHostRef.current = hostId;
    // Skip the first assignment (initial host) — only announce changes.
    if (prev === null || prev === hostId) return;

    const becameMe = youId !== null && hostId === youId;
    const newHostName = room?.players.find((p) => p.id === hostId)?.displayName ?? 'A player';
    setToast(
      becameMe
        ? "The host left — you're the host now."
        : `${newHostName} is now the host.`,
    );
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4500);
  }, [hostId, youId, room]);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  // The non-host "back to lobby" view only makes sense while the room is
  // showing results; once the host starts the next round or returns the
  // room to the lobby, drop the local override.
  const roomStatus = room?.status;
  useEffect(() => {
    if (roomStatus !== 'results') setExitedResults(false);
  }, [roomStatus]);

  const handleLeave = () => {
    leaveRoom();
    navigate('/');
  };

  // Host pressing Start in the lobby. Solo (room of one) runs the
  // established single-player free-play engine so challenge links,
  // history persistence, and the rich solo results page all keep
  // working untouched. With others present, the board runs through the
  // room so everyone races the same letters live.
  const handleStart = async () => {
    if (!room) return;
    const connected = room.players.filter((p) => p.connected).length;
    if (connected <= 1) {
      const cfg = room.nextConfig;
      // `startGame` hits /api/game/start, which only accepts a session in
      // Config state. A leftover game from a just-finished solo round (e.g.
      // "Play again" routing back through the lobby) is Finished, so create a
      // fresh session unless the current one is already startable.
      if (!game || game.status !== GameState.Config) await createGame();
      await startGame(cfg.durationSeconds, cfg.boardSize, cfg.minWordLength);
      navigate('/game');
      return;
    }
    startBoard();
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/play/room/${code}`;
    // Prefer the native share sheet on mobile; fall back to copying (with the
    // same insecure-origin/webview-safe path the Copy button uses).
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Froggle — Free Play', text: `Join my Froggle room ${code}`, url });
        return;
      } catch {
        // User dismissed or share failed — fall through to clipboard.
      }
    }
    await copyToClipboard(url);
  };

  if (precheck === 'checking' || !profileReady) {
    return <LoadingScreen label="Connecting…" />;
  }
  if (precheck === 'not-found' || errorReason === 'not-found') {
    return <NotFoundScreen code={code} onHome={() => navigate('/')} />;
  }
  if (precheck === 'error') {
    return <NotFoundScreen code={code} onHome={() => navigate('/')} variant="error" />;
  }

  if (!room) {
    return <LoadingScreen label={status === 'connecting' ? 'Joining room…' : 'Reconnecting…'} />;
  }

  if (room.status === 'playing') {
    return (
      <>
        <RoomToast message={toast} />
        <RoomPlay
          room={room}
          youId={youId}
          onSubmitWord={submitWord}
          onFinishMyBoard={finishMyBoard}
          onLeave={handleLeave}
        />
      </>
    );
  }
  // Active results screen, or the host reopening the last board's
  // scoresheet from the lobby. Both render RoomResults off the retained
  // currentBoard; the lobby-reopened variant just returns to the lobby
  // on close instead of advancing the round. A non-host who stepped back
  // to the lobby (exitedResults) falls through to the lobby view.
  const reopenedResults = viewingLastResults && room.currentBoard;
  const autoResults = room.status === 'results' && !(!isHost && exitedResults);
  if (reopenedResults || autoResults) {
    const reopened = room.status !== 'results';
    return (
      <>
        <RoomToast message={toast} />
        <RoomResults
          room={room}
          youId={youId}
          isHost={isHost}
          onStartNext={() => {
            setViewingLastResults(false);
            startBoard();
          }}
          onReturnToLobby={() => {
            setViewingLastResults(false);
            if (!reopened) returnToLobby();
          }}
          onBackToLobby={reopened ? () => setViewingLastResults(false) : () => setExitedResults(true)}
          onLeave={reopened ? () => setViewingLastResults(false) : handleLeave}
        />
      </>
    );
  }
  return (
    <>
      <RoomToast message={toast} />
      <FreePlayLobbyPage
        room={room}
        youId={youId}
        isHost={isHost}
        onBack={handleLeave}
        onShare={handleShare}
        onToggleVisibility={setVisibility}
        onConfigChange={updateNextConfig}
        onStart={handleStart}
        onSeeLastResults={() => setViewingLastResults(true)}
        onJoinRoom={(joinCode) => {
          if (joinCode !== code) navigate(`/play/room/${joinCode}`);
        }}
        onNudgeHost={nudgeHost}
      />
    </>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)]">
      <div className="flex flex-col items-center gap-2">
        <div
          className="font-[family-name:var(--font-display)] italic"
          style={{ fontSize: '1.4rem', fontWeight: 600 }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

interface NotFoundProps {
  code: string;
  onHome: () => void;
  variant?: 'missing' | 'error';
}

function NotFoundScreen({ code, onHome, variant = 'missing' }: NotFoundProps) {
  const title = variant === 'error' ? 'Connection trouble' : 'Room not found';
  const body =
    variant === 'error'
      ? 'The server is unreachable right now. Try again in a moment.'
      : `We couldn't find room ${code || 'with that code'}. The host may have ended it, or the code is mistyped.`;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)]">
      <div className="w-full max-w-[360px] flex flex-col gap-4 px-6 text-center">
        <div
          className="text-caption uppercase tracking-[0.08em] text-[color:var(--ink-soft)] leading-none font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 700 }}
        >
          Play with Friends
        </div>
        <div
          className="italic leading-[1.1] tracking-[-0.015em] text-display-sm font-[family-name:var(--font-display)]"
          style={{ fontWeight: 500 }}
        >
          {title}
        </div>
        <p className="text-sm text-[color:var(--ink-muted)] leading-relaxed">
          {body}
        </p>
        <InkButton onClick={onHome}>Back to home</InkButton>
      </div>
    </div>
  );
}
