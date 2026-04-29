// Short, fixed-width date label used on results / leaderboard / picker
// headers — e.g. "Wed, Apr 29". Long weekday/month forms wrap on narrow
// viewports (Wednesday is the worst offender), so the whole app standardizes
// on the short form.
export function formatDateLabel(dateIso: string): string {
  const d = new Date(dateIso + 'T12:00:00');
  return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
