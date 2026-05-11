import {
  defaultPoolConfig,
  defaultVowelWeights,
  defaultBackboneWeights,
  defaultOtherWeights,
  VOWEL_LETTERS,
  BACKBONE_LETTERS,
  OTHER_LETTERS,
} from '../../../shared/calibration/pool';
import type { PoolConfig } from '../../../shared/calibration/types';

interface WeightsPanelProps {
  config: PoolConfig;
  onChange: (next: PoolConfig) => void;
  size: number;
  onSizeChange: (size: number) => void;
  nBoards: number;
  onNBoardsChange: (n: number) => void;
  onRun: () => void;
  canRun: boolean;
}

const SIZES = [4, 5, 6];
const N_OPTIONS = [100, 200, 500, 1000];

function WeightInput({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className="font-mono w-6 text-[color:var(--text-muted)]">{label}</span>
      <input
        type="number"
        value={value}
        step="0.1"
        min="0"
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-16 px-1.5 py-0.5 text-xs font-mono text-right border border-[color:var(--track)] rounded bg-white focus:outline-none focus:border-[color:var(--accent)]"
      />
    </label>
  );
}

function QuotaInput({ value, onChange, label, max }: { value: number; onChange: (n: number) => void; label: string; max: number }) {
  return (
    <label className="flex items-center gap-1 text-[11px]">
      <span className="font-mono w-3 text-[color:var(--text-muted)]">{label}</span>
      <input
        type="number"
        value={value}
        min="0"
        max={max}
        step="1"
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-12 px-1 py-0.5 text-[11px] font-mono text-right border border-[color:var(--track)] rounded bg-white focus:outline-none focus:border-[color:var(--accent)]"
      />
    </label>
  );
}

