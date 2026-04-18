import { useEffect, useRef, useState } from 'react';

interface ShareMenuProps {
  getText: () => string;
}

export function ShareMenu({ getText }: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const canNativeShare = !!navigator.share;

  const handleNativeShare = () => {
    navigator.share({ text: getText() }).catch(() => {});
    setOpen(false);
  };

  const handleCopy = () => {
    const text = getText();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      prompt('Copy results:', text);
    });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 py-2 px-4 text-[length:var(--text-small)] bg-transparent border border-[#ddd] rounded-md text-[#888] cursor-pointer transition-all duration-150 hover:border-[#aaa] hover:text-[#555] font-[family-name:var(--font-serif)] font-semibold"
      >
        <ShareIcon />
        Share Results
      </button>
      {open && (
        <div className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 bg-white border border-[#e0e0e0] rounded-[10px] shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden min-w-[170px] z-10">
          {canNativeShare && (
            <button
              className="flex items-center gap-2 w-full py-2.5 px-3.5 bg-transparent border-none text-[length:var(--text-small)] font-semibold text-[#555] cursor-pointer transition-colors duration-100 text-left whitespace-nowrap hover:bg-[#f5f5f5] active:bg-[#eee]"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              onClick={handleNativeShare}
            >
              <ShareIcon />
              Share to...
            </button>
          )}
          <button
            className={`flex items-center gap-2 w-full py-2.5 px-3.5 bg-transparent border-none text-[length:var(--text-small)] font-semibold text-[#555] cursor-pointer transition-colors duration-100 text-left whitespace-nowrap hover:bg-[#f5f5f5] active:bg-[#eee] ${canNativeShare ? 'border-t border-t-[#f0f0f0]' : ''}`}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy to clipboard
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
