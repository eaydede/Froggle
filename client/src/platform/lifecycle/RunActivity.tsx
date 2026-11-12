import { createContext, useContext, useRef, type ReactNode } from 'react';

export function createRunRegistry() {
  const runs = new Set<symbol>();
  return {
    isActive: () => runs.size > 0,
    registerActiveRun: () => {
      const token = Symbol('active run');
      runs.add(token);
      return () => { runs.delete(token); };
    },
  };
}
const Context = createContext<ReturnType<typeof createRunRegistry> | null>(null);

export function RunActivityProvider({ children }: { children: ReactNode; }) {
  const registry = useRef<ReturnType<typeof createRunRegistry>>();
  if (!registry.current) registry.current = createRunRegistry();
  return <Context.Provider value={registry.current}>{children}</Context.Provider>;
}

export function useRunActivity() {
  const value = useContext(Context);
  if (!value) throw new Error('RunActivityProvider is missing');
  return value;
}
