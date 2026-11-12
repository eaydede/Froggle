import http from 'node:http';
import { Server } from 'socket.io';
import { createApplication } from './app.js';
import { persistRoomBoardResults } from './features/free-play/service.js';
import { closeRooms, startRoomCleanup } from './features/rooms/cleanup.js';
import { setBoardCompletionHandler } from './features/rooms/history.js';
import { attachMultiplayerSockets } from './features/rooms/sockets.js';
import { getDb, resetDb } from './platform/database/index.js';

export function createRuntime() {
  const app = createApplication();
  const server = http.createServer(app);
  const sockets = new Server(server, { cors: { origin: '*' } });
  attachMultiplayerSockets(sockets);
  setBoardCompletionHandler(completion => persistRoomBoardResults(getDb(), completion).catch(error => {
    console.error('Failed to persist room results:', error);
  }));
  const roomCleanup = startRoomCleanup();
  roomCleanup.unref();
  return {
    app,
    server,
    async close() {
      clearInterval(roomCleanup);
      await closeRooms();
      await new Promise<void>(resolve => sockets.close(() => resolve()));
      await resetDb();
    },
  };
}
