import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Button } from '../components/Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'tertiary'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    mode: { control: 'select', options: ['light', 'dark'] },
    fullWidth: { control: 'boolean' },
  },
  args: {
    onClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

const DARK_BG = '#2C2C2E';

function VariantStory({ variant, label }: { variant: 'primary' | 'secondary' | 'tertiary'; label: string }) {
  return (
    <div className="flex gap-8">
      <div className="w-[280px]">
        <div className="text-xs text-[#999] font-semibold mb-3 uppercase tracking-wider">Light</div>
        <div className="flex flex-col gap-3 p-6 rounded-2xl bg-[#FAFAF8] border border-[#eee]">
          <Button variant={variant} size="sm">{label}</Button>
          <Button variant={variant} size="md">{label}</Button>
          <Button variant={variant} size="lg" fullWidth>{label}</Button>
        </div>
      </div>
      <div className="w-[280px]">
        <div className="text-xs text-[#999] font-semibold mb-3 uppercase tracking-wider">Dark</div>
        <div className="flex flex-col gap-3 p-6 rounded-2xl" style={{ backgroundColor: DARK_BG }}>
          <Button variant={variant} mode="dark" size="sm">{label}</Button>
          <Button variant={variant} mode="dark" size="md">{label}</Button>
          <Button variant={variant} mode="dark" size="lg" fullWidth>{label}</Button>
        </div>
      </div>
    </div>
  );
}

export const Primary: Story = {
  render: () => <VariantStory variant="primary" label="Start Game" />,
};

export const Secondary: Story = {
  render: () => <VariantStory variant="secondary" label="Cancel" />,
};

export const Tertiary: Story = {
  render: () => <VariantStory variant="tertiary" label="Share Results" />,
};
