# Froggle: product and experience specification

This inventory records the application before the rebuild (baseline revision in `.context/original/revision.txt`). It describes shipped behavior, including older links and saved games. It is the compatibility specification for the replacement; comments describing abandoned designs are not treated as features.

## Intent

Froggle is a mobile-first, browser-based word-finding game. Players trace adjacent letter tiles to discover English words. It combines a daily habit, relaxed vocabulary exploration, short competitive runs, and playing the same board with friends. Learning what was missed and comparing discoveries are central parts of the experience, not just an end-of-game score screen.

There is no required registration screen. Supabase anonymous authentication gives the browser a persistent player identity. A moderated display name represents that identity in rooms, history, and standings. This is browser-session identity, not a shipped cross-device account-management product.

## Core play

- Draw with a mouse or touch pointer; release to submit. Horizontal, vertical, and diagonal neighbors are legal. A tile cannot repeat within a word. Dragging back over an earlier adjacent tile retracts the path to that tile. Leaving the board cancels the gesture.
- Hit testing uses a circular region, radius 85% of half the tile width. The board prevents touch scrolling while tracing. Nearby unselected tiles subtly shrink toward the pointer.
- Letters are assembled from tile contents. `Qu` occupies one tile and contributes two letters to word length. Accepted words come from the bundled ENABLE dictionary; board generation and the solver support multi-character tiles.
- Each mode sets a minimum word length. Duplicate words do not add points. Invalid paths, short words, non-dictionary words, repeated words, ended sessions, and expired runs have distinct validation outcomes where applicable.
- Standard points: 3 or fewer letters = 1; 4 = 2; 5 = 3; 6 = 5; 7 = 8; 8+ = 13. The UI never exposes words below the active minimum even though the scoring function accepts short strings.
- Instant local validation uses salted hashes of the legal words. Accepted submissions also go to the server, which validates against the actual board, dictionary, timer, and saved words. Hashes are an interaction optimization, not authorization.
- Tiles show blue selection, green success, red invalid, and amber duplicate feedback. Feedback flashes for 200 ms. A live word banner stays above the board without shifting it; success in timed play waves individual letters for 400 ms with 40 ms staggering, invalid/duplicate attempts shake for 300 ms. The banner holds for 800 ms then fades over 300 ms. Zen uses a plain success word with the same hold/fade.
- Tile selection makes a synthesized thock. Success, invalid, and duplicate attempts have distinct synthesized feedback sounds. Mute persists locally. Standard timer bars update every 100 ms with linear width transitions.
- Game settings and the mode appear beneath the board. Timed play has an end-game control. Early finishing is supported; Zen asks for confirmation before irreversible daily finalization.

## Home and identity

The home screen presents a compact centered column, Froggle's italic wordmark and green dot, local display name/profile control, date, daily reset countdown, streak, four daily-mode cards, Free Play, history activity, feedback, and a changelog control. Cards change between unplayed, resumable, and completed treatments; completed cards summarize performance and may show rank badges. Missing auxiliary counts do not prevent the home screen from rendering.

- Light/dark preference persists in `froggle-theme`. The visual theme is warm paper and ink in light mode, warm charcoal and cream in dark mode, with floating cards, soft shadows, sage accents, colored word rarity, and gold/silver/bronze podium cues.
- Fonts: Fraunces for expressive display, Inter for UI, Outfit for structural labels and tiles; Merriweather remains used by legacy heading roles. Font resources load through the document head.
- Profile editing supports up to 20 characters. Moderation masks profane public names with a deterministic friendly name. Repeated profane edits accumulate strikes; the third starts a 24-hour editing lock and applies the marked/masked treatment. A clean edit resets strikes. Explanatory profile states distinguish masking from locking.
- Feedback accepts a trimmed nonempty message up to 2,000 characters, exposes submitting/success/error states, and may be saved without an authenticated user.
- The changelog shows dated product updates and tracks what has been seen locally; unseen major entries open automatically and unread updates pulse a notification dot.

## Daily timed puzzle

