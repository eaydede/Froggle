import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { GameController } from './GameController.js';

interface Session {
  controller: GameController;
  lastActivity: number;
}

const sessions = new Map<string, Session>();

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

export function createSession(): { sessionId: string; controller: GameController } {
  const sessionId = crypto.randomUUID();
  const controller = new GameController();
  sessions.set(sessionId, { controller, lastActivity: Date.now() });
  return { sessionId, controller };
}

export function getSession(sessionId: string | undefined): Session | null {
  if (!sessionId) return null;
  const session = sessions.get(sessionId);
  if (!session) return null;
  session.lastActivity = Date.now();
  return session;
}

export function destroySession(sessionId: string | undefined): void {
  if (!sessionId) return;
  sessions.delete(sessionId);
}

// Idle sessions are cancelled and dropped on a fixed interval so controllers
// don't leak when a client disconnects without calling /api/game/cancel.
export function startSessionCleanup(): NodeJS.Timeout {
  return setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (now - session.lastActivity > SESSION_TIMEOUT_MS) {
        session.controller.cancelGame();
        sessions.delete(id);
      }
    }
  }, CLEANUP_INTERVAL_MS);
}

export function sessionMiddleware(req: Request, _res: Response, next: NextFunction): void {
  (req as any).sessionId = req.headers['x-session-id'] as string | undefined;
  next();
}

export function getRequestSessionId(req: Request): string | undefined {
  return (req as any).sessionId as string | undefined;
}
