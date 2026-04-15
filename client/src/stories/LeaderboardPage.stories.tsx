import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LeaderboardPage } from '../pages/leaderboard/LeaderboardPage';
import type { RankingType } from '../pages/leaderboard/components/RankingSelector';
import type { RankingEntry } from '../pages/leaderboard/components/Rankings';
import type { TopThreeEntry } from '../pages/leaderboard/components/TopThree';
import type { DailyEntry } from '../pages/daily/types';

const stubConfig = { boardSize: 5, timeLimit: 120, minWordLength: 4 };

const dailyEntries: DailyEntry[] = [
  {
    puzzleNumber: 7,
    date: new Date('2026-04-05T12:00:00'),
    state: 'completed',
    points: 72,
    wordsFound: 18,
    longestWord: 'BRIDGE',
    longestWordDefinition: null,
    stampTier: 'top30',
    playersCount: 24,
    config: stubConfig,
  },
  {
    puzzleNumber: 8,
    date: new Date('2026-04-06T12:00:00'),
    state: 'completed',
    points: 61,
    wordsFound: 14,
    longestWord: 'CLAMP',
    longestWordDefinition: null,
    stampTier: null,
    playersCount: 26,
    config: stubConfig,
  },
  {
    puzzleNumber: 9,
    date: new Date('2026-04-07T12:00:00'),
    state: 'completed',
    points: 112,
    wordsFound: 29,
    longestWord: 'TABLET',
    longestWordDefinition: null,
    stampTier: 'top30',
    playersCount: 30,
    config: stubConfig,
  },
  {
    puzzleNumber: 10,
    date: new Date('2026-04-08T12:00:00'),
    state: 'completed',
    points: 98,
    wordsFound: 23,
    longestWord: 'FROGGLE',
    longestWordDefinition: null,
    stampTier: 'top30',
    playersCount: 32,
    config: stubConfig,
  },
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
  { rank: 1, displayName: 'sarah_j', value: 186, unit: 'pts' },
  { rank: 2, displayName: 'mike_k', value: 164, unit: 'pts' },
  { rank: 3, displayName: 'alex_l', value: 151, unit: 'pts' },
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
  const [selectedIdx, setSelectedIdx] = useState(dailyEntries.length - 1);
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
        entries={dailyEntries}
        currentIndex={selectedIdx}
        onChangeIndex={setSelectedIdx}
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
        { rank: 1, displayName: 'You', value: 98, unit: 'pts' },
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
        { rank: 1, displayName: 'sarah_j', value: 186, unit: 'pts' },
        { rank: 2, displayName: 'You', value: 98, unit: 'pts' },
      ]}
      totalPlayers={2}
      rank={2}
    />
  ),
};
