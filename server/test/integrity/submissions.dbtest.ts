import { findAllWords } from 'engine/solver.js';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getGauntletRoundSession, startGauntletRound, submitGauntletWord } from '../../features/gauntlet/service.js';
import { getTimeIsMoneySession, startTimeIsMoneySession, submitTimeIsMoneyWord } from '../../features/time-is-money/service.js';
import { getDailyConfig } from '../../features/timed-daily/config.js';
import { getTimedDailySession, startTimedDailySession, submitTimedDailyWord } from '../../features/timed-daily/service.js';
import { getSession, startSession, submitWord } from '../../features/zen/service.js';
import { dictionary } from '../../gameplay/dictionary.js';
import { boardWithWords } from '../fixtures.js';
import { dockerAvailable, startTestDb, type TestDb } from '../pgHarness.js';

const date = '2026-04-15';
describe.runIf(dockerAvailable())('daily submission integrity', () => {
  let harness: TestDb;
  beforeAll(async () => { harness = await startTestDb(); }, 180_000);
  afterAll(async () => { await harness?.stop(); });
  beforeEach(async () => { await harness.truncateAll(); });
  const modes = ['timed', 'zen', 'gauntlet', 'money'] as const;

  async function start(mode: typeof modes[number], user: string) {
    const db = harness.db;
    if (mode === 'timed') {
      const config = getDailyConfig(date), fixture = boardWithWords(config.boardSize, config.minWordLength);
      await startTimedDailySession(db, user, date, fixture.board, config);
      return {
        words: fixture.words, submit: (path: typeof fixture.words[number]['path']) => submitTimedDailyWord(db, user, date, path),
        read: async () => (await getTimedDailySession(db, user, date))!.found_words
      };
    }
    if (mode === 'zen') {
      const fixture = boardWithWords(5, 4);
      await startSession(db, user, date, fixture.board, true);
      return {
        words: fixture.words, submit: (path: typeof fixture.words[number]['path']) => submitWord(db, user, date, path),
        read: async () => (await getSession(db, user, date))!.found_words
      };
    }
    if (mode === 'gauntlet') {
      const round = await startGauntletRound(db, user, date, 0);
      if ('error' in round) throw new Error(round.error);
      return {
        words: findAllWords(round.board, dictionary, round.config.minWordLength),
        submit: (path: { row: number; col: number; }[]) => submitGauntletWord(db, user, date, 0, path),
        read: async () => (await getGauntletRoundSession(db, user, date, 0))!.foundWords
      };
    }
    const session = await startTimeIsMoneySession(db, user, date);
    return {
      words: findAllWords(session.board, dictionary, session.min_word_length),
      submit: (path: { row: number; col: number; }[]) => submitTimeIsMoneyWord(db, user, date, path),
      read: async () => (await getTimeIsMoneySession(db, user, date))!.found_words
    };
  }
  for (const mode of modes) {
    it(`${mode}: simultaneous distinct words both persist`, async () => {
      const run = await start(mode, randomUUID());
      const words = run.words.slice(0, 2);
      expect(words).toHaveLength(2);
      const outcomes = await Promise.all(words.map(word => run.submit(word.path)));
      expect(outcomes.every(outcome => outcome.valid)).toBe(true);
      expect((await run.read()).sort()).toEqual(words.map(word => word.word).sort());
    });
    it(`${mode}: simultaneous duplicates count once`, async () => {
      const run = await start(mode, randomUUID());
      const outcomes = await Promise.all([run.submit(run.words[0].path), run.submit(run.words[0].path)]);
      expect(outcomes.filter(outcome => outcome.valid)).toHaveLength(1);
      expect(outcomes.find(outcome => !outcome.valid)).toMatchObject({ reason: 'repeat' });
      expect(await run.read()).toEqual([run.words[0].word]);
    });
  }
});
