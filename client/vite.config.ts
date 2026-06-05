import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: '..',
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      // Multiplayer socket traffic — Socket.io uses /socket.io for the
      // protocol handshake regardless of namespace, and needs ws:
      // upgrade to keep the persistent connection alive in dev.
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        // The dev WebSocket proxy logs a noisy EPIPE/ECONNRESET stack
        // whenever a client socket closes mid-write — StrictMode remounts,
        // HMR reloads, transport upgrades, a tab closing. These are benign
        // (there's no proxy in production), so quiet them to keep the dev
        // terminal readable; genuine proxy errors still surface.
        configure: (proxy: { on: (event: string, cb: (err: NodeJS.ErrnoException) => void) => void }) => {
          proxy.on('error', (err) => {
            if (err.code === 'EPIPE' || err.code === 'ECONNRESET') return;
            console.warn('[socket.io proxy]', err.message);
          });
        },
      },
    },
  },
});
