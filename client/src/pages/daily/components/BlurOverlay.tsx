interface BlurOverlayProps {
  visible: boolean;
  onClick: () => void;
}

export function BlurOverlay({ visible, onClick }: BlurOverlayProps) {
  if (!visible) return null;

  // Fixed + inset:0 so the blur covers the entire viewport. Using the
  // page's container bounds would leave the App-level 20px padding
  // unblurred (visible as an edge strip), which breaks the illusion
  // that the whole UI is de-emphasized.
  return (
    <div
      className="fixed inset-0 z-10 backdrop-blur-xs"
      style={{
        background: "color-mix(in srgb, var(--page-bg) 40%, transparent)",
      }}
      onClick={onClick}
    />
  );
}
