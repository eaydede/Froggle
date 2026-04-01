import { useState, useCallback, useRef } from "react";

/**
 * Returns a shake key and a trigger function.
 * Each call to trigger() increments the key, which can be used
 * to re-trigger a CSS animation on a container element.
 */
export function useDisabledShake() {
  const [shakeKey, setShakeKey] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerShake = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShakeKey((k) => k + 1);
    timeoutRef.current = setTimeout(() => setShakeKey(0), 300);
  }, []);

  const shakeStyle: React.CSSProperties | undefined =
    shakeKey > 0 ? { animation: "disabled-shake 0.3s ease" } : undefined;

  return { shakeKey, shakeStyle, triggerShake };
}
