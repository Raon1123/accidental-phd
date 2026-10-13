#!/usr/bin/env node
// Creates GitHub issues from a seed file. Idempotent by title: an issue whose
// exact title already exists (open or closed) is skipped.
// Usage: node scripts/create-issues.mjs <seed.json> [owner/repo]
// Seed format: [{ "title": "...", "labels": ["wave/2"], "body": "markdown" }]
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const [seedPath, repo = 'Raon1123/accidental-phd'] = process.argv.slice(2);
if (!seedPath) { console.error('usage: create-issues.mjs <seed.json> [owner/repo]'); process.exit(2); }
const seed = JSON.parse(readFileSync(seedPath, 'utf8'));
const existing = JSON.parse(execFileSync('gh', ['issue', 'list', '--repo', repo, '--state', 'all', '--limit', '500', '--json', 'number,title'], { encoding: 'utf8' }));
const byTitle = new Map(existing.map(i => [i.title, i.number]));
const out = [];
for (const it of seed) {
  if (byTitle.has(it.title)) { out.push({ title: it.title, number: byTitle.get(it.title), created: false }); continue; }
  const args = ['issue', 'create', '--repo', repo, '--title', it.title, '--body', it.body];
  for (const l of it.labels ?? []) args.push('--label', l);
  const url = execFileSync('gh', args, { encoding: 'utf8' }).trim();
  const number = Number(url.split('/').pop());
  out.push({ title: it.title, number, created: true });
}
for (const o of out) console.log(`${o.created ? 'created' : 'exists '} #${o.number} ${o.title}`);
