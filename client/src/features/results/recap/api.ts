import { useEffect, useState } from 'react';
import type { ResultsInsights, ResultsSource, ResultsWordDifficulties } from 'models/results';
import { API_URL, getJson } from '../../../platform/http';

export function useResultsInsights(source?: ResultsSource, provided?: ResultsInsights) {
  const key = source ? JSON.stringify(source) : '';
  const [state, setState] = useState<{ key: string; data: ResultsInsights | null; error: boolean }>(
    { key: '', data: null, error: false },
  );
  useEffect(() => {
    if (!key || provided) return;
    let active = true;
    const params = new URLSearchParams(JSON.parse(key));
    getJson<ResultsInsights>(`${API_URL}/results/insights?${params}`, { auth: true })
      .then((data) => {
        if (active) setState({ key, data, error: false });
      })
      .catch(() => {
        if (active) setState({ key, data: null, error: true });
      });
    return () => {
      active = false;
    };
  }, [key, provided]);
  return {
    insights: provided ?? (state.key === key ? state.data : null),
    error: state.key === key && state.error,
    loading: !!key && !provided && state.key !== key,
  };
}

/** Fetch only after the player asks, and reuse ratings while this result stays open. */
export function useResultsDifficulties(
  source: ResultsSource | undefined,
  enabled: boolean,
  provided?: Record<string, number>,
) {
  const key = source ? JSON.stringify(source) : '';
  const [state, setState] = useState<{
    key: string; data: Record<string, number> | null; error: boolean;
  }>({ key: '', data: null, error: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled || !key || provided || (state.key === key && state.data)) return;
    let active = true;
    setState({ key, data: null, error: false });
    const params = new URLSearchParams(JSON.parse(key));
    getJson<ResultsWordDifficulties>(`${API_URL}/results/word-difficulties?${params}`, { auth: true })
      .then(result => { if (active) setState({ key, data: result.difficulties, error: false }); })
      .catch(() => { if (active) setState({ key, data: null, error: true }); });
    return () => { active = false; };
  }, [key, enabled, provided, attempt]);
  const data = provided ?? (state.key === key ? state.data : null);
  const error = enabled && !provided && (!key || (state.key === key && state.error));
  return {
    data,
    error,
    loading: enabled && !data && !error,
    retry: () => {
      setState({ key: '', data: null, error: false });
      setAttempt(value => value + 1);
    },
  };
}
