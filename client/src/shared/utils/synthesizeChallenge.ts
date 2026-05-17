import type { Game } from 'models';
import type { GameResults } from '../types';
import type { FreePlayChallengeResponse } from '../api/gameApi';

/** Builds a single-player challenge payload from a live or saved
 *  free-play game so the unified challenge results page can render it.
 *  The caller is the only player; standings vanish and the right-column
 *  prompt becomes the solo tap-hint. */
export function synthesizeSoloChallenge(opts: {
  results: GameResults;
  game: Game;
  seed: number | null;
  sessionId: string | null;
  displayName?: string;
  ownerUserId?: string | null;
}): FreePlayChallengeResponse {
  const { results, game, seed, sessionId, displayName, ownerUserId } = opts;
  const points = results.foundWords.reduce((sum, w) => sum + w.score, 0);
  const longest = results.foundWords.reduce(
    (best, w) => (w.word.length > best.length ? w.word : best),
    '',
  );
  // sessionId may be unknown when the recorder hasn't echoed it back
  // yet — a placeholder keeps the renderer happy; share-mint will look
  // up the real row via context-supplied callback.
  const stableId = sessionId ?? 'solo';

  return {
    challengeId: stableId,
    board: results.board,
    config: {
      boardSize: game.config.boardSize,
      minWordLength: game.config.minWordLength,
      timeLimit: game.config.durationSeconds,
    },
    seed,
    ownerUserId: ownerUserId ?? null,
    players: [
      {
        userId: ownerUserId ?? null,
        displayName: displayName ?? 'You',
        sessionId: stableId,
        points,
        wordCount: results.foundWords.length,
        longestWord: longest,
        completedAt: new Date().toISOString(),
        foundWords: results.foundWords.map((w) => ({ word: w.word, score: w.score })),
        isOwner: true,
        isYou: true,
      },
    ],
    missedWords: results.missedWords,
  };
}
