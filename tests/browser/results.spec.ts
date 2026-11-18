import { expect, test } from '@playwright/test';
import fs from 'node:fs';
const seen = fs
  .readdirSync('client/src/features/release-notes/entries')
  .map(
    (file) =>
      fs
        .readFileSync(`client/src/features/release-notes/entries/${file}`, 'utf8')
        .match(/id: '([^']+)'/)![1],
  );

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.addInitScript((ids) => {
    if (!localStorage.getItem('froggle-theme')) localStorage.setItem('froggle-theme', 'dark');
    localStorage.setItem('froggle-changelog-seen', JSON.stringify(ids));
  }, seen);
  await page.route('https://freedictionaryapi.com/**', (route) =>
    route.fulfill({
      json: {
        word: 'scale',
        source: { name: 'Wiktionary' },
        license: { name: 'CC BY-SA' },
        entries: [
          {
            partOfSpeech: 'noun',
            pronunciations: [{ text: '/skeɪl/' }],
            senses: [
              {
                definition:
                  'An ordered series of marks or values used to measure or compare something.',
                examples: ['Rate the puzzle on a scale of one to ten.'],
              },
              {
                definition:
                  'One of the small, hard plates that cover the skin of a fish or reptile.',
              },
            ],
          },
          {
            partOfSpeech: 'verb',
            senses: [
              {
                definition: 'To climb up or over something steep.',
                examples: ['They scaled the north face before noon.'],
              },
            ],
          },
        ],
      },
    }),
  );
});

