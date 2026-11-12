import express from 'express';
import { exportJWK, generateKeyPair, jwtVerify, SignJWT } from 'jose';
import { createServer as createViteServer } from '../../client/node_modules/vite/dist/node/index.js';
import { startTestDb } from '../../server/test/pgHarness.js';
import { createRuntime } from '../../server/runtime.js';
import { findAllWords } from 'engine/solver.js';
import { dictionary } from '../../server/gameplay/dictionary.js';
import { getDailyDatePST } from '../../server/features/timed-daily/config.js';
import { closeRooms } from '../../server/features/rooms/cleanup.js';
import { getRoom } from '../../server/features/rooms/service.js';

// This runtime is test-only. All writes go to a disposable PostgreSQL container.
const db = await startTestDb();
const authPort = 54350;
const apiPort = 54351;
process.env.SUPABASE_URL = `http://127.0.0.1:${authPort}`;
process.env.SUPABASE_SECRET_KEY = 'local-test-service-key';
const { publicKey, privateKey } = await generateKeyPair('ES256');
const jwk = { ...await exportJWK(publicKey), kid: 'test', alg: 'ES256', use: 'sig' };
const auth = express();
auth.use(express.json());
auth.use((_req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', '*');
  res.set('Access-Control-Allow-Methods', '*');
  next();
});
auth.options('*', (_req, res) => { res.sendStatus(204); });

async function user(id: string) {
  const row = await db.pool.query('select * from auth.users where id = $1', [id]);
  if (!row.rows.length) return null;
  return { id, aud: 'authenticated', role: 'authenticated', is_anonymous: true,
    app_metadata: row.rows[0].raw_app_meta_data ?? {}, user_metadata: row.rows[0].raw_user_meta_data ?? {},
    identities: [], created_at: new Date().toISOString() };
}
async function issueSession(id: string) {
  const token = await new SignJWT({ role: 'authenticated' }).setProtectedHeader({ alg: 'ES256', kid: 'test' })
    .setSubject(id).setIssuer(`${process.env.SUPABASE_URL}/auth/v1`).setAudience('authenticated').setIssuedAt().setExpirationTime('1h').sign(privateKey);
  return { access_token: token, refresh_token: id, token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600, user: await user(id) };
}
auth.get('/auth/v1/.well-known/jwks.json', (_req, res) => { res.json({ keys: [jwk] }); });
auth.post('/auth/v1/signup', async (_req, res) => {
  const id = crypto.randomUUID();
  await db.pool.query('insert into auth.users (id, raw_user_meta_data, raw_app_meta_data) values ($1, $2, $3)', [id, { display_name: 'Alex' }, {}]);
  res.json(await issueSession(id));
});
auth.post('/auth/v1/token', async (req, res) => { res.json(await issueSession(req.body.refresh_token)); });
auth.get('/auth/v1/user', async (req, res) => {
  try {
    const { payload } = await jwtVerify(req.headers.authorization!.slice(7), publicKey);
    res.json(await user(payload.sub!));
  } catch { res.status(401).json({ error: 'invalid token' }); }
});
auth.get('/auth/v1/admin/users/:id', async (req, res) => {
  const profile = await user(req.params.id);
  if (profile) res.json(profile); else res.status(404).json({ message: 'User not found' });
});
auth.put('/auth/v1/admin/users/:id', async (req, res) => {
  await db.pool.query(`update auth.users set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || $2::jsonb,
    raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || $3::jsonb where id = $1`,
    [req.params.id, JSON.stringify(req.body.user_metadata ?? {}), JSON.stringify(req.body.app_metadata ?? {})]);
  res.json(await user(req.params.id));
});
auth.post('/__test__/reset', async (_req, res) => {
  await closeRooms();
  await db.truncateAll();
  res.json({ ok: true });
});
auth.get('/__test__/solutions', async (req, res) => {
  if (typeof req.query.room === 'string') {
    const board = getRoom(req.query.room)?.currentBoard;
    return res.json(board ? findAllWords(board.board, dictionary, board.config.minWordLength) : []);
  }
  const tables = { timed: 'daily_results', zen: 'daily_zen_results', money: 'daily_time_is_money_results', gauntlet: 'daily_gauntlet_results', freeplay: 'free_play_sessions' } as const;
  const mode = req.query.mode as keyof typeof tables;
  const table = tables[mode];
  if (!table) return res.status(400).json({ error: 'Unknown mode' });
  const row = await db.pool.query(`select * from ${table} where user_id = $1 and date = $2 order by started_at desc limit 1`, [req.query.user, getDailyDatePST()]);
  if (!row.rows.length) return res.json([]);
  const run = row.rows[0];
  const board = typeof run.board === 'string' ? JSON.parse(run.board) : run.board;
  return res.json(findAllWords(board, dictionary, run.min_word_length ?? 4));
});
const authServer = auth.listen(authPort, '127.0.0.1');
const runtime = createRuntime();
await new Promise<void>(resolve => runtime.server.listen(apiPort, '127.0.0.1', resolve));
const vite = await createViteServer({
  root: new URL('../../client', import.meta.url).pathname,
  configFile: new URL('../../client/vite.config.ts', import.meta.url).pathname,
  define: { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('local-test-publishable-key') },
  server: { port: 54352, host: '127.0.0.1', strictPort: true,
    proxy: { '/api': `http://127.0.0.1:${apiPort}`, '/socket.io': { target: `http://127.0.0.1:${apiPort}`, ws: true } } },
});
await vite.listen();
console.log('Isolated browser test app ready at http://127.0.0.1:54352');
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await vite.close();
  await runtime.close();
  await new Promise<void>(resolve => authServer.close(() => resolve()));
  await db.stop();
  process.exit(0);
}
process.once('SIGTERM', () => { void stop(); });
process.once('SIGINT', () => { void stop(); });
