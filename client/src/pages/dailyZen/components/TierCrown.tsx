import type { ZenTier } from 'models/zenTiers';

interface TierCrownProps {
  tier: ZenTier;
  /** Tap target — typically opens the tier ladder sheet. Optional so the
   *  crown can be used as a static label on read-only surfaces. */
  onClick?: () => void;
}

// Achievement label rendered above the hero number on the zen results page.
// Italic Fraunces tinted with the tier accent — borrowed from the rest of
// the results layout. Tappable when an onClick is supplied; the visual cue
// is a small chevron beside the name.
export function TierCrown({ tier, onClick }: TierCrownProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-label={onClick ? `${tier.name} tier — view ladder` : undefined}
      className={[
        'inline-flex items-center gap-2 leading-none bg-transparent border-none p-0 m-0',
        onClick ? 'cursor-pointer hover:opacity-80 transition-opacity duration-150' : '',
      ].join(' ')}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <span
        aria-hidden
        className="block w-[18px] h-[1px]"
        style={{ background: `var(${tier.colorToken})`, opacity: 0.55 }}
      />
      <span
        className="italic text-base font-[family-name:var(--font-display)] tracking-[-0.005em]"
        style={{ color: `var(${tier.colorToken})`, fontWeight: 600 }}
      >
        {tier.name}
      </span>
      {onClick && <ChevronIcon />}
      <span
        aria-hidden
        className="block w-[18px] h-[1px]"
        style={{ background: `var(${tier.colorToken})`, opacity: 0.55 }}
      />
    </Tag>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="text-[color:var(--ink-faint)] -ml-1 self-center"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
