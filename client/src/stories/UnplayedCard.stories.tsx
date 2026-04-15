import type { Meta, StoryObj } from '@storybook/react';
import { UnplayedCard } from '../pages/daily/components/UnplayedCard';

const meta: Meta<typeof UnplayedCard> = {
  title: 'Daily/UnplayedCard',
  component: UnplayedCard,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof UnplayedCard>;

const defaultConfig = {
  boardSize: 4,
  timeLimit: 180,
  minWordLength: 3,
};

export const Light: Story = {
  args: { config: defaultConfig, onStart: () => {} },
  decorators: [
    (Story) => (
      <div data-theme="light" className="w-[300px]">
        <Story />
      </div>
    ),
  ],
};

export const Dark: Story = {
  args: { config: defaultConfig, onStart: () => {} },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="w-[300px] p-4" style={{ backgroundColor: 'var(--page-bg)', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export const LargeBoardLight: Story = {
  args: { config: { boardSize: 5, timeLimit: 300, minWordLength: 4 }, onStart: () => {} },
  decorators: [
    (Story) => (
      <div data-theme="light" className="w-[300px]">
        <Story />
      </div>
    ),
  ],
};

export const LargeBoardDark: Story = {
  args: { config: { boardSize: 5, timeLimit: 300, minWordLength: 4 }, onStart: () => {} },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="w-[300px] p-4" style={{ backgroundColor: 'var(--page-bg)', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};
