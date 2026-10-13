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

function fixture({ records = [], sources = [SRC], decision = null, md = null } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'aphd-'));
  mkdirSync(join(root, 'data/sources'), { recursive: true });
  mkdirSync(join(root, 'data/packs/statistics'), { recursive: true });
  mkdirSync(join(root, 'docs/design/decisions'), { recursive: true });
  writeFileSync(join(root, 'data/sources/registry.json'), JSON.stringify(sources));
  writeFileSync(join(root, 'data/packs/statistics/records.json'), JSON.stringify(records));
  if (decision !== null) writeFileSync(join(root, 'docs/design/decisions/0001-x.md'), decision);
  if (md !== null) writeFileSync(join(root, 'docs/a.md'), md);
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
