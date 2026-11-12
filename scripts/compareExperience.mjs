import { chromium } from '@playwright/test';
import fs from 'node:fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { hashWord } from 'models';
import { DEFAULT_RARE_LETTER_VALUES } from 'models/gauntlet';
import { encodeSeedCode } from 'models/seedCode';

const reference = process.env.REFERENCE_URL ?? 'http://localhost:5180';
const candidate = process.env.CANDIDATE_URL ?? 'http://localhost:5174';
const output = process.env.VISUAL_OUTPUT_DIR ?? '.context/visual';
fs.mkdirSync(output, { recursive: true });
const seen = fs.readdirSync('client/src/features/release-notes/entries').map(file =>
  fs.readFileSync(`client/src/features/release-notes/entries/${file}`, 'utf8').match(/id: '([^']+)'/)[1]);
const date = '2026-11-10';
const now = Date.parse('2026-11-10T20:00:00Z');
const board4 = [['T','R','A','P'],['E','S','O','L'],['N','I','D','E'],['G','H','A','M']];
const board5 = [['T','R','A','P','E'],['E','S','O','L','N'],['N','I','D','E','A'],['G','H','A','M','I'],['S','T','O','R','E']];
const words = ['TRAP', 'ROSE'];
const validation = { salt: 'visual-reference', wordHashes: words.map(word => hashWord(word, 'visual-reference')) };
const configs = [
  { index: 0, kind: 'regular', boardSize: 4, timeLimit: 120, minWordLength: 4, modifier: { kind: 'regular' } },
  { index: 1, kind: 'hotLetter', boardSize: 5, timeLimit: 120, minWordLength: 4, modifier: { kind: 'hotLetter', letter: 'R' } },
  { index: 2, kind: 'rareLetters', boardSize: 5, timeLimit: 120, minWordLength: 4, modifier: { kind: 'rareLetters', values: DEFAULT_RARE_LETTER_VALUES } },
];
const profile = { display_name: 'Alex', public_name: 'Alex', is_marked: false, is_locked: false, locked_until: null, mask_name: 'Kind Otter', strikes: 0 };
const screens = [
  { name: 'home', path: '/?mock=unplayed' },
  { name: 'home-completed', path: '/?mock=completed' },
  { name: 'home-zen', path: '/?mock=zen-progress' },
  { name: 'daily', path: '/daily?mock=default' },
  { name: 'daily-played', path: '/daily?mock=played' },
  { name: 'results', path: '/results?mock=rarity' },
  { name: 'money-results', path: '/daily/time-is-money/results?mock=standings' },
  { name: 'zen-intro', path: '/daily/zen/play' },
  { name: 'gauntlet-intro', path: '/daily/gauntlet' },
  { name: 'money-intro', path: '/daily/time-is-money' },
  { name: 'freeplay-board', path: '/game', mode: 'freeplay' },
  { name: 'zen-board', path: '/daily/zen/play', mode: 'zen' },
  { name: 'money-board', path: '/daily/time-is-money/play', mode: 'money' },
  { name: 'gauntlet-hot', path: '/daily/gauntlet/round/1/play', mode: 'gauntlet' },
  { name: 'gauntlet-rare', path: '/daily/gauntlet/round/2/play', mode: 'gauntlet' },
  { name: 'challenge-invitation', path: `/play?c=${encodeSeedCode(4,12345)}&t=120&m=3&ch=visual-challenge` },
  { name: 'leaderboard', path: `/leaderboard?date=${date}` },
];

