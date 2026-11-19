import { expect, test } from '@playwright/test';
import fs from 'node:fs';

const seen = fs.readdirSync('client/src/features/release-notes/entries').map(file =>
  fs.readFileSync(`client/src/features/release-notes/entries/${file}`, 'utf8').match(/id: '([^']+)'/)![1]);

test.beforeEach(async ({ page, request }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await request.post('http://127.0.0.1:54350/__test__/reset');
  await request.post('http://127.0.0.1:54350/__test__/rank-model');
  // Core result ranks must work even when optional field insights are unavailable.
  await page.route('**/api/results/insights?*', route => route.abort());
  await page.addInitScript(ids => {
    localStorage.setItem('froggle-changelog-seen', JSON.stringify(ids));
    localStorage.setItem('froggle-muted', 'true');
    localStorage.setItem('froggle-lobby-intro-seen', 'true');
  }, seen);
});

test('saved rank carousel and board difficulty render immediately and survive reload', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/daily');
  const started = page.waitForResponse(response => /\/daily\/session\/[^/]+\/start$/.test(new URL(response.url()).pathname));
  await page.getByRole('button', { name: /^Start/ }).click();
  const { session: { rankTargets: targets } } = await (await started).json();
  expect(targets.thresholds).toHaveLength(5);
  expect(targets.boardDifficulty.comparisonBoards).toBe(5);
  await expect(page.locator('[data-row="0"][data-col="0"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'View rank ladder' })).toHaveCount(0);
  const resumed = page.waitForResponse(response => /\/daily\/session\/[^/]+$/.test(new URL(response.url()).pathname));
  await page.reload();
  expect((await (await resumed).json()).session.rankTargets).toEqual(targets);
  await page.getByRole('button', { name: 'End game', exact: true }).click();
  await expect(page).toHaveURL(/\/daily\/results/);
  const panel = page.getByRole('region', { name: 'Board rank', exact: true });
  const carousel = panel.getByRole('list', { name: 'Rank ladder' });
  await expect(carousel.locator('.current .rank-rung-name')).toHaveText('Scribe');
  await expect(carousel.locator('.rank-rung-needed')).toHaveText(`+${targets.thresholds[0] + 1}`);
  await expect(panel.locator('.board-difficulty-comparison')).toHaveText(`Harder than ${targets.boardDifficulty.percentile}% of boards`);
  const labels = await carousel.locator('.rank-rung-points').allTextContents();
  expect(labels.map(label => parseInt(label, 10)).reverse()).toEqual([0, ...targets.thresholds.slice(0, -1).map((points: number) => points + 1)]);
  await carousel.focus();
  await expect(carousel).toBeFocused();
  await page.keyboard.press('Home');
  await expect(carousel.getByRole('button')).toHaveCount(0);
  await expect(panel.getByRole('button', { name: 'View words by difficulty' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(carousel).toBeVisible();
  expect(await carousel.locator('.rank-rung-points').allTextContents()).toEqual(labels);
  await page.screenshot({ path: '.context/timed-ranks-carousel-results.png' });
});

test('Time is Money and Gauntlet expose their own saved ladders', async ({ page }) => {
  await page.goto('/daily/time-is-money');
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.locator('[data-row="0"][data-col="0"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'View rank ladder' })).toHaveCount(0);
  await page.getByRole('button', { name: 'End game', exact: true }).click();
  await expect(page).toHaveURL(/time-is-money\/results/);
  await expect(page.getByRole('region', { name: 'Board rank', exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Rank ladder' }).getByRole('listitem')).toHaveCount(5);
  await page.getByRole('button', { name: 'View words by difficulty' }).click();
  await expect(page.locator('.recap-word-difficulty').first()).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);

  await page.goto('/daily/gauntlet');
  await page.getByRole('button', { name: /^Start/ }).click();
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.locator('[data-row="0"][data-col="0"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'View rank ladder' })).toHaveCount(0);
  await page.getByRole('button', { name: 'End game', exact: true }).click();
  await expect(page).toHaveURL(/gauntlet\/round\/0\/results/);
  await expect(page.getByRole('region', { name: 'Board rank', exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Rank ladder' }).getByRole('listitem')).toHaveCount(5);
  await page.getByRole('button', { name: 'View words by difficulty' }).click();
  await expect(page.locator('.recap-word-difficulty').first()).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('a room prepares the saved ladder before starting its countdown', async ({ page }) => {
  await page.goto('/play');
  await expect(page).toHaveURL(/play\/room\/[A-Z0-9]+/);
  await page.getByRole('button', { name: /^Start Game/ }).click();
  await expect(page.locator('[data-row="0"][data-col="0"]')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'View rank ladder' })).toHaveCount(0);
  await page.getByRole('button', { name: 'End game', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Board rank', exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Rank ladder' }).getByRole('listitem')).toHaveCount(5);
  await page.getByRole('button', { name: 'View words by difficulty' }).click();
  await expect(page.locator('.recap-word-difficulty').first()).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('board rank and ladder render while the insights request is still pending', async ({ page }) => {
  let release = () => {};
  const pending = new Promise<void>(resolve => { release = resolve; });
  let requested = false;
  await page.route('**/api/results/insights?*', async route => {
    requested = true;
    await pending;
    await route.continue();
  });
  try {
    await page.goto('/daily');
    await page.getByRole('button', { name: /^Start/ }).click();
    await page.getByRole('button', { name: 'End game', exact: true }).click();
    const rank = page.getByRole('region', { name: 'Board rank', exact: true });
    await expect(rank).toBeVisible();
    expect(requested).toBe(true);
    await expect(rank.getByRole('list', { name: 'Rank ladder' }).getByRole('listitem')).toHaveCount(5);
    await expect(rank.locator('.board-difficulty-comparison')).toContainText('Harder than');
  } finally {
    release();
    await page.unrouteAll({ behavior: 'wait' });
  }
});

test('word difficulty loads on demand, retries failures, and reuses saved ratings', async ({ page }) => {
  let requests = 0;
  let release = () => {};
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/results/word-difficulties?*', async route => {
    requests++;
    if (requests === 1) return route.fulfill({ status: 503, json: { error: 'Unavailable' } });
    await pending;
    await route.continue();
  });
  try {
    await page.goto('/daily');
    await page.getByRole('button', { name: /^Start/ }).click();
    await page.getByRole('button', { name: 'End game', exact: true }).click();
    const card = page.getByRole('button', { name: 'View words by difficulty' });
    await expect(card).toBeVisible();
    expect(requests).toBe(0);
    await card.click();
    await expect(page.getByRole('alert')).toContainText('Couldn’t load word difficulties.');
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Loading word difficulties' })).toBeVisible();
    const response = page.waitForResponse(response => response.url().includes('/results/word-difficulties?') && response.status() === 200);
    release();
    const { difficulties } = await (await response).json();
    await expect(page.locator('.recap-word-difficulty')).toHaveCount(Object.keys(difficulties).length);
    const words = await page.locator('.recap-word-text').allTextContents();
    expect(words).toEqual(Object.keys(difficulties).sort((a, b) => difficulties[b] - difficulties[a] || a.localeCompare(b)));
    for (const rating of Object.values(difficulties) as number[]) {
      expect(rating).toBeGreaterThanOrEqual(0);
      expect(rating).toBeLessThanOrEqual(1);
    }
    await card.click();
    await expect(page.locator('.results-empty')).toHaveText('No words found.');
    await card.click();
    await expect(page.locator('.recap-word-difficulty')).toHaveCount(words.length);
    expect(requests).toBe(2);
  } finally {
    release();
    await page.unrouteAll({ behavior: 'wait' });
  }
});

test('completed Zen results carry their difficulty immediately and expose Zen word ratings', async ({ page }) => {
  await page.goto('/daily/zen/play');
  await page.getByRole('radio', { name: /Play casually/ }).click();
  const started = page.waitForResponse(response => /\/zen\/session\/[^/]+\/start$/.test(new URL(response.url()).pathname));
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const { session } = await (await started).json();
  expect(session.theoretical_max_score).toBeGreaterThan(0);
  expect(session.difficulty_assessment).toBeUndefined(); // No solution ratings in playable sessions.
  await page.getByRole('button', { name: 'End puzzle', exact: true }).click();
  const completed = page.waitForResponse(response => /\/zen\/results\/[^/]+$/.test(new URL(response.url()).pathname));
  await page.getByRole('button', { name: 'End puzzle', exact: true }).last().click();
  const { result } = await (await completed).json();
  expect(result.difficulty_assessment.boardDifficulty.comparisonBoards).toBe(5);
  const panel = page.getByRole('region', { name: 'Board rank', exact: true });
  await expect(panel.locator('.current .rank-rung-name')).toHaveText('Unranked');
  const maximum = session.theoretical_max_score;
  const entryScores = [.28, .22, .14, .08, .03, 0].map(percentage => {
    let score = 0;
    while (score / maximum < percentage) score++;
    return String(score);
  });
  await expect(panel.locator('.rank-rung-points')).toHaveText(entryScores);
  await expect(panel.locator('.board-difficulty-comparison')).toContainText('Harder than');
  const response = page.waitForResponse(response => response.url().includes('/results/word-difficulties?') && response.status() === 200);
  await page.getByRole('button', { name: 'View words by difficulty' }).click();
  const { difficulties } = await (await response).json();
  await expect(page.locator('.recap-word-difficulty')).toHaveCount(result.found_words.length + result.missed_words.length);
  expect(Object.keys(difficulties)).toHaveLength(result.found_words.length + result.missed_words.length);
  await page.reload();
  await expect(panel.locator('.current .rank-rung-name')).toHaveText('Unranked');
});
