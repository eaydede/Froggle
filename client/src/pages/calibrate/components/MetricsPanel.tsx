import type { CalibrationOutput, CandidateRun } from '../../../shared/calibration/types';
import { median, p10, p90, mean, SUFFIXES } from '../../../shared/calibration/metrics';

interface MetricsPanelProps {
  output: CalibrationOutput | null;
}

const CANDIDATE_COLORS: Record<string, string> = {
  baseline_dice: '#2c5aa0',
  current: '#059669',
};

const LENGTH_COLORS: Record<string, string> = {
  '3': '#cbd5e1',
  '4': '#60a5fa',
  '5': '#10b981',
  '6': '#f59e0b',
  '7+': '#dc2626',
};

const LENGTH_BUCKETS = ['3', '4', '5', '6', '7+'] as const;

export const MetricsPanel = ({ output }: MetricsPanelProps) => {
  if (!output) {
    return (
      <section className="bg-white border border-[color:var(--track)] rounded-lg p-4 text-sm text-[color:var(--text-muted)]">
        Run a calibration to see metrics. <strong>baseline_dice</strong> is the current production behavior; <strong>current</strong> is the weights you set in the panel on the left.
      </section>
    );
  }

  return (
    <section className="bg-white border border-[color:var(--track)] rounded-lg p-4 flex flex-col gap-4">
      <header>
        <h2 className="text-sm font-semibold m-0">Metrics</h2>
        <p className="text-[11px] text-[color:var(--text-muted)] m-0 mt-1 leading-snug">
          Median per board (p10–p90 shaded behind). <span className="font-mono">current</span> = your weights, <span className="font-mono">baseline_dice</span> = production reference. Each combo lists volume + ceiling + length distribution + diversity.
        </p>
      </header>

      <Scorecard output={output} />

      {output.combos.map(combo => {
        const key = `${combo.size}x${combo.size}_min${combo.minLen}`;
        return <ComboBlock key={key} output={output} comboKey={key} comboLabel={`${combo.size}×${combo.size}, minLength ${combo.minLen}`} />;
      })}
    </section>
  );
};

