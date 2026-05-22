// "Scoring rule" card on the gauntlet confirm page. Description is the
// human rule ("one letter scores extra"), badge is the per-round flavor
// ("E · 2×"). The pair stays consistent between the confirm page and
// the post-round popover.
export function ModifierCard({
  description,
  badge,
}: {
  description: string;
  badge: string;
}) {
  return (
    <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] px-4 py-4">
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-caption uppercase tracking-[0.06em] text-[color:var(--ink-muted)] font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 700 }}
        >
          Scoring rule
        </span>
        <span
          className="text-caption text-[color:var(--accent)] font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 700 }}
        >
          {badge}
        </span>
      </div>
      <p className="text-small text-[color:var(--ink)] leading-[1.5] m-0">{description}</p>
    </div>
  );
}
