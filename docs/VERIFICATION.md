# Verification evidence

Executed locally on November 10, 2026. The reference is the pre-rebuild application at revision `3b88e7058244df89db7d4033436002a3f0bd2a6a`, archived before implementation. All database/browser test writes use disposable PostgreSQL containers and a local test auth service.

## Executed checks

| Check | Result |
| --- | --- |
| Original unit suite, before changes | 19 files, 121 tests passed |
| Original PostgreSQL integration suite, before changes | 4 files, 17 tests passed |
| `npm run check` | Dependency boundaries, all four workspaces and browser-test TypeScript passed |
| `npm test` | 21 files, 126 tests passed |
| `npm run test:integration` | 5 files, 25 tests passed |
| `npm run test:browser` | 13 API/browser scenarios passed |
| `npm run build --workspace=client` | Passed; Vite reports the existing large-chunk advisory |
| `STORYBOOK_DISABLE_TELEMETRY=1 CI=1 npm run build-storybook --workspace=client` | Passed |
| `npm run verify:visual` | 68/68 paired comparisons passed |
| `git diff --check` | Passed |
| Running dev API | `/api/version` and public `/api/daily` responded successfully |

The production client remains about 757 kB minified JavaScript / 206 kB gzip. Route splitting was not added as an unrelated optimization. The component build retains Storybook/Vite deprecation and bundle-size advisories; neither prevents the build.

## Visual fidelity

The comparison renders 17 representative states at **390×844** and **1280×900**, device-pixel ratio 1, in **light and dark** themes: 68 original/rebuilt pairs.

States include home unplayed/completed/Zen progress, daily confirmation and already-played confirmation, found/missed-word results, Time is Money standings, Zen/Gauntlet/Time is Money introductions, active free-play/Zen/Time is Money boards, Gauntlet hot-letter and rare-letter boards, challenge invitation, and leaderboard.

- **64 pairs are pixel-exact**, comparing every RGBA pixel.
- The other four differ by **4, 21, 31 and 31 pixels** respectively, all on home/completed-home captures.
- **All 68 have zero perceptual difference** with Pixelmatch threshold 0.1 and its default antialias handling.
- No captured scene raised a browser page error.

The fixture data, clock, viewport, theme, font assets and rendering settings match between reference and candidate. The script waits for visible content and all relevant font weights, reuses identical downloaded font bytes, and warms the screenshot renderer before saving. A reference-versus-itself check exposed text rasterization noise during development; after those controls, its four challenge-invitation pairs were pixel-exact. Both raw pixel counts and perceptual counts are retained, so the perceptual threshold does not conceal the remaining exact differences.

Static screenshots disable animations only for the capture. They establish layout, typography, colors, tile decorations, responsive dimensions and stable states; they do not establish motion by themselves.

The local machine-readable evidence is `.context/visual/comparison.json`, containing a row for every scene, viewport, theme, raw difference count, perceptual count and browser error list. Paired PNGs use `original-` and `rebuilt-` prefixes. `home-before-after.png` places the original on the left and the rebuild on the right. These are local, untracked artifacts; rerunning comparison regenerates them.

## Functional and interaction coverage

The Playwright harness starts the real Express/Socket.io application, Vite, a fresh PostgreSQL database with the full migration chain, and a local Supabase-compatible auth fixture. It issues signed ES256 JWTs and serves their public JWKS; the production authentication verifier still verifies those tokens. Application API calls, SQL, persistence and room socket traffic are real. Only external word definitions are canned in browser journeys.

The 13 scenarios cover:

1. Identity is required for private APIs; malformed/fractional/out-of-bounds board paths cannot crash a game.
2. Saved sessions are owner-only; challenge metadata is available before play while full challenge word lists remain private; repeated sharing is idempotent.
3. Later Gauntlet rounds are blocked until predecessors finish; malformed round indices and invalid feedback return meaningful errors; unknown API paths return JSON 404.
4. Timed daily accepts a traced word, rejects its duplicate, preserves the board and accepted word through reload, and can finish after resuming.
5. Zen locks in casual choice, accepts a word, opens/sorts/closes the found-word sheet, resumes saved progress, and confirms/cancels early completion.
6. Time is Money awards the expected six seconds for a five-letter word, preserves progress through reload, and shows `1:06` earned time after finalization.
7. Gauntlet starts round one, accepts a word, shows results and advances to the next round.
8. A real room updates rules, shares its countdown, accepts a word, finishes and writes personal history after the grace window.
9. Results select/stop an opponent, replay a word, load a definition, and preserve theme through reload.
10. A completed shared board creates a challenge link; another identity accepts it, plays the same board, compares results, and revisiting the invitation returns to results.
11. Two browser contexts share a board; reconnect preserves identity and letters; host departure transfers controls with the correct notice; the successor can finish.
12. Profile edits persist through reload; feedback traverses the actual API and succeeds.
13. A new build ID cannot reload an active run, but the idle results page safely refreshes after finishing.

