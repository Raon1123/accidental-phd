#!/usr/bin/env node
// Creates GitHub issues from a seed file. Idempotent by title: an issue whose
// exact title already exists (open or closed) is skipped, or has its body
// rewritten from the seed when --sync is given.
// Usage: node scripts/create-issues.mjs <seed.json> [owner/repo] [--sync]
// Seed format: [{ "title": "...", "labels": ["wave/2"], "body": "markdown" }]
// Cross-references like "#14" inside bodies assume a fresh repo with no prior
// issues or PRs and creation in seed order; verify after the first run.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const sync = args.includes('--sync');
const [seedPath, repo = 'Raon1123/accidental-phd'] = args.filter(a => a !== '--sync');
if (!seedPath) { console.error('usage: create-issues.mjs <seed.json> [owner/repo] [--sync]'); process.exit(2); }
const seed = JSON.parse(readFileSync(seedPath, 'utf8'));
const existing = JSON.parse(execFileSync('gh', ['issue', 'list', '--repo', repo, '--state', 'all', '--limit', '500', '--json', 'number,title'], { encoding: 'utf8' }));
const byTitle = new Map(existing.map(i => [i.title, i.number]));
const out = [];
for (const it of seed) {
  if (byTitle.has(it.title)) {
    const number = byTitle.get(it.title);
    if (sync) execFileSync('gh', ['issue', 'edit', String(number), '--repo', repo, '--body', it.body], { encoding: 'utf8' });
    out.push({ title: it.title, number, created: false, synced: sync });
    continue;
  }
  const args = ['issue', 'create', '--repo', repo, '--title', it.title, '--body', it.body];
  for (const l of it.labels ?? []) args.push('--label', l);
  const url = execFileSync('gh', args, { encoding: 'utf8' }).trim();
  const number = Number(url.split('/').pop());
  out.push({ title: it.title, number, created: true });
}
for (const o of out) console.log(`${o.created ? 'created' : o.synced ? 'synced ' : 'exists '} #${o.number} ${o.title}`);
