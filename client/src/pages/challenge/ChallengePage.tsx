import { useCallback, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Position } from 'models';
import type { FreePlayChallengeResponse, FreePlayChallengePlayer } from '../../shared/api/gameApi';
import type { ScoredWord } from '../../shared/types';
import { useShareText } from '../results/hooks/useShareText';
import { encodeGameLink } from '../../shared/utils/gameLink';
import { findWordPath } from '../../shared/utils/findWordPath';
import { InkButton } from '../../shared/components/InkButton';
import { WordsCard } from '../results/components/WordsCard';
import { WordDefinitionPanel } from '../results/components/WordDefinitionPanel';
import { ChallengeTopbar } from './components/ChallengeTopbar';
import { ChallengeHero } from './components/ChallengeHero';
import { ChallengeStandings } from './components/ChallengeStandings';
import { ChallengeBoard } from './components/ChallengeBoard';
import { ChallengePlaceholders } from './components/ChallengePlaceholders';
import { WordList, type DisplayWordRow } from './components/WordList';

interface ChallengePageProps {
  data: FreePlayChallengeResponse;
  onBack: () => void;
  onPlayAgain: () => void;
  /** Solo callers can hand back a freshly minted challenge id on share,
   *  promoting their session row server-side so the link they hand out
   *  resolves for recipients. Real challenge views skip this. */
  onShareMint?: () => Promise<string | null>;
}

