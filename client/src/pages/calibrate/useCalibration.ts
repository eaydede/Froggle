import { useEffect, useRef, useState } from 'react';
import type { CalibrationOutput, PoolConfig, WorkerMessage } from '../../shared/calibration/types';

export type CalibrationStatus = 'init' | 'ready' | 'running' | 'error';

export interface CalibrationState {
  status: CalibrationStatus;
  dictSize: number;
  commonSize: number;
  output: CalibrationOutput | null;
  progress: { done: number; total: number; label: string } | null;
  error: string | null;
}

const initial: CalibrationState = {
  status: 'init',
  dictSize: 0,
  commonSize: 0,
  output: null,
  progress: null,
  error: null,
};

export function useCalibration() {
  const workerRef = useRef<Worker | null>(null);
  const [state, setState] = useState<CalibrationState>(initial);

  useEffect(() => {
    const worker = new Worker(new URL('./calibration.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const msg = event.data;
      if (msg.type === 'ready') {
        setState(s => ({ ...s, status: 'ready', dictSize: msg.dictSize, commonSize: msg.commonSize }));
      } else if (msg.type === 'progress') {
        setState(s => ({
          ...s,
          progress: { done: msg.comboIndex, total: msg.comboTotal, label: `${msg.candidate} · ${msg.comboKey}` },
        }));
      } else if (msg.type === 'result') {
        setState(s => ({ ...s, status: 'ready', output: msg.output, progress: null }));
      } else if (msg.type === 'error') {
        setState(s => ({ ...s, status: 'error', error: msg.message, progress: null }));
      }
    };
    worker.onerror = (e: ErrorEvent) => {
      setState(s => ({ ...s, status: 'error', error: e.message }));
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  function run(config: PoolConfig, nBoards: number) {
    if (!workerRef.current) return;
    setState(s => ({ ...s, status: 'running', progress: { done: 0, total: 1, label: 'starting…' } }));
    workerRef.current.postMessage({ type: 'run', config, nBoards });
  }

  return { state, run };
}
