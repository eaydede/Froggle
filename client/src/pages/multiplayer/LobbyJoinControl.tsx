import { useEffect, useRef, useState } from 'react';
import { fetchMultiplayerRoom } from '../../shared/api/multiplayerApi';

interface LobbyJoinControlProps {
  /** Called with a validated, existing room code. The caller navigates
   *  to it. Validation happens here so a typo'd code surfaces inline
   *  instead of bouncing the player to a not-found page. */
  onJoin: (code: string) => void;
}

// Room codes use an unambiguous alphabet (no 0/1/I/O) and are 5 chars.
const CODE_LENGTH = 5;
const sanitize = (raw: string) =>
  raw.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, CODE_LENGTH);

// Header affordance for joining a friend's room from the lobby. Collapsed
// it's a quiet "Join a room" button next to Back; tapping it drops a small
// panel with a code field so the primary surface (your own room) stays
// uncluttered. Closes on submit, Escape, or an outside click.
export function LobbyJoinControl({ onJoin }: LobbyJoinControlProps) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const ready = code.length === CODE_LENGTH && !checking;

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  const submit = async () => {
    if (code.length !== CODE_LENGTH || checking) return;
    setChecking(true);
    setError(null);
    try {
      const room = await fetchMultiplayerRoom(code);
      if (room) {
        onJoin(code);
      } else {
        setError(`No room "${code}". Check the code and try again.`);
      }
    } catch {
      setError("Couldn't reach the server. Try again in a moment.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group flex items-center gap-1.5 bg-transparent border-0 cursor-pointer text-caption text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] transition-colors py-1.5"
        style={{ fontWeight: 600, WebkitTapHighlightColor: 'transparent' }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
        Join a room
      </button>

      {open && (
        <div
          className="lobby-card absolute right-0 top-full mt-1.5 z-20 p-3 flex flex-col gap-2"
          style={{ width: 232 }}
        >
          <span
            className="text-label-xs uppercase tracking-[0.14em] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)]"
            style={{ fontWeight: 700 }}
          >
            Enter room code
          </span>
          <div className="flex items-stretch gap-1.5">
            <input
              ref={inputRef}
              value={code}
              onChange={(e) => {
                setCode(sanitize(e.target.value));
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
                if (e.key === 'Escape') setOpen(false);
              }}
              placeholder="ABCDE"
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={!!error}
              className="flex-1 min-w-0 rounded-lg px-2 py-2 text-base text-center uppercase tabular-nums bg-[var(--surface-bg)] outline-none text-[color:var(--ink)] placeholder:text-[color:var(--ink-faint)] font-[family-name:var(--font-display)] italic"
              style={{
                fontWeight: 500,
                letterSpacing: '0.16em',
                border: `1px solid ${error ? 'var(--color-invalid)' : 'var(--ink-border-subtle)'}`,
              }}
            />
            <button
              type="button"
              onClick={submit}
              disabled={!ready}
              className="rounded-lg px-3 border-0 cursor-pointer bg-[var(--ink)] text-[color:var(--ink-inverse)] shadow-[var(--shadow-btn-primary)] hover:-translate-y-px hover:shadow-[var(--shadow-btn-primary-hover)] active:scale-[0.98] disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-[var(--shadow-btn-primary)] disabled:cursor-not-allowed transition-all"
              style={{ fontWeight: 700, fontSize: 13, WebkitTapHighlightColor: 'transparent' }}
            >
              {checking ? '…' : 'Join'}
            </button>
          </div>
          {error && (
            <span
              role="alert"
              className="text-label-xs leading-snug text-[color:var(--color-invalid)]"
              style={{ fontWeight: 600 }}
            >
              {error}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
