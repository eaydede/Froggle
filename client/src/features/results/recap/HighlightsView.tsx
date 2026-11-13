import type { ResultPlayer } from 'models/results';
import { RARITY_VAR, wordRarity } from '../utils/wordRarity';

export function HighlightsView({
  players,
  selected,
  onSelect,
  onCompare,
}: {
  players: ResultPlayer[];
  selected: string | null;
  onSelect: (word: string) => void;
  onCompare: (id: string) => void;
}) {
  const words = new Map<string, { word: string; score: number; finders: ResultPlayer[] }>();
  for (const player of players)
    for (const find of player.finds) {
      const entry = words.get(find.word) ?? { ...find, finders: [] };
      entry.finders.push(player);
      words.set(find.word, entry);
    }
  const finds = [...words.values()].sort(
    (a, b) => b.score - a.score || a.word.localeCompare(b.word),
  );
  const maxLength = Math.max(0, ...finds.map((f) => f.word.length));
  const longest = finds.filter((f) => f.word.length === maxLength);
  const names = (finders: ResultPlayer[], chips = false) =>
    [...finders]
      .sort((a, b) => Number(b.isYou) - Number(a.isYou))
      .map((p, i) => (
        <span key={p.id}>
          {!chips && i > 0 && ', '}
          {p.isYou ? (
            <span className={chips ? 'finder-chip you' : 'finder-you'}>You</span>
          ) : (
            <button
              type="button"
              className={chips ? 'finder-chip' : 'finder-name'}
              onClick={(e) => {
                e.stopPropagation();
                onCompare(p.id);
              }}
            >
              {p.displayName}
            </button>
          )}
        </span>
      ));
  return (
    <div className="highlights-view">
      {longest.length > 0 ? (
        <div className="highlights-longest results-scroll">
          <div className="highlights-label">Longest {longest.length > 1 ? 'words' : 'word'}</div>
          {longest.map((f) => (
            <div className="highlights-longest-row" key={f.word}>
              <button type="button" onClick={() => onSelect(f.word)}>
                {f.word}{' '}
                <strong style={{ color: RARITY_VAR[wordRarity(f.score)] }}>+{f.score}</strong>
              </button>
              <span className="longest-finders">
                {[...f.finders]
                  .sort((a, b) => Number(b.isYou) - Number(a.isYou))
                  .map((p) => (p.isYou ? 'You' : p.displayName))
                  .join(', ')}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="results-empty">No finds yet.</p>
      )}
      <div className="highlights-divider">
        <strong>All Finds</strong>
        <span />
        <small>tap a name to compare</small>
      </div>
      <div className="results-scroll highlights-list">
        {finds.map((f) => {
          const expanded = selected === f.word && f.finders.length >= 3;
          return (
            <div
              key={f.word}
              className={`highlight-find ${f.finders.some((p) => p.isYou) ? 'yours' : ''} ${selected === f.word ? 'selected' : ''}`}
            >
              <div className="highlight-find-row" onClick={() => onSelect(f.word)}>
                <span
                  className="recap-stripe"
                  style={{ background: RARITY_VAR[wordRarity(f.score)] }}
                />
                <button
                  type="button"
                  className="highlight-word"
                  aria-pressed={selected === f.word}
                  aria-expanded={f.finders.length >= 3 ? expanded : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(f.word);
                  }}
                >
                  <strong style={{ color: RARITY_VAR[wordRarity(f.score)] }}>+{f.score}</strong>
                  <span>{f.word}</span>
                </button>
                {f.finders.length < 3 ? (
                  <div className="highlight-finders">{names(f.finders)}</div>
                ) : (
                  <button
                    type="button"
                    className="highlight-count"
                    aria-expanded={expanded}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(f.word);
                    }}
                  >
                    {f.finders.length} players{' '}
                    <span
                      style={{
                        display: 'inline-block',
                        transform: expanded ? 'rotate(180deg)' : undefined,
                        transition: 'transform .15s',
                      }}
                    >
                      ⌄
                    </span>
                  </button>
                )}
              </div>
              {expanded && <div className="finder-chips">{names(f.finders, true)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
