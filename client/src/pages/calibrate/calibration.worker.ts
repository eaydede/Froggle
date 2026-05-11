/// <reference lib="webworker" />

import {
  buildSampler,
  generateBoardFromThreePools,
  generateBaselineDiceBoard,
} from '../../shared/calibration/pool';
import type { Sampler } from '../../shared/calibration/pool';
import { buildPrefixSet } from '../../shared/calibration/solver';
import {
  COMBOS,
  comboKey,
  computeDiversity,
  runOnBoards,
} from '../../shared/calibration/metrics';
import {
  fetchDictionary,
  fetchCommonWords,
  commonByLengthBucket,
} from '../../shared/calibration/dictionaries';
import type {
  CalibrationOutput,
  CandidateRun,
  PoolConfig,
  RunRequest,
  WorkerMessage,
} from '../../shared/calibration/types';

declare const self: DedicatedWorkerGlobalScope;

let dict: Set<string> | null = null;
let prefixes: Set<string> | null = null;
let common: Set<string> | null = null;
let commonByBucket: Record<string, number> | null = null;

function post(msg: WorkerMessage): void {
  self.postMessage(msg);
}

async function init(): Promise<void> {
  dict = await fetchDictionary();
  prefixes = buildPrefixSet(dict);
  common = await fetchCommonWords(dict);
  commonByBucket = commonByLengthBucket(common);
  post({ type: 'ready', dictSize: dict.size, commonSize: common.size });
}

function buildCandidateGenerator(name: 'baseline_dice' | 'current', config: PoolConfig) {
  if (name === 'baseline_dice') {
    return (size: number) => generateBaselineDiceBoard(size);
  }
  const v: Sampler = buildSampler(config.vowel);
  const b: Sampler = buildSampler(config.backbone);
  const o: Sampler = buildSampler(config.other);
  return (size: number) => {
    const q = config.quotasBySize[size] ?? { V: 0, B: 0, O: size * size };
    return generateBoardFromThreePools(size, v, b, o, q.V, q.B);
  };
}

function runCalibration(req: RunRequest): void {
  if (!dict || !prefixes || !common || !commonByBucket) {
    post({ type: 'error', message: 'Worker not initialised' });
    return;
  }
  const candidates: Array<{ name: 'baseline_dice' | 'current' }> = [
    { name: 'baseline_dice' },
    { name: 'current' },
  ];
  const total = candidates.length * COMBOS.length;
  let i = 0;
  const candidateRuns: CandidateRun[] = [];
  for (const { name } of candidates) {
    const generator = buildCandidateGenerator(name, req.config);
    const perCombo: CandidateRun['perCombo'] = {};
    for (const combo of COMBOS) {
      const key = comboKey(combo.size, combo.minLen);
      post({ type: 'progress', candidate: name, comboKey: key, comboIndex: i, comboTotal: total });
      const result = runOnBoards(generator, combo.size, combo.minLen, dict, prefixes, common, req.nBoards);
      const diversity: Record<string, ReturnType<typeof computeDiversity>> = {};
      for (const bucket of ['4', '5', '6', '7+']) {
        diversity[bucket] = computeDiversity(result, common, commonByBucket, bucket);
      }
      perCombo[key] = { result, diversity };
      i++;
    }
    candidateRuns.push({ name, perCombo });
  }
  const output: CalibrationOutput = {
    candidates: candidateRuns,
    commonByBucket,
    combos: COMBOS,
    nBoards: req.nBoards,
  };
  post({ type: 'result', output });
}

self.onmessage = (event: MessageEvent) => {
  const data = event.data as RunRequest;
  if (data.type === 'run') runCalibration(data);
};

init().catch((err: Error) => post({ type: 'error', message: err.message }));
