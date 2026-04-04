import type { Meta, StoryObj } from '@storybook/react';
import { Cell } from '../shared/components/Cell';

const DARK_BG = '#2C2C2E';

const meta: Meta<typeof Cell> = {
  title: 'Components/Cell',
  component: Cell,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    state: { control: 'select', options: ['default', 'selected', 'valid', 'invalid', 'duplicate'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    mode: { control: 'select', options: ['light', 'dark'] },
    variant: { control: 'select', options: ['simple', 'dice'] },
  },
};

export default meta;
type Story = StoryObj<typeof Cell>;

export const Default: Story = {
  args: { letter: 'F', state: 'default', size: 'md', mode: 'light', variant: 'simple' },
};

// --- States ---

function StatesGrid({ variant }: { variant: 'simple' | 'dice' }) {
  const states = ['default', 'selected', 'valid', 'invalid', 'duplicate'] as const;
  return (
    <div className="flex gap-8">
      <div>
        <div className="text-xs text-[#999] font-semibold mb-2 uppercase tracking-wider">Light</div>
        <div className="flex gap-3 p-6 rounded-2xl bg-[#FAFAF8] border border-[#eee]">
          {states.map((state) => (
            <div key={state} className="flex flex-col items-center gap-1">
              <Cell letter={state[0].toUpperCase()} state={state} size="md" mode="light" variant={variant} />
              <span className="text-[10px] text-[#999]">{state}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs text-[#999] font-semibold mb-2 uppercase tracking-wider">Dark</div>
        <div className="flex gap-3 p-6 rounded-2xl" style={{ backgroundColor: DARK_BG }}>
          {states.map((state) => (
            <div key={state} className="flex flex-col items-center gap-1">
              <Cell letter={state[0].toUpperCase()} state={state} size="md" mode="dark" variant={variant} />
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{state}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-xs text-[#666] font-semibold mb-2">Simple</div>
        <StatesGrid variant="simple" />
      </div>
      <div>
        <div className="text-xs text-[#666] font-semibold mb-2">Dice</div>
        <StatesGrid variant="dice" />
      </div>
    </div>
  ),
};

// --- Sizes ---

function SizesRow({ variant }: { variant: 'simple' | 'dice' }) {
  const sizes = ['sm', 'md', 'lg'] as const;
  return (
    <div className="flex gap-8">
      <div>
        <div className="text-xs text-[#999] font-semibold mb-2 uppercase tracking-wider">Light</div>
        <div className="flex gap-3 items-end p-6 rounded-2xl bg-[#FAFAF8] border border-[#eee]">
          {sizes.map((size) => (
            <div key={size} className="flex flex-col items-center gap-1">
              <Cell letter="F" state="default" size={size} mode="light" variant={variant} />
              <span className="text-[10px] text-[#999]">{size}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs text-[#999] font-semibold mb-2 uppercase tracking-wider">Dark</div>
        <div className="flex gap-3 items-end p-6 rounded-2xl" style={{ backgroundColor: DARK_BG }}>
          {sizes.map((size) => (
            <div key={size} className="flex flex-col items-center gap-1">
              <Cell letter="F" state="default" size={size} mode="dark" variant={variant} />
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{size}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-xs text-[#666] font-semibold mb-2">Simple</div>
        <SizesRow variant="simple" />
      </div>
      <div>
        <div className="text-xs text-[#666] font-semibold mb-2">Dice</div>
        <SizesRow variant="dice" />
      </div>
    </div>
  ),
};

// --- Word example ---

function WordRow({ variant, state, mode, bg }: { variant: 'simple' | 'dice'; state: 'default' | 'selected' | 'valid'; mode: 'light' | 'dark'; bg: string }) {
  return (
    <div className="flex gap-2 p-4 rounded-xl" style={{ backgroundColor: bg }}>
      {'FROGGLE'.split('').map((letter, i) => (
        <Cell key={i} letter={letter} state={state} size="md" mode={mode} variant={variant} />
      ))}
    </div>
  );
}

export const WordExample: Story = {
  render: () => (
    <div className="flex gap-8">
      {(['simple', 'dice'] as const).map((variant) => (
        <div key={variant} className="flex flex-col gap-4">
          <div className="text-xs text-[#666] font-semibold capitalize">{variant}</div>
          {(['default', 'selected', 'valid'] as const).map((state) => (
            <div key={state} className="flex gap-3 items-center">
              <span className="text-[10px] text-[#999] w-[50px] text-right capitalize">{state}</span>
              <WordRow variant={variant} state={state} mode="light" bg="#FAFAF8" />
              <WordRow variant={variant} state={state} mode="dark" bg={DARK_BG} />
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
};
