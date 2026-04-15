import { useRef, useState, useEffect, useCallback } from "react";
import type { WordDefinition } from "../../results/hooks/useDefinition";

interface DefinitionAreaProps {
  word: string;
  definition: WordDefinition | null;
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
    setNeedsTruncation(el.scrollHeight > TRUNCATION_HEIGHT);
  }, []);

  useEffect(() => {
    checkTruncation();
  }, [checkTruncation, definition]);

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
          {definition ? (
            <>
              {definition.phonetic && (
                <div className="not-italic text-[11px] mb-1" style={{ opacity: 0.7 }}>
                  {definition.phonetic}
                </div>
              )}
              {definition.meanings.map((meaning, i) => (
                <div key={i} className="mb-1.5">
                  <span className="not-italic text-[11px]" style={{ opacity: 0.7 }}>
                    {meaning.partOfSpeech}
                  </span>
                  <ol className="mt-0.5 pl-[18px] not-italic">
                    {meaning.definitions.map((def, j) => (
                      <li key={j} className="mb-0.5 italic">
                        {def.definition}
                        {def.example && (
                          <span className="block not-italic text-[11px] mt-px" style={{ opacity: 0.6 }}>
                            "{def.example}"
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </>
          ) : (
            <span style={{ opacity: 0.6 }}>No definition available for "{word}".</span>
          )}
        </div>
      </div>

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
