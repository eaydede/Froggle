import { devices, expect, test } from '@playwright/test';
import fs from 'node:fs';

const seen = fs.readdirSync('client/src/features/release-notes/entries').map(file =>
  fs.readFileSync(`client/src/features/release-notes/entries/${file}`, 'utf8').match(/id: '([^']+)'/)![1]);

test.use({ ...devices['iPhone SE'], browserName: 'webkit' });

test('iPhone shows five difficulty bars across the card', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(ids => localStorage.setItem('froggle-changelog-seen', JSON.stringify(ids)), seen);
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/results?mock=recap');
  const card = page.getByRole('button', { name: 'View words by difficulty' });
  const pips = card.locator('.board-difficulty-pips > span');
  await expect(pips).toHaveCount(5);
  const widths = await pips.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().width));
  expect(widths.every(width => width > 10)).toBe(true);
  for (const pip of await pips.all()) await expect(pip).toHaveCSS('height', '4px');
  const bar = card.locator('.board-difficulty-pips');
  expect((await bar.boundingBox())!.width).toBeGreaterThan(100);
  await card.click();
  await expect(page.getByRole('button', { name: 'Sort easiest first' })).toBeVisible();
  await page.getByRole('button', { name: 'Sort easiest first' }).tap();
  await expect(page.locator('.recap-word-text').first()).toHaveText('SAME');
  await expect(page.getByRole('button', { name: 'Sort hardest first' })).toBeVisible();
  await page.screenshot({ path: '.context/iphone-difficulty-bars.png' });
  await page.setViewportSize({ width: 320, height: 568 });
  const narrowWidths = await pips.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().width));
  expect(narrowWidths.every(width => width > 10)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  const cardBounds = (await card.boundingBox())!;
  const footerBounds = (await page.getByRole('button', { name: 'Home', exact: true }).boundingBox())!;
  expect(cardBounds.y + cardBounds.height).toBeLessThanOrEqual(footerBounds.y);
  const carousel = page.getByRole('list', { name: 'Rank ladder' });
  expect((await carousel.boundingBox())!.height).toBeGreaterThan(26);
  await page.screenshot({ path: '.context/iphone-small-difficulty-bars.png' });
  await page.evaluate(() => localStorage.setItem('froggle-theme', 'dark'));
  await page.reload();
  await expect(pips).toHaveCount(5);
  const darkCardBounds = (await card.boundingBox())!;
  const darkFooterBounds = (await page.getByRole('button', { name: 'Home', exact: true }).boundingBox())!;
  expect(darkCardBounds.y + darkCardBounds.height).toBeLessThanOrEqual(darkFooterBounds.y);
});
