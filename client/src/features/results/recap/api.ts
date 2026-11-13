import { useEffect, useState } from 'react';
import type { ResultsInsights, ResultsSource } from 'models/results';
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
