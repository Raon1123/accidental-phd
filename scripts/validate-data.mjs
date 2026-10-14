#!/usr/bin/env node
// Validates data packs, the source registry, decision records and markdown links.
// No dependencies. Usage: node scripts/validate-data.mjs [rootDir]
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { basename, join, dirname, resolve } from 'node:path';
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

// --- Record-id existence check (Wave 3 retro: decision 0013 once cited a non-existent id) ---
const ID_TOKEN_RE = /^(schools|departments|salaries|statistics|venues|taxonomy|nar-hs|nar-stem)-[^` ]+$/;
const MAX_EXPANSION = 200;

function collectRecordIds(root) {
  const ids = new Set();
  const files = new Set(walk(join(root, 'data/packs'), p => p.endsWith('records.json')));
  for (const p of walk(join(root, 'data/packs/narratives'), p => p.endsWith('.json'))) files.add(p);
  for (const f of files) {
    let recs;
    try { recs = readJson(f); } catch { continue; }
    if (Array.isArray(recs)) for (const r of recs) if (r && typeof r.id === 'string') ids.add(r.id);
  }
  return ids;
}

// Expands explicit alternations into concrete patterns: {a,b,c}, {a/b}, {1..5}, (a|b).
// Placeholders such as {school}, {…}, <field> are left for patternToRegex.
function expandAlternations(token) {
  const m = token.match(/\{([^{}]*)\}|\(([^()]*\|[^()]*)\)/);
  if (!m) return [token];
  const body = m[1] ?? m[2];
  let alts = null;
  const range = m[1] !== undefined && body.match(/^(\d+)\.\.(\d+)$/);
  if (range) {
    const [lo, hi] = [Number(range[1]), Number(range[2])];
    if (hi >= lo && hi - lo < 100) alts = Array.from({ length: hi - lo + 1 }, (_, i) => String(lo + i));
  } else if (m[2] !== undefined) alts = body.split('|');
  else if (/[,/]/.test(body)) alts = body.split(/[,/]/).map(a => a.trim());
  if (!alts) {
    // placeholder: keep the text, protect it from re-matching, restore afterwards
    const hold = m[0].replace(/[{}()]/g, c => ({ '{': '\u0001', '}': '\u0002', '(': '\u0003', ')': '\u0004' })[c]);
    return expandAlternations(token.replace(m[0], hold)).map(t => t.replace(/[\u0001-\u0004]/g, c => '{}()'[c.charCodeAt(0) - 1]));
  }
  const out = [];
  for (const a of alts) for (const rest of expandAlternations(token.replace(m[0], a))) out.push(rest);
  return out;
}

// Translates one placeholder-bearing pattern to an anchored RegExp.
// Wildcards -> .+ : <…> <field> {…} {...} {school} {n} * … ...  Trailing -N -> digits; NNNN -> 4 digits.
function patternToRegex(pat) {
  const prefixOnly = pat.endsWith('-');
  const parts = pat.split(/(<[^<>]*>|\{[^{}]*\}|\*|…|\.{3}|NNNN|-N$)/);
  const src = parts.map((part, i) => {
    if (i % 2 === 0) return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (part === 'NNNN') return '\\d{4}';
    if (part === '-N') return '-\\d+';
    return '.+';
  }).join('');
  return new RegExp(`^${src}${prefixOnly ? '' : '$'}`);
}

function checkRecordIdMentions(root, errors) {
  const ids = collectRecordIds(root);
  const idList = [...ids];
  const files = [
    ...walk(join(root, 'docs/design/decisions'), p => p.endsWith('.md')),
    ...walk(join(root, 'docs/superpowers/specs'), p => p.endsWith('.md'))
  ];
  for (const file of files) {
    const rel = file.slice(root.length + 1);
    const text = readFileSync(file, 'utf8').replace(/^(`{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, '');
    const seen = new Set();
    for (const m of text.matchAll(/`([^`\n]+)`/g)) {
      const token = m[1];
      if (!ID_TOKEN_RE.test(token) || seen.has(token)) continue;
      seen.add(token);
      if (ids.has(token)) continue;
      const expansions = expandAlternations(token);
      const pats = expansions.length <= MAX_EXPANSION ? expansions : [token];
      for (const pat of pats) {
        const re = patternToRegex(pat);
        if (!idList.some(id => re.test(id))) {
          errors.push(`${rel}: no record matches id pattern ${pat === token ? token : `${pat} (from ${token})`}`);
        }
      }
    }
  }
}

// Pre-existing groups of registry entries that share one URL on purpose (one portal page, several years or
// tables). Each group is a list of ids; the duplicate-URL check skips two ids that sit in the same group.
// Do not add new entries here: give a new source its own URL or reuse the existing id.
const DUPLICATE_URL_ALLOWLIST = [
  ['kedi-2022-dataset-dept', 'kedi-2023-dataset-dept', 'kedi-2024-dataset-dept', 'kedi-2025-dataset-dept', 'kedi-2026-dataset-dept'],
  ['khu-2026-scholarship', 'khu-2026-tuition'],
  [
    'scimago-2025-sjr-chem-materials-engineering', 'scimago-2025-sjr-civil-env-engineering', 'scimago-2025-sjr-computer-science',
    'scimago-2025-sjr-economics', 'scimago-2025-sjr-history-philosophy-korean-literature', 'scimago-2025-sjr-life-science',
    'scimago-2025-sjr-mathematics', 'scimago-2025-sjr-mech-elec-engineering', 'scimago-2025-sjr-polsci-public-admin',
    'scimago-2025-sjr-psychology', 'scimago-2025-sjr-sociology', 'scimago-2025-sjr-statistics', 'scimago-2026-portal'
  ]
];

// Lowercase scheme and host, drop a leading `www.` and a trailing slash, so equal documents compare equal.
export function normalizeUrl(u) {
  const t = u.trim();
  try {
    const x = new URL(t);
    const host = x.host.toLowerCase().replace(/^www\./, '');
    const path = x.pathname.replace(/\/+$/, '');
    return `${x.protocol.toLowerCase()}//${host}${path}${x.search}${x.hash}`;
  } catch {
    return t.replace(/\/+$/, '');
  }
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
  const byUrl = new Map();
  for (const s of sources) {
    if (!s.id || typeof s.url !== 'string') continue;
    const key = normalizeUrl(s.url);
    const prev = byUrl.get(key);
    if (!prev) { byUrl.set(key, s.id); continue; }
    if (prev === s.id || DUPLICATE_URL_ALLOWLIST.some(group => group.includes(prev) && group.includes(s.id))) continue;
    errors.push(`registry: duplicate url ${s.url} in ${prev} and ${s.id}`);
  }
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
  // 화면 텍스트 팩(data/text/*.json): 항목마다 id 와 creative: true. 뉴스(news.*)는 type·headline·body(노동 스펙 §5.4, #58),
  // 장면(scenes.*)은 at·key·text 와 근거 refs(narratives 레코드 id 또는 'assumed', #57).
  const TEXT_FIELDS = { news: ['type', 'headline', 'body'], scenes: ['at', 'key', 'text'] };
  for (const file of walk(join(root, 'data/text'), p => p.endsWith('.json'))) {
    const rel = file.slice(root.length + 1);
    const items = readJson(file);
    if (!Array.isArray(items)) { errors.push(`${rel}: not an array`); continue; }
    const seen = new Set();
    items.forEach((x, i) => {
      const at = `${rel}[${i}]`;
      const kind = basename(file).split('.')[0];
      for (const f of ['id', ...(TEXT_FIELDS[kind] ?? [])]) if (typeof x[f] !== 'string' || !x[f].trim()) errors.push(`${at}: missing ${f}`);
      if (kind === 'scenes' && (!Array.isArray(x.refs) || x.refs.length === 0)) errors.push(`${at}: scenes need refs`);
      if (x.creative !== true) errors.push(`${at}: creative must be true`);
      if (x.id) { if (seen.has(x.id)) errors.push(`${at}: duplicate id ${x.id}`); seen.add(x.id); }
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
  checkRecordIdMentions(root, errors);
  return { errors };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] ?? '.');
  const { errors } = validate(root);
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log('validate-data: ok');
}
