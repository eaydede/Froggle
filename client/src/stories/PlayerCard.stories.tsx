import type { Meta, StoryObj } from '@storybook/react';
import { PlayerCard } from '../pages/leaderboard/components/PlayerCard';

const meta: Meta<typeof PlayerCard> = {
  title: 'Leaderboard/PlayerCard',
  component: PlayerCard,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof PlayerCard>;

const sampleProps = {
  points: 98,
  wordsFound: 23,
  longestWord: 'SNOB',
  rank: 8,
  totalPlayers: 32,
  topPercent: 26,
  accolade: 'Only <b>6%</b> of players found <b>SNOB</b>',
};

export const Light: Story = {
  args: sampleProps,
  decorators: [
    (Story) => (
      <div data-theme="light" className="w-[340px]">
        <Story />
      </div>
    ),
  ],
};

export const Dark: Story = {
  args: sampleProps,
  decorators: [
    (Story) => (
      <div data-theme="dark" className="w-[340px]" style={{ backgroundColor: 'var(--page-bg)', padding: '24px', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export const NoTopPercent: Story = {
  args: { ...sampleProps, topPercent: null, rank: 22 },
  decorators: [
    (Story) => (
      <div data-theme="light" className="w-[340px]">
        <Story />
      </div>
    ),
  ],
};
