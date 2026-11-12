import type { RoomEntry } from './types.js';

const rooms = new Map<string, RoomEntry>();
const nudgeTimes = new Map<string, number>();

export const hasRoom = (code: string) => rooms.has(code);
export const findEntry = (code: string) => rooms.get(code.toUpperCase()) ?? null;
export const saveEntry = (code: string, entry: RoomEntry) => { rooms.set(code, entry); };
export const listEntries = () => rooms.values();
export const allEntries = () => rooms.entries();
export const removeRoom = (code: string) => { rooms.delete(code); clearRoomNudges(code); };
export const findNudgeTime = (key: string) => nudgeTimes.get(key);
export const saveNudgeTime = (key: string, time: number) => { nudgeTimes.set(key, time); };

export function clearRoomNudges(code: string) {
  for (const key of nudgeTimes.keys()) if (key.startsWith(`${code}:`)) nudgeTimes.delete(key);
}
