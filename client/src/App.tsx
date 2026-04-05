import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { GameState } from 'models';
import { useGame } from './GameContext';
import { LandingRoute } from './pages/landing';
import { ConfigRoute } from './pages/config';
import { GameRoute } from './pages/game';
import { ResultsRoute, DailyResultsRoute } from './pages/results';
import './tailwind.css';

function App() {
  const { game, showHomeConfirm, setShowHomeConfirm, cancelGame, setDailyInfo, theme, toggleTheme } = useGame();
  const navigate = useNavigate();
  const location = useLocation();

  const showTitle = ['/game', '/results', '/daily/results'].includes(location.pathname);

  const handleTitleClick = () => {
    if (game?.status === GameState.InProgress) {
      setShowHomeConfirm(true);
    } else {
      handleGoHome();
    }
  };

  const handleGoHome = async () => {
    setShowHomeConfirm(false);
    setDailyInfo(null);
    if (game) await cancelGame();
    navigate('/');
  };

  return (
    <div className="max-w-[800px] mx-auto p-5 bg-[var(--page-bg)] text-[var(--text)] h-dvh box-border overflow-y-auto flex flex-col" style={{ fontFamily: 'var(--font-body)', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
      {showTitle && (
        <h1
          onClick={handleTitleClick}
          className="text-center text-[1.35rem] tracking-[-0.025em] m-0 mb-2.5 cursor-pointer select-none transition-all duration-200 hover:scale-105"
          style={{ fontFamily: 'var(--font-heading)', fontWeight: 'var(--font-heading-weight)' as any }}
        >
          Froggle
        </h1>
      )}

      {showHomeConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]" onClick={() => setShowHomeConfirm(false)}>
          <div className="bg-white rounded-xl py-6 px-8 shadow-[0_4px_20px_rgba(0,0,0,0.15)] text-center max-w-[300px]" onClick={e => e.stopPropagation()}>
            <p className="text-base text-[var(--text)] m-0 mb-5">Return to the home screen?</p>
            <div className="flex gap-3 justify-center">
              <button
                className="py-2 px-6 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white border-none rounded-lg cursor-pointer text-sm transition-colors duration-200"
                style={{ fontFamily: 'var(--font-button)', fontWeight: 'var(--font-button-weight)' as any }}
                onClick={handleGoHome}
              >
                Yes
              </button>
              <button
                className="py-2 px-6 bg-[var(--track)] hover:bg-[#ddd] text-[var(--text)] border-none rounded-lg cursor-pointer text-sm transition-colors duration-200"
                style={{ fontFamily: 'var(--font-button)', fontWeight: 'var(--font-button-weight)' as any }}
                onClick={() => setShowHomeConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {location.pathname === '/' && (
        <button
          onClick={toggleTheme}
          className="fixed bottom-5 right-5 w-9 h-9 rounded-full bg-[var(--card)] border-none cursor-pointer flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:scale-105 z-10 text-[var(--text-muted)]"
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {theme === 'light' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>
      )}

      <Routes>
        <Route path="/" element={<LandingRoute />} />
        <Route path="/play" element={<ConfigRoute mode="freeplay" />} />
        <Route path="/daily" element={<ConfigRoute mode="daily" />} />
        <Route path="/daily/results" element={<DailyResultsRoute />} />
        <Route path="/game" element={<GameRoute />} />
        <Route path="/results" element={<ResultsRoute />} />
      </Routes>
    </div>
  );
}

export default App;