export function ChallengePage({ data, onBack, onPlayAgain, onShareMint }: ChallengePageProps) {
  const me = useMemo(() => data.players.find((p) => p.isYou) ?? data.players[0], [data.players]);
  const myRank = data.players.findIndex((p) => p.sessionId === me.sessionId) + 1;

  const [searchParams] = useSearchParams();

  // ?compare=owner — sent by ResultsRoute after a challenge recipient
  // finishes, so they land in the compare view against the originator
  // without an extra tap. Resolved at mount only; the user can dismiss
  // it normally with the Stop button afterward.
  const initialCompareId = useMemo(() => {
    const compare = searchParams.get('compare');
    if (compare !== 'owner') return null;
    const owner = data.players.find((p) => p.isOwner);
    if (!owner || owner.sessionId === me.sessionId) return null;
    return owner.sessionId;
  }, [searchParams, data.players, me.sessionId]);

  const [comparingId, setComparingId] = useState<string | null>(initialCompareId);
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null);

  const opponent = useMemo(
    () => (comparingId ? data.players.find((p) => p.sessionId === comparingId) ?? null : null),
    [comparingId, data.players],
  );
  const oppRank = opponent
    ? data.players.findIndex((p) => p.sessionId === opponent.sessionId) + 1
    : null;

  // Path lookup keyed by uppercased word. Server returns paths for the
  // caller's missed words; the caller's found words and the opponent's
  // words rely on findWordPath in the engine, computed once here.
  const pathByWord = useMemo(() => buildPathMap(data, me), [data, me]);

  const highlightPath: Position[] | null = useMemo(() => {
    if (!highlightedWord) return null;
    return pathByWord.get(highlightedWord) ?? null;
  }, [highlightedWord, pathByWord]);

  // ScoredWord shape expected by WordsCard. Built lazily so we share the
  // same path map the highlight uses.
  const myFoundScored: ScoredWord[] = useMemo(
    () =>
      me.foundWords.map((w) => ({
        word: w.word,
        score: w.score,
        path: pathByWord.get(w.word.toUpperCase()) ?? [],
      })),
    [me.foundWords, pathByWord],
  );
  const myMissedScored: ScoredWord[] = useMemo(
    () =>
      data.missedWords.map((w) => ({
        word: w.word,
        score: w.score,
        path: w.path,
      })),
    [data.missedWords],
  );

  const handleHighlight = useCallback(
    (word: string | null) => {
      setHighlightedWord(word ? word.toUpperCase() : null);
    },
    [],
  );

  const handleStandingsSelect = useCallback(
    (sessionId: string) => {
      if (sessionId === me.sessionId) return;
      setComparingId((prev) => (prev === sessionId ? null : sessionId));
      setHighlightedWord(null);
    },
    [me.sessionId],
  );

  const { share, copied } = useShareText(async () => {
    // Solo views land here with a synthesized payload whose
    // `challengeId` is just the caller's session id and whose row may
    // not yet be promoted to a challenge — mint on share so recipients
    // can join. For real challenge views, onShareMint hands back the
    // already-minted id and the call is a no-op against the server.
    const challengeId = onShareMint ? await onShareMint() : data.challengeId;
    if (!challengeId || data.seed == null) {
      return 'Froggle challenge';
    }
    return `Froggle challenge — ${encodeGameLink({
      boardSize: data.config.boardSize,
      seed: data.seed,
      timer: data.config.timeLimit,
      minWordLength: data.config.minWordLength,
      challengeId,
    })}`;
  });

  // Compare-mode rows — only built when an opponent is selected.
  const youCompareRows: DisplayWordRow[] | null = useMemo(
    () => (opponent ? alignedRows(me, opponent, 'you', highlightedWord) : null),
    [opponent, me, highlightedWord],
  );
  const oppCompareRows: DisplayWordRow[] | null = useMemo(
    () => (opponent ? alignedRows(me, opponent, 'opp', highlightedWord) : null),
    [opponent, me, highlightedWord],
  );

  const scrollSync = useScrollSync(!!opponent);

  return (
    <div className="fixed inset-0 flex justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)] overflow-hidden">
      <main
        className="w-full max-w-[360px] box-border flex flex-col px-[22px] pt-[14px] pb-5"
        style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}
      >
        <ChallengeTopbar onClose={onBack} onShare={share} shareCopied={copied} />

        <ChallengeHero
          me={me}
          myRank={myRank}
          totalPlayers={data.players.length}
          opponent={opponent}
          oppRank={oppRank}
        />

        <section className="flex items-stretch shrink-0 box-border gap-3 mt-3 mb-3">
          {data.players.length > 1 && (
            <ChallengeStandings
              players={data.players}
              selectedSessionId={opponent?.sessionId ?? null}
              mySessionId={me.sessionId}
              onSelect={handleStandingsSelect}
            />
          )}
          <div className={data.players.length > 1 ? '' : 'flex-1 flex justify-center'}>
            <ChallengeBoard
              board={data.board}
              highlightPath={highlightPath}
              config={data.config}
            />
          </div>
        </section>

        <section className="flex justify-between items-stretch flex-1 min-h-0 box-border gap-3">
          <div className="w-1/2 flex flex-col min-h-0">
            {opponent && youCompareRows ? (
              <WordList
                side="you"
                headerLabel={`You · ${me.wordCount}`}
                headerTrail={String(me.points)}
                rows={youCompareRows}
                onWordTap={(w) => handleHighlight(w)}
                scrollSync={scrollSync.left}
              />
            ) : (
              <WordsCard
                foundWords={myFoundScored}
                missedWords={myMissedScored}
                showMissedTab={myMissedScored.length > 0}
                highlightedWord={highlightedWord}
                onHighlightWord={(w) => handleHighlight(w)}
              />
            )}
          </div>

          <div className="w-1/2 flex flex-col min-h-0 gap-2">
            {opponent && oppCompareRows ? (
              <WordList
                side="opp"
                headerLabel={`${opponent.displayName} · ${opponent.wordCount}`}
                headerTrail={String(opponent.points)}
                footer={{
                  label: 'Stop',
                  arrow: '›',
                  onClick: () => {
                    setComparingId(null);
                    setHighlightedWord(null);
                  },
                }}
                rows={oppCompareRows}
                onWordTap={(w) => handleHighlight(w)}
                scrollSync={scrollSync.right}
              />
            ) : (
              <ChallengePlaceholders
                variant={data.players.length === 1 ? 'share' : 'compare'}
                onShare={data.players.length === 1 ? share : undefined}
                definitionSlot={
                  highlightedWord ? <WordDefinitionPanel word={highlightedWord} fitContainer /> : undefined
                }
              />
            )}
          </div>
        </section>

        <div className="mt-3.5 flex flex-col shrink-0">
          <InkButton onClick={onPlayAgain}>
            Play again
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-200 group-hover:rotate-[-90deg]"
            >
              <path d="M1 4v6h6" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </InkButton>
        </div>
      </main>

    </div>
  );
}

