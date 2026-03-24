import { useState, useRef } from 'react';
import { Game, Word, Position } from 'models';
import * as gameApi from '../api/gameApi';
import { GameResults } from '../api/gameApi';

export const useGameApi = () => {
  const [game, setGame] = useState<Game | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [results, setResults] = useState<GameResults | null>(null);
  const fetchingResults = useRef(false);

  const createGame = async () => {
    const data = await gameApi.createGame();
    setGame(data.game);
    setWords([]);
    setResults(null);
    fetchingResults.current = false;
  };

  const startGame = async (
    durationSeconds: number = 180, 
    boardSize: number = 4, 
    minWordLength: number = 3
  ) => {
    const data = await gameApi.startGame(durationSeconds, boardSize, minWordLength);
    setGame(data.game);
    setWords([]);
  };

  const cancelGame = async () => {
    await gameApi.cancelGame();
    setGame(null);
    setWords([]);
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

  const fetchGameState = async () => {
    const data = await gameApi.fetchGameState();
    setGame(data.game);
    setWords(data.words);
    if (data.game?.status === 'Finished' && !fetchingResults.current) {
      fetchingResults.current = true;
      const resultsData = await gameApi.fetchResults();
      setResults(resultsData);
      fetchingResults.current = false;
    }
  };

  const submitWord = async (path: Position[]) => {
    return await gameApi.submitWord(path);
  };

  return {
    game,
    words,
    results,
    createGame,
    startGame,
    cancelGame,
    endGame,
    fetchGameState,
    submitWord,
  };
};
