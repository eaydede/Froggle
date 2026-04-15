import { Button } from "../../../shared/components/Button"
import { formatConfig } from "../utils";

interface UnplayedCardProps {
  config: {
    boardSize: number;
    timeLimit: number;
    minWordLength: number;
  };
  onStart: () => void;
}

export function UnplayedCard({ config, onStart }: UnplayedCardProps) {
  const { boardLabel, timerLabel, lettersLabel } = formatConfig(config);

  return (
    <div
      className="rounded-[14px] flex-1 flex flex-col items-center justify-center px-4 py-6"
      style={{
        background: "color-mix(in srgb, var(--page-bg) 85%, var(--text) 5%)",
        border: "1.5px dashed var(--dot)",
      }}
    >
      <div data-start-btn>
        <Button variant="primary" size="lg" onClick={onStart}>
          Start puzzle
        </Button>
      </div>
      <div
        className="text-[11px] mt-3 flex items-center justify-center gap-[3px]"
        style={{
          fontFamily: "var(--font-sans)",
          color: "var(--text-muted)",
        }}
      >
        <span>{boardLabel}</span>
        <span>&middot;</span>
        <span>{timerLabel}</span>
        <span>&middot;</span>
        <span>{lettersLabel}</span>
      </div>
    </div>
  );
}