- One shared seeded board per day. Days turn over in `America/Los_Angeles` (Pacific time, including DST), not the device's timezone. Puzzle numbering starts April 10, 2026.
- From April 27, 2026 onward the seeded rotation chooses one of seven `(board size, minimum letters)` pairs: `(4,3)`, `(4,4)`, `(5,3)`, `(5,4)`, `(5,5)`, `(6,4)`, `(6,5)`; duration is 120 or 180 seconds. Earlier saved puzzles retain 5×5 / 4 letters / 120 seconds.
- A confirmation page explains today's rules before starting. Starting is idempotent and restricted to today. One persisted run per player/date prevents replaying a daily for a better rank.
- Refresh resumes the saved board, found words, and actual remaining time. Server time is converted to the device clock and anchored to monotonic elapsed time. Timeout finalizes at the original deadline; a small server grace period handles words arriving at the buzzer. Early finishing is also possible.
- Results show found and missed words, points, longest word, board paths, sharing, standings, and comparison. Past results are reachable through date navigation. Results do not appear until the run ends.
- Statistics include current streak, recent streak-day markers, mean points/words, a per-date played/missed/unplayed timeline, participation counts, completion stamps, and longest-word definitions. A streak may carry from yesterday before today's puzzle is played. The streak is unified across daily modes: a finalized timed run counts, while starting Zen, Gauntlet or Time is Money also counts as daily engagement. The last seven played timed days supply the displayed points/words averages, independently of that shared streak.
- Leaderboard views rank points, number of words, and rarity, include podium treatments and the current player's summary/rank/percentile/accolade, and support historical dates. Rarity weights each found word by its standard score times `(2 − its finder count / total players)`; displayed rarity values are rounded and equal displayed values tie. Equal values use competition ranking (1,1,3); ordering within a tie must not split a rank.

## Daily Zen

- Separate shared 5×5 board, minimum 4 letters, no countdown. Numbering starts April 26, 2026. Leave and return during the day with progress saved.
- Before starting, choose casual or competitive. The last choice is remembered locally; the persisted choice is locked for that day's session. Casual scores do not enter the ranked leaderboard. Competitive scores rank only after finalization. In-progress competitive players appear as scoreless presence, not premature ranked results. Casual players count toward participation totals but are omitted from that presence list.
- End puzzle confirms points and words and explains that today's puzzle cannot continue afterward. A new day selects a new session. The original service does not auto-finalize an old Zen row at midnight; this should not be represented as a shipped automatic-end feature.
- Points are primary. A rank strip shows progress against the board's theoretical maximum points, captured when the session starts: Scribe 3%, Wordsmith 8%, Linguist 14%, Virtuoso 22%, Legend 28%. A rank-ladder sheet explains the progression. Legacy runs may have no stored maximum.
- Crossing a new rank celebrates inline for 1,800 ms (dot pulse, colored wash, and RANK UP tag). Resuming an existing rank must not celebrate it again. The board remains unobscured.
- The found-words summary opens a bottom sheet with recent/score sorting and rarity stripes. The sheet stays mounted for opening and closing animation, dismisses through its close control, scrim, or Escape, and limits height to 72dvh.
- Finalized results support historical navigation, definitions, sharing, board replay, and player comparison. Finished casual players may compare despite being unranked. The Zen leaderboard separately exposes points/words rankings and current competitive active-player presence.

## Daily Gauntlet

- Three rounds in sequence, separately seeded by date and round. Numbering starts May 21, 2026. A hub communicates unplayed, partial, and completed progress, per-round summaries, and the next available round. Later rounds cannot start before earlier rounds finish.
- Every round lasts 120 seconds and requires 4 letters. Round 1: 4×4, normal scoring. Round 2: 5×5, a seeded hot letter doubles each word containing it. Round 3: 5×5, letter-value scoring replaces word-length scoring.
- Rare-letter values: A/E/I/O/U/L/N/R/S/T=1; D/G=2; B/C/M/P=3; F/H/V/W/Y=4; K=5; J/X=8; Q/Z=10. `Qu` contributes both letter values.
- Hot tiles receive violet accents; rare-letter tiles show small point badges. Round confirmation cards explain the modifier; valid hot-letter words surface a bonus badge.
- Each round resumes its stored board/timer/words, ends manually or on expiry, and has its own results and standings. Round scoring settings persist with the result.
- Overall standing uses the sum of the player's competition rank in each round, lowest sum wins. Equal rank sums tie; raw total points do not replace this rule. Complete players enter the overall ranking. Partial progress is represented explicitly. The standings/date picker includes completed and incomplete days and an explanation of rank-sum scoring.

## Time is Money

