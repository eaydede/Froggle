import { SegmentedControl, type SegmentedOption } from "./SegmentedControl";
import type { TimerOption } from "../types";

const OPTIONS: SegmentedOption<TimerOption>[] = [
  { value: 60, label: "1:00", sub: "Sprint" },
  { value: 120, label: "2:00", sub: "Standard" },
  { value: 180, label: "3:00", sub: "Relaxed" },
  { value: -1, label: "∞", sub: "Zen" },
];

interface TimerConfigProps {
  value: TimerOption;
  onChange: (timer: TimerOption) => void;
  disabled?: boolean;
}

export function TimerConfig({ value, onChange, disabled }: TimerConfigProps) {
  return (
    <SegmentedControl
      label="Timer"
      value={value}
      options={OPTIONS}
      onChange={onChange}
      disabled={disabled}
    />
  );
}
