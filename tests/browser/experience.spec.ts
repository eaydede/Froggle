import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';

const seen = fs.readdirSync('client/src/features/release-notes/entries').map(file =>
  fs.readFileSync(`client/src/features/release-notes/entries/${file}`, 'utf8').match(/id: '([^']+)'/)![1]);

test.beforeEach(async ({ page, request }) => {
  await request.post('http://127.0.0.1:54350/__test__/reset');
  await page.addInitScript(ids => {
    localStorage.setItem('froggle-changelog-seen', JSON.stringify(ids));
    localStorage.setItem('froggle-muted', 'true');
    localStorage.setItem('froggle-lobby-intro-seen', 'true');
  }, seen);
  await page.route('https://freedictionaryapi.com/**', route => route.fulfill({ json: {
    word: 'word', source: { name: 'Wiktionary' }, entries: [{ partOfSpeech: 'noun', senses: [{ definition: 'A meaningful unit of language.' }] }],
  } }));
});

async function playerId(page: Page) {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find(key => key.startsWith('sb-') && key.endsWith('-auth-token'))!;
    return JSON.parse(localStorage.getItem(key)!).user.id as string;
  });
}
async function solutions(page: Page, mode: string) {
  const id = await playerId(page);
  const response = await page.request.get(`http://127.0.0.1:54350/__test__/solutions?mode=${mode}&user=${id}`);
  return await response.json() as { word: string; path: { row: number; col: number }[] }[];
}
async function traceWord(page: Page, path: { row: number; col: number }[]) {
  for (let i = 0; i < path.length; i++) {
    const cell = page.locator(`[data-row="${path[i].row}"][data-col="${path[i].col}"]`).first();
    const bounds = (await cell.boundingBox())!;
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    if (!i) await page.mouse.down();
  }
  await page.mouse.up();
}

test('timed daily accepts words, rejects repeats and resumes the same board after reload', async ({ page }) => {
  await page.goto('/daily');
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page).toHaveURL(/\/game$/);
  await expect(page.locator('[data-row="0"][data-col="0"]')).toBeVisible();
  const words = await solutions(page, 'timed');
  expect(words.length).toBeGreaterThan(0);
  const before = await page.locator('[data-row][data-col]').allTextContents();
  await traceWord(page, words[0].path);
  await expect(page.getByText(words[0].word, { exact: true }).first()).toBeVisible();
  const wave = page.locator('[style*="letter-wave"]');
  await expect(wave).toHaveCount(words[0].word.length);
  await expect(wave.first()).toHaveCSS('animation-duration', '0.4s');
  await expect(wave.nth(1)).toHaveCSS('animation-delay', '0.04s');
  await page.waitForTimeout(250);
  await traceWord(page, words[0].path);
  await expect(page.locator('[style*="word-shake"]')).toHaveCSS('animation-duration', '0.3s');
  await page.reload();
  await expect(page.locator('[data-row="0"][data-col="0"]')).toBeVisible();
  expect(await page.locator('[data-row][data-col]').allTextContents()).toEqual(before);
  await page.getByRole('button', { name: 'End game', exact: true }).click();
  await expect(page).toHaveURL(/\/daily\/results/);
  await expect(page.getByText(words[0].word, { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: '.context/visual/live-daily-results.png' });
});

