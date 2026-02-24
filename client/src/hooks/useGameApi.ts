import { useState } from 'react';
import { Game, Word, Position } from 'models';
import * as gameApi from '../api/gameApi';

export const useGameApi = () => {
  const [game, setGame] = useState<Game | null>(null);
  const [words, setWords] = useState<Word[]>([]);

  const startGame = async (durationSeconds: number = 180) => {
    const data = await gameApi.startGame(durationSeconds);
    setGame(data.game);
    setWords([]);
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
    startGame,
    fetchGameState,
    submitWord,
  };
};