function buildPathMap(
  data: FreePlayChallengeResponse,
  me: FreePlayChallengePlayer,
): Map<string, Position[]> {
  const map = new Map<string, Position[]>();
  // Caller's missed words come with paths from the server — cheap.
  for (const w of data.missedWords) map.set(w.word.toUpperCase(), w.path);
  // Caller's found words need a per-word solver pass since paths weren't
  // included in the players payload. Same for any opponent-only word the
  // user might tap in compare mode. Compute up front so the click path
  // stays cheap.
  const allWords = new Set<string>();
  for (const p of data.players) {
    for (const w of p.foundWords) allWords.add(w.word.toUpperCase());
  }
  for (const word of allWords) {
    if (map.has(word)) continue;
    const path = findWordPath(data.board, word);
    if (path) map.set(word, path);
  }
  // Touch `me` so the dependency stays explicit in the caller.
  void me;
  return map;
}

// Both lists share an identical ordering — the union of their words by
// max score — and missing entries become dashes so the rows align across
// the gap. The "unique" flag flags rows that exist only on this side.
function alignedRows(
  me: FreePlayChallengePlayer,
  opp: FreePlayChallengePlayer,
  side: 'you' | 'opp',
  highlightedWord: string | null,
): DisplayWordRow[] {
  const youMap = new Map(me.foundWords.map((w) => [w.word.toUpperCase(), w]));
  const oppMap = new Map(opp.foundWords.map((w) => [w.word.toUpperCase(), w]));
  const union = new Set<string>([...youMap.keys(), ...oppMap.keys()]);

  const entries = Array.from(union).map((word) => {
    const youWord = youMap.get(word);
    const oppWord = oppMap.get(word);
    const score = Math.max(youWord?.score ?? 0, oppWord?.score ?? 0);
    return { word, score, youWord, oppWord };
  });
  entries.sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));

  return entries.map((e) => {
    const onThisSide = side === 'you' ? e.youWord : e.oppWord;
    const onOtherSide = side === 'you' ? e.oppWord : e.youWord;
    if (!onThisSide) {
      return { key: `${side}:${e.word}`, word: null, score: e.score };
    }
    return {
      key: `${side}:${e.word}`,
      word: e.word,
      score: e.score,
      unique: !onOtherSide,
      highlighted: highlightedWord === e.word,
    };
  });
}

// Cheap two-way scroll sync. Each list registers its scroll container;
// when one scrolls, we copy its scrollTop to the other and short-circuit
// the partner's handler with a ref so we don't ping-pong forever.
function useScrollSync(active: boolean) {
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const syncingRef = useRef(false);

  const handle = (source: 'left' | 'right') => () => {
    if (!active) return;
    if (syncingRef.current) return;
    const from = source === 'left' ? leftRef.current : rightRef.current;
    const to = source === 'left' ? rightRef.current : leftRef.current;
    if (!from || !to) return;
    syncingRef.current = true;
    to.scrollTop = from.scrollTop;
    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  };

  const bind = (which: 'left' | 'right') => ({
    register: (el: HTMLDivElement | null) => {
      const ref = which === 'left' ? leftRef : rightRef;
      const prev = ref.current;
      if (prev) prev.removeEventListener('scroll', handle(which));
      ref.current = el;
      if (el) el.addEventListener('scroll', handle(which));
    },
  });

  return { left: bind('left'), right: bind('right') };
}
