import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DailyPage } from '../pages/daily/DailyPage';
import type { DailyEntry, DailyStats } from '../pages/daily/types';
import { mockDefinition } from './mockDefinition';

const meta: Meta<typeof DailyPage> = {
  title: 'Daily/DailyPage',
  component: DailyPage,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof DailyPage>;

const entries: DailyEntry[] = [
  {
    puzzleNumber: 10,
    date: new Date('2026-04-08'),
    state: 'completed',
    points: 44,
    wordsFound: 12,
    longestWord: 'TABLET',
    longestWordDefinition: mockDefinition('TABLET', 'A flat slab of stone, clay, or wood, used especially for an inscription.'),
    stampTier: null,
    playersCount: 91,
    config: { boardSize: 4, timeLimit: 180, minWordLength: 3 },
  },
  {
    puzzleNumber: 11,
    date: new Date('2026-04-09'),
    state: 'missed',
    stampTier: null,
    playersCount: 88,
    config: { boardSize: 4, timeLimit: 180, minWordLength: 3 },
  },
  {
    puzzleNumber: 12,
    date: new Date('2026-04-10'),
    state: 'completed',
    points: 58,
    wordsFound: 17,
    longestWord: 'BRIDGE',
    longestWordDefinition: mockDefinition('BRIDGE', 'A structure carrying a road, path, or railway across a river, road, or other obstacle.'),
    stampTier: 'first',
    playersCount: 102,
    config: { boardSize: 4, timeLimit: 180, minWordLength: 3 },
  },
  {
    puzzleNumber: 13,
    date: new Date('2026-04-11'),
    state: 'completed',
    points: 35,
    wordsFound: 9,
    longestWord: 'CLAMP',
    longestWordDefinition: mockDefinition('CLAMP', 'A device used to hold things tightly together or in place.'),
    stampTier: null,
    playersCount: 95,
    config: { boardSize: 4, timeLimit: 180, minWordLength: 3 },
  },
  {
    puzzleNumber: 14,
    date: new Date('2026-04-12'),
    state: 'completed',
    points: 42,
    wordsFound: 14,
    longestWord: 'SERENDIPITY',
    longestWordDefinition: mockDefinition(
      'SERENDIPITY',
      'The faculty or phenomenon of finding valuable or agreeable things not sought for. Often associated with happy accidents or pleasant surprises that occur when one is not actively searching for them.',
    ),
    stampTier: 'top30',
    playersCount: 110,
    config: { boardSize: 4, timeLimit: 180, minWordLength: 3 },
  },
  {
    puzzleNumber: 15,
    date: new Date('2026-04-13'),
    state: 'unplayed',
    stampTier: null,
    playersCount: 45,
    config: { boardSize: 4, timeLimit: 180, minWordLength: 3 },
  },
];

const stats: DailyStats = {
  currentStreak: 5,
  streakDays: [true, true, false, true, true, true, true],
  avgPoints: 72.4,
  avgWords: 18.6,
};

const callbacks = {
  onStartPuzzle: () => {},
  onViewResults: () => {},
  onViewLeaderboard: () => {},
  getShareText: async () => 'Froggle #1 0W 0pts',
  onBack: () => {},
};

function InteractiveDailyPage({
  initialIndex,
  theme,
}: {
  initialIndex: number;
  theme: 'light' | 'dark';
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  return (
    <div
      data-theme={theme}
      className="w-full max-w-[430px] mx-auto"
      style={{ backgroundColor: 'var(--page-bg)', minHeight: '100vh' }}
    >
      <DailyPage
        entries={entries}
        stats={stats}
        currentIndex={currentIndex}
        nextPuzzleCountdown="4h 23m"
        onChangeIndex={setCurrentIndex}
        {...callbacks}
      />
    </div>
  );
}

export const TodayLight: Story = {
  render: () => <InteractiveDailyPage initialIndex={5} theme="light" />,
};

export const TodayDark: Story = {
  render: () => <InteractiveDailyPage initialIndex={5} theme="dark" />,
};

export const CompletedLight: Story = {
  render: () => <InteractiveDailyPage initialIndex={4} theme="light" />,
};

export const CompletedDark: Story = {
  render: () => <InteractiveDailyPage initialIndex={4} theme="dark" />,
};

export const MissedLight: Story = {
  render: () => <InteractiveDailyPage initialIndex={1} theme="light" />,
};

export const MissedDark: Story = {
  render: () => <InteractiveDailyPage initialIndex={1} theme="dark" />,
};
