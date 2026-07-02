import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { GameState } from 'models';
import { useGame } from './GameContext';
import { LandingRoute } from './pages/landing';
import { ConfigRoute } from './pages/config';
import { GameRoute } from './pages/game';
import { ResultsRoute, DailyResultsRoute } from './pages/results';
import { LeaderboardRoute } from './pages/leaderboard';
import { DailyConfirmRoute } from './pages/daily';
import { ZenGameRoute, ZenResultsRoute, ZenLeaderboardRoute } from './pages/dailyZen';
import {
  GauntletHubRoute,
  GauntletConfirmRoute,
  GauntletPlayRoute,
  GauntletRoundResultsRoute,
  GauntletResultsRoute,
} from './pages/dailyGauntlet';
import {
  ExperimentalHubRoute,
  ExperimentalOverviewRoute,
  ExperimentalPlayRoute,
  ExperimentalResultsRoute,
} from './pages/dailyExperimental';
import { HistoryRoute, HistoricResultsRoute } from './pages/history';
import { ChallengeRoute } from './pages/challenge';
import { MultiplayerRoomRoute } from './pages/multiplayer';
import './tailwind.css';

function App() {
  const { game, showHomeConfirm, setShowHomeConfirm, cancelGame, setDailyInfo } = useGame();
  const navigate = useNavigate();
  const location = useLocation();

  const showTitle = ['/game'].includes(location.pathname);

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

      <Routes>
        <Route path="/" element={<LandingRoute />} />
        <Route path="/play" element={<ConfigRoute />} />
        <Route path="/daily" element={<DailyConfirmRoute />} />
        <Route path="/daily/results" element={<DailyResultsRoute />} />
        <Route path="/game" element={<GameRoute />} />
        <Route path="/results" element={<ResultsRoute />} />
        <Route path="/leaderboard" element={<LeaderboardRoute />} />
        <Route path="/daily/zen/play" element={<ZenGameRoute />} />
        <Route path="/daily/zen/results" element={<ZenResultsRoute />} />
        <Route path="/daily/zen/leaderboard" element={<ZenLeaderboardRoute />} />
        <Route path="/daily/gauntlet" element={<GauntletHubRoute />} />
        <Route path="/daily/gauntlet/results" element={<GauntletResultsRoute />} />
        <Route path="/daily/gauntlet/round/:round" element={<GauntletConfirmRoute />} />
        <Route path="/daily/gauntlet/round/:round/play" element={<GauntletPlayRoute />} />
        <Route path="/daily/gauntlet/round/:round/results" element={<GauntletRoundResultsRoute />} />
        <Route path="/daily/experimental" element={<ExperimentalHubRoute />} />
        <Route path="/daily/experimental/:mode" element={<ExperimentalOverviewRoute />} />
        <Route path="/daily/experimental/:mode/play" element={<ExperimentalPlayRoute />} />
        <Route path="/daily/experimental/:mode/results" element={<ExperimentalResultsRoute />} />
        <Route path="/history" element={<HistoryRoute />} />
        <Route path="/freeplay/results/:id" element={<HistoricResultsRoute />} />
        <Route path="/freeplay/challenge/:id" element={<ChallengeRoute />} />
        <Route path="/play/room/:code" element={<MultiplayerRoomRoute />} />
      </Routes>
    </div>
  );
}

export default App;
