import type { Response } from 'express';

export function cachePublic(res: Response, seconds: number): void {
  res.set('Cache-Control', `public, max-age=${seconds}`);
}

export function cachePrivate(res: Response, seconds: number): void {
  res.set('Cache-Control', `private, max-age=${seconds}`);
}

export function noStore(res: Response): void {
  res.set('Cache-Control', 'no-store');
}
