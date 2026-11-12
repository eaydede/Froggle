export function readSetting(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function writeSetting(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* Preferences still work without browser storage. */ }
}
