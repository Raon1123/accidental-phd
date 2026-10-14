#!/usr/bin/env node
// Compares departments notes against a base commit and counts sentences that
// disappeared outside the marker a rewrite was meant to touch (same_unit_as).
// Wave 3 retrospective rule: a data-rewrite script must report this count and
// it must be 0 (docs/waves/wave-04-engine-impl.md, carry-over item 1).
// Usage: node scripts/compare-notes.mjs <base-commit> [--exclude=id,id,...] [--file=path]
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const base = args.find(a => !a.startsWith('--'));
if (!base) { console.error('usage: compare-notes.mjs <base-commit> [--exclude=id,...] [--file=path]'); process.exit(2); }
const exclude = new Set((args.find(a => a.startsWith('--exclude='))?.slice('--exclude='.length) ?? '').split(',').filter(Boolean));
const FILE = args.find(a => a.startsWith('--file='))?.slice('--file='.length) ?? 'data/packs/departments/records.json';

const before = JSON.parse(execFileSync('git', ['show', `${base}:${FILE}`], { encoding: 'utf8' }));
const after = JSON.parse(readFileSync(FILE, 'utf8'));
const split = s => (s ?? '').split(/\s*·\s*|(?<=[.。])\s+/).map(t => t.trim()).filter(Boolean);
const isMarker = t => /same_unit_as|대표 departments-/.test(t);
const afterById = new Map(after.map(r => [r.id, r]));

let lost = 0, changed = 0, excludedLost = 0;
for (const r of before) {
  const a = afterById.get(r.id);
  if (!a) { console.log(`missing record ${r.id}`); lost++; continue; }
  const bs = split(r.note), as = new Set(split(a.note));
  const gone = bs.filter(t => !as.has(t) && !isMarker(t));
  if (!gone.length) continue;
  changed++;
  if (exclude.has(r.id)) { excludedLost += gone.length; continue; }
  lost += gone.length;
  console.log(`${r.id}: ${gone.length} sentence(s) lost outside marker: ${gone.join(' | ')}`);
}
console.log(`base ${base}: records ${before.length} -> ${after.length}; records with non-marker changes ${changed}; ` +
  `lost sentences outside marker ${lost} (excluded ids ${exclude.size}, their lost sentences ${excludedLost})`);
process.exit(lost ? 1 : 0);
