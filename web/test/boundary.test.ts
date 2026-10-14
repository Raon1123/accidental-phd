// web/ 은 엔진을 공개 진입점(engine/src/browser.ts)으로만 부르고, 그 진입점이 닿는 엔진 파일은 Node 모듈을 쓰지 않는다.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const IMPORT_RE = /(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]/g;
const specs = (file: string) => [...readFileSync(file, 'utf8').matchAll(IMPORT_RE)].map(m => (m[1] ?? m[2])!);
const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.ts') ? [join(dir, e.name)] : []));

describe('web → engine boundary (#53)', () => {
  it('web/src imports engine only through engine/src/browser', () => {
    const bad: string[] = [];
    for (const f of walk(join(root, 'web', 'src'))) {
      for (const s of specs(f)) if (s.includes('engine/') && !/engine\/src\/browser$/.test(s)) bad.push(`${f}: ${s}`);
    }
    expect(bad).toEqual([]);
  });
  it('no engine file reachable from browser.ts imports a node: module', () => {
    const seen = new Set<string>();
    const nodeImports: string[] = [];
    const visit = (file: string) => {
      if (seen.has(file)) return;
      seen.add(file);
      for (const s of specs(file)) {
        if (s.startsWith('node:')) nodeImports.push(`${file}: ${s}`);
        else if (s.startsWith('.')) visit(resolve(dirname(file), s) + '.ts');
      }
    };
    visit(join(root, 'engine', 'src', 'browser.ts'));
    expect(seen.size).toBeGreaterThan(20);
    expect(nodeImports).toEqual([]);
  });
});
