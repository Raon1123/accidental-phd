import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validate } from '../scripts/validate-data.mjs';

const REC = {
  id: 'phd-employed-cs', value: 0.682, unit: 'ratio', source_id: 'krivet-2025-phd',
  table: '표 8', page: 140, population: '2024 학업전념 박사', denominator: '유효 응답자',
  year: 2024, checked_on: '2026-10-13', confidence: 'verified', note: ''
};
const SRC = { id: 'krivet-2025-phd', title: 't', publisher: 'KRIVET', year: 2025, url: 'https://x', checked_on: '2026-10-13' };

function fixture({ records = [], sources = [SRC], decision = null, md = null, spec = null, narratives = null } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'aphd-'));
  mkdirSync(join(root, 'data/sources'), { recursive: true });
  mkdirSync(join(root, 'data/packs/statistics'), { recursive: true });
  mkdirSync(join(root, 'docs/design/decisions'), { recursive: true });
  writeFileSync(join(root, 'data/sources/registry.json'), JSON.stringify(sources));
  writeFileSync(join(root, 'data/packs/statistics/records.json'), JSON.stringify(records));
  if (decision !== null) writeFileSync(join(root, 'docs/design/decisions/0001-x.md'), decision);
  if (md !== null) writeFileSync(join(root, 'docs/a.md'), md);
  if (spec !== null) {
    mkdirSync(join(root, 'docs/superpowers/specs'), { recursive: true });
    writeFileSync(join(root, 'docs/superpowers/specs/x.md'), spec);
  }
  if (narratives !== null) {
    mkdirSync(join(root, 'data/packs/narratives/humanities-social'), { recursive: true });
    writeFileSync(join(root, 'data/packs/narratives/humanities-social/x.json'), JSON.stringify(narratives));
  }
  return root;
}

test('empty pack passes', () => {
  assert.deepEqual(validate(fixture()).errors, []);
});
test('valid record passes', () => {
  assert.deepEqual(validate(fixture({ records: [REC] })).errors, []);
});
test('ratio without denominator fails', () => {
  const r = validate(fixture({ records: [{ ...REC, denominator: '' }] }));
  assert.ok(r.errors.some(e => e.includes('denominator')));
});
test('unknown source_id fails', () => {
  const r = validate(fixture({ records: [{ ...REC, source_id: 'nope' }] }));
  assert.ok(r.errors.some(e => e.includes('source_id')));
});
test('missing field fails', () => {
  const { note, ...rest } = REC;
  const r = validate(fixture({ records: [rest] }));
  assert.ok(r.errors.some(e => e.includes('note')));
});
test('bad confidence fails', () => {
  const r = validate(fixture({ records: [{ ...REC, confidence: 'maybe' }] }));
  assert.ok(r.errors.some(e => e.includes('confidence')));
});
test('whitespace-only denominator on a ratio fails', () => {
  const r = validate(fixture({ records: [{ ...REC, denominator: '   ' }] }));
  assert.ok(r.errors.some(e => e.includes('denominator')));
});
test('non-integer year fails', () => {
  const r = validate(fixture({ records: [{ ...REC, year: '2024' }] }));
  assert.ok(r.errors.some(e => e.includes('year')));
});
test('checked_on not YYYY-MM-DD fails', () => {
  const r = validate(fixture({ records: [{ ...REC, checked_on: 'yesterday' }] }));
  assert.ok(r.errors.some(e => e.includes('checked_on')));
});
test('decision missing heading fails', () => {
  const r = validate(fixture({ decision: '# 0001. x\n\n## 상태\n승인됨\n\n## 맥락\nc\n\n## 결정\nd\n' }));
  assert.ok(r.errors.some(e => e.includes('결과')));
});
test('decision with all headings passes', () => {
  const r = validate(fixture({ decision: '# 0001. x\n\n## 상태\n\n## 맥락\n\n## 결정\n\n## 결과\n' }));
  assert.deepEqual(r.errors, []);
});
const NAR = {
  id: 'nar-stem-qual-exam-1', track: '이공', stage: 'qualifying', theme: 'exam-anxiety',
  summary: '자격시험 전날 실험 장비가 고장나 지도교수와 일정을 조정한다.', quote: '',
  source_id: 'krivet-2025-phd', page_or_url: 'p.12', year: 2024, checked_on: '2026-10-13', confidence: 'verified'
};
function narFixture(rec) {
  const root = fixture();
  mkdirSync(join(root, 'data/packs/narratives/stem'), { recursive: true });
  writeFileSync(join(root, 'data/packs/narratives/stem/records.json'), JSON.stringify([rec]));
  return root;
}
test('narrative record passes', () => {
  assert.deepEqual(validate(narFixture(NAR)).errors, []);
});
test('narrative long quote fails', () => {
  const r = validate(narFixture({ ...NAR, quote: 'a b c d e f g h i j k l m n o p' }));
  assert.ok(r.errors.some(e => e.includes('quote')));
});
test('narrative stage outside the list fails', () => {
  const r = validate(narFixture({ ...NAR, stage: 'not-a-stage' }));
  assert.ok(r.errors.some(e => e.includes('stage')));
});
test('narrative bad track fails', () => {
  const r = validate(narFixture({ ...NAR, track: '예체능' }));
  assert.ok(r.errors.some(e => e.includes('track')));
});
test('broken relative link fails', () => {
  const r = validate(fixture({ md: '[x](./missing.md)' }));
  assert.ok(r.errors.some(e => e.includes('missing.md')));
});
test('external and anchor links are ignored', () => {
  const r = validate(fixture({ md: '[a](https://x.y) [b](#sec)' }));
  assert.deepEqual(r.errors, []);
});
test('links inside code fences and inline code are ignored', () => {
  const r = validate(fixture({ md: '```\n[x](./missing.md)\n```\nand `[y](./gone.md)`' }));
  assert.deepEqual(r.errors, []);
});
test('a backtick triple inside a fenced line does not close the fence', () => {
  const r = validate(fixture({ md: "```js\nconst s = '```\\n[x](./missing.md)';\n[y](./gone.md)\n```\n" }));
  assert.deepEqual(r.errors, []);
});
test("record citing a -portal source_id fails", () => {
  const portal = { ...SRC, id: "kci-2026-portal" };
  const r = validate(fixture({ records: [{ ...REC, source_id: "kci-2026-portal" }], sources: [SRC, portal] }));
  assert.ok(r.errors.some(e => e.includes("portal")));
});
test('sources in data/sources/registry.d/*.json are accepted as source_ids', () => {
  const root = fixture({ sources: [] });
  mkdirSync(join(root, 'data/sources/registry.d'), { recursive: true });
  writeFileSync(join(root, 'data/sources/registry.d/issue-99.json'), JSON.stringify([SRC]));
  writeFileSync(join(root, 'data/packs/statistics/records.json'), JSON.stringify([REC]));
  assert.deepEqual(validate(root).errors, []);
});
test('duplicate source id across registry.json and registry.d fails', () => {
  const root = fixture({ sources: [SRC] });
  mkdirSync(join(root, 'data/sources/registry.d'), { recursive: true });
  writeFileSync(join(root, 'data/sources/registry.d/issue-99.json'), JSON.stringify([SRC]));
  const r = validate(root);
  assert.ok(r.errors.some(e => e.includes('duplicate id')));
});

