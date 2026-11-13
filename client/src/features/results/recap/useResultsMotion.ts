import { useLayoutEffect, useRef } from 'react';
import type { ResultsTab } from './ResultsTabs';
const order: ResultsTab[] = ['recap', 'highlights'];
interface ComparisonSnapshot {
  element: HTMLElement;
  scrollPositions: number[];
}

export function useResultsMotion(view: ResultsTab, run: boolean, opponentId: string | null) {
  const body = useRef<HTMLDivElement>(null);
  const comparisonLayer = useRef<HTMLDivElement>(null);
  const comparisonSnapshot = useRef<ComparisonSnapshot | null>(null);
  const oldOpponent = useRef(opponentId);
  const oldView = useRef(view);
  const snapshot = useRef<Map<string, number> | null>(null);
  const captureRows = () => {
    snapshot.current = new Map(
      [...body.current!.querySelectorAll<HTMLElement>('[data-flip]')].map((el) => [
        el.dataset.flip!,
        el.getBoundingClientRect().top,
      ]),
    );
  };
  const captureComparison = () => {
    const el = body.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const element = el.cloneNode(true) as HTMLElement;
    // The outgoing visual must not duplicate accessible controls or IDs.
    element.setAttribute('aria-hidden', 'true');
    element.setAttribute('inert', '');
    element.removeAttribute('id');
    element.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
    comparisonSnapshot.current = {
      element,
      scrollPositions: [...el.querySelectorAll<HTMLElement>('.results-scroll')].map(
        (row) => row.scrollTop,
      ),
    };
  };
  useLayoutEffect(() => {
    const el = body.current;
    if (oldOpponent.current !== opponentId) {
      const list = el?.querySelector<HTMLElement>('.recap-words');
      if (list) list.scrollTop = 0;
    }
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      oldView.current = view;
      oldOpponent.current = opponentId;
      comparisonSnapshot.current = null;
      snapshot.current = null;
      return;
    }
    const animations: Animation[] = [];
    const outgoing = comparisonSnapshot.current;
    if (oldOpponent.current !== opponentId && outgoing && comparisonLayer.current) {
      comparisonLayer.current.replaceChildren(outgoing.element);
      outgoing.element
        .querySelectorAll<HTMLElement>('.results-scroll')
        .forEach((scroller, index) => {
          scroller.scrollTop = outgoing.scrollPositions[index];
        });
      const timing = { duration: 220, easing: 'cubic-bezier(.2,.7,.2,1)' };
      animations.push(
        el.animate(
          [
            { opacity: 0, transform: 'translateY(4px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          timing,
        ),
      );
      const fade = outgoing.element.animate(
        [
          { opacity: 1, transform: 'translateY(0)' },
          { opacity: 0, transform: 'translateY(-4px)' },
        ],
        timing,
      );
      fade.addEventListener('finish', () => outgoing.element.remove(), { once: true });
      animations.push(fade);
    } else if (oldView.current !== view) {
      const direction = order.indexOf(view) > order.indexOf(oldView.current) ? 1 : -1;
      animations.push(
        el.animate(
          [
            { opacity: 0, transform: `translateX(${14 * direction}px)` },
            { opacity: 1, transform: 'translateX(0)' },
          ],
          { duration: 220, easing: 'cubic-bezier(.2,.7,.2,1)' },
        ),
      );
    } else if (snapshot.current) {
      const viewport = el.querySelector('.recap-words')?.getBoundingClientRect();
      el.querySelectorAll<HTMLElement>('[data-flip]').forEach((row) => {
        const rect = row.getBoundingClientRect();
        if (viewport && (rect.bottom < viewport.top - 40 || rect.top > viewport.bottom + 40))
          return;
        const old = snapshot.current!.get(row.dataset.flip!);
        animations.push(
          row.animate(
            old === undefined
              ? [{ opacity: 0 }, { opacity: 1 }]
              : [{ transform: `translateY(${old - rect.top}px)` }, { transform: 'translateY(0)' }],
            {
              duration: old === undefined ? 220 : 340,
              delay: old === undefined ? 120 : 0,
              fill: 'backwards',
              easing: 'cubic-bezier(.2,.7,.2,1)',
            },
          ),
        );
      });
      const chart = el.querySelector('.recap-chart');
      if (run && chart)
        animations.push(
          chart.animate(
            [
              { opacity: 0, transform: 'translateY(-4px)' },
              { opacity: 1, transform: 'translateY(0)' },
            ],
            { duration: 260 },
          ),
        );
    }
    snapshot.current = null;
    comparisonSnapshot.current = null;
    oldView.current = view;
    oldOpponent.current = opponentId;
    return () => {
      animations.forEach((animation) => animation.cancel());
      outgoing?.element.remove();
    };
  }, [view, run, opponentId]);
  return { body, comparisonLayer, captureRows, captureComparison };
}
