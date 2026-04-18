# Client

React + Vite + Tailwind v4 workspace. Rules in this file scope to `client/` and
extend the project root `CLAUDE.md`. When a root rule and a client rule
disagree, the client rule wins within this workspace.

## React

- **List keys are stable identifiers, not array indices.** `key={index}` is
  only acceptable when the list is fully static and never reorders, filters,
  or grows. If a list can be sorted, filtered, spliced, or animated in place,
  use a stable domain key (id, unique string). Index keys silently misassign
  DOM nodes on reorder, which corrupts animations, transitions, and
  uncontrolled child state.

## Styling

- **No raw color values in component code.** Colors are expressed as CSS
  variables declared in `client/src/tailwind.css`. That includes hex, rgb,
  hsl, and named colors used in `className`, `style={{}}`, or constant
  objects. If a needed color isn't in the theme, add it to the shared `:root`
  or to the light/dark theme blocks first, then reference it as
  `var(--token)`. Palettes that are reused across a feature (score tiers,
  semantic states, etc.) should get a named token family rather than living
  as private per-file constants.
- **Typography goes through the scale, not arbitrary sizes.** Use
  `text-[var(--text-*)]` (see `--text-title`, `--text-heading`,
  `--text-body-lg`, `--text-body`, `--text-small`, `--text-caption` in
  `tailwind.css`) instead of `text-[Npx]` or `text-[Nrem]`. If a required
  size genuinely isn't on the scale, add a new token to the scale first —
  don't scatter one-off arbitrary values across components.
- **Prefer Tailwind classes over `style={{}}` for static values.** Inline
  `style` is reserved for values that change at runtime — transforms,
  computed positions, animated offsets, etc. — and for CSS properties
  Tailwind cannot express (e.g. `WebkitTapHighlightColor`,
  `WebkitOverflowScrolling`). Static typography, static colors, and static
  sizing flow through className, using arbitrary utilities
  (`text-[var(--text-body)]`, `font-[family-name:var(--font-heading)]`,
  `[font-weight:var(--font-heading-weight)]`) when necessary. Private
  `CSSProperties` constants that exist only to spread into `style={}` are a
  smell — collapse them into className strings or shared Tailwind classes.

## Structure

- **Component size is a refactor signal, not a hard limit.** Once a
  component crosses ~250 lines, default to decomposing it unless every
  concern is genuinely coupled. Look for natural seams: visual sub-regions
  that can become child components, interaction logic that can become a
  hook (measurement, drag/swipe, click-outside, timers). The goal isn't a
  line-count target — it's that each file answers one question.
- **Context values are domain-scoped.** If a new field doesn't fit the
  existing context's domain (game, auth, preferences, daily, etc.), start a
  new context instead of piling the field onto the nearest one. Contexts
  are cheap; god-contexts are not.

## Verification

- **If you changed a component's rendered output, you must look at that
  specific component rendered** — in the real app or via a dev-only
  fixture. Type-check and smoke-testing adjacent pages are necessary but
  not sufficient. "Tokens map to identical values" is a reasoning proof,
  not a rendering proof, and is the exact class of argument that hides
  regressions.
- **Dev-only route fixtures for stateful pages.** Pages that require game
  state to reach (results, mid-game, daily post-play) should expose a
  `?mock=<name>` query param behind `import.meta.env.DEV`. Fixtures live
  under the page at `__fixtures__/` and get registered in an index lookup.
  The goal is to make the refactored component reachable in one click, so
  the verification rule above is cheap to honour. See
  `pages/results/__fixtures__/` for the pattern.
