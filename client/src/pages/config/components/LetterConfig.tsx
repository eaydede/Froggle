import { SegmentedControl, type SegmentedOption } from "./SegmentedControl";
import type { MinWordLength } from "../types";

const OPTIONS: SegmentedOption<MinWordLength>[] = [
  { value: 3, label: "3", sub: "Easy" },
  { value: 4, label: "4", sub: "Normal" },
  { value: 5, label: "5", sub: "Hard" },
];

interface LetterConfigProps {
  value: MinWordLength;
  onChange: (len: MinWordLength) => void;
  disabled?: boolean;
}

export function LetterConfig({ value, onChange, disabled }: LetterConfigProps) {
  return (
    <SegmentedControl
      label="Min. Letters"
      value={value}
      options={OPTIONS}
      onChange={onChange}
      disabled={disabled}
      labelSize="md"
    />
  );
}
