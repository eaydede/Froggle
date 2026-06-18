import { Router } from 'express';
import { scoreWord } from 'engine/scoring.js';
import { getDb } from '../db/index.js';
import { scoreWords } from '../services/DailyService.js';
import { getDailyNumber } from '../services/dailyConfig.js';
import { getDisplayNames } from '../services/displayNames.js';
import { assignCompetitionRanks } from 'models/ranking';
import { cachePrivate } from '../httpCache.js';

export const leaderboardRouter = Router();

// Daily leaderboard for a single date. Returns fully computed rankings and
// per-player stats ready for display. Anonymous-friendly — requestingUserId
// may be undefined; currentPlayer is populated only when authenticated.
leaderboardRouter.get('/:date', async (req, res) => {
  const { date } = req.params;
  const requestingUserId = req.userId;

  try {
    const db = getDb();

    const results = await db
      .selectFrom('daily_results')
      .selectAll()
      .where('date', '=', date)
      .where('ended_at', 'is not', null)
      .execute();

    const totalPlayers = results.length;

    if (totalPlayers === 0) {
      cachePrivate(res, 10);
      return res.json({
        puzzleNumber: getDailyNumber(date),
        totalPlayers: 0,
        rankings: { points: [], words: [], rarity: [] },
        currentPlayer: null,
      });
    }

    const userMap = await getDisplayNames(results.map((r) => r.user_id));

    const wordCounts = new Map<string, number>();
    const parsedResults = results.map((r) => {
      const words: string[] = typeof r.found_words === 'string'
        ? JSON.parse(r.found_words)
        : r.found_words;
      for (const w of words) {
        wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
      }
      return { ...r, words };
    });

    const scored = parsedResults.map((r) => {
      const points = scoreWords(r.words);
      const wordCount = r.words.length;
      const rarityScore = Math.round(
        r.words.reduce((sum, w) => {
          const base = scoreWord(w);
          const freq = wordCounts.get(w) || 1;
          return sum + base * (2 - freq / totalPlayers);
        }, 0) * 10,
      ) / 10;
      const longest = r.words.reduce((a, b) => (b.length > a.length ? b : a), '');

      return {
        userId: r.user_id,
        displayName: userMap.get(r.user_id) || 'Anonymous',
        words: r.words,
        points,
        wordCount,
        rarityScore,
        longestWord: longest.toUpperCase(),
        wordFrequencies: Object.fromEntries(
          r.words.map((w) => [w, wordCounts.get(w) || 0]),
        ),
      };
    });

    function buildRankings(
      sortKey: 'points' | 'wordCount' | 'rarityScore',
      subLabelKey: 'wordCount' | 'points',
      subLabelSuffix: string,
    ) {
      const sorted = [...scored].sort((a, b) => b[sortKey] - a[sortKey]);
      // Rank on the displayed (rounded) value, not the raw score: the rarity
      // tab rounds to an integer for display, so ranking on the underlying
      // float could hand two players who both see "50" different ranks — the
      // exact confusion we're removing.
      const ranked = assignCompetitionRanks(sorted, (p) => Math.round(p[sortKey]));
      return ranked.map(({ item: p, rank }) => ({
        rank,
        userId: p.userId,
        displayName: p.displayName,
        value: Math.round(p[sortKey]),
        subLabel: `${p[subLabelKey]} ${subLabelSuffix}`,
        isCurrentUser: p.userId === requestingUserId,
      }));
    }

    const rankings = {
      points: buildRankings('points', 'wordCount', 'words'),
      words: buildRankings('wordCount', 'points', 'pts'),
      rarity: buildRankings('rarityScore', 'wordCount', 'words'),
    };

    let currentPlayer = null;
    if (requestingUserId) {
      const me = scored.find((p) => p.userId === requestingUserId);
      if (me) {
        const pointsRank = rankings.points.find((r) => r.isCurrentUser)!.rank;

        const wordsByRarity = [...me.words].sort(
          (a, b) => (me.wordFrequencies[a] || totalPlayers) - (me.wordFrequencies[b] || totalPlayers),
        );

        let accolade = '';
        if (wordsByRarity.length > 0) {
          const rarestWord = wordsByRarity[0];
          const freq = me.wordFrequencies[rarestWord] || totalPlayers;
          const pct = Math.round((freq / totalPlayers) * 100);

          if (pct <= 10) {
            accolade = `Only <b>${pct}%</b> of players found <b>${rarestWord.toUpperCase()}</b>`;
          } else {
            const rareWords = me.words.filter(
              (w) => ((me.wordFrequencies[w] || totalPlayers) / totalPlayers) * 100 <= 10,
            );
            if (rareWords.length >= 2) {
              accolade = `You found <b>${rareWords.length} words</b> that less than 10% of players spotted`;
            }
          }
        }

        if (!accolade && me.wordCount > 0) {
          const avg = (me.points / me.wordCount).toFixed(1);
          accolade = `Your avg word scored <b>${avg} pts</b>`;
        }

        if (!accolade) {
          accolade = 'Keep playing to earn accolades!';
        }

        const topPercent = Math.round((pointsRank / totalPlayers) * 100);

        currentPlayer = {
          points: me.points,
          wordsFound: me.wordCount,
          longestWord: me.longestWord,
          rank: pointsRank,
          totalPlayers,
          topPercent: topPercent <= 30 ? topPercent : null,
          accolade,
        };
      }
    }

    const avgScore = scored.length === 0
      ? 0
      : Math.round(scored.reduce((sum, p) => sum + p.points, 0) / scored.length);

    cachePrivate(res, 10);
    res.json({
      puzzleNumber: getDailyNumber(date),
      totalPlayers,
      avgScore,
      rankings,
      currentPlayer,
    });
  } catch (err) {
    console.error('Failed to fetch leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});
