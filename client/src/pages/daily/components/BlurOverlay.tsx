interface BlurOverlayProps {
  visible: boolean;
  onClick: () => void;
}

export function BlurOverlay({ visible, onClick }: BlurOverlayProps) {
  if (!visible) return null;

  return (
    <div
      className="absolute inset-0 z-5 rounded-2xl backdrop-blur-sm"
      style={{ background: "var(--page-bg)", opacity: 0.7 }}
      onClick={onClick}
    />
  );
}
