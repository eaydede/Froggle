import { API_URL, sessionHeaders } from '../../platform/http';


export interface ProfileResponse {
  display_name: string;
  public_name: string;
  is_marked: boolean;
  is_locked: boolean;
  locked_until: string | null;
  mask_name: string;
  strikes: number;
}

export const fetchProfile = async (): Promise<ProfileResponse> => {
  const response = await fetch(`${API_URL}/user/profile`, {
    headers: await sessionHeaders(),
  });
  return response.json();
};

export type UpdateProfileResult =
  | { ok: true; profile: ProfileResponse }
  | { ok: false; reason: 'locked'; lockedUntil: string | null }
  | { ok: false; reason: 'unknown' };

export const updateProfile = async (displayName: string): Promise<UpdateProfileResult> => {
  const response = await fetch(`${API_URL}/user/profile`, {
    method: 'PUT',
    headers: await sessionHeaders(),
    body: JSON.stringify({ display_name: displayName }),
  });
  if (response.ok) {
    return { ok: true, profile: await response.json() };
  }
  if (response.status === 403) {
    const body = await response.json().catch(() => ({}));
    return { ok: false, reason: 'locked', lockedUntil: body?.locked_until ?? null };
  }
  return { ok: false, reason: 'unknown' };
};
