import type { Meta, StoryObj } from '@storybook/react';
import { DateSelector } from '../pages/daily/components/DateSelector';
import type { DailyEntry } from '../pages/daily/types';
import { mockDefinition } from './mockDefinition';

const meta: Meta<typeof DateSelector> = {
  title: 'Daily/DateSelector',
  component: DateSelector,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof DateSelector>;

const entries: DailyEntry[] = [
  {
    puzzleNumber: 39,
    date: new Date('2026-04-10'),
    state: 'completed',
    points: 65,
    wordsFound: 16,
    longestWord: 'BRIDGE',
    longestWordDefinition: mockDefinition('BRIDGE', 'A structure carrying a road over a river.'),
    stampTier: 'second',
    playersCount: 102,
    config: { boardSize: 4, timeLimit: 180, minWordLength: 3 },
  },
  {
    puzzleNumber: 40,
    date: new Date('2026-04-11'),
    state: 'missed',
    stampTier: null,
    playersCount: 88,
    config: { boardSize: 4, timeLimit: 180, minWordLength: 3 },
  },
  {
    puzzleNumber: 41,
    date: new Date('2026-04-12'),
    state: 'completed',
    points: 87,
    wordsFound: 23,
    longestWord: 'FROGGLE',
    longestWordDefinition: mockDefinition('FROGGLE', 'A word puzzle game.'),
    stampTier: 'first',
    playersCount: 128,
    config: { boardSize: 4, timeLimit: 180, minWordLength: 3 },
  },
  {
    puzzleNumber: 42,
    date: new Date('2026-04-13'),
    state: 'unplayed',
    stampTier: null,
    playersCount: 45,
    config: { boardSize: 4, timeLimit: 180, minWordLength: 3 },
  },
];

const callbacks = {
  onToggle: () => {},
  onSelect: () => {},
};

export const ClosedLight: Story = {
  args: { entries, currentIndex: 3, isOpen: false, ...callbacks },
  decorators: [
    (Story) => (
      <div data-theme="light" className="w-[340px] relative" style={{ backgroundColor: 'var(--page-bg)', padding: '16px', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export const ClosedDark: Story = {
  args: { entries, currentIndex: 3, isOpen: false, ...callbacks },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="w-[340px] relative" style={{ backgroundColor: 'var(--page-bg)', padding: '16px', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export const OpenLight: Story = {
  args: { entries, currentIndex: 3, isOpen: true, ...callbacks },
  decorators: [
    (Story) => (
      <div data-theme="light" className="w-[340px] relative" style={{ backgroundColor: 'var(--page-bg)', padding: '16px', borderRadius: '16px', minHeight: '300px' }}>
        <Story />
      </div>
    ),
  ],
};

export const OpenDark: Story = {
  args: { entries, currentIndex: 3, isOpen: true, ...callbacks },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="w-[340px] relative" style={{ backgroundColor: 'var(--page-bg)', padding: '16px', borderRadius: '16px', minHeight: '300px' }}>
        <Story />
      </div>
    ),
  ],
};

export const OlderDateSelectedLight: Story = {
  args: { entries, currentIndex: 0, isOpen: false, ...callbacks },
  decorators: [
    (Story) => (
      <div data-theme="light" className="w-[340px] relative" style={{ backgroundColor: 'var(--page-bg)', padding: '16px', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export const OlderDateSelectedDark: Story = {
  args: { entries, currentIndex: 0, isOpen: false, ...callbacks },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="w-[340px] relative" style={{ backgroundColor: 'var(--page-bg)', padding: '16px', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

// 30 entries so the dropdown overflows its max-height and scrolls. Mixes
// completed/missed/unplayed states + all stamp tiers.
const manyEntries: DailyEntry[] = Array.from({ length: 30 }).map((_, i) => {
  const dayIndex = i + 1;
  const date = new Date(2026, 2, dayIndex + 14); // March 15 → April 13, 2026
  const isLast = i === 29;
  const state: DailyEntry['state'] =
    isLast ? 'unplayed' : (i % 5 === 0 ? 'missed' : 'completed');

  if (state !== 'completed') {
    return {
      puzzleNumber: dayIndex,
      date,
      state,
      stampTier: null,
      playersCount: 40 + (i % 20),
      config: { boardSize: 4, timeLimit: 180, minWordLength: 3 },
    };
  }

  const tierCycle: DailyEntry['stampTier'][] = ['first', 'second', 'third', 'top30', null];
  return {
    puzzleNumber: dayIndex,
    date,
    state,
    points: 45 + (i * 3) % 70,
    wordsFound: 8 + (i * 2) % 18,
    longestWord: ['BRIDGE', 'TABLET', 'CLAMP', 'SEEKER', 'LAPTOP'][i % 5],
    longestWordDefinition: null,
    stampTier: tierCycle[i % tierCycle.length],
    playersCount: 40 + (i % 20),
    config: { boardSize: 4, timeLimit: 180, minWordLength: 3 },
  };
});

export const ScrollingLight: Story = {
  args: { entries: manyEntries, currentIndex: manyEntries.length - 1, isOpen: true, ...callbacks },
  decorators: [
    (Story) => (
      <div data-theme="light" className="w-[340px] relative" style={{ backgroundColor: 'var(--page-bg)', padding: '16px', borderRadius: '16px', height: '500px' }}>
        <Story />
      </div>
    ),
  ],
};

export const ScrollingDark: Story = {
  args: { entries: manyEntries, currentIndex: manyEntries.length - 1, isOpen: true, ...callbacks },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="w-[340px] relative" style={{ backgroundColor: 'var(--page-bg)', padding: '16px', borderRadius: '16px', height: '500px' }}>
        <Story />
      </div>
    ),
  ],
};
