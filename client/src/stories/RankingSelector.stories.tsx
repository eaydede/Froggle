import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { RankingSelector, type RankingType } from '../pages/leaderboard/components/RankingSelector';

const meta: Meta<typeof RankingSelector> = {
  title: 'Leaderboard/RankingSelector',
  component: RankingSelector,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof RankingSelector>;

const Interactive = ({ theme }: { theme: string }) => {
  const [value, setValue] = useState<RankingType>('points');
  return (
    <div data-theme={theme} className="w-[340px]" style={{ backgroundColor: 'var(--page-bg)', padding: '24px', borderRadius: '16px' }}>
      <RankingSelector value={value} onChange={setValue} />
    </div>
  );
};

export const Light: Story = {
  render: () => <Interactive theme="light" />,
};

export const Dark: Story = {
  render: () => <Interactive theme="dark" />,
};
