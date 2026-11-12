import { ApplicationError } from '../../platform/errors.js';
import { getMaskedName } from './maskedName.js';
import { computeNameUpdate, isLocked, renderPublicName } from './moderation.js';
import { invalidateDisplayName } from './publicNames.js';
import { findProfile, saveProfile, type ProfileState } from './repository.js';

function presentProfile(userId: string, profile: ProfileState, now: number) {
  const publicName = renderPublicName(userId, profile.displayName, profile, now);
  const locked = isLocked(profile, now);
  return {
    display_name: profile.displayName,
    public_name: publicName,
    is_marked: publicName !== profile.displayName,
    is_locked: locked,
    locked_until: locked ? new Date(profile.lockedUntilMs!).toISOString() : null,
    mask_name: getMaskedName(userId),
    strikes: profile.strikes,
  };
}

export async function getProfile(userId: string) {
  const profile = await findProfile(userId);
  if (!profile) throw new ApplicationError('not-found', 'User not found');
  return presentProfile(userId, profile, Date.now());
}

export async function changeName(userId: string, name: string) {
  const profile = await findProfile(userId);
  if (!profile) throw new ApplicationError('not-found', 'User not found');
  const now = Date.now();
  if (isLocked(profile, now)) return { ok: false as const, lockedUntil: new Date(profile.lockedUntilMs!).toISOString() };
  const { nextDisplayName, nextState } = computeNameUpdate(userId, name.trim().slice(0, 20), profile, now);
  const saved = await saveProfile(userId, nextDisplayName, nextState);
  invalidateDisplayName(userId);
  return { ok: true as const, profile: presentProfile(userId, saved, now) };
}
