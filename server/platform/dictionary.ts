import { parseDictionary } from 'engine/dictionary.js';
import { readFileSync } from 'node:fs';

export function loadDictionary(file: string): Set<string> {
  return parseDictionary(readFileSync(file, 'utf8'));
}
