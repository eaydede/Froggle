import { useEffect } from 'react';
import { useTimedDaily } from '../features/timed-daily/TimedDaily';
import { useZenDaily } from '../features/zen/ZenDaily';
import { useRunActivity } from '../platform/lifecycle/RunActivity';

export function FreshnessCoordinator() {
  const { refreshPuzzle: refreshTimed } = useTimedDaily();
  const { refreshPuzzle: refreshZen } = useZenDaily();
  const { isActive } = useRunActivity();
  useEffect(() => {
    let mounted = true;
    let initialBuild: string | null = null;
    const readBuild = () => fetch('/api/version').then(response => response.json()).then(data => typeof data?.buildId === 'string' ? data.buildId as string : null);
    readBuild().then(build => { if (mounted) initialBuild = build; }).catch(() => { });
    const refresh = () => {
      if (document.hidden || isActive()) return;
      void refreshTimed().catch(() => { });
      void refreshZen().catch(() => { });
    };
    const checkBuild = () => {
      if (document.hidden || isActive()) return;
      refresh();
      readBuild().then(build => {
        if (mounted && !document.hidden && !isActive() && initialBuild && build && build !== initialBuild) window.location.reload();
      }).catch(() => { });
    };
    const pageShow = (event: PageTransitionEvent) => { if (event.persisted) checkBuild(); };
    document.addEventListener('visibilitychange', checkBuild);
    window.addEventListener('focus', checkBuild);
    window.addEventListener('pageshow', pageShow);
    const poll = window.setInterval(refresh, 90_000);
    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', checkBuild);
      window.removeEventListener('focus', checkBuild);
      window.removeEventListener('pageshow', pageShow);
      window.clearInterval(poll);
    };
  }, [isActive, refreshTimed, refreshZen]);
  return null;
}