- Separate daily 5×5 board, minimum 3 letters, starts with 60 seconds. Numbering starts July 1, 2026. Former experimental naming is historical; the current public experience is a permanent daily mode.
- Every standard point adds 2 seconds. The deadline is `start + saved base time + points × 2 seconds`. Refresh must retain banked time. A 2-second server grace window applies at the buzzer.
- An overview explains the rules and dispatches play/resume/results according to saved status. One daily run per player/date; idempotent start, early finish, automatic expiration.
- The timer can grow past full. Overflow layers use blue, purple, and orange rarity colors and drain from the highest layer down. Accepted-word feedback shows time earned.
- The main result is the clock earned (`saved base seconds + points × 2`), formatted as time survived. This is a score transform, not a separate stopwatch measurement; manually ending early does not change that formula. Standings sort equivalently by points. Sharing uses the time headline.
- Results include Recap, Highlights, definitions, board review, roster, and comparison. Historical result configuration is read from the saved run rather than today's defaults.

## Free Play and live rooms

- Free Play creates a room immediately. A room of one is solo play; inviting friends turns the same lobby into multiplayer. There is no standalone settings page in the current journey.
- Room codes are 5 uppercase characters without ambiguous 0/1/I/O. Join by code or invite URL. A precheck distinguishes missing/expired rooms from connection trouble. Reconnecting preserves the last good room snapshot.
- Lobby: optional first-visit explainer, room code/share, private/public setting, roster, configurable rules, last-round winner/streak, and a docked Start button with a gradient backdrop. Only the host changes rules, visibility, or starts rounds.
- Board options: 4×4 Classic, 5×5 Big, 6×6 Mega. Timer options: 60s Sprint, 120s Standard, 180s Chill. Minimum letters: 3 Easy, 4 Normal, 5 Hard. Current room play always uses a finite timer. The older shared-board transport still accepts legacy solo configurations; do not add an untimed option to the shipped lobby.
- Segmented choices have a sliding selected pill. Non-hosts see the synchronized rules as read-only and can nudge the host. The client offers a 12-second nudge cooldown; the server independently rate-limits at 10 seconds. The host gets a transient notice.
- Public rooms are actually discoverable through the lobby browser. The home card polls the total public-player count (20 seconds). Solo lobbies can browse and hop to another public room. Private rooms remain accessible by code/link.
- Everyone present at start receives the same seeded board and 3-second get-ready countdown. The host can advance countdown steps. Late joiners wait in the lobby and do not enter that round's standings.
- Each player submits independently and may finish their own board. A round completes when all active players finish, when the deadline passes, or when the host ends it. A short 500 ms grace interval accepts in-flight final words. Saved room results wait for that window before persistence.
- Stable private reconnect keys survive reloads; public player IDs are separate and safe to broadcast. Display names come from authenticated moderated profiles. Socket clock synchronization corrects skewed devices.
- Disconnected players retain their seat. Explicit leavers retain a frozen score and departed marker for the current round, then are pruned before the next. Host ownership transfers when the host leaves, with an explanatory toast. Empty/inactive rooms expire after six hours of inactivity.
- Results show shared-board standings, proportional score bars, opponent comparison, missed words and definitions. The host can start another round or return to lobby. Non-hosts may return to lobby while waiting. The last score sheet can reopen from the lobby, and winner streaks carry across rounds in the room.
- Finished room boards persist to the same personal history as solo games and can be shared as asynchronous challenges. Sharing waits for persistence, so immediately sharing a just-finished board works.

## Shared boards and asynchronous challenges

- Compact `c` query parameters encode a seed, duration, size, and minimum length; optional `ch` identifies a challenge. Existing links remain valid. A bare encoded board auto-starts; a challenge first shows who invited the player, rules, and participation.
- A completed session can be promoted idempotently into a challenge; the original session ID is its stable challenge ID. Sharing the same result again keeps the URL stable.
- Challenge recipients play the same seeded configuration on their own time. Returning participants go to the comparison results, with no second scored replay. A missing preview may fall back to playing a valid encoded board; unavailable challenge results have explicit error states.
- Challenge standings include moderated names, score, words, longest word, owner/you markers, tie-aware rank, and full found-word lists. The caller must have completed the challenge before viewing its solutions. Saved private session results are owner-only.
- History lists up to 200 completed personal free-play sessions, latest first, groups recent challenges, shows rules and score summaries, and badges first place and newly completed challengers. Old daily records that were accidentally saved as free play are excluded.
- New results are counted relative to when the owner last viewed the challenge, summed for the home badge, and cleared when the owner opens standings. A solo history row opens its own result; a shared game with multiple players opens comparison/standings.

