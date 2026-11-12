import { sql } from 'kysely';
import { getDb } from '../../platform/database/index.js';
import { getSupabaseAdmin } from '../../platform/supabaseAdmin.js';
import type { NameModerationState } from './moderation.js';

export interface ProfileState extends NameModerationState { displayName: string; }

function readState(name: unknown, metadata: Record<string, unknown> | undefined | null): ProfileState {
  const lockedUntil = typeof metadata?.nameLockedUntil === 'string' ? Date.parse(metadata.nameLockedUntil) : NaN;
  const strikes = metadata?.nameStrikes;
  return {
    displayName: typeof name === 'string' && name ? name : 'Anonymous',
    strikes: typeof strikes === 'number' && Number.isFinite(strikes) ? strikes : 0,
    lockedUntilMs: Number.isFinite(lockedUntil) ? lockedUntil : null,
  };
}

export async function findProfile(userId: string): Promise<ProfileState | null> {
  const { data, error } = await getSupabaseAdmin().auth.admin.getUserById(userId);
  if (error?.status === 404 || !error && !data.user) return null;
  if (error) throw error;
  return readState(data.user.user_metadata?.display_name, data.user.app_metadata);
}

export async function saveProfile(userId: string, displayName: string, state: NameModerationState): Promise<ProfileState> {
  const { data, error } = await getSupabaseAdmin().auth.admin.updateUserById(userId, {
    user_metadata: { display_name: displayName },
    app_metadata: {
      nameStrikes: state.strikes,
      nameLockedUntil: state.lockedUntilMs ? new Date(state.lockedUntilMs).toISOString() : null,
    },
  });
  if (error) throw error;
  return readState(data.user.user_metadata?.display_name || displayName, data.user.app_metadata);
}

interface StoredProfile {
  id: string;
  raw_user_meta_data: Record<string, unknown> | null;
  raw_app_meta_data: Record<string, unknown> | null;
}

export async function findPublicProfiles(userIds: string[]): Promise<Map<string, ProfileState>> {
  const profiles = new Map<string, ProfileState>();
  if (!userIds.length) return profiles;
  const { rows } = await sql<StoredProfile>`
    select id::text as id, raw_user_meta_data, raw_app_meta_data
    from auth.users where id = any(${userIds}::uuid[])
  `.execute(getDb());
  for (const row of rows) {
    const profile = readState(row.raw_user_meta_data?.display_name, row.raw_app_meta_data);
    profiles.set(row.id, { ...profile, displayName: profile.displayName.trim() || 'Anonymous' });
  }
  return profiles;
}
