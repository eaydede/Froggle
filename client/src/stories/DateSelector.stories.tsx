import type { Meta, StoryObj } from '@storybook/react';
import { DateSelector } from '../pages/daily/components/DateSelector';
import type { DailyEntry } from '../pages/daily/types';

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
    longestWordDefinition: 'A structure carrying a road over a river.',
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
    longestWordDefinition: 'A word puzzle game.',
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
