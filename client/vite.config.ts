import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const apiTarget = process.env.VITE_API_TARGET ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: '..',
  server: {
    proxy: {
      '/api': apiTarget,
      // Multiplayer socket traffic — Socket.io uses /socket.io for the
      // protocol handshake regardless of namespace, and needs ws:
      // upgrade to keep the persistent connection alive in dev.
      '/socket.io': {
        target: apiTarget,
        ws: true,
        // The dev WebSocket proxy logs a noisy EPIPE/ECONNRESET stack
        // whenever a client socket closes mid-write — StrictMode remounts,
        // HMR reloads, transport upgrades, a tab closing. These are benign
        // (there's no proxy in production), so quiet them to keep the dev
        // terminal readable; genuine proxy errors still surface.
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if ((err as NodeJS.ErrnoException).code === 'EPIPE' || (err as NodeJS.ErrnoException).code === 'ECONNRESET') return;
            console.warn('[socket.io proxy]', err.message);
          });
        },
      },
    },
  },
});
