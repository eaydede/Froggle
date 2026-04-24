import { useState } from 'react';
import { useDefinition } from '../hooks/useDefinition';
import { WordDefinitionSheet } from './WordDefinitionSheet';
import { abbreviatePartOfSpeech } from '../utils/partOfSpeech';

interface WordDefinitionPanelProps {
  word: string;
}

/**
 * Compact card that teases the headword and the first sense's definition
 * (3 lines clamped), with a chevron that opens the full WordDefinitionSheet
 * for the user to read the entire entry. Fixed height so it sits neatly
 * beneath the mini-board without pushing the page layout around when the
 * fetch lands.
 */
export function WordDefinitionPanel({ word }: WordDefinitionPanelProps) {
  const { definition, loading } = useDefinition(word);
  const [sheetOpen, setSheetOpen] = useState(false);

  const firstMeaning = definition?.meanings[0];
  const firstDefinition = firstMeaning?.definitions[0]?.definition;
  const headword = definition?.word ?? word.toLowerCase();
  const posLabel = firstMeaning ? abbreviatePartOfSpeech(firstMeaning.partOfSpeech) : null;
  const previewText = loading && !definition
    ? 'Looking up…'
    : firstDefinition ?? 'Definition not available.';

  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        aria-label={`Show definition of ${headword}`}
        className="relative w-full h-[92px] shrink-0 rounded-lg bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] px-2.5 py-2 pr-[22px] cursor-pointer hover:-translate-y-px hover:border-[var(--ink-border)] hover:shadow-[var(--shadow-card-hover)] transition-[transform,border-color,box-shadow] duration-200 flex flex-col gap-1 overflow-hidden text-left font-[family-name:var(--font-ui)]"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <span
          aria-hidden
          className="absolute top-2 right-2 text-[color:var(--ink-faint)] group-hover:text-[color:var(--ink-muted)] flex items-center"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </span>
        <span className="flex items-baseline gap-1.5 leading-none shrink-0">
          <span
            className="italic text-[13px] tracking-[-0.01em] text-[color:var(--ink)] font-[family-name:var(--font-display)]"
            style={{ fontWeight: 600 }}
          >
            {headword}
          </span>
          {posLabel && (
            <span
              className="italic text-[9px] text-[color:var(--ink-soft)] font-[family-name:var(--font-display)]"
              style={{ fontWeight: 500 }}
            >
              {posLabel}
            </span>
          )}
        </span>
        <span
          className="text-[10px] leading-[1.4] text-[color:var(--ink-muted)] overflow-hidden"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            textOverflow: 'ellipsis',
          }}
        >
          {previewText}
        </span>
      </button>

      <WordDefinitionSheet
        open={sheetOpen}
        word={word}
        definition={definition}
        loading={loading}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