## Results, learning, and social sharing

- The shared results page keeps the score hero, standings, and replayable board above Recap / Highlights tabs. All modes use the same detail views, while preserving mode-specific heroes, rules, and bottom actions.
- Recap defaults to your points-sorted words. All words includes every solution and dims missed words. Selecting a word animates its path in its rarity color and reveals a one-line definition peek; Only the More button opens the light definition sheet; the preview text does not. Lookup tries the original word and plural stems through the existing dictionary sources, caching successes and missing entries.
- Run shows a score-over-time step chart with play/pause, pointer scrubbing, keyboard controls, a live hero, and a centered current find. Playback compresses a game into seven seconds. New submissions record elapsed seconds; Zen uses its gap-capped active seconds. The line becomes dotted after the actual finish through the remaining time allowance. Room results preserve each player’s individual finish time. Historical games keep their actual find order and explain that timestamps were not recorded. Historical comparisons preserve each player's own order without inventing a common chronology.
- Comparing uses one scroller with opponent-left / you-right columns, shared and unique word treatments, and merged timestamped finds in Run. Select a standings row or a Highlights name to compare; selecting the same player or the view-row × exits. Unranked Zen players have no rank badge. Comparison changes keep the current list and scroll position visible while loading, then crossfade into the new layout; the loading indicator overlays the content without shifting it. Deep links and expected comparison errors remain supported.
- Highlights shows the field's longest word(s) and an All Finds list with finder names. Rows with three or more finders expand into chips. A word tap replays its path; another player's name opens their comparison in Recap.
- Tabs slide and glide over 220/260 ms. Switching list/run animates row positions over 340 ms. Reduced-motion preference skips these transitions. The definition sheet traps focus while open and restores it on dismissal.
- Share text summarizes mode/puzzle number, words/points or time survived, longest length, and six score-tier emoji groups. More than ten words in a tier use a numeric emoji count. Links lead to the matching daily mode or exact challenge/board. Native share is preferred where available; clipboard has a fallback, with copied-state feedback.
- Date navigation exposes played/missed/unplayed days and mode-appropriate summaries. Date picker overlays fade over 200 ms. Definition/found-word sheets use a dimmed, softly blurred scrim and a 260 ms upward slide with `cubic-bezier(0.22,1,0.36,1)`.

## Layout and interaction contract

Keep the current responsive dimensions rather than redesigning: outer app max-width 800px with 20px padding; home/results centered around 360px; lobby 400px; live board up to 500px; sheets up to 420px. Screens use dynamic viewport height, scrolling regions, fixed overlays, and docked controls so short mobile screens can still reach actions. Existing font roles, spacing, tile depth, border radii, shadows, colors, icon shapes, hover lift, pressed scale, focus behavior, and animation easing are part of compatibility.

Other motion includes cell-pop spring entry (350 ms), config pill slide (300–350 ms), lobby roster/chip reveal, countdown numeral pop, completed-card score entrance, unread/changelog breathing indicators, gold rarity glows, share-state changes, and 4.5-second room notices. Static screenshots alone do not prove these interactions.

## Operational behavior that affects players

- Public puzzle metadata starts loading before authentication. Per-player state hydrates after auth; redirects wait for that hydration so refresh does not strand an ongoing run.
- A foreground idle tab refreshes public daily data every 90 seconds. On focus, visibility return, or bfcache restore, it also checks a build ID and may reload a stale bundle. All refresh/reload paths are suppressed during active runs, including route-owned modes and multiplayer play.
- Existing REST URLs, Socket.io namespace/events, database migrations, anonymous identity storage, preference keys, seed/hash algorithms, board generation, and result payloads are compatibility surfaces. Content-hashed assets cache immutably; HTML and non-hashed assets revalidate.
- Deployment targets Fly.io with distinct staging/production configs; PostgreSQL/Supabase hold durable results and auth. Operational tooling includes aggregate backfill, result rescoring, daily summary email, dictionary-frequency preprocessing, and letter-pool calibration.

## Non-features and limits

No payments, ads, achievements beyond the described rank/streak cues, chat, friend graph, team accounts, cross-device login UI, AI-generated words, or custom dictionary editor were found. Rooms are ephemeral process memory, not durable distributed lobbies. Dictionary definitions need external services. Anonymous browser storage loss can lose access to the identity. A rewrite should preserve these limits rather than silently invent replacements.
