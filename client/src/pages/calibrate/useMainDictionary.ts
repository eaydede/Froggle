import { useEffect, useState } from 'react';
import { fetchDictionary, fetchCommonWords } from '../../shared/calibration/dictionaries';
import { buildPrefixSet } from '../../shared/calibration/solver';

export interface MainDictionary {
  dict: Set<string> | null;
  prefixes: Set<string> | null;
  common: Set<string> | null;
  loading: boolean;
  error: string | null;
}

// Loads enable1.txt + mit10k.txt on the main thread for synchronous use
// in the test-board panel: word validation, full-board solver runs, and
// "common word" highlighting. The worker maintains its own copy independently;
// the browser cache dedupes the network round-trips.
export function useMainDictionary(): MainDictionary {
  const [state, setState] = useState<MainDictionary>({ dict: null, prefixes: null, common: null, loading: true, error: null });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const dict = await fetchDictionary();
        const prefixes = buildPrefixSet(dict);
        const common = await fetchCommonWords(dict);
        if (!cancelled) setState({ dict, prefixes, common, loading: false, error: null });
      } catch (err) {
        if (!cancelled) setState({ dict: null, prefixes: null, common: null, loading: false, error: (err as Error).message });
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return state;
}
