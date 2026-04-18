import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getSupabaseAdmin } from '../supabaseAdmin.js';

export const userRouter = Router();

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
    res.json({ display_name: displayName });
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

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.updateUserById(req.userId!, {
      user_metadata: { display_name: trimmed },
    });

    if (error) {
      console.error('Supabase update error:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    res.json({ display_name: data.user.user_metadata?.display_name || trimmed });
  } catch (err) {
    console.error('Failed to update user profile:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});
