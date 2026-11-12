import { fileURLToPath } from 'node:url';
import { loadDictionary } from '../platform/dictionary.js';

export const dictionary = loadDictionary(fileURLToPath(new URL('../../enable1.txt', import.meta.url)));
