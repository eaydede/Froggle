import type { Meta, StoryObj } from '@storybook/react';
import { TopThree, type TopThreeEntry } from '../pages/leaderboard/components/TopThree';

const sampleEntries: TopThreeEntry[] = [
  { rank: 1, displayName: 'sarah_j', value: 186 },
  { rank: 2, displayName: 'mike_k', value: 164 },
  { rank: 3, displayName: 'alex_l', value: 151 },
];

const meta: Meta<typeof TopThree> = {
  title: 'Leaderboard/TopThree',
  component: TopThree,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof TopThree>;

export const Light: Story = {
  args: { entries: sampleEntries },
  decorators: [
    (Story) => (
      <div data-theme="light" className="w-[340px]">
        <Story />
      </div>
    ),
  ],
};

export const Dark: Story = {
  args: { entries: sampleEntries },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="w-[340px]" style={{ backgroundColor: 'var(--page-bg)', padding: '24px', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};
