import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { readSetting, writeSetting } from '../../platform/storage';

type Theme = 'light' | 'dark';
interface Preferences {
  theme: Theme;
  muted: boolean;
  toggleTheme: () => void;
  toggleMute: () => void;
}
const Context = createContext<Preferences | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode; }) {
  const [theme, setTheme] = useState<Theme>(() => readSetting('froggle-theme') === 'dark' ? 'dark' : 'light');
  const [muted, setMuted] = useState(() => readSetting('froggle-muted') === 'true');
  const toggleTheme = useCallback(() => setTheme(previous => {
    const next = previous === 'light' ? 'dark' : 'light';
    writeSetting('froggle-theme', next);
    return next;
  }), []);
  const toggleMute = useCallback(() => setMuted(previous => {
    writeSetting('froggle-muted', String(!previous));
    return !previous;
  }), []);
  const value = useMemo(() => ({ theme, muted, toggleTheme, toggleMute }), [theme, muted, toggleTheme, toggleMute]);
  return <Context.Provider value={value}><div data-theme={theme} className="contents">{children}</div></Context.Provider>;
}

export function usePreferences() {
  const value = useContext(Context);
  if (!value) throw new Error('PreferencesProvider is missing');
  return value;
}
