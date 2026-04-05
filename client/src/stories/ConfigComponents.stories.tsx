import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { BoardConfigCards } from '../pages/config/components/BoardConfigCards';
import type { BoardSize } from '../pages/config/types';
const DARK_BG = '#2C2C2E'; // matches --page-bg in dark theme

const boardMeta: Meta<typeof BoardConfigCards> = {
  title: 'Components/BoardConfig',
  component: BoardConfigCards,
  parameters: { layout: 'centered' },
};

export default boardMeta;
type Story = StoryObj<typeof BoardConfigCards>;

function BoardWrapper({ initial = 4 as BoardSize, disabled = false, mode = 'light' as 'light' | 'dark' }) {
  const [value, setValue] = useState<BoardSize>(initial);
  return <BoardConfigCards value={value} onChange={setValue} disabled={disabled} mode={mode} />;
}

export const BoardDefault: Story = {
  render: () => (
    <div className="flex gap-8">
      <div className="w-[340px]">
        <div className="text-xs text-[#999] font-semibold mb-3 uppercase tracking-wider">Light</div>
        <div className="p-6 rounded-2xl bg-[#FAFAF8] border border-[#eee]">
          <BoardWrapper />
        </div>
      </div>
      <div className="w-[340px]">
        <div className="text-xs text-[#999] font-semibold mb-3 uppercase tracking-wider">Dark</div>
        <div className="p-6 rounded-2xl" style={{ backgroundColor: DARK_BG }}>
          <BoardWrapper mode="dark" />
        </div>
      </div>
    </div>
  ),
};

export const BoardDisabled: Story = {
  render: () => (
    <div className="flex gap-8">
      <div className="w-[340px]">
        <div className="text-xs text-[#999] font-semibold mb-3 uppercase tracking-wider">Light (disabled)</div>
        <div className="p-6 rounded-2xl bg-[#FAFAF8] border border-[#eee]">
          <BoardWrapper initial={5} disabled />
        </div>
      </div>
      <div className="w-[340px]">
        <div className="text-xs text-[#999] font-semibold mb-3 uppercase tracking-wider">Dark (disabled)</div>
        <div className="p-6 rounded-2xl" style={{ backgroundColor: DARK_BG }}>
          <BoardWrapper initial={5} disabled mode="dark" />
        </div>
      </div>
    </div>
  ),
};
