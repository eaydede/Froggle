import type { ErrorRequestHandler, RequestHandler } from 'express';

export type FailureCode = 'invalid' | 'unauthenticated' | 'forbidden' | 'not-found' | 'conflict';
const STATUS: Record<FailureCode, number> = { invalid: 400, unauthenticated: 401, forbidden: 403, 'not-found': 404, conflict: 409 };

export class ApplicationError extends Error {
  constructor(public readonly code: FailureCode, message: string) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export function endpoint(handler: RequestHandler): RequestHandler {
  return (req, res, next) => { Promise.resolve(handler(req, res, next)).catch(next); };
}

export const handleError: ErrorRequestHandler = (error, req, res, _next) => {
  res.set('Cache-Control', 'no-store');
  if (error instanceof ApplicationError) {
    res.status(STATUS[error.code]).json({ error: error.message });
    return;
  }
  console.error('Unhandled request failure:', req.method, req.path, error);
  res.status(500).json({ error: 'Unexpected server error' });
};
