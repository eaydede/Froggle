import type { ChangelogEntry } from '../types';

const entry: ChangelogEntry = {
  id: 'experimental-modes-2026-07-02',
  date: '2026-07-02',
  kind: 'major',
  title: 'Experimental modes',
  body: (
    <>
      <p>
        A new home for prototype game modes now lives on the landing
        page. Two experimental dailies to try, each with its own twist!
      </p>
      <ul>
        <li>
          <strong>Time is Money</strong> — every word you find adds
          seconds to the clock. Keep the chain going as long as you can.
        </li>
        <li>
          <strong>Golden Ticket</strong> — the center tile is a
          wildcard. Draw through it and every letter that completes the
          word scores at once.
        </li>
      </ul>
    </>
  ),
};

export default entry;
