import path from 'path';
import { fileURLToPath } from 'url';
import { loadDictionary } from 'engine/dictionary.js';

// Dictionary singleton loaded at import time. Both GameController (for
// live scoring) and the daily-results endpoint (for computing missed
// words on demand) share this set so the file is only read once per
// process. Set reads are O(1), so sharing is lossless.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const dictionary: Set<string> = loadDictionary(
  path.join(__dirname, '../../enable1.txt'),
);