test('mobile recap, definition peek, light sheet and all words', async ({ page }) => {
  await page.goto('/results?mock=recap');
  await expect(page.getByRole('tab')).toHaveText(['Recap', 'Playback', 'Highlights']);
  await expect(page.getByRole('tab', { name: 'Recap' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.recap-word-text').first()).toHaveText('SCALES');
  await page.screenshot({ animations: 'disabled', path: '.context/recap-solo-list.png' });
  await page.locator('.recap-word-button').first().click();
  await expect(page.locator('.recap-definition-peek')).toContainText('An ordered series');
  await page.screenshot({ animations: 'disabled', path: '.context/recap-definition-peek.png' });
  await page.locator('.recap-definition-peek > span').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.recap-definition-peek')).toBeVisible();
  await page.getByRole('button', { name: 'More', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Definition of SCALES' });
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveCSS('background-color', 'rgb(250, 248, 243)');
  await expect(sheet.getByRole('button', { name: 'Close definition' })).toBeFocused();
  await expect(sheet).toHaveCSS('translate', '0px');
  await page.screenshot({ animations: 'disabled', path: '.context/recap-definition-sheet.png' });
  await page.keyboard.press('Tab');
  await expect(sheet.getByRole('button', { name: 'Close definition' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /More$/ })).toBeFocused();
  await page.getByRole('button', { name: 'All words', exact: true }).click();
  await expect(page.locator('.recap-word.missed').first()).toBeVisible();
  await page.getByRole('button', { name: 'Found', exact: true }).click();
  await expect(page.locator('.recap-word')).toHaveCount(11);
});

test('solo and compare runs scrub, play, reset, and share a scroller', async ({ page }) => {
  await page.goto('/results?mock=recap');
  await page.getByRole('tab', { name: 'Playback' }).click();
  const chart = page.getByRole('slider', { name: 'Run playhead' });
  await chart.focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < 63; i++) await page.keyboard.press('ArrowRight');
  await expect(page.getByText('1:03 · 7 of 11 words')).toBeVisible();
  await expect(page.locator('[data-current="true"] .recap-word-text')).toHaveText('LAMES');
  const plotBounds = (await chart.boundingBox())!;
  await chart.click({ position: { x: plotBounds.width * 0.527, y: 30 } });
  await expect(page.locator('[style*="color-mix"]')).toHaveCount(5);
  await page.screenshot({ animations: 'disabled', path: '.context/recap-solo-run.png' });
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('tab', { name: 'Recap' }).click();
  await expect(chart).toHaveCount(0);
  await expect(page.locator('.recap-word-text').first()).toHaveText('SCALES');
  await page.getByRole('button', { name: 'Compare with Wach' }).click();
  await expect(page.getByRole('button', { name: 'Stop comparing' })).toBeVisible();
  await expect(page.locator('.recap-words')).toHaveCount(1);
  await expect(page.locator('.recap-compare-row').first().locator('.recap-word-text')).toHaveText(
    'LEACHES',
  );
  await page.locator('.recap-word-button').filter({ hasText: 'SCALES' }).first().click();
  await page.locator('.recap-definition-peek > span').first().click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'More', exact: true }).first().click();
  await expect(page.getByRole('dialog', { name: 'Definition of SCALES' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('.recap-word-button').filter({ hasText: 'SCALES' }).first().click();
  await page.screenshot({ animations: 'disabled', path: '.context/recap-compare-list.png' });
  await page.getByRole('tab', { name: 'Playback' }).click();
  await chart.focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < 63; i++) await page.keyboard.press('ArrowRight');
  await expect(page.locator('.recap-curve')).toHaveCount(2);
  await expect(page.locator('.recap-score-chip')).toHaveCount(2);
  await page.screenshot({ animations: 'disabled', path: '.context/recap-compare-run.png' });
  await page.getByRole('button', { name: 'Stop comparing' }).click();
  await expect(page.locator('.recap-playhead')).toHaveCount(0);
  await expect(page.locator('.recap-compare-header')).toHaveCount(0);
});

test('highlights expand finders and names enter compare', async ({ page }) => {
  await page.goto('/results?mock=recap');
  await page.getByRole('tab', { name: 'Highlights' }).click();
  await expect(page.locator('.highlights-longest-row')).toContainText('AMESACES');
  await page
    .locator('.highlight-find-row')
    .filter({ hasText: 'LEACHES' })
    .click({ position: { x: 2, y: 10 } });
  await expect(page.locator('.finder-chips')).toBeVisible();
  await expect(page.locator('[style*="color-mix"]')).toHaveCount(7);
  await page.locator('.highlights-list').evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.screenshot({ animations: 'disabled', path: '.context/recap-highlights.png' });
  await page.getByRole('button', { name: 'Wach', exact: true }).last().click();
  await expect(page.getByRole('tab', { name: 'Recap' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'Stop comparing' })).toBeVisible();
  await page.getByRole('button', { name: 'Stop comparing' }).click();
  await page.getByRole('tab', { name: 'Highlights' }).click();
  await expect(page.locator('.highlights-longest-row')).toContainText('AMESACES');
  await expect(page.getByRole('tab')).toHaveText(['Recap', 'Playback', 'Highlights']);
});

test('historical runs retain find order without manufactured timestamps', async ({ page }) => {
  await page.goto('/results?mock=recap-legacy');
  await page.getByRole('tab', { name: 'Playback' }).click();
  await expect(
    page.getByText('Timestamps weren’t recorded for this game.', { exact: false }),
  ).toBeVisible();
  await expect(page.locator('.recap-word-text').first()).toHaveText('CAME');
  await expect(page.locator('.recap-word-time').first()).toHaveText('#1');
  await expect(page.getByRole('slider')).toHaveCount(0);
});

test('early finishes have dotted tails for both players', async ({ page }) => {
  await page.goto('/results?mock=recap-early');
  await page.getByRole('tab', { name: 'Playback' }).click();
  await expect(page.locator('.recap-curve.finished')).toHaveCount(1);
  await expect(page.getByText('Dotted line: after finishing')).toBeVisible();
  const chart = page.getByRole('slider', { name: 'Run playhead' });
  await chart.focus();
  await page.keyboard.press('Home');
  await expect(page.locator('.recap-curve.finished')).toHaveCount(0);
  await page.keyboard.press('End');
  await expect(page.locator('.recap-curve.finished')).toHaveCount(1);
  await page.getByRole('button', { name: 'Compare with Wach' }).click();
  await expect(page.locator('.recap-curve.finished')).toHaveCount(2);
  await expect(page.locator('.recap-curve.opp.finished')).toHaveCount(1);
  await page.screenshot({ animations: 'disabled', path: '.context/recap-early-finish.png' });
});

test('comparison loading preserves the current list and crossfades without a blank frame', async ({
  page,
}) => {
  await page.goto('/results?mock=recap-delayed');
  await page.getByRole('button', { name: 'All words', exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
  const panel = page.locator('#results-panel');
  const list = panel.locator('.recap-words');
  await list.evaluate((el) => {
    el.scrollTop = 120;
  });
  const before = await list.evaluate((el) => ({
    top: el.getBoundingClientRect().top,
    height: el.getBoundingClientRect().height,
    scroll: el.scrollTop,
    words: el.textContent,
  }));

  await page.evaluate(() => {
    const state = window as unknown as {
      compareFrames: { top: number; height: number; incoming: number; outgoing: number }[];
      recordCompare: boolean;
    };
    state.compareFrames = [];
    state.recordCompare = true;
    const sample = () => {
      const panel = document.getElementById('results-panel')!;
      const outgoing = document.querySelector('.results-transition-layer > *');
      const rect = panel.parentElement!.getBoundingClientRect();
      state.compareFrames.push({
        top: rect.top,
        height: rect.height,
        incoming: Number(getComputedStyle(panel).opacity),
        outgoing: outgoing ? Number(getComputedStyle(outgoing).opacity) : 0,
      });
      if (state.recordCompare) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });

  await page.getByRole('button', { name: 'Compare with Wach' }).click();
  await expect(panel).toHaveAttribute('aria-busy', 'true');
  expect(
    await list.evaluate((el) => ({
      top: el.getBoundingClientRect().top,
      height: el.getBoundingClientRect().height,
      scroll: el.scrollTop,
      words: el.textContent,
    })),
  ).toEqual(before);
  await expect(panel.locator('.recap-compare-header')).toHaveCount(0);
  await expect(panel.locator('.recap-compare-header')).toContainText('Wach');
  await expect(page.locator('.results-transition-layer > *')).toHaveCount(0);
  await expect(panel).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
  await expect(page.locator('#results-panel')).toHaveCount(1);
  const frames = await page.evaluate(() => {
    const state = window as unknown as {
      compareFrames: { top: number; height: number; incoming: number; outgoing: number }[];
      recordCompare: boolean;
    };
    state.recordCompare = false;
    return state.compareFrames;
  });
  expect(frames.length).toBeGreaterThan(0);
  expect(new Set(frames.map((frame) => frame.top)).size).toBe(1);
  expect(new Set(frames.map((frame) => frame.height)).size).toBe(1);
  expect(frames.every((frame) => frame.incoming + frame.outgoing > 0.95)).toBe(true);
  expect(
    frames.some((frame) => frame.incoming > 0 && frame.incoming < 1 && frame.outgoing > 0),
  ).toBe(true);
  await page.getByRole('button', { name: 'Stop comparing' }).click();
  await expect(panel.locator('.recap-word')).toHaveCount(11);
  await expect(page.locator('.results-transition-layer > *')).toHaveCount(0);
});

test('comparison changes respect reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/results?mock=recap');
  await page.getByRole('button', { name: 'Compare with Wach' }).click();
  await expect(page.locator('#results-panel .recap-compare-header')).toContainText('Wach');
  await expect(page.locator('.results-transition-layer > *')).toHaveCount(0);
  expect(
    await page
      .locator('#results-panel')
      .evaluate((el) => el.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await page.getByRole('button', { name: 'Stop comparing' }).click();
  await expect(page.locator('#results-panel .recap-compare-header')).toHaveCount(0);
  await expect(page.locator('.results-transition-layer > *')).toHaveCount(0);
});

test('board rank follows saved thresholds and continues beyond Legend 1 with a full ring', async ({ page }) => {
  await page.goto('/results?mock=recap');
  const rank = page.getByRole('region', { name: 'Board rank', exact: true });
  await expect(rank.getByRole('img')).toHaveAccessibleName('Scribe, rank 1 of 5');
  await expect(rank.locator('.board-rank-next')).toHaveText('+1To Wordsmith');
  await expect(rank.locator('.board-rank-header')).toHaveText('Board rank');
  for (const height of [667, 844]) {
    await page.setViewportSize({ width: 375, height });
    const body = (await rank.locator('.board-rank-body').boundingBox())!;
    const ring = (await rank.getByRole('img').boundingBox())!;
    expect(Math.abs(ring.y + ring.height / 2 - (body.y + body.height / 2))).toBeLessThan(1);
  }
  await page.setViewportSize({ width: 375, height: 667 });
  await page.screenshot({ animations: 'disabled', path: '.context/rank-centered.png' });
  await rank.getByRole('button', { name: 'View rank ladder' }).click();
  const ladder = page.getByRole('dialog', { name: 'Rank ladder' });
  await expect(ladder).toHaveCSS('background-color', 'rgb(34, 31, 26)');
  await expect(ladder.getByText('29 pts', { exact: true })).toBeVisible();
  await page.screenshot({ animations: 'disabled', path: '.context/rank-results-ladder-dark.png' });
  await page.getByRole('button', { name: 'Close rank ladder' }).click();
  await expect(page.locator('.recap-found-header')).toHaveText('Found · 1128 pts');
  await page.getByRole('button', { name: 'All words', exact: true }).click();
  await expect(page.locator('.recap-found-header')).toHaveText('All words11/44');
  await expect(rank).toBeVisible();
  await page.screenshot({ animations: 'disabled', path: '.context/rank-recap-all-words.png' });
  await page.getByRole('tab', { name: 'Playback' }).click();
  await expect(rank).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'All words', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Compare with Wach' }).click();
  await expect(page.getByRole('tab', { name: 'Playback' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.recap-curve')).toHaveCount(2);
  await page.goto('/results?mock=recap-legend');
  await expect(rank.getByRole('img')).toHaveAccessibleName('Legend 2, rank 5 of 5');
  await expect(rank.locator('.board-rank-next')).toHaveText('+27To Legend 3');
  // All five colored bands stay filled, regardless of how far Legend progresses.
  await expect(rank.locator('circle[stroke^="var(--rarity-"]')).toHaveCount(5);
  await page.screenshot({ animations: 'disabled', path: '.context/rank-recap-legend.png' });
  await page.goto('/results?mock=recap-zero');
  await expect(rank.getByRole('img')).toHaveAccessibleName('Unranked, rank 0 of 5');
  await expect(rank.locator('.board-rank-next')).toHaveText('+14To Scribe');
  await expect(rank.locator('circle[stroke^="var(--rarity-"]')).toHaveCount(0);
  await page.goto('/results?mock=recap-legacy');
  await expect(rank).toHaveCount(0);
});

test('compact boards scale for 5×5 and 6×6 and remain usable in light mode', async ({ page }) => {
  for (const size of [5, 6]) {
    await page.goto(`/results?mock=recap-${size}x${size}`);
    const grid = page.locator('.grid.aspect-square');
    await expect(grid).toHaveCSS('width', '148px');
    await expect(grid.locator(':scope > div')).toHaveCount(size * size);
    await expect(grid.locator(':scope > div').first()).toHaveCSS('font-size', size === 5 ? '11.5px' : '9.5px');
    await expect(page.getByText(`${size}×${size}`, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
    await page.screenshot({ animations: 'disabled', path: `.context/rank-recap-${size}x${size}.png` });
  }
  await page.evaluate(() => localStorage.setItem('froggle-theme', 'light'));
  await page.reload();
  await expect(page.locator('[data-theme]').first()).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('region', { name: 'Board rank', exact: true })).toBeVisible();
  await page.screenshot({ animations: 'disabled', path: '.context/rank-recap-light.png' });
  await page.getByRole('button', { name: 'View rank ladder' }).click();
  await expect(page.getByRole('dialog', { name: 'Rank ladder' })).toHaveCSS('background-color', 'rgb(252, 252, 250)');
});

test('keyboard tabs select playback and respect reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/results?mock=recap');
  await page.getByRole('tab', { name: 'Recap' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Playback' })).toBeFocused();
  await expect(page.getByRole('slider')).toBeVisible();
  expect(await page.locator('#results-panel').evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Highlights' })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(page.getByRole('region', { name: 'Board rank', exact: true })).toBeVisible();
});
