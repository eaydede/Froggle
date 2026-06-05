import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// Cache the JWKS fetcher per Supabase URL
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks(): ReturnType<typeof createRemoteJWKSet> {
  if (!jwks) {
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is not set');
    }
    jwks = createRemoteJWKSet(
      new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`)
    );
  }
  return jwks;
}

/**
 * Verify a Supabase access token and return the authenticated user id, or
 * null if the token is missing/invalid. Shared by the Express middleware and
 * the multiplayer socket handshake so both gate on the same verification.
 */
export async function verifyAccessToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: `${process.env.SUPABASE_URL}/auth/v1`,
    });
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch (err) {
    console.warn('JWT verification failed:', (err as Error).message);
    return null;
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token — continue without user context (anonymous request)
    next();
    return;
  }

  const userId = await verifyAccessToken(authHeader.slice(7));
  if (userId) req.userId = userId;
  next();
}

/**
 * Middleware that requires a valid authenticated user.
 * Use on routes that must have a user (e.g., saving results).
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}
