#!/usr/bin/env node
// 엔진 소스의 `0014#n` 주석을 모아 결정 기록 0014 의 번호 1..MAX (119 + Wave 4 추가분)와 대조한다.
//  - 범위 밖 번호가 있으면 exit 1.
//  - 소스에 없는 번호마다 engine/README.md 에 `| n | … | UI 전용 또는 엔진 밖 … |` 행이 있어야 한다. 없으면 exit 1.
// Usage: node scripts/check-assumed.mjs [rootDir]
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX = 135;   // 0014 #120·#121 Wave 4, #122–#130 Wave 5, #131·#132 Wave 6(씀씀이, 학자금대출 순서), #133–#135 계약 기간·해고(#84)

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

export function check(root) {
  const lines = [];
  const srcDir = join(root, 'engine/src');
  if (!existsSync(srcDir)) return { code: 1, lines: ['engine/src does not exist yet'] };
  const found = new Set();
  for (const f of walk(srcDir)) for (const m of readFileSync(f, 'utf8').matchAll(/0014#(\d+)/g)) found.add(Number(m[1]));
  const missing = [];
  for (let n = 1; n <= MAX; n++) if (!found.has(n)) missing.push(n);
  const outOfRange = [...found].filter(n => n < 1 || n > MAX).sort((a, b) => a - b);
  lines.push(`missing: [${missing.join(', ')}]`, `out-of-range: [${outOfRange.join(', ')}]`);
  let code = outOfRange.length ? 1 : 0;

  const readme = join(root, 'engine/README.md');
  const justified = new Set();
  if (existsSync(readme)) {
    for (const line of readFileSync(readme, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*\|\s*#?(\d+)\s*\|(.*)\|\s*$/);
      if (m && /UI 전용|엔진 밖/.test(m[2])) justified.add(Number(m[1]));
    }
  } else if (missing.length) {
    lines.push('engine/README.md is missing');
    code = 1;
  }
  const unexplained = missing.filter(n => !justified.has(n));
  if (existsSync(readme) && unexplained.length) {
    lines.push(`no "UI 전용"/"엔진 밖" row in engine/README.md for: [${unexplained.join(', ')}]`);
    code = 1;
  }
  if (!code) lines.push(`check-assumed: ok (${found.size} numbers cited in engine/src, ${missing.length} explained in engine/README.md)`);
  return { code, lines };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { code, lines } = check(resolve(process.argv[2] ?? '.'));
  for (const l of lines) console.log(l);
  process.exit(code);
}
