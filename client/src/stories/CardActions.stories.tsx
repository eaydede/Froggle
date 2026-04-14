import type { Meta, StoryObj } from '@storybook/react';
import { CardActions } from '../pages/daily/components/CardActions';

const meta: Meta<typeof CardActions> = {
  title: 'Daily/CardActions',
  component: CardActions,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof CardActions>;

const callbacks = {
  onResults: () => {},
  onLeaderboard: () => {},
  onShare: () => {},
};

export const CompletedLight: Story = {
  args: { isCompleted: true, ...callbacks },
  decorators: [
    (Story) => (
      <div data-theme="light" className="w-[300px]">
        <Story />
      </div>
    ),
  ],
};

export const CompletedDark: Story = {
  args: { isCompleted: true, ...callbacks },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="w-[300px] p-4" style={{ backgroundColor: 'var(--page-bg)', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export const NotCompletedLight: Story = {
  args: { isCompleted: false, ...callbacks },
  decorators: [
    (Story) => (
      <div data-theme="light" className="w-[300px]">
        <Story />
      </div>
    ),
  ],
};

export const NotCompletedDark: Story = {
  args: { isCompleted: false, ...callbacks },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="w-[300px] p-4" style={{ backgroundColor: 'var(--page-bg)', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};
