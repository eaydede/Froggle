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
- **Typography uses the scale — Tailwind defaults first, then the
  project scale.** Reach for Tailwind's built-ins (`text-xs`, `text-sm`,
  `text-base`, `text-lg`, `text-xl`, ...) whenever they fit; add a custom
  token under `@theme` in `tailwind.css` only when no default matches the
  required size. Custom tokens (`text-title`, `text-heading`,
  `text-body-lg`, `text-body`, `text-small`, `text-caption`) are invoked
  as plain utility classes — do not fall back to
  `text-[length:var(--text-*)]`, and never reintroduce `text-[Npx]` or
  `text-[Nrem]`.
- **Arbitrary `text-[…]` / `bg-[…]` / `border-[…]` utilities wrapping a
  CSS variable need a type hint.** Tailwind cannot statically infer
  whether `text-[var(--foo)]` is a font-size or a color, so it defaults to
  color and silently emits invalid CSS when the variable holds a length.
  When you genuinely need an arbitrary utility with a CSS variable (for
  example because the token is theme-dependent and hasn't been moved to
  `@theme` yet), disambiguate with `text-[color:var(--text-muted)]`,
  `text-[length:var(--some-size)]`, etc. For typography sizes, the
  preferred path is not arbitrary utilities at all — it's the `@theme`
  scale above.
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
- **Playwright screenshots go under `.playwright-mcp/`.** The MCP sandboxes
  writes to the repo tree (paths outside the repo are rejected), so the
  usable location is `.playwright-mcp/<name>.png`, which is gitignored.
  A bare filename like `foo.png` resolves to the repo root and leaves a
  tracked artefact behind — always prefix with `.playwright-mcp/`. Repo-
  root `*.png` is gitignored as a safety net, but the right default is
  not to write there in the first place.
