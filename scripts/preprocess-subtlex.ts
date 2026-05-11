// One-shot preprocessor: read the raw SUBTLEX-US TSV, intersect with
// enable1.txt (we only care about playable words), compute Zipf from the
// frequency-per-million column, and emit `word\tzipf` lines sorted by word.
//
// Zipf formula (van Heuven et al. 2014):
//   zipf = log10(frequency_per_million * 1000) = log10(SUBTLWF) + 3
// For SUBTLWF == 0 (shouldn't appear but safety), we skip the word.
//
// Output: scripts/data/subtlex.tsv  (compact, committable)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const RAW = path.join(REPO_ROOT, 'scripts/data/_tmp/SUBTLEXus74286wordstextversion.txt');
const ENABLE1 = path.join(REPO_ROOT, 'enable1.txt');
const OUT = path.join(REPO_ROOT, 'scripts/data/subtlex.tsv');

console.log('Loading enable1...');
const enable1 = new Set<string>(
  fs.readFileSync(ENABLE1, 'utf-8').split('\n').map(w => w.trim().toLowerCase()).filter(Boolean),
);
console.log(`  ${enable1.size} enable1 words`);

console.log('Reading SUBTLEX raw...');
const raw = fs.readFileSync(RAW, 'utf-8').split('\n').filter(Boolean);
const header = raw[0].split('\t');
const wordCol = header.indexOf('Word');
const subtlwfCol = header.indexOf('SUBTLWF');
if (wordCol === -1 || subtlwfCol === -1) {
  throw new Error('Could not find Word / SUBTLWF columns in SUBTLEX header');
}
console.log(`  ${raw.length - 1} SUBTLEX rows`);

const out: Array<{ word: string; zipf: number }> = [];
let inEnable1 = 0;
let zipfHist = { '<2': 0, '2-3': 0, '3-4': 0, '4-5': 0, '5+': 0 };

for (let i = 1; i < raw.length; i++) {
  const cols = raw[i].split('\t');
  const word = (cols[wordCol] ?? '').trim().toLowerCase();
  if (!word || !enable1.has(word)) continue;
  inEnable1++;
  const subtlwf = parseFloat(cols[subtlwfCol] ?? '0');
  if (!Number.isFinite(subtlwf) || subtlwf <= 0) continue;
  const zipf = Math.log10(subtlwf) + 3;
  out.push({ word, zipf });
  if (zipf < 2) zipfHist['<2']++;
  else if (zipf < 3) zipfHist['2-3']++;
  else if (zipf < 4) zipfHist['3-4']++;
  else if (zipf < 5) zipfHist['4-5']++;
  else zipfHist['5+']++;
}

out.sort((a, b) => a.word.localeCompare(b.word));

const body = out.map(r => `${r.word}\t${r.zipf.toFixed(3)}`).join('\n') + '\n';
fs.writeFileSync(OUT, body);

console.log(`\nWritten: ${OUT}`);
console.log(`  ${out.length} words (intersection of enable1 ∩ SUBTLEX with SUBTLWF > 0)`);
console.log(`  ${inEnable1 - out.length} SUBTLEX-but-zero-freq words dropped`);
console.log(`  ${enable1.size - inEnable1} enable1 words not in SUBTLEX (will fall to "impossible" tier at runtime)`);
console.log('\nZipf distribution (of intersected words):');
for (const [band, count] of Object.entries(zipfHist)) {
  console.log(`  ${band.padStart(4)}: ${count}`);
}
