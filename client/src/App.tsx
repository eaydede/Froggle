import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { GameState } from 'models';
import { useGame } from './GameContext';
import { LandingRoute } from './pages/landing';
import { ConfigRoute } from './pages/config';
import { GameRoute } from './pages/game';
import { ResultsRoute, DailyResultsRoute } from './pages/results';
import './tailwind.css';

function App() {
  const { game, showHomeConfirm, setShowHomeConfirm, cancelGame, setDailyInfo } = useGame();
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
    <div className="max-w-[800px] mx-auto p-5 bg-[#FAFAF8] h-dvh box-border overflow-y-auto flex flex-col" style={{ fontFamily: 'var(--font-body)', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
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
