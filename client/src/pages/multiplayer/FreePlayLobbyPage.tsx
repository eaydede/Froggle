import { useEffect, useState } from 'react';
import type { GameConfig } from 'models';
import type { MultiplayerRoom, RoomVisibility } from 'models/multiplayer';
import { LobbyRoomCard } from './LobbyRoomCard';
import { LobbyLastRound } from './LobbyLastRound';
import { LobbyRules } from './LobbyRules';
import { LobbyJoinControl } from './LobbyJoinControl';
import { LobbyPublicGames } from './LobbyPublicGames';
import { LobbyIntro } from './LobbyIntro';

const INTRO_SEEN_KEY = 'froggle-lobby-intro-seen';

function loadIntroSeen(): boolean {
  try {
    return localStorage.getItem(INTRO_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

interface FreePlayLobbyPageProps {
  room: MultiplayerRoom;
  youId: string | null;
  isHost: boolean;
  onBack: () => void;
  onShare: () => void;
  onToggleVisibility: (next: RoomVisibility) => void;
  onConfigChange: (patch: Partial<GameConfig>) => void;
  onStart: () => void;
  onSeeLastResults: () => void;
  /** Switch into a different room by code (joining a friend's game). */
  onJoinRoom: (code: string) => void;
  /** Non-host: nudge the host to start (cooldown-limited). */
  onNudgeHost: () => void;
}

// The merged Free Play config + lobby page (mock 9 · variant 2).
//
// One surface serves three states off a single room: a solo player sees a
// plain config page (room code + rules), and as others join it grows the
// "In the room" strip and the Last Round recap. Only the host can edit
// the rules or start; everyone else watches the same config update live
// and waits on the start CTA. The CTA is docked to the bottom with a
// gradient fade so the rules scroll behind it on short viewports.
export function FreePlayLobbyPage({
  room,
  youId,
  isHost,
  onBack,
  onShare,
  onToggleVisibility,
  onConfigChange,
  onStart,
  onSeeLastResults,
  onJoinRoom,
  onNudgeHost,
}: FreePlayLobbyPageProps) {
  const connectedCount = room.players.filter((p) => p.connected).length;
  const solo = connectedCount <= 1;
  const youWonLast = !!room.lastRound && room.lastRound.winnerId === youId;

  // Show the "how this works" explainer automatically the first time a
  // player lands here (the page is a big change from the old solo-only
  // config), then leave it reachable via the header help button.
  const [showIntro, setShowIntro] = useState(() => !loadIntroSeen());
  const dismissIntro = () => {
    setShowIntro(false);
    try {
      localStorage.setItem(INTRO_SEEN_KEY, 'true');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="fixed inset-0 flex justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)]">
      <div className="relative w-full max-w-[400px] h-full overflow-hidden">
        {/* Scroll region — content scrolls behind the docked CTA. */}
        <div className="absolute inset-0 overflow-y-auto overflow-x-hidden no-scrollbar">
          <header className="flex items-center justify-between px-5 pt-5 pb-2">
            <button
              type="button"
              onClick={onBack}
              className="group flex items-center gap-1.5 bg-transparent border-0 cursor-pointer text-caption text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] transition-colors py-1.5"
              style={{ fontWeight: 600 }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform group-hover:-translate-x-[2px]"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowIntro(true)}
                aria-label="How this works"
                className="size-7 rounded-full flex items-center justify-center bg-transparent border-0 cursor-pointer text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] hover:bg-[var(--ink-whisper)] transition-colors"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5" />
                  <line x1="12" y1="17" x2="12" y2="17.01" />
                </svg>
              </button>
              <LobbyJoinControl onJoin={onJoinRoom} />
            </div>
          </header>

          <div className="px-5 pt-1 pb-3 text-center">
            <div
              className="italic leading-[1.0] tracking-[-0.02em] text-[28px] text-[color:var(--ink)] font-[family-name:var(--font-display)]"
              style={{ fontWeight: 900 }}
            >
              Free Play
            </div>
            <div className="text-caption text-[color:var(--ink-soft)] mt-1" style={{ fontWeight: 500 }}>
              {solo ? 'Play solo or with others.' : `Playing with ${connectedCount}.`}
            </div>
          </div>

          {showIntro && (
            <div className="px-5 pb-2">
              <LobbyIntro onDismiss={dismissIntro} />
            </div>
          )}

          <div className="px-5 pb-2">
            <LobbyRoomCard
              room={room}
              youId={youId}
              isHost={isHost}
              solo={solo}
              onShare={onShare}
              onToggleVisibility={onToggleVisibility}
            />
          </div>

          {!solo && room.lastRound && (
            <div className="px-5 pb-2">
              <LobbyLastRound
                lastRound={room.lastRound}
                isYouWinner={youWonLast}
                onSeeResults={onSeeLastResults}
              />
            </div>
          )}

          <div className="px-5 pb-2">
            <LobbyRules config={room.nextConfig} disabled={!isHost} onChange={onConfigChange} />
          </div>

          {/* Solo players can browse and hop into an existing public game
              instead of waiting alone. Hidden the moment someone joins, so
              the page collapses back to the focused multiplayer lobby. */}
          {solo && (
            <div className="px-5 pb-2">
              <LobbyPublicGames currentCode={room.code} onJoin={onJoinRoom} />
            </div>
          )}

          {/* Spacer so the last card clears the docked CTA when scrolled. */}
          <div className="h-24" aria-hidden />
        </div>

        {/* Docked CTA */}
        <div className="absolute inset-x-0 bottom-0 px-5 pt-7 pb-5 z-10 cta-dock pointer-events-none">
          {isHost ? (
            <button
              type="button"
              onClick={onStart}
              className="group w-full rounded-2xl border-0 cursor-pointer py-3 flex items-center justify-center gap-2 bg-[var(--ink)] text-[color:var(--ink-inverse)] shadow-[var(--shadow-btn-primary)] hover:-translate-y-px hover:shadow-[var(--shadow-btn-primary-hover)] active:scale-[0.99] transition-all pointer-events-auto"
              style={{ fontWeight: 700, fontSize: 15, WebkitTapHighlightColor: 'transparent' }}
            >
              <span>{solo ? 'Start Game' : `Start Game · ${connectedCount} players`}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform group-hover:translate-x-[3px]"
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div className="pointer-events-auto">
              <WaitingNudgeButton onNudge={onNudgeHost} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const NUDGE_COOLDOWN_MS = 12000;

// The non-host "waiting" CTA, which doubles as the nudge control: it reads
// as a passive waiting state but is tappable to nudge the host, with a
// client-side cooldown (the server also rate-limits per player). After
// tapping it shows a ticking "nudge sent" state until the cooldown clears.
function WaitingNudgeButton({ onNudge }: { onNudge: () => void }) {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (until <= Date.now()) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= until) clearInterval(id);
    }, 300);
    return () => clearInterval(id);
  }, [until]);

  const remaining = Math.max(0, Math.ceil((until - now) / 1000));
  const cooling = remaining > 0;

  return (
    <button
      type="button"
      disabled={cooling}
      onClick={() => {
        onNudge();
        setUntil(Date.now() + NUDGE_COOLDOWN_MS);
      }}
      aria-label="Waiting for the host — tap to nudge them"
      className="group w-full rounded-2xl py-2.5 flex flex-col items-center gap-0.5 bg-[var(--ink-whisper)] hover:bg-[var(--ink-trace)] border border-dashed border-[color:var(--ink-border-subtle)] transition-colors disabled:hover:bg-[var(--ink-whisper)]"
      style={{ cursor: cooling ? 'default' : 'pointer', WebkitTapHighlightColor: 'transparent' }}
    >
      <span
        className="text-sm italic text-[color:var(--ink-muted)] font-[family-name:var(--font-display)]"
      >
        {cooling ? 'Nudge sent' : 'Waiting for the host to start'}
      </span>
      <span
        className="inline-flex items-center gap-1 text-label-xs uppercase tracking-[0.08em] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 700 }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {cooling ? `Nudge again in ${remaining}s` : 'Tap to nudge'}
      </span>
    </button>
  );
}
