import { GameState } from 'models';
import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFreePlay } from '../features/free-play/FreePlay';
import { useTimedDaily } from '../features/timed-daily/TimedDaily';

export function AppShell({ children }: { children: ReactNode; }) {
  const { game, cancelGame } = useFreePlay();
  const { selectPuzzle } = useTimedDaily();
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const showTitle = location.pathname === '/game';
  const handleGoHome = async () => {
    setShowHomeConfirm(false);
    selectPuzzle(null);
    if (game) await cancelGame();
    navigate('/');
  };
  const handleTitleClick = () => {
    if (game?.status === GameState.InProgress) setShowHomeConfirm(true);
    else void handleGoHome();
  };
  return (
    <div className="max-w-[800px] mx-auto p-5 bg-[var(--surface-panel)] text-[color:var(--ink)] h-dvh box-border overflow-y-auto flex flex-col touch-pan-y font-[family-name:var(--font-ui)]" style={{ WebkitOverflowScrolling: 'touch' }}>
      {showTitle && (
        <h1
          onClick={handleTitleClick}
          className="text-center text-logo italic leading-none tracking-[-0.02em] m-0 mb-2.5 cursor-pointer select-none transition-all duration-200 hover:scale-105 font-[family-name:var(--font-display)]"
          style={{ fontWeight: 600 }}
        >
          Froggle
          <span className="inline-block w-[5px] h-[5px] rounded-full bg-[var(--logo-dot)] ml-[2px] align-baseline mb-[3px]" />
        </h1>
      )}

      {showHomeConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]" onClick={() => setShowHomeConfirm(false)}>
          <div className="bg-[var(--surface-card)] rounded-xl py-6 px-8 shadow-[0_4px_20px_rgba(0,0,0,0.15)] text-center max-w-[300px]" onClick={e => e.stopPropagation()}>
            <p className="text-base text-[color:var(--ink)] m-0 mb-5">Return to the home screen?</p>
            <div className="flex gap-3 justify-center">
              <button
                className="py-2 px-6 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white border-none rounded-lg cursor-pointer text-sm transition-colors duration-200 font-[family-name:var(--font-button)] [font-weight:var(--font-button-weight)]"
                onClick={handleGoHome}
              >
                Yes
              </button>
              <button
                className="py-2 px-6 bg-[var(--ink-whisper)] hover:bg-[var(--ink-trace)] text-[color:var(--ink)] border-none rounded-lg cursor-pointer text-sm transition-colors duration-200 font-[family-name:var(--font-button)] [font-weight:var(--font-button-weight)]"
                onClick={() => setShowHomeConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