export const WeightsPanel = ({
  config, onChange, size, onSizeChange, nBoards, onNBoardsChange, onRun, canRun,
}: WeightsPanelProps) => {
  const updateVowel = (letter: string, weight: number) => {
    onChange({ ...config, vowel: { ...config.vowel, [letter]: weight } });
  };
  const updateBackbone = (letter: string, weight: number) => {
    onChange({ ...config, backbone: { ...config.backbone, [letter]: weight } });
  };
  const updateOther = (letter: string, weight: number) => {
    onChange({ ...config, other: { ...config.other, [letter]: weight } });
  };
  const updateQuota = (s: number, key: 'V' | 'B' | 'O', value: number) => {
    onChange({
      ...config,
      quotasBySize: {
        ...config.quotasBySize,
        [s]: { ...config.quotasBySize[s], [key]: value },
      },
    });
  };

  const vowelTotal = VOWEL_LETTERS.reduce((sum, l) => sum + (config.vowel[l] ?? 0), 0);
  const backboneTotal = BACKBONE_LETTERS.reduce((sum, l) => sum + (config.backbone[l] ?? 0), 0);
  const otherTotal = OTHER_LETTERS.reduce((sum, l) => sum + (config.other[l] ?? 0), 0);

  return (
    <aside className="bg-white border border-[color:var(--track)] rounded-lg p-3 flex flex-col gap-3 self-start sticky top-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold m-0">Weights</h2>
        <button
          type="button"
          onClick={() => onChange(defaultPoolConfig())}
          className="text-[11px] px-2 py-1 rounded bg-[color:var(--track)] hover:bg-[color:var(--dot)] text-[color:var(--text)] cursor-pointer border-none"
        >
          Reset to H8
        </button>
      </div>

      <section className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Vowels (V)</span>
          <span className="text-[color:var(--text-muted)] font-mono">Σ {vowelTotal.toFixed(2)}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {VOWEL_LETTERS.map(l => (
            <WeightInput key={l} label={l} value={config.vowel[l] ?? 0} onChange={(n) => updateVowel(l, n)} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...config, vowel: defaultVowelWeights() })}
          className="text-[10px] text-[color:var(--text-muted)] underline self-end cursor-pointer bg-transparent border-none p-0"
        >
          reset vowels
        </button>
      </section>

      <section className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Backbones (B)</span>
          <span className="text-[color:var(--text-muted)] font-mono">Σ {backboneTotal.toFixed(2)}</span>
        </div>
        <p className="text-[11px] text-[color:var(--text-muted)] m-0 leading-snug">T S R N L D — drive most common-word formation.</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {BACKBONE_LETTERS.map(l => (
            <WeightInput key={l} label={l} value={config.backbone[l] ?? 0} onChange={(n) => updateBackbone(l, n)} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...config, backbone: defaultBackboneWeights() })}
          className="text-[10px] text-[color:var(--text-muted)] underline self-end cursor-pointer bg-transparent border-none p-0"
        >
          reset backbones
        </button>
      </section>

      <section className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Others (O)</span>
          <span className="text-[color:var(--text-muted)] font-mono">Σ {otherTotal.toFixed(2)}</span>
        </div>
        <p className="text-[11px] text-[color:var(--text-muted)] m-0 leading-snug">Q emits as Qu (2-letter tile).</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {OTHER_LETTERS.map(l => (
            <WeightInput key={l} label={l} value={config.other[l] ?? 0} onChange={(n) => updateOther(l, n)} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...config, other: defaultOtherWeights() })}
          className="text-[10px] text-[color:var(--text-muted)] underline self-end cursor-pointer bg-transparent border-none p-0"
        >
          reset others
        </button>
      </section>

      <section className="flex flex-col gap-1.5">
        <div className="text-xs font-medium">Per-board quotas (V + B + O = size²)</div>
        <div className="flex flex-col gap-1">
          {SIZES.map(s => {
            const q = config.quotasBySize[s] ?? { V: 0, B: 0, O: 0 };
            const sum = q.V + q.B + q.O;
            const target = s * s;
            const ok = sum === target;
            return (
              <div key={s} className="flex items-center gap-2 text-xs">
                <span className="font-mono w-10 text-[color:var(--text-muted)]">{s}×{s}</span>
                <QuotaInput label="V" value={q.V} max={target} onChange={(n) => updateQuota(s, 'V', n)} />
                <QuotaInput label="B" value={q.B} max={target} onChange={(n) => updateQuota(s, 'B', n)} />
                <QuotaInput label="O" value={q.O} max={target} onChange={(n) => updateQuota(s, 'O', n)} />
                <span className={`text-[10px] font-mono ml-auto ${ok ? 'text-[color:var(--text-muted)]' : 'text-red-600'}`}>
                  {sum}/{target}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <hr className="border-0 border-t border-[color:var(--track)] m-0" />

      <section className="flex flex-col gap-2">
        <div className="text-xs font-medium">Test board size</div>
        <div className="flex gap-1">
          {SIZES.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => onSizeChange(s)}
              className={`flex-1 py-1 text-xs rounded border-none cursor-pointer ${
                size === s
                  ? 'bg-[color:var(--accent)] text-white'
                  : 'bg-[color:var(--track)] text-[color:var(--text)] hover:bg-[color:var(--dot)]'
              }`}
            >
              {s}×{s}
            </button>
          ))}
        </div>
      </section>

      <hr className="border-0 border-t border-[color:var(--track)] m-0" />

      <section className="flex flex-col gap-2">
        <div className="text-xs font-medium">Calibration</div>
        <div className="flex gap-1">
          {N_OPTIONS.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => onNBoardsChange(n)}
              className={`flex-1 py-1 text-[11px] rounded border-none cursor-pointer ${
                nBoards === n
                  ? 'bg-[color:var(--accent)] text-white'
                  : 'bg-[color:var(--track)] text-[color:var(--text)] hover:bg-[color:var(--dot)]'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={!canRun}
          className="py-2 text-sm font-medium rounded bg-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] text-white border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Run calibration
        </button>
      </section>
    </aside>
  );
};
