#!/usr/bin/env node
// Validates data packs, the source registry, decision records and markdown links.
// No dependencies. Usage: node scripts/validate-data.mjs [rootDir]
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RECORD_FIELDS = ['id','value','unit','source_id','table','page','population','denominator','year','checked_on','confidence','note'];
export const SOURCE_FIELDS = ['id','title','publisher','year','url','checked_on'];
export const CONFIDENCE = ['verified','indexed','assumed'];
export const DECISION_HEADINGS = ['## 상태','## 맥락','## 결정','## 결과'];
export const NARRATIVE_FIELDS = ['id','track','stage','theme','summary','quote','source_id','page_or_url','year','checked_on','confidence'];
export const TRACKS = ['인문사회','이공'];
export const STAGES = ['admission','coursework','qualifying','first-paper','funding','thesis','defense','early-career','mid-career','retirement'];
const RATIO_UNITS = ['ratio','percent'];
const QUOTE_MAX_WORDS = 15;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function checkCommon(r, at, ids, errors) {
  if (!ids.has(r.source_id)) errors.push(`${at}: unknown source_id ${r.source_id}`);
  if (typeof r.source_id === 'string' && r.source_id.endsWith('-portal')) errors.push(`${at}: source_id ${r.source_id} is a portal entry; cite the document actually read (decision 0010)`);
  if (!CONFIDENCE.includes(r.confidence)) errors.push(`${at}: confidence must be one of ${CONFIDENCE.join('|')}`);
  if (!Number.isInteger(r.year)) errors.push(`${at}: year must be an integer`);
  if (typeof r.checked_on !== 'string' || !DATE_RE.test(r.checked_on)) errors.push(`${at}: checked_on must be YYYY-MM-DD`);
}

function readJson(p) { return JSON.parse(readFileSync(p, 'utf8')); }
function walk(dir, pred, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) { if (name !== 'node_modules' && name !== '.git') walk(p, pred, out); }
    else if (pred(p)) out.push(p);
  }
  return out;
}

export function validate(root) {
  const errors = [];
  const regPath = join(root, 'data/sources/registry.json');
  // Sources may also live one file per collection issue under data/sources/registry.d/ (decision 0012).
  const regDir = join(root, 'data/sources/registry.d');
  const sources = (existsSync(regPath) ? readJson(regPath) : [])
    .concat(...walk(regDir, p => p.endsWith('.json')).sort().map(p => readJson(p)));
  const ids = new Set();
  sources.forEach((s, i) => {
    for (const f of SOURCE_FIELDS) if (!(f in s)) errors.push(`registry[${i}]: missing ${f}`);
    if (s.id) { if (ids.has(s.id)) errors.push(`registry: duplicate id ${s.id}`); ids.add(s.id); }
  });
  for (const file of walk(join(root, 'data/packs'), p => p.endsWith('records.json'))) {
    const rel = file.slice(root.length + 1);
    const recs = readJson(file);
    if (!Array.isArray(recs)) { errors.push(`${rel}: not an array`); continue; }
    const seen = new Set();
    const isNarrative = /[\\/]narratives[\\/]/.test(file);
    recs.forEach((r, i) => {
      const at = `${rel}[${i}]`;
      if (isNarrative) {
        for (const f of NARRATIVE_FIELDS) if (!(f in r)) errors.push(`${at}: missing ${f}`);
        if (!TRACKS.includes(r.track)) errors.push(`${at}: track must be one of ${TRACKS.join('|')}`);
        if (!STAGES.includes(r.stage)) errors.push(`${at}: stage must be one of ${STAGES.join('|')}`);
        if (typeof r.quote === 'string' && r.quote.trim() && r.quote.trim().split(/\s+/).length > QUOTE_MAX_WORDS) errors.push(`${at}: quote exceeds ${QUOTE_MAX_WORDS} words`);
        checkCommon(r, at, ids, errors);
        if (r.id) { if (seen.has(r.id)) errors.push(`${at}: duplicate id ${r.id}`); seen.add(r.id); }
        return;
      }
      for (const f of RECORD_FIELDS) if (!(f in r)) errors.push(`${at}: missing ${f}`);
      if (typeof r.value !== 'number') errors.push(`${at}: value must be a number`);
      checkCommon(r, at, ids, errors);
      if (RATIO_UNITS.includes(r.unit) && !String(r.denominator ?? '').trim()) errors.push(`${at}: ${r.unit} needs denominator`);
      if (r.id) { if (seen.has(r.id)) errors.push(`${at}: duplicate id ${r.id}`); seen.add(r.id); }
    });
  }
  for (const file of walk(join(root, 'docs/design/decisions'), p => /[\\/][0-9]{4}-[^\\/]+\.md$/.test(p))) {
    const text = readFileSync(file, 'utf8');
    for (const h of DECISION_HEADINGS) if (!text.includes(h)) errors.push(`${file.slice(root.length + 1)}: missing heading ${h}`);
  }
  for (const file of walk(join(root, 'docs'), p => p.endsWith('.md'))) {
    // Fences open and close only at line start; a longer fence may contain a shorter one.
    const text = readFileSync(file, 'utf8')
      .replace(/^(`{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, '')
      .replace(/`[^`\n]*`/g, '');
    for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = m[1];
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      const clean = target.split('#')[0];
      if (!existsSync(resolve(dirname(file), clean))) errors.push(`${file.slice(root.length + 1)}: broken link ${target}`);
    }
  }
  return { errors };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] ?? '.');
  const { errors } = validate(root);
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log('validate-data: ok');
}
