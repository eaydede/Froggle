import { useEffect, useRef, useState } from 'react';
import { copyToClipboard } from '../../../platform/clipboard';

export function useShareText(getText: () => string | Promise<string>) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const share = async () => {
    const text = await getText();
    if (navigator.share) {
      await navigator.share({ text }).catch(() => {});
      return;
    }
    if (await copyToClipboard(text)) {
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } else prompt('Copy results:', text);
  };
  return { copied, share };
}
