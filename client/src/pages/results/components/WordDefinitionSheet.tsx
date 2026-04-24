import { useEffect } from 'react';
import type { WordDefinition } from '../hooks/useDefinition';
import { abbreviatePartOfSpeech } from '../utils/partOfSpeech';

interface WordDefinitionSheetProps {
  open: boolean;
  word: string;
  definition: WordDefinition | null;
  loading: boolean;
  onClose: () => void;
}

/**
 * Bottom-sheet reader for a word's full dictionary entry. Slides in from
 * the bottom of the viewport, dims the page behind it, and is dismissable
 * via the close button, the scrim, or the Escape key. Renders the full
 * set of meanings (not the 3-line preview from the compact card).
 */
export function WordDefinitionSheet({
  open,
  word,
  definition,
  loading,
  onClose,
}: WordDefinitionSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={[
          'fixed inset-0 z-[150] bg-black/45 backdrop-blur-[2px] transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Definition of ${word}`}
        className={[
          'fixed inset-x-0 bottom-0 z-[160] mx-auto w-full max-w-[420px] bg-[var(--surface-card)] rounded-t-[18px] shadow-[0_-4px_24px_rgba(34,32,28,0.18),0_-1px_2px_rgba(34,32,28,0.06)] flex flex-col max-h-[72dvh] overflow-hidden transition-transform duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] font-[family-name:var(--font-ui)]',
          open ? 'translate-y-0' : 'translate-y-full pointer-events-none',
        ].join(' ')}
      >
        <div className="flex justify-center pt-2 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full bg-[var(--ink-faint)]" aria-hidden />
        </div>
        <div className="flex justify-end px-3 pb-1.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close definition"
            className="w-[26px] h-[26px] flex items-center justify-center bg-transparent border-none rounded-lg cursor-pointer text-[color:var(--ink-soft)] hover:text-[color:var(--ink)] transition-colors duration-150"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-[22px] pb-7 [scrollbar-width:thin]">
          <div className="text-center pt-1 pb-4 border-b border-[var(--ink-border-subtle)] mb-4">
            <div
              className="italic leading-none tracking-[-0.02em] text-[30px] text-[color:var(--ink)] font-[family-name:var(--font-display)] mb-2"
              style={{ fontWeight: 600 }}
            >
              {loading && !definition ? '…' : (definition?.word ?? word.toLowerCase())}
            </div>
            {definition && (definition.phonetic || definition.meanings[0]) && (
              <div className="flex items-center justify-center gap-2.5 text-[13px] italic text-[color:var(--ink-soft)] font-[family-name:var(--font-display)]">
                {definition.meanings[0] && (
                  <span>{abbreviatePartOfSpeech(definition.meanings[0].partOfSpeech)}</span>
                )}
                {definition.meanings[0] && definition.phonetic && (
                  <span
                    aria-hidden
                    className="w-[3px] h-[3px] rounded-full bg-[var(--ink-faint)]"
                  />
                )}
                {definition.phonetic && (
                  <span className="not-italic font-[family-name:var(--font-ui)] text-[color:var(--ink-soft)]">
                    {definition.phonetic}
                  </span>
                )}
              </div>
            )}
          </div>

          {loading && !definition ? (
            <div className="italic text-sm text-[color:var(--ink-soft)] text-center py-4">
              Looking up…
            </div>
          ) : definition ? (
            <div className="flex flex-col gap-5">
              {definition.meanings.map((meaning, i) => (
                <div key={`${meaning.partOfSpeech}-${i}`} className="flex flex-col gap-3">
                  {definition.meanings.length > 1 && (
                    <div
                      className="italic text-[13px] text-[color:var(--ink-soft)] font-[family-name:var(--font-display)]"
                    >
                      {meaning.partOfSpeech}
                    </div>
                  )}
                  {meaning.definitions.map((d, j) => (
                    <div key={j} className="flex flex-col gap-2.5">
                      <p className="text-[15px] leading-[1.55] text-[color:var(--ink)]">
                        {d.definition}
                      </p>
                      {d.example && (
                        <p className="italic text-[13px] leading-[1.55] text-[color:var(--ink-muted)] py-2.5 px-3.5 bg-[var(--ink-whisper)] border-l-2 border-[var(--ink-faint)] rounded-r-md font-[family-name:var(--font-display)]">
                          {d.example}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="italic text-sm text-[color:var(--ink-soft)] text-center py-4">
              Definition not available.
            </div>
          )}

          {definition && (
            <div
              className="pt-3.5 mt-4 border-t border-[var(--ink-border-subtle)] text-center italic text-[11px] text-[color:var(--ink-soft)] font-[family-name:var(--font-display)]"
            >
              From {definition.source}
              {definition.license ? ` · ${definition.license}` : ''}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
