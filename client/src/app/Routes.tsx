import { Route, Routes } from 'react-router-dom';
import { ChallengeRoute } from '../features/challenges/index';
import { GameRoute } from '../features/free-play/GameRoute';
import { ResultsRoute } from '../features/free-play/results/ResultsRoute';
import { ConfigRoute } from '../features/free-play/start/index';
import {
  GauntletConfirmRoute,
  GauntletHubRoute,
  GauntletPlayRoute,
  GauntletResultsRoute,
  GauntletRoundResultsRoute,
} from '../features/gauntlet/index';
import { HistoricResultsRoute, HistoryRoute } from '../features/history/index';
import { LandingRoute } from '../features/home/index';
import { MultiplayerRoomRoute } from '../features/rooms/index';
import {
  TimeIsMoneyOverviewRoute,
  TimeIsMoneyPlayRoute,
  TimeIsMoneyResultsRoute,
} from '../features/time-is-money/index';
import { DailyConfirmRoute } from '../features/timed-daily/index';
import { LeaderboardRoute } from '../features/timed-daily/leaderboard/index';
import { DailyResultsRoute } from '../features/timed-daily/results/DailyResultsRoute';
import { ZenGameRoute, ZenLeaderboardRoute, ZenResultsRoute } from '../features/zen/index';

export function AppRoutes() {
  return (
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
      <Route path="/daily/time-is-money" element={<TimeIsMoneyOverviewRoute />} />
      <Route path="/daily/time-is-money/play" element={<TimeIsMoneyPlayRoute />} />
      <Route path="/daily/time-is-money/results" element={<TimeIsMoneyResultsRoute />} />
      <Route path="/history" element={<HistoryRoute />} />
      <Route path="/freeplay/results/:id" element={<HistoricResultsRoute />} />
      <Route path="/freeplay/challenge/:id" element={<ChallengeRoute />} />
      <Route path="/play/room/:code" element={<MultiplayerRoomRoute />} />
    </Routes>
  );
}
