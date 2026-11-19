import { expect, test } from '@playwright/test';
import fs from 'node:fs';

const seen = fs.readdirSync('client/src/features/release-notes/entries').map(file =>
  fs.readFileSync(`client/src/features/release-notes/entries/${file}`, 'utf8').match(/id: '([^']+)'/)![1]);

test('successive room rounds cannot reuse another board’s cached ratings or insights', async ({ page, request }) => {
  await request.post('http://127.0.0.1:54350/__test__/reset');
  await request.post('http://127.0.0.1:54350/__test__/rank-model');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(ids => {
    localStorage.setItem('froggle-changelog-seen', JSON.stringify(ids));
    localStorage.setItem('froggle-muted', 'true');
    localStorage.setItem('froggle-lobby-intro-seen', 'true');
  }, seen);
  // Keep browser caching enabled: page.route() would hide the regression.
  await page.goto('/play');
  await expect(page).toHaveURL(/play\/room\/[A-Z0-9]+/);
  const code = page.url().split('/').pop()!;
  const responses: { url: string; words: string[] }[] = [];
  for (let round = 0; round < 2; round++) {
    await page.getByRole('button', { name: round === 0 ? /^Start Game/ : 'Play again', exact: round !== 0 }).click();
    await expect(page.locator('[data-row="0"][data-col="0"]')).toBeVisible({ timeout: 10_000 });
    const solved = await request.get(`http://127.0.0.1:54350/__test__/solutions?room=${code}`);
    const words = (await solved.json() as { word: string }[]).map(entry => entry.word).sort();
    const insightsResponse = page.waitForResponse(response => response.url().includes('/results/insights?'));
    await page.getByRole('button', { name: 'End game', exact: true }).click();
    const insightsUrl = new URL((await insightsResponse).url());
    const ratingsResponse = page.waitForResponse(response => response.url().includes('/results/word-difficulties?'));
    await page.getByRole('button', { name: 'View words by difficulty' }).click();
    const response = await ratingsResponse;
    expect(response.status()).toBe(200);
    const { difficulties } = await response.json();
    const url = new URL(response.url());
    expect(url.searchParams.get('boardStartedAt')).toMatch(/^\d+$/);
    expect(insightsUrl.searchParams.get('boardStartedAt')).toBe(url.searchParams.get('boardStartedAt'));
    expect(Object.keys(difficulties).sort()).toEqual(words);
    await expect(page.locator('.recap-word-difficulty')).toHaveCount(words.length);
    expect((await page.locator('.recap-word-difficulty').allTextContents()).every(value => /^\d\.\d{2}$/.test(value))).toBe(true);
    responses.push({ url: response.url(), words });
  }
  expect(responses[0].url).not.toBe(responses[1].url);
  expect(responses[0].words).not.toEqual(responses[1].words);
  const headers = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(key => key.startsWith('sb-') && key.endsWith('-auth-token'))!;
    return { Authorization: `Bearer ${JSON.parse(localStorage.getItem(key)!).access_token}` };
  });
  expect((await request.get(responses[0].url, { headers })).status()).toBe(404);
  const oldInsights = responses[0].url.replace('/word-difficulties?', '/insights?');
  expect((await request.get(oldInsights, { headers })).status()).toBe(404);
  const invalid = new URL(responses[1].url);
  invalid.searchParams.delete('boardStartedAt');
  expect((await request.get(invalid.toString(), { headers })).status()).toBe(400);
  await page.screenshot({ path: '.context/room-difficulty-round-two.png' });
});
