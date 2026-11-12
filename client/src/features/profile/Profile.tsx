import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useIdentity } from '../identity/Identity';
import { fetchProfile, updateProfile, type ProfileResponse } from './api';

function usePlayerProfile() {
  const { authReady, session } = useIdentity();
  const [nameProfile, setProfile] = useState<ProfileResponse | null>(null);
  const [profileReady, setReady] = useState(false);
  useEffect(() => {
    if (!authReady) return;
    let current = true;
    setReady(false);
    fetchProfile().then(profile => { if (current) setProfile(profile); })
      .catch(() => { }).finally(() => { if (current) setReady(true); });
    return () => { current = false; };
  }, [authReady, session?.user.id]);
  const updateDisplayName = useCallback(async (name: string) => {
    const result = await updateProfile(name);
    if (result.ok) setProfile(result.profile);
    return result;
  }, []);
  return useMemo(() => ({
    nameProfile, profileReady, updateDisplayName,
    displayName: nameProfile?.display_name || 'Anonymous',
  }), [nameProfile, profileReady, updateDisplayName]);
}
const Context = createContext<ReturnType<typeof usePlayerProfile> | null>(null);
export function ProfileProvider({ children }: { children: ReactNode; }) {
  const profile = usePlayerProfile();
  return <Context.Provider value={profile}>{children}</Context.Provider>;
}
export function useProfile() {
  const value = useContext(Context);
  if (!value) throw new Error('ProfileProvider is missing');
  return value;
}
