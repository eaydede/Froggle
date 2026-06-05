import type { GameConfig } from 'models';
import type { MultiplayerRoom, PublicRoomsResponse } from 'models/multiplayer';
import { sessionHeaders } from './gameApi';

const API_URL = '/api';

export async function createMultiplayerRoom(
  config?: Partial<GameConfig>,
): Promise<MultiplayerRoom> {
  const res = await fetch(`${API_URL}/multiplayer/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config: config ?? {} }),
  });
  if (!res.ok) throw new Error(`createMultiplayerRoom failed: ${res.status}`);
  const data = await res.json();
  return data.room as MultiplayerRoom;
}

export async function fetchMultiplayerRoom(code: string): Promise<MultiplayerRoom | null> {
  const res = await fetch(`${API_URL}/multiplayer/rooms/${encodeURIComponent(code)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`fetchMultiplayerRoom failed: ${res.status}`);
  const data = await res.json();
  return data.room as MultiplayerRoom;
}

export async function fetchPublicRooms(): Promise<PublicRoomsResponse> {
  const res = await fetch(`${API_URL}/multiplayer/public`);
  if (!res.ok) throw new Error(`fetchPublicRooms failed: ${res.status}`);
  return (await res.json()) as PublicRoomsResponse;
}

export interface RoomChallengeShare {
  challengeId: string;
  seed: number;
  config: { boardSize: number; timeLimit: number; minWordLength: number };
}

/** Promote the caller's result on the room's most recent board into a
 *  shareable async challenge. Returns null when there's nothing to share yet
 *  (no finished board, or the caller has no recorded result). */
export async function shareRoomChallenge(code: string): Promise<RoomChallengeShare | null> {
  const res = await fetch(`${API_URL}/multiplayer/rooms/${encodeURIComponent(code)}/share`, {
    method: 'POST',
    headers: await sessionHeaders(),
  });
  if (!res.ok) return null;
  return (await res.json()) as RoomChallengeShare;
}

/** Every found-able word on the room's current board. Returns [] until the
 *  board has ended (the server gates the dictionary mid-game). */
export async function fetchRoomWords(code: string): Promise<string[]> {
  const res = await fetch(`${API_URL}/multiplayer/rooms/${encodeURIComponent(code)}/words`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.words ?? []) as string[];
}
