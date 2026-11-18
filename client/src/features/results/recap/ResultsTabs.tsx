import { useLayoutEffect, useRef, useState } from 'react';
export type ResultsTab = 'recap' | 'playback' | 'highlights';
const tabs: ResultsTab[] = ['recap', 'playback', 'highlights'];

export function ResultsTabs({
  view,
  onView,
  comparing,
  onExit,
  meta,
}: {
  view: ResultsTab;
  onView: (tab: ResultsTab) => void;
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
            tabIndex={view === tab ? 0 : -1}
            onKeyDown={event => {
              const index = tabs.indexOf(tab);
              const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
                : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
                : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null;
              if (next !== null) {
                event.preventDefault();
                onView(tabs[next]);
                group.current?.querySelectorAll<HTMLButtonElement>('[role=tab]')[next].focus();
              }
            }}
            key={tab}
            onClick={() => onView(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
        <span className="results-tab-underline" style={underline} />
      </div>
      <div className="results-view-controls">
        {view === 'highlights' && !comparing && <span className="results-meta">{meta}</span>}
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
