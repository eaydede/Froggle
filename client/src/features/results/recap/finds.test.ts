import { expect, it } from 'vitest';
import { buildFinds } from './finds';

it('restores historical find order even when the results endpoint sorts by score', () => {
  const finds = buildFinds(
    [
      { word: 'SCALES', score: 5, bonus: '2×' },
      { word: 'came', score: 2 },
    ],
    {
      id: 'you',
      displayName: 'You',
      isYou: true,
      duration: 120,
      timeLimit: 120,
      finds: [
        { word: 'CAME', score: 2, time: null },
        { word: 'SCALES', score: 5, time: null },
      ],
    },
  );
  expect(finds.map((f) => f.word)).toEqual(['CAME', 'SCALES']);
  expect(finds.map((f) => f.time)).toEqual([null, null]);
  expect(finds[1].bonus).toBe('2×');
});
