#!/usr/bin/env node
// 절 단위 markdown 표 파서. 의존성 없음.
//
// 읽을 범위: 제목 줄이 `heading` 과 (trim 후) 정확히 같은 줄부터, 같은 수준 이상
// (`#` 개수가 같거나 적은) 다음 제목 전까지. 하위 제목(`###` 등)의 표는 범위에 포함된다.
// 코드 펜스 안의 줄은 제목·표로 읽지 않는다.
//
// 이 파서로 데이터를 고치는 스크립트의 규칙 (Wave 3 회고, 결정 기록 0015 (2)):
//   1. 쓰기 전에 읽은 행 수가 기대 건수와 다르면 아무것도 쓰지 않고 중단한다.
//   2. 바꾼 레코드마다, 바꾸려던 마커 밖에서 사라진 문장 수를 출력한다
//      (scripts/compare-notes.mjs 참고). 그 수는 0 이어야 하고, 0 이라는 출력을 PR 본문에 붙인다.
//
// 사용: node scripts/md-table.mjs <file> "<heading>" [index] [--json]
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const FENCE_RE = /^\s*(`{3,}|~{3,})/;
const HEADING_RE = /^(#{1,6})\s/;

function splitCells(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map(c => c.trim());
}
const isTableLine = l => l.trim().startsWith('|');
const isSeparator = l => /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/.test(l) && l.includes('-');

export function sectionLines(file, heading) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  const want = heading.trim();
  const level = (want.match(HEADING_RE) ?? [])[1]?.length;
  if (!level) throw new Error(`heading not found: ${heading} (not a markdown heading)`);
  let fence = null, start = -1;
  const out = [];
  for (const line of lines) {
    const f = line.match(FENCE_RE);
    if (f) {
      if (!fence) fence = f[1][0];
      else if (f[1][0] === fence) fence = null;
      if (start >= 0) out.push(line);
      continue;
    }
    if (!fence) {
      const h = line.match(HEADING_RE);
      if (start < 0) { if (h && line.trim() === want) start = 1; continue; }
      if (h && h[1].length <= level) break;
    }
    if (start >= 0) out.push(line);
  }
  if (start < 0) throw new Error(`heading not found: ${heading} in ${file}`);
  return out;
}

export function readTable(file, heading, tableIndex = 0) {
  const lines = sectionLines(file, heading);
  const tables = [];
  let cur = null, fence = null;
  for (const line of lines) {
    const f = line.match(FENCE_RE);
    if (f) { fence = !fence ? f[1][0] : (f[1][0] === fence ? null : fence); cur = null; continue; }
    if (fence) continue;
    if (!isTableLine(line)) { cur = null; continue; }
    if (!cur) { cur = { header: splitCells(line), rows: [], sep: false }; tables.push(cur); continue; }
    if (!cur.sep && isSeparator(line)) { cur.sep = true; continue; }
    if (isSeparator(line)) continue;
    cur.rows.push(splitCells(line));
  }
  const real = tables.filter(t => t.sep);
  if (tableIndex >= real.length) throw new Error(`table index ${tableIndex} out of range: section ${heading} has ${real.length} table(s)`);
  const { header, rows } = real[tableIndex];
  return { header, rows };
}

export function toObjects({ header, rows }) {
  return rows.map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const pos = args.filter(a => !a.startsWith('--'));
  if (pos.length < 2) { console.error('usage: md-table.mjs <file> "<heading>" [index] [--json]'); process.exit(2); }
  try {
    const t = readTable(pos[0], pos[1], pos[2] === undefined ? 0 : Number(pos[2]));
    if (json) console.log(JSON.stringify(toObjects(t), null, 2));
    else { console.log(t.header.join(' | ')); for (const r of t.rows) console.log(r.join(' | ')); console.error(`${t.rows.length} rows`); }
  } catch (e) { console.error(e.message); process.exit(1); }
}
