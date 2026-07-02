// The golden wildcard tile at the center of a Golden Ticket board. Drops in
// through the shared Cell `overlay` slot, so it stacks over whatever selection
// state the cell is in (default / selected / valid) without fighting it. The
// tile reads as a solid gold plate with a warm halo pulsing softly around its
// outside — the glow lives in box-shadow so it can spill beyond the tile
// bounds and mark the wildcard as the source of light on the board.
//
// Deliberately opaque so the underlying wildcard character (`★`) that sits in
// the board array is hidden — the tile visually reads as a blank; the marker
// still drives the drawn-word display so a golden path shows as e.g. `C★T`
// while the player is drawing.

export function GoldenTileOverlay() {
  return (
    <div
      className="w-full h-full rounded-[12px]"
      style={{
        backgroundColor: 'var(--golden-tile-face)',
        animation: 'golden-tile-glow 2.4s ease-in-out infinite',
      }}
    />
  );
}
