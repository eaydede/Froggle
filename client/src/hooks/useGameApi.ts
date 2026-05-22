import { useState, useRef, useCallback } from 'react';
import { Game, Word, Position, hashWord } from 'models';
import * as gameApi from '../shared/api/gameApi';
import type { GameResults } from '../shared/types';

export const useGameApi = () => {
  const [game, setGame] = useState<Game | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [results, setResults] = useState<GameResults | null>(null);
  const [gameSeed, setGameSeed] = useState<number | null>(null);
  const fetchingResults = useRef(false);
  const wordHashesRef = useRef<Set<string>>(new Set());
  const saltRef = useRef<string>('');
  const submittedWordsRef = useRef<Set<string>>(new Set());

  const createGame = async () => {
    const data = await gameApi.createGame();
    setGame(data.game);
    setWords([]);
    setResults(null);
    fetchingResults.current = false;
    wordHashesRef.current = new Set();
    saltRef.current = '';
    submittedWordsRef.current = new Set();
  };

  const startGame = async (
    durationSeconds: number = 180,
    boardSize: number = 4,
    minWordLength: number = 3,
    predefinedBoard?: string[][],
    seed?: number,
    challengeId?: string,
    isDaily?: boolean,
  ) => {
    const data = await gameApi.startGame(durationSeconds, boardSize, minWordLength, predefinedBoard, seed, challengeId, isDaily);
    setGame(data.game);
    setWords([]);
    setGameSeed(data.seed);
    wordHashesRef.current = new Set(data.wordHashes);
    saltRef.current = data.salt;
    submittedWordsRef.current = new Set();
  };

  const cancelGame = async () => {
    await gameApi.cancelGame();
    setGame(null);
    setWords([]);
    wordHashesRef.current = new Set();
    saltRef.current = '';
    submittedWordsRef.current = new Set();
  };

  // Rehydrates state from a server-resumed session so a page refresh
  // during free play picks up the in-progress game instead of dropping
  // it. Path arrays aren't stored server-side (only word strings are),
  // so resumed words render without a board-replay path until the game
  // ends and /results recomputes them — the practical impact is none
  // because the in-game word list shows the word text alone.
  const hydrate = (params: {
    game: Game;
    foundWords: string[];
    salt: string;
    wordHashes: string[];
    seed: number | null;
  }) => {
    setGame(params.game);
    setWords(params.foundWords.map((word) => ({ word, path: [], submittedAt: 0 })));
    setGameSeed(params.seed);
    setResults(null);
    fetchingResults.current = false;
    wordHashesRef.current = new Set(params.wordHashes);
    saltRef.current = params.salt;
    submittedWordsRef.current = new Set(params.foundWords.map((w) => w.toUpperCase()));
  };

  const endGame = async () => {
    const data = await gameApi.endGame();
    setGame(data.game);
    if (!fetchingResults.current) {
      fetchingResults.current = true;
      const resultsData = await gameApi.fetchResults();
      setResults(resultsData);
      fetchingResults.current = false;
    }
  };

  const fetchGameState = useCallback(async () => {
    const data = await gameApi.fetchGameState();
    setGame(data.game);
    setWords(data.words);
    if (data.game?.status === 'Finished' && !fetchingResults.current) {
      fetchingResults.current = true;
      const resultsData = await gameApi.fetchResults();
      setResults(resultsData);
      fetchingResults.current = false;
    }
  }, []);

  const validateWordLocally = useCallback((word: string): { valid: boolean; reason?: string } => {
    const upperWord = word.toUpperCase();

    if (submittedWordsRef.current.has(upperWord)) {
      return { valid: false, reason: 'repeat' };
    }

    const hash = hashWord(upperWord, saltRef.current);
    if (!wordHashesRef.current.has(hash)) {
      return { valid: false, reason: 'invalid' };
    }

    return { valid: true };
  }, []);

  const submitWord = async (path: Position[]) => {
    // Submit to server with single retry on failure
    const serverSubmit = () => gameApi.submitWord(path);
    serverSubmit().catch(() => {
      // Retry once after a short delay
      setTimeout(() => serverSubmit().catch(() => {}), 200);
    });

    // Validate locally for instant feedback
    if (!game) return { valid: false, reason: 'invalid' };
    const word = path.map(pos => game.board[pos.row][pos.col]).join('').toUpperCase();
    const localResult = validateWordLocally(word);

    if (localResult.valid) {
      submittedWordsRef.current.add(word);
      // Optimistically update local word list
      setWords(prev => [...prev, { word, path, submittedAt: Date.now() }]);
    }

    return { ...localResult, word };
  };

  return {
    game,
    words,
    results,
    gameSeed,
    createGame,
    startGame,
    cancelGame,
    endGame,
    fetchGameState,
    submitWord,
    hydrate,
  };
};
