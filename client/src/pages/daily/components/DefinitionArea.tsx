import { useRef, useState, useEffect, useCallback } from "react";

interface DefinitionAreaProps {
  word: string;
  definition: string;
  expanded: boolean;
  onExpandChange: (expanded: boolean) => void;
  /** Override the text & chevron color. Defaults to var(--text-muted). */
  color?: string;
}

/** Max height in px before truncation kicks in (~2 lines at 12px/1.5 leading) */
const TRUNCATION_HEIGHT = 55;

export function DefinitionArea({
  word,
  definition,
  expanded,
  onExpandChange,
  color = "var(--text-muted)",
}: DefinitionAreaProps) {
  const textRef = useRef<HTMLDivElement>(null);
  const [needsTruncation, setNeedsTruncation] = useState(false);

  const checkTruncation = useCallback(() => {
    const el = textRef.current;
    if (!el) return;

    // scrollHeight reports the full content height even when
    // overflow is hidden, so no need to temporarily remove constraints.
    setNeedsTruncation(el.scrollHeight > TRUNCATION_HEIGHT);
  }, []);

  // Re-check when definition text changes
  useEffect(() => {
    checkTruncation();
  }, [checkTruncation, definition]);

  // Re-check when the container resizes (e.g. carousel sets card width after
  // initial render). This replaces a window resize listener so it fires any
  // time the text element's layout width actually changes.
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      checkTruncation();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [checkTruncation]);

  function handleToggle() {
    onExpandChange(!expanded);
  }

  const isTruncated = needsTruncation && !expanded;

  return (
    <div className="min-h-[62px]">
      {/* Definition text with conditional truncation */}
      <div className="relative">
        <div
          ref={textRef}
          className="text-xs italic leading-relaxed"
          style={{
            fontFamily: "var(--font-serif)",
            color,
            maxHeight: isTruncated ? `${TRUNCATION_HEIGHT}px` : "none",
            overflow: isTruncated ? "hidden" : "visible",
            ...(isTruncated
              ? {
                  maskImage:
                    "linear-gradient(to bottom, black 40%, transparent 100%)",
                  WebkitMaskImage:
                    "linear-gradient(to bottom, black 40%, transparent 100%)",
                }
              : {}),
          }}
        >
          {definition}
        </div>
      </div>

      {/* Expand/collapse chevron — only rendered when definition overflows */}
      {needsTruncation && (
        <button
          type="button"
          data-chevron-btn
          className="flex justify-center w-full pt-1 cursor-pointer relative z-20 bg-transparent border-none outline-none p-0"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            {expanded ? (
              <path d="M4 10l4-4 4 4" />
            ) : (
              <path d="M4 6l4 4 4-4" />
            )}
          </svg>
        </button>
      )}
    </div>
  );
}