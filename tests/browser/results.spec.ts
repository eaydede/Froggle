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

test('rank carousel shows actual entry targets, unlimited Legend levels and board difficulty', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/results?mock=recap');
  const panel = page.getByRole('region', { name: 'Board rank', exact: true });
  const carousel = panel.getByRole('list', { name: 'Rank ladder' });
  await expect(carousel).toHaveAttribute('data-climbing', 'false');
  await expect(carousel.getByRole('listitem')).toHaveText(['Legend80+', 'Virtuoso60', 'Linguist+1240', 'Wordsmith20', 'Scribe0']);
  await expect(carousel.locator('.current .rank-rung-name')).toHaveText('Wordsmith');
  await expect(carousel.locator('[aria-current="step"]')).toHaveAccessibleName('Wordsmith, 20 points, your rank');
  await expect(panel.locator('.board-difficulty-name')).toHaveText('Tough');
  await expect(panel.getByRole('img')).toHaveAccessibleName('3 of 5 difficulty');
  await expect(panel.locator('.board-difficulty-comparison')).toHaveText('Harder than 58% of boards');
  await expect(carousel.getByRole('button')).toHaveCount(0);
  await expect(panel.getByRole('button', { name: 'View words by difficulty' })).toBeVisible();
  const layout = await panel.evaluate(element => {
    const panel = element.getBoundingClientRect();
    const comparison = element.querySelector('.board-difficulty-comparison')!.getBoundingClientRect();
    return { bottom: panel.bottom, contentBottom: comparison.bottom };
  });
  expect(layout.contentBottom).toBeLessThanOrEqual(layout.bottom + 1);
  await page.screenshot({ animations: 'disabled', path: '.context/rank-carousel-wordsmith.png' });
  await page.getByRole('button', { name: 'All words', exact: true }).click();
  await expect(page.locator('.recap-found-header')).toHaveText('All words11/44');
  await page.getByRole('tab', { name: 'Playback' }).click();
  await expect(panel).toHaveCount(0);
  await page.getByRole('button', { name: 'Compare with Wach' }).click();
  await expect(page.getByRole('tab', { name: 'Playback' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.recap-curve')).toHaveCount(2);
  await page.goto('/results?mock=recap-legend');
  await expect(carousel.getByRole('listitem')).toHaveText(['Legend 3+13120', 'Legend 2100', 'Legend 180', 'Virtuoso60', 'Linguist40', 'Wordsmith20', 'Scribe0']);
  // The +N pill belongs to the next rung, not the current one.
  await expect(carousel.locator('.rank-rung-needed').locator('..')).toHaveAccessibleName('Legend 3, 120 points');
  await expect(carousel.locator('.current .rank-rung-name')).toHaveText('Legend 2');
  await page.screenshot({ animations: 'disabled', path: '.context/rank-carousel-legend.png' });
  await page.goto('/results?mock=recap-high-legend');
  await expect(carousel.getByRole('listitem')).toHaveCount(17);
  await expect(carousel.getByRole('listitem').first()).toHaveAccessibleName('Legend 13, 320 points');
  await expect(carousel.locator('.current .rank-rung-name')).toHaveText('Legend 12');
  await expect(panel.locator('.board-difficulty-name')).toHaveText('Brutal');
  await carousel.evaluate(el => { el.scrollTop = el.scrollHeight; });
  await expect(carousel).toHaveAttribute('data-at-bottom', 'true');
  await expect(carousel).toHaveAttribute('data-at-top', 'false');
  await expect(carousel.getByRole('listitem').last()).toBeVisible();
  await page.goto('/results?mock=recap-zero');
  await expect(carousel.locator('.current .rank-rung-name')).toHaveText('Scribe');
  await expect(carousel.locator('.rank-rung-needed')).toHaveText('+20');
  for (const [fixture, name, percentile] of [['recap-easy', 'Easy', 12], ['recap-fair', 'Fair', 33], ['recap-hard', 'Hard', 75]] as const) {
    await page.goto(`/results?mock=${fixture}`);
    await expect(panel.locator('.board-difficulty-name')).toHaveText(name);
    await expect(panel.locator('.board-difficulty-comparison')).toHaveText(`Harder than ${percentile}% of boards`);
  }
  await page.goto('/results?mock=recap-difficulty-unknown');
  await expect(panel.locator('.board-difficulty-comparison')).toHaveText('Board comparison unavailable.');
  await page.goto('/results?mock=recap-legacy');
  await expect(panel).toHaveCount(0);
});

test('compact boards scale for 5×5 and 6×6 and remain usable in light mode', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
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
  await expect(page.locator('.rank-carousel .current .rank-rung-name')).toHaveText('Wordsmith');
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

test('rank climb runs once, can be cancelled, and does not obstruct normal scrolling', async ({ page }) => {
  await page.goto('/results?mock=recap');
  const carousel = page.getByRole('list', { name: 'Rank ladder' });
  await expect(carousel).toHaveAttribute('data-climbing', 'true');
  await expect(carousel).toHaveCSS('scroll-snap-type', 'none');
  await expect(carousel.locator('.current .rank-rung-name')).toHaveText('Scribe');
  await expect(carousel.locator('.rank-rung-needed')).toHaveCount(0);
  await expect(carousel).toHaveAttribute('data-climbing', 'false', { timeout: 6000 });
  await expect(carousel.locator('.current .rank-rung-name')).toHaveText('Wordsmith');
  await expect(carousel.locator('.rank-rung-needed')).toHaveText('+12');
  await expect(carousel).toHaveCSS('scroll-snap-type', 'y mandatory');
  await page.getByRole('tab', { name: 'Playback' }).click();
  await page.getByRole('tab', { name: 'Recap' }).click();
  await expect(carousel).toHaveAttribute('data-climbing', 'false');
  await expect(carousel.locator('.current .rank-rung-name')).toHaveText('Wordsmith');
  await page.goto('/results?mock=recap-high-legend');
  await expect(carousel).toHaveAttribute('data-climbing', 'true');
  await carousel.dispatchEvent('pointerdown');
  await expect(carousel).toHaveAttribute('data-climbing', 'false');
  await expect(carousel.locator('.current .rank-rung-name')).toHaveText('Legend 12');
  await expect(carousel).toHaveAttribute('data-at-top', 'true');
  await carousel.hover();
  await page.mouse.wheel(0, 600);
  await expect(carousel).toHaveAttribute('data-at-bottom', 'true');
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/results?mock=recap');
  await expect(carousel).toHaveAttribute('data-climbing', 'false');
  await expect(carousel.locator('.current .rank-rung-name')).toHaveText('Wordsmith');
});

test('board difficulty opens all words from hardest to easiest and returns to points', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/results?mock=recap');
  const card = page.getByRole('button', { name: 'View words by difficulty' });
  await card.click();
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.recap-found-header')).toHaveText('Difficulty0–1');
  await expect(page.locator('.recap-word')).toHaveCount(44);
  await expect(page.locator('.recap-word-text').first()).toHaveText('AMESACES');
  await expect(page.locator('.recap-word-difficulty').first()).toHaveText('0.94');
  await expect(page.locator('.recap-word-points')).toHaveCount(0);
  const ratings = (await page.locator('.recap-word-difficulty').allTextContents()).map(Number);
  expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
  await expect(page.locator('.recap-word.missed')).toHaveCount(33);
  await page.locator('.recap-words').evaluate(element => { element.scrollTop = 100; });
  await page.getByRole('button', { name: 'Sort easiest first' }).click();
  const ascending = (await page.locator('.recap-word-difficulty').allTextContents()).map(Number);
  expect(ascending).toEqual([...ascending].sort((a, b) => a - b));
  await expect(page.locator('.recap-word-text').first()).toHaveText('SAME');
  expect(await page.locator('.recap-words').evaluate(element => element.scrollTop)).toBe(0);
  await page.getByRole('button', { name: 'Sort hardest first' }).click();
  await expect(page.locator('.recap-word-text').first()).toHaveText('AMESACES');
  await page.screenshot({ animations: 'disabled', path: '.context/word-difficulty-list.png' });
  await page.locator('.recap-word-button').first().click();
  await expect(page.locator('.recap-definition-peek')).toBeVisible();
  await page.getByRole('button', { name: 'Points', exact: true }).click();
  await expect(card).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.recap-word-points')).toHaveCount(11);
  await expect(page.locator('.recap-word-text').first()).toHaveText('SCALES');
  await card.click();
  await card.click();
  await expect(page.locator('.recap-word-points')).toHaveCount(11);
  await card.click();
  await page.getByRole('tab', { name: 'Playback' }).click();
  await page.getByRole('tab', { name: 'Recap' }).click();
  await expect(card).toHaveAttribute('aria-pressed', 'false');
  await card.click();
  await page.getByRole('button', { name: 'Compare with Wach' }).click();
  await expect(page.locator('.recap-compare-header')).toBeVisible();
  await expect(page.locator('.recap-word-difficulty')).toHaveCount(0);
});

test('Zen uses its original percentage ladder with an Unranked start and Legend peak', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/results?mock=recap-zen');
  const panel = page.getByRole('region', { name: 'Board rank', exact: true });
  const carousel = panel.getByRole('list', { name: 'Rank ladder' });
  await expect(carousel.locator('.rank-rung-points')).toHaveText(['74', '58', '37', '21', '8', '0']);
  await expect(carousel.locator('.current .rank-rung-name')).toHaveText('Wordsmith');
  await expect(carousel.locator('.rank-rung-needed')).toHaveText('+9');
  await page.getByRole('button', { name: 'View words by difficulty' }).click();
  await expect(page.locator('.recap-word-difficulty')).toHaveCount(44);
  await page.screenshot({ animations: 'disabled', path: '.context/zen-results-difficulty.png' });
  await page.goto('/results?mock=recap-zen-zero');
  await expect(carousel.locator('.current .rank-rung-name')).toHaveText('Unranked');
  await expect(carousel.locator('.rank-rung-needed')).toHaveText('+8');
  await page.goto('/results?mock=recap-zen-legend');
  await expect(carousel.locator('.current .rank-rung-name')).toHaveText('Legend');
  await expect(carousel.getByRole('listitem')).toHaveCount(6);
  await expect(carousel.locator('.rank-rung-needed')).toHaveCount(0);
  await expect(panel.getByRole('status')).toHaveText('Legend. Top rank reached.');
  await expect(carousel.locator('.current .rank-rung-bar > span')).toHaveCSS('height', '26px');
});
