import type { Meta, StoryObj } from '@storybook/react';
import { StatsCard } from '../pages/daily/components/StatsCard';

const meta: Meta<typeof StatsCard> = {
  title: 'Daily/StatsCard',
  component: StatsCard,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof StatsCard>;

const defaultStats = {
  currentStreak: 5,
  streakDays: [true, true, false, true, true, true, true],
  avgPoints: 72.4,
  avgWords: 18.6,
};

export const Light: Story = {
  args: { stats: defaultStats },
  decorators: [
    (Story) => (
      <div data-theme="light" className="w-[340px]" style={{ backgroundColor: 'var(--page-bg)', padding: '16px', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export const Dark: Story = {
  args: { stats: defaultStats },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="w-[340px]" style={{ backgroundColor: 'var(--page-bg)', padding: '16px', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export const HighStatsLight: Story = {
  args: {
    stats: {
      currentStreak: 7,
      streakDays: [true, true, true, true, true, true, true],
      avgPoints: 124.8,
      avgWords: 31.2,
    },
  },
  decorators: [
    (Story) => (
      <div data-theme="light" className="w-[340px]" style={{ backgroundColor: 'var(--page-bg)', padding: '16px', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export const HighStatsDark: Story = {
  args: {
    stats: {
      currentStreak: 7,
      streakDays: [true, true, true, true, true, true, true],
      avgPoints: 124.8,
      avgWords: 31.2,
    },
  },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="w-[340px]" style={{ backgroundColor: 'var(--page-bg)', padding: '16px', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};
