import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ResultsHero } from './ResultsHero';

it('compares unranked Zen players without assigning them a fictional first place', () => {
  const html = renderToStaticMarkup(
    <ResultsHero
      me={{ displayName: 'You', points: 20, wordCount: 8 }}
      opponent={{ displayName: 'Casual player', points: 25, wordCount: 9 }}
      myRank={null}
      oppRank={null}
      totalPlayers={2}
      compact
    />,
  );
  expect(html).toContain('Casual player');
  expect(html).toContain('vs');
  expect(html).toContain('-5');
  expect(html).not.toContain('#');
});