function reply(path, screen) {
  if (path === '/api/daily') return { date, number: 215, seed: 1, board: board4, config: { boardSize: 4, timeLimit: 120, minWordLength: 3 }, ...validation };
  if (path === '/api/daily/zen/meta') return { date, number: 199, seed: 2, board: board5, config: { boardSize: 5, minWordLength: 4 } };
  if (path === '/api/user/profile') return profile;
  if (path.includes('/stats')) return { currentStreak: 3, streakDays: [false,false,false,false,true,true,true], avgPoints: 30, avgWords: 12, windowStart: date, windowEnd: date, days: [] };
  if (path === '/api/game/active') return { server_now: now, session: screen.mode === 'freeplay' ? {
    id: 'visual-session', game: { board: board4, startedAt: now, status: 'InProgress', config: { boardSize: 4, durationSeconds: 120, minWordLength: 3 } },
    found_words: [], challenge_id: null, seed: 12345, ...validation,
  } : null };
  if (path.includes('/daily/zen/session/')) return { session: screen.mode === 'zen' ? {
    date, board: board5, found_words: words, started_at: new Date(now).toISOString(), last_active_at: new Date(now).toISOString(), ended_at: null,
    ended_by_player: false, points: 4, word_count: 2, longest_word: 'TRAP', is_competitive: true, total_findable: 70, theoretical_max_score: 100, ...validation,
  } : null };
  if (path.includes('/time-is-money/session/')) return { session: screen.mode === 'money' ? {
    date, board: board5, found_words: [], started_at: new Date(now).toISOString(), ended_at: null,
    points: 0, word_count: 0, longest_word: '', board_size: 5, min_word_length: 3, time_limit: 60, server_now: now, ...validation,
  } : null };
  if (/\/gauntlet\/[^/]+\/round\/\d$/.test(path)) {
    const index = Number(path.split('/').pop()), config = configs[index];
    return { session: screen.mode === 'gauntlet' ? { date, roundIndex: index, roundKind: config.kind, modifier: config.modifier,
      config: { boardSize: config.boardSize, timeLimit: 120, minWordLength: 4 }, board: index ? board5 : board4,
      foundWords: [], points: 0, wordCount: 0, longestWord: '', startedAt: new Date(now).toISOString(), endedAt: null,
      completedAt: null, total_findable: 70, server_now: now, ...validation } : null };
  }
  if (path.includes('/session/')) return { session: null };
  if (path.includes('/results/')) return { result: null };
  if (path === '/api/version') return { buildId: 'reference' };
  if (path === '/api/multiplayer/public') return { rooms: [], totalPlayers: 0 };
  if (path.includes('leaderboard')) {
    const rows = [{ rank: 1, userId: 'you', displayName: 'Alex', value: 32, subLabel: '6 words', isCurrentUser: true },
      { rank: 2, userId: 'pat', displayName: 'Pat', value: 22, subLabel: '5 words', isCurrentUser: false }];
    return { puzzleNumber: 215, totalPlayers: 2, avgScore: 27, rankings: { points: rows, words: rows, rarity: rows },
      currentPlayer: { points: 32, wordsFound: 6, longestWord: 'STREAM', rank: 1, totalPlayers: 2, topPercent: null, accolade: 'A great round' } };
  }
  if (path.includes('time-is-money/status')) return { date, number: 133, state: 'unplayed', points: null, wordCount: null, rank: null, timeLimit: null };
  if (path === '/api/daily/gauntlet') return { date, puzzleNumber: 174, entry: { date, puzzleNumber: 174, state: 'unplayed', rounds: [null,null,null], aggregateRankSum: null, aggregateRank: null, totalPlayersCompleted: 2 },
    upcomingConfigs: { 0: configs[0] }, nextRoundIndex: 0, roundKinds: ['regular','hotLetter','rareLetters'] };
  if (path.includes('/preview')) return { challengeId: 'visual-challenge', ownerUserId: 'pat', ownerDisplayName: 'Pat', playerCount: 2, alreadyPlayed: false,
    config: { boardSize: 4, timeLimit: 120, minWordLength: 3 }, seed: 12345 };
  if (path.includes('/unread')) return { count: 0 };
  return {};
}

