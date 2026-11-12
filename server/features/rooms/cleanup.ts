import { ROOM_TTL_MS } from './config.js';
import { allEntries, removeRoom } from './repository.js';

export function startRoomCleanup(intervalMs = 15 * 60 * 1000): NodeJS.Timeout {
  return setInterval(() => {
    const cutoff = Date.now() - ROOM_TTL_MS;
    for (const [code, entry] of allEntries()) {
      if (entry.lastActivity >= cutoff) continue;
      if (entry.boardTimer) clearTimeout(entry.boardTimer);
      if (entry.persistTimer) clearTimeout(entry.persistTimer);
      removeRoom(code);
    }
  }, intervalMs);
}

export async function closeRooms() {
  const pending: Promise<void>[] = [];
  for (const [code, entry] of allEntries()) {
    if (entry.boardTimer) clearTimeout(entry.boardTimer);
    entry.flushPersistence?.();
    if (entry.lastPersistence) pending.push(entry.lastPersistence);
    removeRoom(code);
  }
  await Promise.allSettled(pending);
}
