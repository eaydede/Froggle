import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getSupabaseAdmin } from '../supabaseAdmin.js';
import { cachePrivate, noStore } from '../httpCache.js';
import { invalidateDisplayName } from '../services/displayNames.js';
import { getMaskedName } from '../services/maskedName.js';
import {
  computeNameUpdate,
  isLocked,
  renderPublicName,
  type NameModerationState,
} from '../services/nameModeration.js';

export const userRouter = Router();

function readState(appMetadata: Record<string, unknown> | null | undefined): NameModerationState {
  const strikesRaw = appMetadata?.nameStrikes;
  const strikes = typeof strikesRaw === 'number' && Number.isFinite(strikesRaw) ? strikesRaw : 0;
  const lockedUntilRaw = appMetadata?.nameLockedUntil;
  const lockedUntilMs = typeof lockedUntilRaw === 'string' ? Date.parse(lockedUntilRaw) : NaN;
  return {
    strikes,
    lockedUntilMs: Number.isFinite(lockedUntilMs) ? lockedUntilMs : null,
  };
}

function profileResponse(
  userId: string,
  displayName: string,
  state: NameModerationState,
  nowMs: number,
) {
  const publicName = renderPublicName(userId, displayName, state, nowMs);
  const locked = isLocked(state, nowMs);
  return {
    display_name: displayName,
    public_name: publicName,
    is_marked: publicName !== displayName,
    is_locked: locked,
    locked_until: locked ? new Date(state.lockedUntilMs!).toISOString() : null,
    mask_name: getMaskedName(userId),
    strikes: state.strikes,
  };
}

userRouter.get('/me', requireAuth, (req, res) => {
  res.json({ id: req.userId });
});

userRouter.get('/profile', requireAuth, async (req, res) => {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.getUserById(req.userId!);

    if (error || !data.user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const displayName = data.user.user_metadata?.display_name || 'Anonymous';
    const state = readState(data.user.app_metadata);
    cachePrivate(res, 60);
    res.json(profileResponse(req.userId!, displayName, state, Date.now()));
  } catch (err) {
    console.error('Failed to fetch user profile:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

userRouter.put('/profile', requireAuth, async (req, res) => {
  const { display_name } = req.body;

  if (typeof display_name !== 'string' || display_name.trim().length === 0) {
    return res.status(400).json({ error: 'display_name must be a non-empty string' });
  }

  const trimmed = display_name.trim().slice(0, 20);
  const userId = req.userId!;

  try {
    const admin = getSupabaseAdmin();
    const { data: existing, error: fetchError } = await admin.auth.admin.getUserById(userId);
    if (fetchError || !existing.user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const state = readState(existing.user.app_metadata);
    const now = Date.now();

    if (isLocked(state, now)) {
      noStore(res);
      return res.status(403).json({
        error: 'name_locked',
        locked_until: new Date(state.lockedUntilMs!).toISOString(),
      });
    }

    const { nextDisplayName, nextState } = computeNameUpdate(userId, trimmed, state, now);

    const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: { display_name: nextDisplayName },
      app_metadata: {
        nameStrikes: nextState.strikes,
        nameLockedUntil: nextState.lockedUntilMs
          ? new Date(nextState.lockedUntilMs).toISOString()
          : null,
      },
    });

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    invalidateDisplayName(userId);

    const finalDisplayName = updated.user.user_metadata?.display_name || nextDisplayName;
    noStore(res);
    res.json(profileResponse(userId, finalDisplayName, nextState, now));
  } catch (err) {
    console.error('Failed to update user profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});
