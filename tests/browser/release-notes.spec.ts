import { expect, test } from '@playwright/test';

test('new release notes explain results, ranks and relative board difficulty', async ({ page, request }) => {
  await request.post('http://127.0.0.1:54350/__test__/reset');
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  const dialog = page.getByRole('dialog', { name: "What's new", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Your game, replayed' })).toBeAttached();
  await expect(dialog.getByRole('heading', { name: 'A rank for your board' })).toBeAttached();
  await expect(dialog.getByRole('heading', { name: 'Get to know your board' })).toBeAttached();
  await expect(dialog.getByRole('heading', { name: 'Smoother timed games' })).toHaveCount(0);
  await expect(dialog).toContainText('keeping its existing rank rules');
  await expect(dialog).toContainText('Timed ranks are still being tuned and may not be well calibrated yet. Targets could change.');
  await expect(dialog).toContainText('Difficulty estimates are still being tuned and may not be well calibrated yet. Ratings could change.');
  await page.screenshot({ path: '.context/ranking-release-notes.png' });
  await dialog.getByRole('button', { name: 'Got it', exact: true }).click();
  await page.reload();
  await expect(dialog).toHaveCount(0);
});
