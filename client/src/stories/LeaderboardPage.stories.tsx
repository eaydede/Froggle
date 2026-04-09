import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LeaderboardPage } from '../pages/leaderboard/LeaderboardPage';
import type { RankingType } from '../pages/leaderboard/components/RankingSelector';
import type { DailyNavEntry } from '../pages/leaderboard/components/DailyNav';
import type { RankingEntry } from '../pages/leaderboard/components/Rankings';
import type { TopThreeEntry } from '../pages/leaderboard/components/TopThree';

const dailyEntries: DailyNavEntry[] = [
  { date: '2026-04-08', puzzleNumber: 10, points: 98, wordsFound: 23, rank: 8, isToday: true },
  { date: '2026-04-07', puzzleNumber: 9, points: 112, wordsFound: 29, rank: 5, isToday: false },
  { date: '2026-04-06', puzzleNumber: 8, points: 61, wordsFound: 14, rank: 12, isToday: false },
  { date: '2026-04-05', puzzleNumber: 7, points: 72, wordsFound: 18, rank: 8, isToday: false },
];

const fullRankings: RankingEntry[] = [
  { rank: 1, displayName: 'sarah_j', value: 186, isCurrentUser: false },
  { rank: 2, displayName: 'mike_k', value: 164, isCurrentUser: false },
  { rank: 3, displayName: 'alex_l', value: 151, isCurrentUser: false },
  { rank: 4, displayName: 'chris_n', value: 142, isCurrentUser: false },
  { rank: 5, displayName: 'taylor_p', value: 127, isCurrentUser: false },
  { rank: 6, displayName: 'jordan_w', value: 115, isCurrentUser: false },
  { rank: 7, displayName: 'casey_m', value: 109, isCurrentUser: false },
  { rank: 8, displayName: 'You', value: 98, isCurrentUser: true },
  { rank: 9, displayName: 'dana_r', value: 91, isCurrentUser: false },
  { rank: 10, displayName: 'pat_h', value: 84, isCurrentUser: false },
  { rank: 11, displayName: 'sam_t', value: 78, isCurrentUser: false },
  { rank: 12, displayName: 'riley_b', value: 72, isCurrentUser: false },
  { rank: 13, displayName: 'morgan_c', value: 65, isCurrentUser: false },
  { rank: 14, displayName: 'quinn_d', value: 58, isCurrentUser: false },
  { rank: 15, displayName: 'avery_f', value: 51, isCurrentUser: false },
];

const fullTopThree: TopThreeEntry[] = [
  { rank: 1, displayName: 'sarah_j', value: 186 },
  { rank: 2, displayName: 'mike_k', value: 164 },
  { rank: 3, displayName: 'alex_l', value: 151 },
];

const meta: Meta<typeof LeaderboardPage> = {
  title: 'Leaderboard/LeaderboardPage',
  component: LeaderboardPage,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof LeaderboardPage>;

const Interactive = ({
  theme,
  rankings,
  topThree,
  totalPlayers,
  rank,
}: {
  theme: string;
  rankings: RankingEntry[];
  topThree: TopThreeEntry[];
  totalPlayers: number;
  rank: number;
}) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [rankingType, setRankingType] = useState<RankingType>('points');
  const entry = dailyEntries[selectedIdx];

  return (
    <div
      data-theme={theme}
      style={{
        width: '375px',
        height: '667px',
        backgroundColor: 'var(--page-bg)',
        padding: '16px 20px',
        borderRadius: '16px',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <LeaderboardPage
        title={`Daily #${entry.puzzleNumber}`}
        dailyEntries={dailyEntries}
        selectedDate={entry.date}
        onSelectDate={(date) => {
          const idx = dailyEntries.findIndex((e) => e.date === date);
          if (idx >= 0) setSelectedIdx(idx);
        }}
        onPrev={() => setSelectedIdx((i) => Math.min(i + 1, dailyEntries.length - 1))}
        onNext={() => setSelectedIdx((i) => Math.max(i - 1, 0))}
        hasNext={selectedIdx > 0}
        playerCard={{
          points: entry.points,
          wordsFound: entry.wordsFound,
          longestWord: 'SNOB',
          rank,
          totalPlayers,
          topPercent: rank <= Math.ceil(totalPlayers * 0.3) ? Math.round((rank / totalPlayers) * 100) : null,
          accolade: 'Only <b>6%</b> of players found <b>SNOB</b>',
        }}
        rankingType={rankingType}
        onRankingTypeChange={setRankingType}
        topThree={topThree}
        rankings={rankings}
        onMyResults={() => {}}
        onBack={() => {}}
      />
    </div>
  );
};

export const Light: Story = {
  render: () => (
    <Interactive
      theme="light"
      rankings={fullRankings}
      topThree={fullTopThree}
      totalPlayers={32}
      rank={8}
    />
  ),
};

export const Dark: Story = {
  render: () => (
    <Interactive
      theme="dark"
      rankings={fullRankings}
      topThree={fullTopThree}
      totalPlayers={32}
      rank={8}
    />
  ),
};

export const OnePlayer: Story = {
  render: () => (
    <Interactive
      theme="light"
      rankings={[
        { rank: 1, displayName: 'You', value: 98, isCurrentUser: true },
      ]}
      topThree={[
        { rank: 1, displayName: 'You', value: 98 },
      ]}
      totalPlayers={1}
      rank={1}
    />
  ),
};

export const TwoPlayers: Story = {
  render: () => (
    <Interactive
      theme="light"
      rankings={[
        { rank: 1, displayName: 'sarah_j', value: 186, isCurrentUser: false },
        { rank: 2, displayName: 'You', value: 98, isCurrentUser: true },
      ]}
      topThree={[
        { rank: 1, displayName: 'sarah_j', value: 186 },
        { rank: 2, displayName: 'You', value: 98 },
      ]}
      totalPlayers={2}
      rank={2}
    />
  ),
};
