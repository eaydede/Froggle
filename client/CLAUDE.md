# Client

Follow root `AGENTS.md` and `CLAUDE.md`. Compose capabilities in `src/app`; feature UI, state, API contracts and fixtures live with their capability in `src/features`. Shared board interaction/audio lives in `src/gameplay`, browser transport/storage/time in `src/platform`, and visual primitives/tokens in `src/ui`.

State contexts have one product responsibility. Shared primitives do not import feature state or API modules. Use stable domain keys for mutable lists. Preserve the established theme and interaction timings. The design system is `src/ui/theme.css`; keep raw design values out of new feature code where a semantic token applies.

Keep deterministic dev fixtures behind `import.meta.env.DEV`. Record screenshots under `.context/`. Run TypeScript and production build, and exercise changed rendered states in Playwright or the real app before reporting parity.
