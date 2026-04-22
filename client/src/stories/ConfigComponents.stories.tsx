import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { BoardConfigCards } from '../pages/config/components/BoardConfigCards';
import type { BoardSize } from '../pages/config/types';

const boardMeta: Meta<typeof BoardConfigCards> = {
  title: 'Components/BoardConfig',
  component: BoardConfigCards,
  parameters: { layout: 'centered' },
};

export default boardMeta;
type Story = StoryObj<typeof BoardConfigCards>;

function BoardWrapper({ initial = 4 as BoardSize, disabled = false }) {
  const [value, setValue] = useState<BoardSize>(initial);
  return <BoardConfigCards value={value} onChange={setValue} disabled={disabled} />;
}

function Frame({ theme, children }: { theme: 'light' | 'dark'; children: React.ReactNode }) {
  return (
    <div
      data-theme={theme}
      className="w-[340px] p-6 rounded-2xl bg-[var(--surface-panel)]"
    >
      {children}
    </div>
  );
}

export const BoardDefault: Story = {
  render: () => (
    <div className="flex gap-8">
      <Frame theme="light"><BoardWrapper /></Frame>
      <Frame theme="dark"><BoardWrapper /></Frame>
    </div>
  ),
};

export const BoardDisabled: Story = {
  render: () => (
    <div className="flex gap-8">
      <Frame theme="light"><BoardWrapper initial={5} disabled /></Frame>
      <Frame theme="dark"><BoardWrapper initial={5} disabled /></Frame>
    </div>
  ),
};
