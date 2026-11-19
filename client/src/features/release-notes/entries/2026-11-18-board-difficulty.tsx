import type { ChangelogEntry } from '../types';

const entry: ChangelogEntry = {
  id: 'board-difficulty-2026-11-18',
  date: '2026-11-18',
  kind: 'minor',
  title: 'Get to know your board',
  body: (
    <>
      <p><strong>This board</strong> shows how tricky your puzzle is compared with boards under the same rules, using word familiarity and how often players find each word.</p>
      <p>Tap it to explore <strong>every word, hardest first</strong>, rated from 0 (easiest) to 1 (hardest).</p>
      <p>Difficulty estimates are still being tuned and may not be well calibrated yet. Ratings could change.</p>
    </>
  ),
};

export default entry;
