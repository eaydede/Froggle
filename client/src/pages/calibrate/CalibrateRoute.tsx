import { useState } from 'react';
import { defaultPoolConfig } from '../../shared/calibration/pool';
import type { PoolConfig } from '../../shared/calibration/types';
import { useCalibration } from './useCalibration';
import { WeightsPanel } from './components/WeightsPanel';
import { MetricsPanel } from './components/MetricsPanel';
import { TestBoardPanel } from './components/TestBoardPanel';

export const CalibrateRoute = () => {
  const [config, setConfig] = useState<PoolConfig>(() => defaultPoolConfig());
  const [size, setSize] = useState<number>(4);
  const [nBoards, setNBoards] = useState<number>(200);
  const { state, run } = useCalibration();

  const isReady = state.status === 'ready' || state.status === 'running';
  const progressPct = state.progress ? Math.round((state.progress.done / Math.max(1, state.progress.total)) * 100) : 0;

  return (
    <div className="flex flex-col gap-4 py-2">
      <header className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold m-0">Letter pool test bench</h1>
          <p className="text-sm text-[color:var(--text-muted)] m-0 mt-0.5">
            Tune weights, run calibrations, play boards — all client-side, all dev-only.
          </p>
        </div>
        <div className="text-xs text-[color:var(--text-muted)]">
          {state.status === 'init' && 'Loading dictionaries…'}
          {state.status === 'ready' && state.output == null && `Dict ${state.dictSize.toLocaleString()} · MIT-10k ∩ ${state.commonSize.toLocaleString()}`}
          {state.status === 'ready' && state.output != null && `Last run: ${state.output.nBoards} boards × ${state.output.combos.length} combos`}
          {state.status === 'running' && state.progress && `Running… ${state.progress.label} (${progressPct}%)`}
          {state.status === 'error' && <span className="text-red-600">Error: {state.error}</span>}
        </div>
      </header>

      {state.status === 'running' && (
        <div className="h-1 w-full bg-[color:var(--track)] rounded-full overflow-hidden">
          <div className="h-full bg-[color:var(--accent)] transition-all duration-150" style={{ width: `${progressPct}%` }} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <WeightsPanel
          config={config}
          onChange={setConfig}
          size={size}
          onSizeChange={setSize}
          nBoards={nBoards}
          onNBoardsChange={setNBoards}
          onRun={() => run(config, nBoards)}
          canRun={isReady && state.status !== 'running'}
        />

        <div className="flex flex-col gap-4 min-w-0">
          <TestBoardPanel size={size} config={config} dictReady={state.status === 'ready' || state.status === 'running'} />
          <MetricsPanel output={state.output} />
        </div>
      </div>
    </div>
  );
};