const browser = await chromium.launch({ args: ['--disable-lcd-text', '--font-render-hinting=none', '--disable-gpu'] });
const report = [];
const fontAssets = new Map();
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    for (const theme of ['light', 'dark']) {
      for (const screen of screens.filter(screen => !process.env.ONLY_SCREEN || screen.name === process.env.ONLY_SCREEN)) {
        const captures = [];
        for (const [label, base] of [['original', reference], ['rebuilt', candidate]]) {
          const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
          const errors = [];
          page.on('pageerror', error => errors.push(error.message));
          await page.clock.install({ time: now });
          await page.clock.pauseAt(now + 1);
          await page.addInitScript(({ theme, seen }) => {
            localStorage.setItem('froggle-changelog-seen', JSON.stringify(seen));
            localStorage.setItem('froggle-theme', theme);
            localStorage.setItem('froggle-muted', 'true');
          }, { theme, seen });
          await page.route('**/*', async route => {
            const url = new URL(route.request().url());
            if (url.pathname.includes('/auth/v1/')) return route.fulfill({ json: {
              access_token: 'mock', refresh_token: 'mock', expires_in: 3600, expires_at: 4102444800,
              token_type: 'bearer', user: { id: 'you', aud: 'authenticated', role: 'authenticated' },
            } });
            if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
              if (!fontAssets.has(url.href)) fontAssets.set(url.href, route.fetch().then(async response => ({ status: response.status(), headers: response.headers(), body: await response.body() })));
              return route.fulfill(await fontAssets.get(url.href));
            }
            if (url.pathname.startsWith('/api/')) return route.fulfill({ json: reply(url.pathname, screen) });
            return route.continue();
          });
          await page.goto(base + screen.path);
          await page.getByRole('button').first().waitFor({ state: 'visible' });
          await page.evaluate(async () => {
            await Promise.all([
              '400 14px Inter', '500 14px Inter', '600 14px Inter', '700 14px Inter',
              '400 14px Outfit', '500 14px Outfit', '600 14px Outfit', '700 14px Outfit', '800 32px Outfit',
              'italic 600 32px Fraunces', 'italic 900 32px Fraunces', '900 32px Merriweather',
            ].map(font => document.fonts.load(font)));
            await document.fonts.ready;
          });
          await page.clock.runFor(600);
          const file = `${output}/${label}-${screen.name}-${viewport.width}-${theme}.png`;
          await page.screenshot({ animations: 'disabled' });
          await page.screenshot({ path: file, animations: 'disabled' });
          captures.push({ file, errors });
          await page.close();
        }
        const original = PNG.sync.read(fs.readFileSync(captures[0].file));
        const rebuilt = PNG.sync.read(fs.readFileSync(captures[1].file));
        const difference = new PNG({ width: original.width, height: original.height });
        const changedPixels = pixelmatch(original.data, rebuilt.data, difference.data, original.width, original.height, { threshold: 0.1 });
        let exactChangedPixels = 0;
        for (let i = 0; i < original.data.length; i += 4) if (original.data.subarray(i, i+4).compare(rebuilt.data.subarray(i, i+4))) exactChangedPixels++;
        if (changedPixels) fs.writeFileSync(`${output}/diff-${screen.name}-${viewport.width}-${theme}.png`, PNG.sync.write(difference));
        const row = { screen: screen.name, viewport, theme, changedPixels, exactChangedPixels, ratio: changedPixels / (original.width * original.height), captures };
        report.push(row);
        console.log(`${screen.name} ${viewport.width} ${theme}: ${changedPixels} perceptual / ${exactChangedPixels} exact changed pixels${captures.some(c => c.errors.length) ? ' — BROWSER ERROR' : ''}`);
      }
    }
  }
} finally { await browser.close(); }
fs.writeFileSync(`${output}/comparison.json`, JSON.stringify(report, null, 2));
const failures = report.filter(row => row.changedPixels || row.captures.some(capture => capture.errors.length));
console.log(`${report.length - failures.length}/${report.length} pairs pass; report: ${output}/comparison.json`);
if (failures.length) process.exitCode = 1;
