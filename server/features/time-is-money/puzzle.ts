import { findAllWords } from 'engine/solver.js';
import { generateSalt, hashWord, type Position } from 'models';
import { dictionary } from '../../gameplay/dictionary.js';

const solutions = new Map<string, { word: string; path: Position[]; }[]>();

export function cachedSolve(date: string, board: string[][], minWordLength: number) {
  const key = JSON.stringify([date, board, minWordLength]);
  let words = solutions.get(key);
  if (!words) {
    words = findAllWords(board, dictionary, minWordLength).map(({ word, path }) => ({ word, path }));
    solutions.set(key, words);
  }
  return words;
}

export function solveBoard(date: string, board: string[][], minWordLength: number) {
  const salt = generateSalt();
  return { salt, wordHashes: cachedSolve(date, board, minWordLength).map(({ word }) => hashWord(word, salt)) };
}
