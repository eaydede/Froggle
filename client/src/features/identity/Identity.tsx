import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../../platform/supabase';

interface Identity { session: Session | null; authReady: boolean; }
const Context = createContext<Identity | null>(null);
let bootstrap: Promise<Session | null> | null = null;

function restoreIdentity(): Promise<Session | null> {
  if (!bootstrap) {
    bootstrap = supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) throw error;
      if (data.session) return data.session;
      const anonymous = await supabase.auth.signInAnonymously();
      if (anonymous.error) throw anonymous.error;
      return anonymous.data.session;
    }).finally(() => { bootstrap = null; });
  }
  return bootstrap;
}

export function IdentityProvider({ children }: { children: ReactNode; }) {
  const [identity, setIdentity] = useState<Identity>({ session: null, authReady: false });
  useEffect(() => {
    let current = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (current) setIdentity(previous => ({ ...previous, session }));
    });
    restoreIdentity().then(session => {
      if (current) setIdentity({ session, authReady: true });
    }).catch(error => {
      console.warn('Could not restore player identity:', error);
      if (current) setIdentity({ session: null, authReady: true });
    });
    return () => { current = false; subscription.unsubscribe(); };
  }, []);
  return <Context.Provider value={identity}>{children}</Context.Provider>;
}

export function useIdentity() {
  const value = useContext(Context);
  if (!value) throw new Error('IdentityProvider is missing');
  return value;
}
