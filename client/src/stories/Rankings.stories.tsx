import type { Meta, StoryObj } from '@storybook/react';
import { Rankings, type RankingEntry } from '../pages/leaderboard/components/Rankings';

const sampleEntries: RankingEntry[] = [
  { rank: 1, displayName: 'sarah_j', value: 186, isCurrentUser: false },
  { rank: 2, displayName: 'mike_k', value: 164, isCurrentUser: false },
  { rank: 3, displayName: 'alex_l', value: 151, isCurrentUser: false },
  { rank: 4, displayName: 'chris_n', value: 142, isCurrentUser: false },
  { rank: 5, displayName: 'taylor_p', value: 127, isCurrentUser: false },
  { rank: 6, displayName: 'jordan_w', value: 115, isCurrentUser: false },
  { rank: 7, displayName: 'casey_m', value: 109, isCurrentUser: false },
  { rank: 8, displayName: 'You', value: 98, isCurrentUser: true },
  { rank: 9, displayName: 'dana_r', value: 91, isCurrentUser: false },
  { rank: 10, displayName: 'pat_h', value: 84, isCurrentUser: false },
  { rank: 11, displayName: 'sam_t', value: 78, isCurrentUser: false },
  { rank: 12, displayName: 'riley_b', value: 72, isCurrentUser: false },
  { rank: 13, displayName: 'morgan_c', value: 65, isCurrentUser: false },
  { rank: 14, displayName: 'quinn_d', value: 58, isCurrentUser: false },
  { rank: 15, displayName: 'avery_f', value: 51, isCurrentUser: false },
  { rank: 16, displayName: 'sam_t', value: 78, isCurrentUser: false },
  { rank: 17, displayName: 'riley_b', value: 72, isCurrentUser: false },
  { rank: 18, displayName: 'morgan_c', value: 65, isCurrentUser: false },
  { rank: 19, displayName: 'quinn_d', value: 58, isCurrentUser: false },
  { rank: 20, displayName: 'avery_f', value: 51, isCurrentUser: false },
];

const meta: Meta<typeof Rankings> = {
  title: 'Leaderboard/Rankings',
  component: Rankings,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof Rankings>;

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
