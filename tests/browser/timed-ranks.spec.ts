import { expect, test } from '@playwright/test';
import fs from 'node:fs';

const seen = fs.readdirSync('client/src/features/release-notes/entries').map(file =>
  fs.readFileSync(`client/src/features/release-notes/entries/${file}`, 'utf8').match(/id: '([^']+)'/)![1]);

test.beforeEach(async ({ page, request }) => {
  await request.post('http://127.0.0.1:54350/__test__/reset');
  await request.post('http://127.0.0.1:54350/__test__/rank-model');
  await page.addInitScript(ids => {
    localStorage.setItem('froggle-changelog-seen', JSON.stringify(ids));
    localStorage.setItem('froggle-muted', 'true');
    localStorage.setItem('froggle-lobby-intro-seen', 'true');
  }, seen);
});

test('timed targets persist without a gameplay display; the results ladder is keyboard accessible', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/daily');
  const started = page.waitForResponse(response => /\/daily\/session\/[^/]+\/start$/.test(new URL(response.url()).pathname));
  await page.getByRole('button', { name: /^Start/ }).click();
  const { session: { rankTargets: targets } } = await (await started).json();
  expect(targets.thresholds).toHaveLength(5);
  await expect(page.locator('[data-row="0"][data-col="0"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'View rank ladder' })).toHaveCount(0);
  await page.screenshot({ path: '.context/timed-ranks-play.png' });
  const resumed = page.waitForResponse(response => /\/daily\/session\/[^/]+$/.test(new URL(response.url()).pathname));
  await page.reload();
  expect((await (await resumed).json()).session.rankTargets).toEqual(targets);
  await expect(page.locator('[data-row="0"][data-col="0"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'View rank ladder' })).toHaveCount(0);
  await page.getByRole('button', { name: 'End game', exact: true }).click();
  await expect(page).toHaveURL(/\/daily\/results/);
  const ring = page.getByRole('region', { name: 'Board rank', exact: true });
  await expect(ring.getByRole('img')).toHaveAccessibleName('Unranked, rank 0 of 5');
  await expect(ring.locator('.board-rank-next')).toContainText(`+${targets.thresholds[0]}`);
  const trigger = ring.getByRole('button', { name: 'View rank ladder' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const ladder = page.getByRole('dialog', { name: 'Rank ladder' });
  await expect(ladder).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(ladder.getByRole('button', { name: 'Close rank ladder' })).toBeFocused();
  await expect(ladder.getByRole('listitem')).toHaveCount(5);
  const rows = await ladder.getByRole('listitem').allTextContents();
  expect(rows.join(' ')).toMatch(/Scribe.*Wordsmith.*Linguist.*Virtuoso.*Legend 1/);
  const pointLabels = await ladder.getByText(/^\d+ pts$/).allTextContents();
  expect(pointLabels.map(label => parseInt(label, 10))).toEqual(targets.thresholds);
  await page.screenshot({ path: '.context/timed-ranks-results-ladder.png' });
  await page.keyboard.press('Escape');
  await expect(ladder).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Space');
  await expect(ladder).toBeVisible();
  await ladder.getByRole('button', { name: 'Close rank ladder' }).click();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.mouse.click(5, 5);
  await expect(ladder).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await page.reload();
  await trigger.click();
  expect(await ladder.getByRole('listitem').allTextContents()).toEqual(rows);
  await page.keyboard.press('Escape');
  await page.screenshot({ path: '.context/timed-ranks-results.png' });
});

test('Time is Money and Gauntlet expose their own saved ladders', async ({ page }) => {
  await page.goto('/daily/time-is-money');
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.locator('[data-row="0"][data-col="0"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'View rank ladder' })).toHaveCount(0);
  await page.getByRole('button', { name: 'End game', exact: true }).click();
  await expect(page).toHaveURL(/time-is-money\/results/);
  await expect(page.getByRole('region', { name: 'Board rank', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View rank ladder' }).click();
  await expect(page.getByRole('dialog', { name: 'Rank ladder' })).toBeVisible();
  await page.getByRole('button', { name: 'Close rank ladder' }).click();

  await page.goto('/daily/gauntlet');
  await page.getByRole('button', { name: /^Start/ }).click();
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.locator('[data-row="0"][data-col="0"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'View rank ladder' })).toHaveCount(0);
  await page.getByRole('button', { name: 'End game', exact: true }).click();
  await expect(page).toHaveURL(/gauntlet\/round\/0\/results/);
  await expect(page.getByRole('region', { name: 'Board rank', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View rank ladder' }).click();
  await expect(page.getByRole('dialog', { name: 'Rank ladder' })).toBeVisible();
  await page.getByRole('button', { name: 'Close rank ladder' }).click();
});

test('a room prepares the saved ladder before starting its countdown', async ({ page }) => {
  await page.goto('/play');
  await expect(page).toHaveURL(/play\/room\/[A-Z0-9]+/);
  await page.getByRole('button', { name: /^Start Game/ }).click();
  await expect(page.locator('[data-row="0"][data-col="0"]')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'View rank ladder' })).toHaveCount(0);
  await page.getByRole('button', { name: 'End game', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Board rank', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View rank ladder' }).click();
  await expect(page.getByRole('dialog', { name: 'Rank ladder' })).toBeVisible();
  await page.getByRole('button', { name: 'Close rank ladder' }).click();
});
