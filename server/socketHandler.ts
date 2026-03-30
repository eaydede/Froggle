import { Server, Socket } from 'socket.io';
import { RoomManager } from './RoomManager.js';

// Track which room each socket is in
const socketRooms = new Map<string, string>(); // socketId → roomCode

export function setupSocketHandlers(io: Server, roomManager: RoomManager): void {
  io.on('connection', (socket: Socket) => {

    // ── Host creates a room ──────────────────────────────────────────────────
    socket.on('room:create', ({ name }: { name: string }) => {
      const trimmedName = (name || '').trim().slice(0, 20) || 'Player';
      const code = roomManager.createRoom(socket.id, trimmedName);
      socketRooms.set(socket.id, code);
      socket.join(code);

      socket.emit('room:created', {
        code,
        players: roomManager.getPlayerInfos(code),
        myId: socket.id,
      });
    });

    // ── Player joins a room ──────────────────────────────────────────────────
    socket.on('room:join', ({ code, name }: { code: string; name: string }) => {
      const upperCode = (code || '').trim().toUpperCase();
      const trimmedName = (name || '').trim().slice(0, 20) || 'Player';

      const result = roomManager.joinRoom(upperCode, socket.id, trimmedName);
      if (!result.success) {
        socket.emit('room:error', { message: result.error });
        return;
      }

      socketRooms.set(socket.id, upperCode);
      socket.join(upperCode);

      // Tell the joiner their full room state
      const room = roomManager.getRoom(upperCode);
      socket.emit('room:joined', {
        code: upperCode,
        players: roomManager.getPlayerInfos(upperCode),
        myId: socket.id,
        game: room?.game ?? null,
      });

      // Tell everyone else a new player arrived
      socket.to(upperCode).emit('room:updated', {
        players: roomManager.getPlayerInfos(upperCode),
      });
    });

    // ── Host starts the game ─────────────────────────────────────────────────
    socket.on('game:start', ({
      boardSize = 4,
      durationSeconds = 120,
      minWordLength = 3,
    }: {
      boardSize?: number;
      durationSeconds?: number;
      minWordLength?: number;
    }) => {
      const code = socketRooms.get(socket.id);
      if (!code) { socket.emit('room:error', { message: 'Not in a room' }); return; }

      const result = roomManager.startGame(
        code,
        socket.id,
        boardSize,
        durationSeconds,
        minWordLength,
        () => {
          // Timer expired — broadcast results to everyone in the room
          const results = roomManager.getResults(code);
          io.to(code).emit('game:ended', { results });
        },
      );

      if (!result.success) {
        socket.emit('room:error', { message: result.error });
        return;
      }

      // Broadcast game start to all players in the room
      io.to(code).emit('game:started', {
        game: result.game,
        wordHashes: result.wordHashes,
        salt: result.salt,
      });
    });

    // ── Player submits a word ────────────────────────────────────────────────
    socket.on('game:submit', ({ path }: { path: { row: number; col: number }[] }) => {
      const code = socketRooms.get(socket.id);
      if (!code) return;

      const result = roomManager.submitWord(code, socket.id, path);

      // Tell the submitter whether it was valid
      socket.emit('game:word-result', result);

      if (result.valid) {
        // Broadcast updated scores to all players
        io.to(code).emit('game:score-update', {
          players: roomManager.getPlayerInfos(code),
        });
      }
    });

    // ── Host ends game early ─────────────────────────────────────────────────
    socket.on('game:end', () => {
      const code = socketRooms.get(socket.id);
      if (!code) return;
      if (!roomManager.isPlayerHost(code, socket.id)) return; // only host may end

      const ended = roomManager.endGame(code);
      if (!ended) return; // already ended (race condition guard)
      const results = roomManager.getResults(code);
      io.to(code).emit('game:ended', { results });
    });

    // ── Player leaves a room ─────────────────────────────────────────────────
    socket.on('room:leave', () => {
      handleLeave(socket, io, roomManager, socketRooms);
    });

    // ── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      handleLeave(socket, io, roomManager, socketRooms);
    });
  });
}

function handleLeave(
  socket: Socket,
  io: Server,
  roomManager: RoomManager,
  socketRooms: Map<string, string>,
): void {
  const code = socketRooms.get(socket.id);
  if (!code) return;

  socketRooms.delete(socket.id);
  socket.leave(code);

  const { newHostId, shouldClose } = roomManager.removePlayer(code, socket.id);

  if (shouldClose) return; // Room dissolved — no more events needed

  if (newHostId) {
    io.to(newHostId).emit('room:host-changed', { myId: newHostId });
  }

  io.to(code).emit('room:updated', {
    players: roomManager.getPlayerInfos(code),
  });
}
