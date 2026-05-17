import { useState } from 'react';

interface UseShareText {
  copied: boolean;
  share: () => void;
}

/**
 * Shares (or copies to clipboard) a block of text generated lazily at click
 * time so the caller doesn't pay the formatting cost until the user commits.
 *
 * Uses the native Web Share sheet when available, otherwise writes the text
 * to the clipboard and flips `copied` true for two seconds so the trigger
 * can show a confirmation without owning the state itself.
 *
 * `getText` may be async — the share action awaits it before dispatching
 * to the native sheet / clipboard. This lets callers mint a challenge id
 * server-side on click without forcing it eagerly on every results render.
 */
export function useShareText(getText: () => string | Promise<string>): UseShareText {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const text = await getText();
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
      return;
    }
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        prompt('Copy results:', text);
      });
  };

  return { copied, share };
}
