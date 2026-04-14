import type { Meta, StoryObj } from '@storybook/react';
import { MissedCard } from '../pages/daily/components/MissedCard';

const meta: Meta<typeof MissedCard> = {
  title: 'Daily/MissedCard',
  component: MissedCard,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof MissedCard>;

export const Light: Story = {
  args: { puzzleNumber: 41, playersCount: 94 },
  decorators: [
    (Story) => (
      <div data-theme="light" className="w-[300px]">
        <Story />
      </div>
    ),
  ],
};

export const Dark: Story = {
  args: { puzzleNumber: 41, playersCount: 94 },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="w-[300px] p-4" style={{ backgroundColor: 'var(--page-bg)', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export const HighPlayerCountLight: Story = {
  args: { puzzleNumber: 1, playersCount: 1243 },
  decorators: [
    (Story) => (
      <div data-theme="light" className="w-[300px]">
        <Story />
      </div>
    ),
  ],
};

export const HighPlayerCountDark: Story = {
  args: { puzzleNumber: 1, playersCount: 1243 },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="w-[300px] p-4" style={{ backgroundColor: 'var(--page-bg)', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};