function Scorecard({ output }: { output: CalibrationOutput }) {
  const baseline = output.candidates.find(c => c.name === 'baseline_dice');
  if (!baseline) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold m-0 mb-1">Common words vs baseline</h3>
      <p className="text-[11px] text-[color:var(--text-muted)] m-0 mb-1.5 leading-snug">
        Each cell = current's median common-word count as % of baseline's. Green ≥ 95%, yellow 80–94%, red &lt; 80%.
      </p>
      <table className="text-[11px] border-collapse">
        <thead>
          <tr>
            <th className="text-left px-2 py-1 border border-[color:var(--track)] bg-[color:var(--track)]">Candidate</th>
            {output.combos.map(c => (
              <th key={`${c.size}-${c.minLen}`} className="px-2 py-1 border border-[color:var(--track)] bg-[color:var(--track)] text-center">
                {c.size}×{c.size}<br />min {c.minLen}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {output.candidates.map(cand => (
            <tr key={cand.name}>
              <td className="px-2 py-1 border border-[color:var(--track)] font-mono">{cand.name}</td>
              {output.combos.map(c => {
                const key = `${c.size}x${c.size}_min${c.minLen}`;
                const v = median(cand.perCombo[key].result.commonCounts);
                const b = median(baseline.perCombo[key].result.commonCounts);
                const ratio = b > 0 ? v / b : 0;
                const cls = ratio >= 0.95 ? 'bg-emerald-100 text-emerald-900' : ratio >= 0.80 ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-900';
                return (
                  <td key={key} className={`px-2 py-1 border border-[color:var(--track)] text-center ${cls}`}>
                    {Math.round(ratio * 100)}%
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ComboBlockProps {
  output: CalibrationOutput;
  comboKey: string;
  comboLabel: string;
}

function ComboBlock({ output, comboKey, comboLabel }: ComboBlockProps) {
  // Compute scale maxima for fair comparison.
  let maxCommon = 0, maxLong6 = 0, maxLenAll = 0, maxLenCommon = 0;
  for (const cand of output.candidates) {
    const r = cand.perCombo[comboKey];
    if (!r) continue;
    maxCommon = Math.max(maxCommon, p90(r.result.commonCounts));
    maxLong6 = Math.max(maxLong6, p90(r.result.longSixPlus));
    let totalAll = 0, totalCom = 0;
    for (const b of LENGTH_BUCKETS) {
      totalAll += median(r.result.lenHistBoards[b]);
      totalCom += median(r.result.commonLenHistBoards[b]);
    }
    maxLenAll = Math.max(maxLenAll, totalAll);
    maxLenCommon = Math.max(maxLenCommon, totalCom);
  }

  return (
    <div className="border-t border-[color:var(--track)] pt-3">
      <h3 className="text-xs font-semibold m-0 mb-2">{comboLabel}</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <div className="text-[11px] font-medium text-[color:var(--text-muted)] mb-1">Common words / board</div>
          {output.candidates.map(c => {
            const r = c.perCombo[comboKey];
            if (!r) return null;
            const m = median(r.result.commonCounts), lo = p10(r.result.commonCounts), hi = p90(r.result.commonCounts);
            return <RangeBar key={c.name} label={c.name} median={m} p10={lo} p90={hi} max={maxCommon} value={`${m} (${lo}–${hi})`} />;
          })}
        </div>

        <div>
          <div className="text-[11px] font-medium text-[color:var(--text-muted)] mb-1">Length-6+ words / board</div>
          {output.candidates.map(c => {
            const r = c.perCombo[comboKey];
            if (!r) return null;
            const m = median(r.result.longSixPlus), lo = p10(r.result.longSixPlus), hi = p90(r.result.longSixPlus);
            return <RangeBar key={c.name} label={c.name} median={m} p10={lo} p90={hi} max={maxLong6} value={`${m} (${lo}–${hi})`} />;
          })}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-[11px] font-medium text-[color:var(--text-muted)] mb-1">Length distribution / board</div>
        <div className="flex gap-3 text-[10px] text-[color:var(--text-muted)] mb-1.5">
          {LENGTH_BUCKETS.map(b => (
            <div key={b} className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: LENGTH_COLORS[b] }} />
              <span>length {b}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] text-[color:var(--text-muted)] mb-1">All valid words</div>
            {output.candidates.map(c => {
              const r = c.perCombo[comboKey];
              if (!r) return null;
              const segs: Record<string, number> = {};
              let total = 0;
              for (const b of LENGTH_BUCKETS) {
                segs[b] = median(r.result.lenHistBoards[b]);
                total += segs[b];
              }
              return <StackedRow key={c.name} label={c.name} segments={segs} total={total} max={maxLenAll} />;
            })}
          </div>
          <div>
            <div className="text-[10px] text-[color:var(--text-muted)] mb-1">Common (MIT-10k) words</div>
            {output.candidates.map(c => {
              const r = c.perCombo[comboKey];
              if (!r) return null;
              const segs: Record<string, number> = {};
              let total = 0;
              for (const b of LENGTH_BUCKETS) {
                segs[b] = median(r.result.commonLenHistBoards[b]);
                total += segs[b];
              }
              return <StackedRow key={c.name} label={c.name} segments={segs} total={total} max={maxLenCommon} />;
            })}
          </div>
        </div>
      </div>

      <DiversityBlock output={output} comboKey={comboKey} />

      <SuffixBlock output={output} comboKey={comboKey} />
    </div>
  );
}

function SuffixBlock({ output, comboKey }: { output: CalibrationOutput; comboKey: string }) {
  let scaleMax = 0;
  for (const c of output.candidates) {
    const r = c.perCombo[comboKey];
    if (!r) continue;
    for (const s of SUFFIXES) scaleMax = Math.max(scaleMax, mean(r.result.suffixBoards[s] ?? []));
  }
  if (scaleMax === 0) return null;

  const half = Math.ceil(SUFFIXES.length / 2);
  const cols = [SUFFIXES.slice(0, half), SUFFIXES.slice(half)];

  return (
    <div className="mt-3">
      <div className="text-[11px] font-medium text-[color:var(--text-muted)] mb-1">Suffix counts per board (common words, longest-match, mean)</div>
      <p className="text-[10px] text-[color:var(--text-muted)] m-0 mb-1.5 leading-snug">
        How often each pattern shows up in a typical board's common-word solutions. More -ing / -ed / -er endings = more morphologically "wordy" board. Each word counts toward its longest matching suffix (WALKERS → -ers, not -er). Mean instead of median because most boards have 0 of any rare suffix.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {cols.map((col, idx) => (
          <div key={idx}>
            {col.map(suf => (
              <div key={suf} className="mb-1.5">
                <div className="text-[10px] text-[color:var(--text-muted)] mb-0.5 font-mono">-{suf}</div>
                {output.candidates.map(c => {
                  const r = c.perCombo[comboKey];
                  if (!r) return null;
                  const m = mean(r.result.suffixBoards[suf] ?? []);
                  return <SimpleBar key={c.name} label={c.name} value={m} max={scaleMax} display={m.toFixed(2)} />;
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function DiversityBlock({ output, comboKey }: { output: CalibrationOutput; comboKey: string }) {
  return (
    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <div className="text-[11px] font-medium text-[color:var(--text-muted)] mb-1">Coverage (higher = wider vocab)</div>
        {(['5', '6'] as const).map(bucket => (
          <div key={bucket} className="mb-2">
            <div className="text-[10px] text-[color:var(--text-muted)] mb-0.5">Length {bucket} (of {output.commonByBucket[bucket] ?? 0})</div>
            {output.candidates.map(c => {
              const r = c.perCombo[comboKey];
              if (!r) return null;
              const d = r.diversity[bucket];
              return <SimpleBar key={c.name} label={c.name} value={d.coverage} max={1} display={`${(d.coverage * 100).toFixed(1)}%`} />;
            })}
          </div>
        ))}
      </div>
      <div>
        <div className="text-[11px] font-medium text-[color:var(--text-muted)] mb-1">Top-20 concentration (lower = more even)</div>
        {(['5', '6'] as const).map(bucket => {
          let scaleMax = 0;
          for (const c of output.candidates) {
            const r = c.perCombo[comboKey];
            if (!r) continue;
            scaleMax = Math.max(scaleMax, r.diversity[bucket].concentration);
          }
          return (
            <div key={bucket} className="mb-2">
              <div className="text-[10px] text-[color:var(--text-muted)] mb-0.5">Length {bucket}</div>
              {output.candidates.map(c => {
                const r = c.perCombo[comboKey];
                if (!r) return null;
                const d = r.diversity[bucket];
                return <SimpleBar key={c.name} label={c.name} value={d.concentration} max={scaleMax} display={`${(d.concentration * 100).toFixed(1)}%`} />;
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RangeBar({ label, median: m, p10: lo, p90: hi, max, value }: { label: string; median: number; p10: number; p90: number; max: number; value: string }) {
  const pct = max > 0 ? (m / max) * 100 : 0;
  const loP = max > 0 ? (lo / max) * 100 : 0;
  const hiP = max > 0 ? (hi / max) * 100 : 0;
  const color = CANDIDATE_COLORS[label] ?? '#6b7280';
  return (
    <div className="flex items-center gap-2 text-[11px] my-0.5">
      <div className="w-28 font-mono shrink-0 text-[color:var(--text)]">{label}</div>
      <div className="flex-1 relative h-5 bg-[color:var(--track)] rounded-sm overflow-hidden">
        <div className="absolute top-0 h-full" style={{ left: `${loP}%`, width: `${Math.max(0, hiP - loP)}%`, background: 'rgba(0,0,0,0.06)' }} />
        <div className="absolute top-0 left-0 h-full" style={{ width: `${pct}%`, background: color }} />
        <span className="absolute right-1 top-0 leading-5 font-mono text-[10px] text-[color:var(--text)]" style={{ textShadow: '0 0 3px rgba(255,255,255,0.9)' }}>{value}</span>
      </div>
    </div>
  );
}

function SimpleBar({ label, value, max, display }: { label: string; value: number; max: number; display: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const color = CANDIDATE_COLORS[label] ?? '#6b7280';
  return (
    <div className="flex items-center gap-2 text-[11px] my-0.5">
      <div className="w-28 font-mono shrink-0 text-[color:var(--text)]">{label}</div>
      <div className="flex-1 relative h-5 bg-[color:var(--track)] rounded-sm overflow-hidden">
        <div className="absolute top-0 left-0 h-full" style={{ width: `${pct}%`, background: color }} />
        <span className="absolute right-1 top-0 leading-5 font-mono text-[10px] text-[color:var(--text)]" style={{ textShadow: '0 0 3px rgba(255,255,255,0.9)' }}>{display}</span>
      </div>
    </div>
  );
}

function StackedRow({ label, segments, total, max }: { label: string; segments: Record<string, number>; total: number; max: number }) {
  return (
    <div className="flex items-center gap-2 text-[11px] my-0.5">
      <div className="w-28 font-mono shrink-0 text-[color:var(--text)]">{label}</div>
      <div className="flex-1 relative h-5 bg-[color:var(--track)] rounded-sm overflow-hidden flex">
        {LENGTH_BUCKETS.map(b => {
          const v = segments[b] ?? 0;
          const w = max > 0 ? (v / max) * 100 : 0;
          if (w === 0) return null;
          return <div key={b} title={`length ${b}: ${v}`} style={{ width: `${w}%`, background: LENGTH_COLORS[b], height: '100%' }} />;
        })}
        <span className="absolute right-1 top-0 leading-5 font-mono text-[10px] text-[color:var(--text)]" style={{ textShadow: '0 0 3px rgba(255,255,255,0.9)' }}>{total}</span>
      </div>
    </div>
  );
}
