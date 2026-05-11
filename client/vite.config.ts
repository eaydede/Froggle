import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const here = dirname(fileURLToPath(import.meta.url));

// Dev-only middleware: serves enable1.txt + mit10k.txt to the test bench at
// /calibration/* without copying the files into client/public/. Test bench
// is gated by import.meta.env.DEV, so these endpoints exist only in dev.
const calibrationDictPlugin = {
  name: 'calibration-dict',
  configureServer(server: { middlewares: { use: (fn: (req: { url?: string }, res: { setHeader: (k: string, v: string) => void; end: (b: Buffer) => void }, next: () => void) => void) => void } }) {
    const map: Record<string, string> = {
      '/calibration/enable1.txt': resolve(here, '../enable1.txt'),
      '/calibration/mit10k.txt': resolve(here, '../scripts/data/mit10k.txt'),
    };
    server.middlewares.use((req, res, next) => {
      const target = req.url ? map[req.url] : undefined;
      if (!target) return next();
      const file = fs.readFileSync(target);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.end(file);
    });
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), calibrationDictPlugin],
  envDir: '..',
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
