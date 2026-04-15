import type { Meta, StoryObj } from '@storybook/react';
import { CompletedCard } from '../pages/daily/components/CompletedCard';
import type { DailyEntry } from '../pages/daily/types';
import { mockDefinition } from './mockDefinition';

const meta: Meta<typeof CompletedCard> = {
  title: 'Daily/CompletedCard',
  component: CompletedCard,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof CompletedCard>;

const baseEntry: DailyEntry = {
  puzzleNumber: 42,
  date: new Date('2026-04-13'),
  state: 'completed',
  points: 87,
  wordsFound: 23,
  longestWord: 'FROGGLE',
  longestWordDefinition: mockDefinition(
    'FROGGLE',
    'A playful portmanteau combining "frog" and "boggle", referring to a word puzzle game played on a grid of letters.',
  ),
  stampTier: 'first',
  playersCount: 128,
  config: {
    boardSize: 4,
    timeLimit: 180,
    minWordLength: 3,
  },
};

const longDefinitionEntry: DailyEntry = {
  ...baseEntry,
  longestWord: 'SERENDIPITY',
  longestWordDefinition: mockDefinition(
    'SERENDIPITY',
    'The faculty or phenomenon of finding valuable or agreeable things not sought for. Often associated with happy accidents or pleasant surprises that occur when one is not actively searching for them. The term was coined by Horace Walpole in 1754 based on the Persian fairy tale "The Three Princes of Serendip" whose heroes were always making discoveries by accident and sagacity.',
  ),
  stampTier: 'top30',
  points: 54,
  wordsFound: 14,
};

export const FirstPlaceLight: Story = {
  args: { entry: baseEntry, onExpandChange: () => {} },
  decorators: [
    (Story) => (
      <div data-theme="light" className="w-[300px]">
        <Story />
      </div>
    ),
  ],
};

export const FirstPlaceDark: Story = {
  args: { entry: baseEntry, onExpandChange: () => {} },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="w-[300px] p-4" style={{ backgroundColor: 'var(--page-bg)', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export const SecondPlaceLight: Story = {
  args: { entry: { ...baseEntry, stampTier: 'second', points: 72, wordsFound: 19 }, onExpandChange: () => {} },
  decorators: [
    (Story) => (
      <div data-theme="light" className="w-[300px]">
        <Story />
      </div>
    ),
  ],
};

export const SecondPlaceDark: Story = {
  args: { entry: { ...baseEntry, stampTier: 'second', points: 72, wordsFound: 19 }, onExpandChange: () => {} },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="w-[300px] p-4" style={{ backgroundColor: 'var(--page-bg)', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export const ThirdPlaceLight: Story = {
  args: { entry: { ...baseEntry, stampTier: 'third', points: 65, wordsFound: 16 }, onExpandChange: () => {} },
  decorators: [
    (Story) => (
      <div data-theme="light" className="w-[300px]">
        <Story />
      </div>
    ),
  ],
};

export const ThirdPlaceDark: Story = {
  args: { entry: { ...baseEntry, stampTier: 'third', points: 65, wordsFound: 16 }, onExpandChange: () => {} },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="w-[300px] p-4" style={{ backgroundColor: 'var(--page-bg)', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export const Top30Light: Story = {
  args: { entry: longDefinitionEntry, onExpandChange: () => {} },
  decorators: [
    (Story) => (
      <div data-theme="light" className="w-[300px]">
        <Story />
      </div>
    ),
  ],
};

export const Top30Dark: Story = {
  args: { entry: longDefinitionEntry, onExpandChange: () => {} },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="w-[300px] p-4" style={{ backgroundColor: 'var(--page-bg)', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export const NoStampLight: Story = {
  args: { entry: { ...baseEntry, stampTier: null, points: 31, wordsFound: 8 }, onExpandChange: () => {} },
  decorators: [
    (Story) => (
      <div data-theme="light" className="w-[300px]">
        <Story />
      </div>
    ),
  ],
};

export const NoStampDark: Story = {
  args: { entry: { ...baseEntry, stampTier: null, points: 31, wordsFound: 8 }, onExpandChange: () => {} },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="w-[300px] p-4" style={{ backgroundColor: 'var(--page-bg)', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};
