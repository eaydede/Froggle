import type { ChangelogEntry } from '../types';

const entry: ChangelogEntry = {
  id: 'daily-gauntlet-2026-05-22',
  date: '2026-05-22',
  kind: 'major',
  title: 'Daily Gauntlet',
  body: (
    <>
      <p>
        A new daily mode chains three rounds back to back, each with its
        own scoring twist:
      </p>
      <ul>
        <li>
          <strong>Standard</strong> — regular play, no twist
        </li>
        <li>
          <strong>Bonus</strong> — one letter on the board scores 2×
        </li>
        <li>
          <strong>Bounty</strong> — every letter has its own point value
        </li>
      </ul>
      <p>
        Your gauntlet standing is the sum of your three round ranks —
        lowest wins. Crushing one round and stumbling in another can still
        come out ahead.
      </p>
    </>
  ),
};

export default entry;