test('Zen choice, found-word sheet and early-end confirmation persist correctly', async ({ page }) => {
  await page.goto('/daily/zen/play');
  await page.getByRole('radio', { name: /Play casually/ }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.locator('[data-row="0"][data-col="0"]')).toBeVisible();
  const words = await solutions(page, 'zen');
  await traceWord(page, words[0].path);
  await page.getByRole('button', { name: 'Expand found words' }).click();
  await expect(page.getByRole('dialog', { name: 'Found words' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Found words' })).toHaveCSS('transition-duration', '0.26s');
  await expect(page.getByRole('dialog', { name: 'Found words' })).toHaveCSS('transition-timing-function', 'cubic-bezier(0.22, 1, 0.36, 1)');
  await page.screenshot({ path: '.context/visual/live-zen-word-sheet.png' });
  await page.getByRole('button', { name: 'Score', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Found words' })).toHaveCSS('translate', '0px 100%');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Expand found words' })).toBeVisible();
  await page.getByRole('button', { name: 'End puzzle', exact: true }).click();
  await expect(page.getByText('End the puzzle?', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Keep playing', exact: true }).click();
  await page.getByRole('button', { name: 'End puzzle', exact: true }).click();
  await page.getByRole('button', { name: 'End puzzle', exact: true }).last().click();
  await expect(page).toHaveURL(/\/daily\/zen\/results/);
});

test('Time is Money banks seconds and reload retains the earned clock', async ({ page }) => {
  await page.goto('/daily/time-is-money');
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page).toHaveURL(/time-is-money\/play/);
  const words = await solutions(page, 'money');
  await expect(page.locator('[data-row="0"][data-col="0"]')).toBeVisible();
  await traceWord(page, words.find(word => word.word.length === 5)!.path);
  await page.waitForTimeout(250);
  await page.reload();
  await expect(page.locator('[data-row="0"][data-col="0"]')).toBeVisible();
  await page.getByRole('button', { name: 'End game', exact: true }).click();
  await expect(page).toHaveURL(/time-is-money\/results/);
  await expect(page.getByText('played', { exact: true })).toBeVisible();
  await expect(page.getByText('1:06', { exact: true })).toBeVisible();
});

test('Gauntlet enforces round order and progresses from round results', async ({ page }) => {
  await page.goto('/daily/gauntlet');
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page).toHaveURL(/gauntlet\/round\/0$/);
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page).toHaveURL(/gauntlet\/round\/0\/play$/);
  const words = await solutions(page, 'gauntlet');
  await expect(page.locator('[data-row="0"][data-col="0"]')).toBeVisible();
  await traceWord(page, words[0].path);
  await page.getByRole('button', { name: 'End game', exact: true }).click();
  await expect(page).toHaveURL(/gauntlet\/round\/0\/results$/);
  await page.getByRole('button', { name: /Next round/i }).click();
  await expect(page).toHaveURL(/gauntlet\/round\/1$/);
});

test('room lobby, configuration, countdown, scores and history use the real socket server', async ({ page }) => {
  await page.goto('/play');
  await expect(page).toHaveURL(/play\/room\/[A-Z0-9]+/);
  await page.getByRole('button', { name: /5×5/ }).click();
  await page.getByRole('button', { name: /2:00/ }).click();
  await page.screenshot({ path: '.context/visual/live-lobby.png' });
  const code = page.url().split('/').pop()!;
  await page.getByRole('button', { name: /^Start Game/ }).click();
  await expect(page.getByText(/Get ready/i)).toBeVisible();
  await expect(page.locator('[data-row="0"][data-col="0"]')).toBeVisible({ timeout: 10_000 });
  const response = await page.request.get(`http://127.0.0.1:54350/__test__/solutions?room=${code}`);
  const words = await response.json();
  await traceWord(page, words[0].path);
  await page.getByRole('button', { name: 'End game', exact: true }).click();
  await expect(page.getByText(/pts/i).first()).toBeVisible();
  await expect.poll(async () => {
    const token = await page.evaluate(() => {
      const key = Object.keys(localStorage).find(key => key.startsWith('sb-') && key.endsWith('-auth-token'))!;
      return JSON.parse(localStorage.getItem(key)!).access_token;
    });
    const response = await page.request.get('/api/freeplay/history', { headers: { Authorization: `Bearer ${token}` } });
    return (await response.json()).entries?.[0]?.boardSize;
  }).toBe(5);
  await page.goto('/history');
  await expect(page.getByText('5×5', { exact: false }).first()).toBeVisible();
});

test('results comparison, word replay, definitions and theme preserve the interaction surfaces', async ({ page }) => {
  await page.goto('/results?mock=rarity');
  await page.getByRole('button', { name: /Pat/ }).click();
  await expect(page.getByText('Stop', { exact: true })).toBeVisible();
  await expect(page.locator('.results-region-fade-in').first()).toHaveCSS('animation-duration', '0.45s');
  await page.screenshot({ path: '.context/visual/compare.png' });
  await page.getByRole('button', { name: /Stop/ }).click();
  await page.getByText('STORE', { exact: true }).click();
  await expect(page.getByText('A meaningful unit of language.').first()).toBeVisible();
  await page.goto('/?mock=unplayed');
  await page.getByRole('button', { name: /dark|theme/i }).click();
  await expect(page.locator('[data-theme="dark"]')).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-theme="dark"]')).toBeVisible();
});

