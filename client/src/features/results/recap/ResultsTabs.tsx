import { useLayoutEffect, useRef, useState } from 'react';
export type ResultsTab = 'recap' | 'highlights';
const tabs: ResultsTab[] = ['recap', 'highlights'];

export function ResultsTabs({
  view,
  onView,
  run,
  onRun,
  canRun,
  comparing,
  onExit,
  meta,
}: {
  view: ResultsTab;
  onView: (tab: ResultsTab) => void;
  run: boolean;
  onRun: (run: boolean) => void;
  canRun: boolean;
  comparing: boolean;
  onExit: () => void;
  meta: string;
}) {
  const group = useRef<HTMLDivElement>(null);
  const [underline, setUnderline] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    let active = true;
    const measure = () => {
      const el = group.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
      if (active && el) setUnderline({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    void document.fonts.ready.then(measure);
    const observer = new ResizeObserver(measure);
    if (group.current) observer.observe(group.current);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [view]);
  return (
    <div className="results-view-row">
      <div ref={group} className="results-tabs" role="tablist" aria-label="Results views">
        {tabs.map((tab) => (
          <button
            type="button"
            id={`results-tab-${tab}`}
            role="tab"
            aria-controls="results-panel"
            aria-selected={view === tab}
            key={tab}
            onClick={() => onView(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
        <span className="results-tab-underline" style={underline} />
      </div>
      <div className="results-view-controls">
        {view === 'recap' ? (
          <>
            <button
              type="button"
              className={`results-circle ${!run ? 'active' : ''}`}
              aria-label="Word list"
              aria-pressed={!run}
              onClick={() => onRun(false)}
            >
              <svg viewBox="0 0 24 24">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              type="button"
              className={`results-circle ${run ? 'active' : ''}`}
              aria-label="Your run"
              aria-pressed={run}
              disabled={!canRun}
              title={!canRun ? 'Find times are unavailable for this game' : undefined}
              onClick={() => onRun(true)}
            >
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </button>
          </>
        ) : (
          !comparing && <span className="results-meta">{meta}</span>
        )}
        {comparing && (
          <button
            type="button"
            className="results-circle exit"
            aria-label="Stop comparing"
            onClick={onExit}
          >
            <svg viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
