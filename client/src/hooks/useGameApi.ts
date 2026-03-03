import { useState } from 'react';
import { Game, Word, Position } from 'models';
import * as gameApi from '../api/gameApi';

export const useGameApi = () => {
  const [game, setGame] = useState<Game | null>(null);
  const [words, setWords] = useState<Word[]>([]);

  const createGame = async () => {
    const data = await gameApi.createGame();
    setGame(data.game);
    setWords([]);
  };

  const startGame = async (durationSeconds: number = 180, boardSize: number = 4) => {
    const data = await gameApi.startGame(durationSeconds, boardSize);
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
  };

  const fetchGameState = async () => {
    const data = await gameApi.fetchGameState();
    setGame(data.game);
    setWords(data.words);
  };

  const submitWord = async (path: Position[]) => {
    return await gameApi.submitWord(path);
  };

  return {
    game,
    words,
    createGame,
    startGame,
    cancelGame,
    endGame,
    fetchGameState,
    submitWord,
  };
};