test('a saved board becomes a shareable challenge with one attempt per recipient', async ({ page, browser }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text: string) => {
      (window as unknown as Record<string, string>).__sharedText = text;
    } }, configurable: true });
  });
  const { encodeSeedCode } = await import('models/seedCode');
  await page.goto(`/play?c=${encodeSeedCode(4, 12345)}&t=120&m=3`);
  await expect(page.locator('[data-row="0"][data-col="0"]')).toBeVisible();
  const ownerWords = await solutions(page, 'freeplay');
  await traceWord(page, ownerWords[0].path);
  await page.getByRole('button', { name: 'End game', exact: true }).click();
  await expect(page).toHaveURL(/\/results$/);
  await page.getByRole('button', { name: 'Share', exact: true }).first().click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Record<string, string>).__sharedText)).toContain('/play?');
  const text = await page.evaluate(() => (window as unknown as Record<string, string>).__sharedText);
  const invitation = text.match(/https?:\/\/\S+/)![0];
  const recipientContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const recipient = await recipientContext.newPage();
  await recipient.addInitScript(ids => {
    localStorage.setItem('froggle-changelog-seen', JSON.stringify(ids));
    localStorage.setItem('froggle-muted', 'true');
  }, seen);
  await recipient.goto(invitation);
  await expect(recipient.getByText(/Challenge from/i)).toBeVisible();
  await recipient.getByRole('button', { name: /Accept challenge/ }).click();
  await expect(recipient.locator('[data-row="0"][data-col="0"]')).toBeVisible();
  await traceWord(recipient, ownerWords[1].path);
  await recipient.getByRole('button', { name: 'End game', exact: true }).click();
  await expect(recipient).toHaveURL(/\/freeplay\/challenge\//);
  await recipient.getByRole('button', { name: 'Compare with Alex', exact: true }).click();
  await expect(recipient.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
  await recipient.goto(invitation);
  await expect(recipient).toHaveURL(/\/freeplay\/challenge\//);
  await recipientContext.close();
});

test('two players share a countdown, reconnect identity and host handover', async ({ page, browser }) => {
  await page.goto('/play');
  await expect(page.getByRole('button', { name: /^Start Game/ })).toBeVisible();
  const url = page.url();
  const guestContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const guest = await guestContext.newPage();
  await guest.addInitScript(ids => {
    localStorage.setItem('froggle-changelog-seen', JSON.stringify(ids));
    localStorage.setItem('froggle-lobby-intro-seen', 'true');
    localStorage.setItem('froggle-muted', 'true');
  }, seen);
  await guest.goto(url);
  await expect(guest.getByRole('button', { name: /Waiting for the host/ })).toBeVisible();
  await expect(guest.getByRole('button', { name: /5×5/ })).toBeDisabled();
  await page.getByRole('button', { name: /5×5/ }).click();
  await page.getByRole('button', { name: /^Start Game/ }).click();
  await expect(guest.getByText(/Get ready/i)).toBeVisible();
  await expect(guest.locator('[data-row="0"][data-col="0"]')).toBeVisible({ timeout: 10_000 });
  expect(await guest.locator('[data-row][data-col]').count()).toBe(25);
  const before = await guest.locator('[data-row][data-col]').allTextContents();
  await guest.reload();
  await expect(guest.locator('[data-row="0"][data-col="0"]')).toBeVisible();
  expect(await guest.locator('[data-row][data-col]').allTextContents()).toEqual(before);
  await page.getByRole('button', { name: 'Leave the game' }).click();
  await expect(guest.getByText("The host left — you're the host now.")).toBeVisible();
  await guest.getByRole('button', { name: 'End game', exact: true }).click();
  await expect(guest.getByRole('button', { name: 'Next round', exact: true })).toBeVisible();
  await guest.screenshot({ path: '.context/visual/live-multiplayer-results.png' });
  await guestContext.close();
});

test('profile edits and feedback survive their real API boundaries', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Profile', exact: true }).click();
  await page.getByRole('textbox').fill('Robin');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Profile', exact: true })).toHaveText('R');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Profile', exact: true })).toHaveText('R');
  await page.getByRole('button', { name: 'Send feedback', exact: true }).click();
  await page.getByPlaceholder("What's on your mind?").fill('Local browser verification of the rebuilt feedback feature.');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText('Thanks!', { exact: true })).toBeVisible();
});

test('active play suppresses stale-build reloads and refreshes safely after finishing', async ({ page }) => {
  let build = 'A', reads = 0;
  await page.route('**/api/version', route => { reads++; return route.fulfill({ json: { buildId: build } }); });
  await page.goto('/daily');
  await page.getByRole('button', { name: /^Start/ }).click();
  await expect(page.locator('[data-row="0"][data-col="0"]')).toBeVisible();
  const initialReads = reads;
  build = 'B';
  await page.evaluate(() => { window.dispatchEvent(new Event('focus')); });
  await page.waitForTimeout(150);
  expect(reads).toBe(initialReads);
  await expect(page).toHaveURL(/\/game$/);
  await page.getByRole('button', { name: 'End game', exact: true }).click();
  await expect(page).toHaveURL(/\/daily\/results/);
  await Promise.all([
    page.waitForEvent('load'),
    page.evaluate(() => { window.dispatchEvent(new Event('focus')); }),
  ]);
  expect(reads).toBeGreaterThan(initialReads);
  await expect(page).toHaveURL(/\/daily\/results/);
});
