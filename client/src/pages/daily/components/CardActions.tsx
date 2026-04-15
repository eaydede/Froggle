import { useState, useRef, useEffect } from "react";
import { Button } from "../../../shared/components/Button";

interface CardActionsProps {
  isCompleted: boolean;
  onResults: () => void;
  onLeaderboard: () => void;
  getShareText: () => Promise<string>;
}

export function CardActions({
  isCompleted,
  onResults,
  onLeaderboard,
  getShareText,
}: CardActionsProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shareOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [shareOpen]);

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  const handleNativeShare = async () => {
    try {
      const text = await getShareText();
      await navigator.share({ text });
    } catch {
      // User cancelled or share failed — nothing more to do.
    }
    setShareOpen(false);
  };

  const handleCopy = async () => {
    try {
      const text = await getShareText();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      // Revert the label after a moment; leave the popover open — the user
      // dismisses it themselves (matches ResultsPage). Auto-closing here
      // used to race with a quick reopen and flash the popover shut.
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setShareOpen(false);
    }
  };

  return (
    <div className="flex gap-1.5 mt-2">
      <div className="flex-1">
        <ActionButton label="Results" disabled={!isCompleted} onClick={onResults} />
      </div>
      <div className="flex-1">
        <ActionButton label="Leaderboard" disabled={false} onClick={onLeaderboard} />
      </div>

      <div className="flex-1 relative" ref={shareRef}>
        <ActionButton
          label="Share"
          disabled={!isCompleted}
          onClick={() => setShareOpen((v) => !v)}
        />
        {shareOpen && (
          <div className="absolute bottom-[calc(100%+6px)] right-0 bg-white border border-[#e0e0e0] rounded-[10px] shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden min-w-[170px] z-30">
            {canNativeShare && (
              <button
                type="button"
                className="flex items-center gap-2 w-full py-2.5 px-3.5 bg-transparent border-none text-[13px] font-semibold text-[#555] cursor-pointer transition-colors duration-100 text-left whitespace-nowrap hover:bg-[#f5f5f5] active:bg-[#eee]"
                style={{ WebkitTapHighlightColor: "transparent" }}
                onClick={handleNativeShare}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Share to...
              </button>
            )}
            <button
              type="button"
              className={`flex items-center gap-2 w-full py-2.5 px-3.5 bg-transparent border-none text-[13px] font-semibold text-[#555] cursor-pointer transition-colors duration-100 text-left whitespace-nowrap hover:bg-[#f5f5f5] active:bg-[#eee] ${canNativeShare ? "border-t border-t-[#f0f0f0]" : ""}`}
              style={{ WebkitTapHighlightColor: "transparent" }}
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
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy to clipboard
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface ActionButtonProps {
  label: string;
  disabled: boolean;
  onClick: () => void;
}

function ActionButton({ label, disabled, onClick }: ActionButtonProps) {
  return (
    <Button
      type="button"
      size="sm"
      className="w-full rounded-[10px] py-2.5 px-1 text-center text-xs cursor-pointer"
      style={{
        background: "var(--track)",
        color: "var(--text)",
        fontFamily: "var(--font-sans)",
        fontWeight: 600,
        opacity: disabled ? 0.3 : 1,
        cursor: disabled ? "default" : "pointer",
        pointerEvents: disabled ? "none" : "auto",
      }}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </Button>
  );
}
