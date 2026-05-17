import { useEffect, useRef, useState } from 'react';
import { submitFeedback } from '../../../shared/api/gameApi';

const MAX_LENGTH = 2000;

type Phase = 'idle' | 'submitting' | 'success' | 'error';

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open && phase === 'idle') {
      // Focus on next tick so the modal mount animation doesn't get
      // interrupted by the keyboard popping on mobile.
      const t = setTimeout(() => textareaRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, phase]);

  const handleOpen = () => {
    setMessage('');
    setPhase('idle');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (trimmed.length === 0 || phase === 'submitting') return;
    setPhase('submitting');
    const result = await submitFeedback(trimmed);
    setPhase(result.ok ? 'success' : 'error');
  };

  const canSubmit = message.trim().length > 0 && phase !== 'submitting';

  return (
    <>
      <div className="flex justify-center mt-4">
        <button
          type="button"
          onClick={handleOpen}
          className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-caption uppercase tracking-[0.12em] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)] px-3 py-2"
          style={{ fontWeight: 600, WebkitTapHighlightColor: 'transparent' }}
        >
          <FeedbackIcon />
          Send feedback
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md font-[family-name:var(--font-ui)]"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-label="Send feedback"
        >
          <div
            className="w-full max-w-[340px] rounded-2xl bg-[var(--surface-card)] shadow-[var(--shadow-card)] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex flex-col items-center pt-6 pb-4 px-6 border-b border-[var(--ink-border-subtle)]">
              <div
                className="text-title italic leading-none tracking-[-0.01em] font-[family-name:var(--font-display)] text-[color:var(--ink)]"
                style={{ fontWeight: 600 }}
              >
                {phase === 'success' ? 'Thanks!' : 'Send feedback'}
                <span className="inline-block w-[5px] h-[5px] rounded-full bg-[var(--logo-dot)] ml-[2px] align-baseline mb-[3px]" />
              </div>
            </header>

            {phase === 'success' ? (
              <div className="px-6 py-6 flex flex-col items-center gap-2">
                <p className="text-body text-[color:var(--ink-muted)] text-center leading-relaxed">
                  Your feedback was sent, thank you!
                </p>
              </div>
            ) : (
              <div className="px-6 py-5 flex flex-col gap-3">
                <p className="text-small text-[color:var(--ink-soft)] leading-relaxed">
                  I'd love to hear your feedback! If you have ideas or issues (or compliments) leave 'em here!
                </p>
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
                  disabled={phase === 'submitting'}
                  placeholder="What's on your mind?"
                  rows={5}
                  className="w-full resize-none rounded-xl border border-[var(--ink-border-subtle)] bg-[var(--surface-panel)] text-[color:var(--ink)] placeholder:text-[color:var(--ink-faint)] text-body px-3 py-2.5 outline-none focus:border-[color:var(--ink-border)]"
                  style={{ fontWeight: 400 }}
                />
                {phase === 'error' && (
                  <p className="text-caption text-[color:var(--rarity-legendary)] leading-relaxed">
                    Couldn&apos;t send that — try again in a moment.
                  </p>
                )}
              </div>
            )}

            <div className="px-6 py-4 border-t border-[var(--ink-border-subtle)] flex gap-2">
              {phase === 'success' ? (
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded-xl py-3 text-sm border-none cursor-pointer bg-[var(--ink)] text-[color:var(--ink-inverse)] shadow-[var(--shadow-btn-primary)]"
                  style={{ fontWeight: 700, WebkitTapHighlightColor: 'transparent' }}
                >
                  Close
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={phase === 'submitting'}
                    className="flex-1 rounded-xl py-3 text-sm border border-[var(--ink-border-subtle)] cursor-pointer bg-transparent text-[color:var(--ink-muted)] disabled:opacity-50"
                    style={{ fontWeight: 600, WebkitTapHighlightColor: 'transparent' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="flex-1 rounded-xl py-3 text-sm border-none cursor-pointer bg-[var(--ink)] text-[color:var(--ink-inverse)] shadow-[var(--shadow-btn-primary)] disabled:opacity-50"
                    style={{ fontWeight: 700, WebkitTapHighlightColor: 'transparent' }}
                  >
                    {phase === 'submitting' ? 'Sending…' : 'Send'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FeedbackIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}