Motion is checked through rendered computed styles: success letters use 400 ms waves with 40 ms staggering; duplicate feedback uses a 300 ms shake; Zen's sheet transitions over 260 ms with the original cubic-bezier easing and returns below the viewport on Escape; comparison regions use the original 450 ms entrance. Countdown and segmented-control changes are exercised through live interaction. The unchanged stylesheet retains the additional keyframes documented in the feature specification.

Unit tests add pure gesture/path regressions, including circular hitboxes, diagonal connection, retraction, nonadjacent moves, duplicate tiles and malformed coordinates. PostgreSQL regressions submit simultaneous distinct words and simultaneous duplicates in timed daily, Zen, Gauntlet and Time is Money. Distinct words both survive; duplicates persist once. Existing score, ranking, grace-period, moderation, room-history and lifecycle tests continue to pass.

Additional live screenshots include `.context/visual/live-lobby.png`, `live-daily-results.png`, `live-zen-word-sheet.png`, `live-multiplayer-results.png` and `compare.png`.

## Reproduce

```sh
npm ci
npx playwright install chromium
npm run check
npm test
npm run test:integration
npm run test:browser
npm run build --workspace=client
STORYBOOK_DISABLE_TELEMETRY=1 CI=1 npm run build-storybook --workspace=client
```

Docker must be running for integration and browser checks. Browser tests start their own local infrastructure on ports 54350–54352 and tear it down afterward. No application `.env` is loaded by that harness.

For before/after visual comparison in this workspace, keep the original snapshot Vite server on port 5180 and the rebuilt dev client on port 5174. The archived reference's launcher is `.context/original/app/client/baseline.config.mts`; from that directory, run `../../../../client/node_modules/.bin/vite --config baseline.config.mts`. Then, from the workspace root:

```sh
REFERENCE_URL=http://localhost:5180 CANDIDATE_URL=http://localhost:5174 npm run verify:visual
```

`VISUAL_OUTPUT_DIR` can keep an additional comparison separate. `ONLY_SCREEN` can select a single scene by its name in `scripts/compareExperience.mjs`. A nonzero perceptual difference or browser page error makes the command fail; exact differences are always reported even when below the perceptual threshold.

## Practical limits

The measured rendering and interaction checks use Chromium on macOS with mobile and desktop viewports. They are not a device-lab certification of Safari, Firefox or physical touchscreen behavior. Browser tests mute audio and mock dictionary definitions; they do not prove audible playback, current third-party dictionary availability or the native OS share sheet. Existing audio synthesis and native-share integration are retained. Live room/lobby workflows are tested and screenshotted but are not included in the deterministic paired visual matrix, whose room codes and live presence would otherwise require additional normalization.

No production deployment or production-data mutation was used to establish these results. These checks establish broad behavioral and visual fidelity, with the specific limits above, rather than a claim that every possible device/network combination is identical.

## Merge-readiness review — November 11, 2026

Fetched `origin/main`; the workspace's HEAD still matches its latest revision. Re-ran dependency/TypeScript checks, all 126 unit tests, all 25 PostgreSQL tests, all 13 browser/API scenarios and the production client build successfully. `git diff --check` also passed.

Built the existing production Dockerfile locally with placeholder client auth settings. A generated Storybook directory was initially included in the image, causing Tailwind to scan extra classes. Added `client/storybook-static` to `.dockerignore` and rebuilt: the image now produces the same `index-BOIsBwKh.css` asset as the local build. The image uses the existing Node 20 runtime; its 126 unit tests also pass (with the repository's Vitest configuration mounted into the container).

The production image started successfully without production credentials. Smoke checks verified its stamped build ID, public daily board/dictionary loading, root and deep-linked SPA routes, no-cache HTML, immutable hashed assets, JSON API 404, absence of generated Storybook output and clean SIGTERM shutdown. Authenticated database workflows remain covered by the separate isolated integration/browser harness, rather than this container smoke check.

Added `.github/workflows/verify.yml` to run dependency/TypeScript checks, unit tests, PostgreSQL integration tests, browser/API scenarios, production build and Storybook build on pull requests to `main`. It uses Node 22 for the testcontainers dependency and requires no production secrets. These commands have passed locally; the workflow itself has not run on GitHub yet. Repository administrators can make its `Types, tests and builds` status required through branch protection.

The data-model redesign and word-attempt recording discussed separately are not included in this refactor. No database migration, commit, push, merge or deployment was performed during this review.
