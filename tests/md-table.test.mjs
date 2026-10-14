import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readTable, toObjects } from '../scripts/md-table.mjs';

test('reads 22 rows from agency §10 and 87 from §11; unknown heading throws', () => {
  const spec = 'docs/superpowers/specs/2026-10-13-agency-model-design.md';
  assert.equal(readTable(spec, '## 10. `same_unit_as` 규칙', 0).rows.length, 22);
  assert.equal(readTable(spec, '## 11. 학과 엔진 키 형식', 0).rows.length, 87);
  assert.throws(() => readTable(spec, '## 99. 없음', 0), /heading not found/);
});

const FIXTURE = [
  '# Doc', '',
  '| ignored | table |', '|---|---|', '| x | y |', '',
  '## A', '',
  '| k | v |', '|---|---|', '| `a` | 1 |', '| b | 2 |', '',
  'text between', '',
  '| p | q | r |', '| :-- | --: | --- |', '| 1 | 2 | 3 |', '',
  '### A.1', '',
  '| nested |', '|---|', '| n1 |', '',
  '```', '| fenced |', '|---|', '| f1 |', '```', '',
  '## B', '',
  '| sibling |', '|---|', '| s1 |', '| s2 |', '', ''
].join('\n');

function fixtureFile() {
  const p = join(mkdtempSync(join(tmpdir(), 'mdt-')), 'f.md');
  writeFileSync(p, FIXTURE);
  return p;
}

test('tableIndex picks the nth table inside the section only', () => {
  const f = fixtureFile();
  const t0 = readTable(f, '## A', 0);
  assert.deepEqual(t0.header, ['k', 'v']);
  assert.deepEqual(t0.rows, [['`a`', '1'], ['b', '2']]);
  const t1 = readTable(f, '## A', 1);
  assert.deepEqual(t1.header, ['p', 'q', 'r']);
  assert.deepEqual(t1.rows, [['1', '2', '3']]);
});

test('subsection tables belong to the section; fenced tables and sibling sections do not', () => {
  const f = fixtureFile();
  assert.deepEqual(readTable(f, '## A', 2).header, ['nested']);
  assert.throws(() => readTable(f, '## A', 3), /out of range/);
  assert.deepEqual(readTable(f, '## B', 0).rows, [['s1'], ['s2']]);
  assert.throws(() => readTable(f, '## B', 1), /out of range/);
  assert.throws(() => readTable(f, '## C', 0), /heading not found/);
});

test('toObjects maps header cells to row cells', () => {
  const f = fixtureFile();
  assert.deepEqual(toObjects(readTable(f, '## A', 0)), [{ k: '`a`', v: '1' }, { k: 'b', v: '2' }]);
});
