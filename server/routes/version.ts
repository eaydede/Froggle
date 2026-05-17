import { Router } from 'express';
import { readFileSync } from 'fs';
import path from 'path';
import { noStore } from '../httpCache.js';

// The Dockerfile writes a fresh BUILD_ID per image. In local dev the file is
// absent, so we fall back to a constant — the client only reloads on a real
// mismatch, and `'dev'` keeps matching `'dev'`.
const BUILD_ID = (() => {
  try {
    return readFileSync(path.join(process.cwd(), 'BUILD_ID'), 'utf-8').trim();
  } catch {
    return 'dev';
  }
})();

export const versionRouter = Router();

versionRouter.get('/', (_req, res) => {
  noStore(res);
  res.json({ buildId: BUILD_ID });
});
