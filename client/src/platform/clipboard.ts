// Writes text to the clipboard, falling back to a hidden-textarea +
// execCommand path when the async Clipboard API is unavailable or blocked
// (insecure origins, some in-app webviews) — the async API can resolve
// without actually writing in those contexts, which is what makes a copy
// button report success while the paste stays stale. Returns whether the
// write actually landed.
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
