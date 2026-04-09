import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { MyResultsCard } from '../pages/leaderboard/components/MyResultsCard';

const meta: Meta<typeof MyResultsCard> = {
  title: 'Leaderboard/MyResultsCard',
  component: MyResultsCard,
  parameters: { layout: 'centered' },
  args: { onClick: fn() },
};

export default meta;
type Story = StoryObj<typeof MyResultsCard>;

export const Light: Story = {
  decorators: [
    (Story) => (
      <div data-theme="light" className="w-[340px]">
        <Story />
      </div>
    ),
  ],
};

export const Dark: Story = {
  decorators: [
    (Story) => (
      <div data-theme="dark" className="w-[340px]" style={{ backgroundColor: 'var(--page-bg)', padding: '24px', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};