test('same url under two source ids across registry.json and registry.d fails, naming both ids', () => {
  const root = fixture({ sources: [SRC] });
  mkdirSync(join(root, 'data/sources/registry.d'), { recursive: true });
  writeFileSync(join(root, 'data/sources/registry.d/issue-99.json'), JSON.stringify([{ ...SRC, id: 'other-id', url: 'HTTPS://WWW.X/' }]));
  const r = validate(root);
  assert.ok(r.errors.some(e => e.includes('duplicate url') && e.includes('krivet-2025-phd') && e.includes('other-id')));
});
test('different urls under different source ids pass the duplicate-url check', () => {
  const root = fixture({ sources: [SRC, { ...SRC, id: 'other-id', url: 'https://y' }] });
  assert.ok(!validate(root).errors.some(e => e.includes('duplicate url')));
});

const NAR_HS = {
  id: 'nar-hs-funding-4', track: '인문사회', stage: 'funding', theme: 'x',
  summary: 's', quote: '', source_id: 'krivet-2025-phd', page_or_url: 'p.1', year: 2024, checked_on: '2026-10-13', confidence: 'verified'
};
test('spec citing a record id pattern that matches no record fails', () => {
  const r = validate(fixture({ records: [REC], spec: 'ratio is `statistics-regular-share-<field>` here' }));
  assert.ok(r.errors.some(e => e.includes('no record matches id pattern') && e.includes('statistics-regular-share-<field>')));
});
test('spec id patterns with {a,b} alternation match existing records and narratives', () => {
  const rec = id => ({ ...REC, id });
  const root = fixture({
    records: [rec('statistics-employed-ict'), rec('statistics-employed-social')],
    narratives: [NAR_HS, { ...NAR_HS, id: 'nar-hs-funding-6' }],
    spec: 'see `statistics-employed-{ict,social}`, `nar-hs-funding-{4,6}`, `statistics-employed-*` and `statistics-employed-ict`.'
  });
  assert.deepEqual(validate(root).errors, []);
});
test('an alternative that matches no record fails even when its sibling exists', () => {
  const r = validate(fixture({ records: [{ ...REC, id: 'statistics-employed-ict' }], spec: '`statistics-employed-{ict,social}`' }));
  assert.ok(r.errors.some(e => e.includes('statistics-employed-social')));
});
test('id mentions inside code fences and non-id backticks are ignored', () => {
  const r = validate(fixture({ spec: '```\n`statistics-nope-1`\n```\n`other-token` `ratio`' }));
  assert.deepEqual(r.errors, []);
});
test('text pack items need creative: true and their fields (#58)', () => {
  const root = fixture();
  mkdirSync(join(root, 'data/text'), { recursive: true });
  writeFileSync(join(root, 'data/text/news.ko.json'), JSON.stringify([
    { id: 'a', type: 't', headline: 'h', body: 'b', creative: true },
    { id: 'b', type: 't', headline: 'h', body: '' },
  ]));
  const r = validate(root);
  assert.ok(r.errors.some(e => e.includes('[1]: creative must be true')));
  assert.ok(r.errors.some(e => e.includes('[1]: missing body')));
  assert.ok(!r.errors.some(e => e.includes('[0]')));
});
test('scene pack items need at, key, text and refs (#57)', () => {
  const root = fixture();
  mkdirSync(join(root, 'data/text'), { recursive: true });
  writeFileSync(join(root, 'data/text/scenes.ko.json'), JSON.stringify([
    { id: 'a', at: 'log', key: 'log.degree', text: 't', refs: ['assumed'], creative: true },
    { id: 'b', at: 'log', key: 'log.degree', text: 't', refs: [], creative: true },
    { id: 'c', at: 'log', text: 't', refs: ['assumed'], creative: true },
  ]));
  const r = validate(root);
  assert.ok(r.errors.some(e => e.includes('[1]: scenes need refs')));
  assert.ok(r.errors.some(e => e.includes('[2]: missing key')));
  assert.ok(!r.errors.some(e => e.includes('[0]')));
});
