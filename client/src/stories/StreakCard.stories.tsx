import type { Meta, StoryObj } from '@storybook/react';
import { StreakCard } from '../pages/daily/components/StreakCard';

const meta: Meta<typeof StreakCard> = {
  title: 'Daily/StreakCard',
  component: StreakCard,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof StreakCard>;

const activeStreak = {
  currentStreak: 5,
  streakDays: [true, true, false, true, true, true, true],
  avgPoints: 72,
  avgWords: 18,
};

const perfectStreak = {
  currentStreak: 7,
  streakDays: [true, true, true, true, true, true, true],
  avgPoints: 95,
  avgWords: 24,
};

const brokenStreak = {
  currentStreak: 0,
  streakDays: [true, true, true, false, false, false, false],
  avgPoints: 40,
  avgWords: 10,
};

export const Light: Story = {
  args: { stats: activeStreak },
  decorators: [
    (Story) => (
      <div data-theme="light" className="w-[340px]" style={{ backgroundColor: 'var(--page-bg)', padding: '16px', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export const Dark: Story = {
  args: { stats: activeStreak },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="w-[340px]" style={{ backgroundColor: 'var(--page-bg)', padding: '16px', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export const PerfectStreakLight: Story = {
  args: { stats: perfectStreak },
  decorators: [
    (Story) => (
      <div data-theme="light" className="w-[340px]" style={{ backgroundColor: 'var(--page-bg)', padding: '16px', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export const PerfectStreakDark: Story = {
  args: { stats: perfectStreak },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="w-[340px]" style={{ backgroundColor: 'var(--page-bg)', padding: '16px', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export const BrokenStreakLight: Story = {
  args: { stats: brokenStreak },
  decorators: [
    (Story) => (
      <div data-theme="light" className="w-[340px]" style={{ backgroundColor: 'var(--page-bg)', padding: '16px', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export const BrokenStreakDark: Story = {
  args: { stats: brokenStreak },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="w-[340px]" style={{ backgroundColor: 'var(--page-bg)', padding: '16px', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};
