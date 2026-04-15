import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CardCarousel } from '../pages/daily/components/CardCarousel';
import type { DailyEntry } from '../pages/daily/types';
import { mockDefinition } from './mockDefinition';

const meta: Meta<typeof CardCarousel> = {
  title: 'Daily/CardCarousel',
  component: CardCarousel,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof CardCarousel>;

const entries: DailyEntry[] = [
  {
    puzzleNumber: 10,
    date: new Date('2026-04-08'),
    state: 'completed',
    points: 44,
    wordsFound: 12,
    longestWord: 'TABLET',
    longestWordDefinition: mockDefinition('TABLET', 'A flat slab of stone, clay, or wood used for writing.'),
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

const callbacks = {
  onStartPuzzle: () => {},
  onViewResults: () => {},
  onViewLeaderboard: () => {},
  getShareText: async () => 'Froggle #1 0W 0pts',
  onDefinitionExpand: () => {},
};

/** Wrapper that manages currentIndex state so swiping works in Storybook */
function InteractiveCarousel({
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
      className="w-full max-w-[430px] mx-auto relative"
      style={{
        backgroundColor: 'var(--page-bg)',
        padding: '16px 0',
        minHeight: '100vh',
      }}
    >
      <CardCarousel
        entries={entries}
        currentIndex={currentIndex}
        defExpanded={false}
        onChangeIndex={setCurrentIndex}
        {...callbacks}
      />
    </div>
  );
}

export const TodayUnplayedLight: Story = {
  render: () => <InteractiveCarousel initialIndex={5} theme="light" />,
};

export const TodayUnplayedDark: Story = {
  render: () => <InteractiveCarousel initialIndex={5} theme="dark" />,
};

export const CompletedLight: Story = {
  render: () => <InteractiveCarousel initialIndex={4} theme="light" />,
};

export const CompletedDark: Story = {
  render: () => <InteractiveCarousel initialIndex={4} theme="dark" />,
};

export const MissedLight: Story = {
  render: () => <InteractiveCarousel initialIndex={1} theme="light" />,
};

export const MissedDark: Story = {
  render: () => <InteractiveCarousel initialIndex={1} theme="dark" />,
};
