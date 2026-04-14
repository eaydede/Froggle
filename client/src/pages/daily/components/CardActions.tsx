import { Button } from "../../../shared/components/Button";

interface CardActionsProps {
  isCompleted: boolean;
  onResults: () => void;
  onLeaderboard: () => void;
  onShare: () => void;
}

export function CardActions({
  isCompleted,
  onResults,
  onLeaderboard,
  onShare,
}: CardActionsProps) {
  return (
    <div className="flex gap-1.5 mt-2">
      <ActionButton
        label="Results"
        disabled={!isCompleted}
        onClick={onResults}
      />
      <ActionButton
        label="Leaderboard"
        disabled={false}
        onClick={onLeaderboard}
      />
      <ActionButton
        label="Share"
        disabled={!isCompleted}
        onClick={onShare}
      />
    </div>
  );
}

interface ActionButtonProps {
  label: string;
  disabled: boolean;
  onClick: () => void;
}

function ActionButton({ label, disabled, onClick }: ActionButtonProps) {
  return (
    <Button
      type="button"
      size="sm"
      className="flex-1 rounded-[10px] py-2.5 px-1 text-center text-xs cursor-pointer"
      style={{
        background: "var(--track)",
        color: "var(--text)",
        fontFamily: "var(--font-sans)",
        fontWeight: 600,
        opacity: disabled ? 0.3 : 1,
        cursor: disabled ? "default" : "pointer",
        pointerEvents: disabled ? "none" : "auto",
      }}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </Button>
  );
}