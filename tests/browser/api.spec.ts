import { expect, test, type APIRequestContext } from '@playwright/test';

const authServer = 'http://127.0.0.1:54350';
async function identity(request: APIRequestContext) {
  const response = await request.post(`${authServer}/auth/v1/signup`, { data: {} });
  const session = await response.json();
  return { Authorization: `Bearer ${session.access_token}` };
}
test.beforeEach(async ({ request }) => { await request.post(`${authServer}/__test__/reset`); });

test('private session APIs require identity and malformed paths cannot crash a game', async ({ request }) => {
  expect((await request.get('/api/game/active')).status()).toBe(401);
  expect((await request.get('/api/results/insights?mode=timed&date=2026-11-12')).status()).toBe(401);
  expect((await request.get('/api/freeplay/history')).status()).toBe(401);
  const headers = await identity(request);
  const start = await request.post('/api/game/start', { headers, data: { durationSeconds: 120, boardSize: 4, minWordLength: 3, seed: 123 } });
  expect(start.ok()).toBe(true);
  for (const path of [[null], [{ row: 0.5, col: 0 }], [{ row: '0', col: 0 }], [{ row: 99, col: 0 }]]) {
    const response = await request.post('/api/game/submit', { headers, data: { path } });
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ valid: false, reason: 'invalid' });
  }
});

test('saved results are owner-only and challenge words stay hidden until participation', async ({ request }) => {
  const owner = await identity(request), stranger = await identity(request);
  await request.post('/api/game/start', { headers: owner, data: { durationSeconds: 120, boardSize: 4, minWordLength: 3, seed: 123 } });
  const ended = await request.post('/api/game/end', { headers: owner });
  const sessionId = (await ended.json()).freePlaySessionId;
  expect(typeof sessionId).toBe('string');
  expect((await request.get(`/api/results/insights?mode=freeplay&sessionId=${sessionId}`, { headers: stranger })).status()).toBe(404);
  expect((await request.get(`/api/results/insights?mode=freeplay&sessionId=${sessionId}`, { headers: owner })).status()).toBe(200);
  expect((await request.get('/api/results/insights?mode=invalid', { headers: owner })).status()).toBe(400);
  expect((await request.get('/api/results/insights?mode=freeplay&sessionId=------------------------------------', { headers: owner })).status()).toBe(400);
  expect((await request.get(`/api/freeplay/session/${sessionId}`, { headers: stranger })).status()).toBe(403);
  const shared = await request.post(`/api/freeplay/share/${sessionId}`, { headers: owner });
  const challengeId = (await shared.json()).challengeId;
  expect((await request.get(`/api/freeplay/challenge/${challengeId}/preview`, { headers: stranger })).status()).toBe(200);
  expect((await request.get(`/api/freeplay/challenge/${challengeId}`, { headers: stranger })).status()).toBe(403);
  const retry = await request.post(`/api/freeplay/share/${sessionId}`, { headers: owner });
  expect((await retry.json()).challengeId).toBe(challengeId);
});

test('Gauntlet sequencing and feedback validation fail with meaningful API responses', async ({ request }) => {
  const headers = await identity(request);
  const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  const blocked = await request.post(`/api/daily/gauntlet/${date}/round/2/start`, { headers });
  expect(blocked.status()).toBe(409);
  expect(await blocked.json()).toEqual({ error: 'previous_round_incomplete' });
  expect((await request.post(`/api/daily/gauntlet/${date}/round/1.5/start`, { headers })).status()).toBe(400);
  for (const message of ['', ' '.repeat(5), 'a'.repeat(2001), 123]) {
    expect((await request.post('/api/feedback', { headers, data: { message } })).status()).toBe(400);
  }
  const unknown = await request.get('/api/not-a-route');
  expect(unknown.status()).toBe(404);
  expect(unknown.headers()['content-type']).toContain('application/json');
});
