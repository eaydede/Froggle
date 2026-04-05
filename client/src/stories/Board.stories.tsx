import { useState, useCallback } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Board } from '../pages/game/components/Board';
import type { FeedbackType } from '../pages/game/components/Board';
import type { Position } from 'models';

const meta: Meta<typeof Board> = {
  title: 'Components/Board',
  component: Board,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Board>;

const board4x4 = [
  ['F', 'R', 'O', 'G'],
  ['L', 'E', 'A', 'P'],
  ['T', 'O', 'A', 'D'],
  ['S', 'W', 'I', 'M'],
];

const board5x5 = [
  ['F', 'R', 'O', 'G', 'S'],
  ['L', 'E', 'A', 'P', 'T'],
  ['T', 'O', 'A', 'D', 'Y'],
  ['S', 'W', 'I', 'M', 'E'],
  ['P', 'O', 'N', 'D', 'R'],
];

const board6x6 = [
  ['F', 'R', 'O', 'G', 'S', 'H'],
  ['L', 'E', 'A', 'P', 'T', 'O'],
  ['T', 'O', 'A', 'D', 'Y', 'P'],
  ['S', 'W', 'I', 'M', 'E', 'R'],
  ['P', 'O', 'N', 'D', 'R', 'S'],
  ['C', 'R', 'O', 'A', 'K', 'E'],
];

function InteractiveBoard({ board, size }: { board: string[][]; size: number }) {
  const [feedback, setFeedback] = useState<{ type: FeedbackType; path: Position[] } | null>(null);
  const [lastWord, setLastWord] = useState('');

  const handleSubmitWord = useCallback((path: Position[]) => {
    const word = path.map(p => board[p.row]?.[p.col] || '').join('');
    setLastWord(word);
    const types: FeedbackType[] = ['valid', 'invalid', 'duplicate'];
    const type = types[Math.floor(Math.random() * types.length)];
    setFeedback({ type, path });
    setTimeout(() => setFeedback(null), 1200);
  }, [board]);

  return (
    <div style={{ '--board-size': size, width: 360 } as React.CSSProperties}>
      <Board
        board={board}
        onSubmitWord={handleSubmitWord}
        feedback={feedback}
      />
      {lastWord && (
        <div className="text-center mt-3 text-sm text-[var(--text-muted)]">
          Last word: <strong>{lastWord}</strong>
        </div>
      )}
    </div>
  );
}

export const Default4x4: Story = {
  render: () => <InteractiveBoard board={board4x4} size={4} />,
};

export const Board5x5: Story = {
  render: () => <InteractiveBoard board={board5x5} size={5} />,
};

export const Board6x6: Story = {
  render: () => <InteractiveBoard board={board6x6} size={6} />,
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex gap-8 items-start">
      {[
        { board: board4x4, label: '4×4', size: 4 },
        { board: board5x5, label: '5×5', size: 5 },
        { board: board6x6, label: '6×6', size: 6 },
      ].map(({ board, label, size }) => (
        <div key={label}>
          <div className="text-xs text-[#999] font-semibold mb-2 uppercase tracking-wider text-center">{label}</div>
          <InteractiveBoard board={board} size={size} />
        </div>
      ))}
    </div>
  ),
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div className="p-8"><Story /></div>],
};
