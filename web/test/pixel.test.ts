// 픽셀 그림(#151, docs/design/pixel-scenes.md): 그림 지도 모양, 기록 → 아이콘, 색은 토큰만.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createLife, newSeed } from '../../engine/src/browser';
import { loadData } from '../../engine/src/index';
import { notes } from '../src/play';
import { ICONS, PAL, SCENE_H, iconOf, iconRects, isBigEvent, sceneOf, scenePerson, sceneRects, spriteRects, type Icon, type SceneStage } from '../src/pixel';
import { ko } from '../src/strings.ko';

const data = loadData();

describe('icons (#151)', () => {
  it('every icon map is 12×12 and uses only palette letters', () => {
    for (const [name, map] of Object.entries(ICONS)) {
      expect(map.length, name).toBe(12);
      for (const row of map) {
        expect(row.length, `${name} ${row}`).toBe(12);
        for (const ch of row) expect(ch === '.' || ch in PAL, `${name} ${ch}`).toBe(true);
      }
    }
  });
  it('spriteRects merges runs of one letter in a row and skips dots', () => {
    expect(spriteRects(['yy.k'], 2, 3)).toEqual([
      { x: 2, y: 3, w: 2, h: 1, c: 'px-sun' },
      { x: 5, y: 3, w: 1, h: 1, c: 'px-ink' },
    ]);
  });
  it('iconRects stays inside 12×12 and names token colors only', () => {
    for (const name of Object.keys(ICONS) as Icon[]) {
      for (const r of iconRects(name)) {
        expect(r.x >= 0 && r.y >= 0 && r.x + r.w <= 12 && r.y + r.h <= 12, `${name}`).toBe(true);
        expect(r.c).toMatch(/^[a-z0-9-]+$/);
      }
    }
  });
});

describe('note → icon (#151)', () => {
  it('known keys get their own picture', () => {
    expect(iconOf('log.qual-pass', 'good')).toBe('star');
    expect(iconOf('log.promotion', 'good')).toBe('star');
    expect(iconOf('log.degree', 'good')).toBe('degree');
    expect(iconOf('log.defense-pass', 'good')).toBe('degree');
    expect(iconOf('log.hired', 'good')).toBe('hired');
    expect(iconOf('life.start', 'start')).toBe('start');
    expect(iconOf('log.retired', 'end')).toBe('end');
    expect(iconOf('log.end-age80', 'end')).toBe('end');
  });
  it('other keys follow their kind, so a new engine key still gets a picture', () => {
    expect(iconOf('log.laid-off', 'bad')).toBe('fail');
    expect(iconOf('leave.start', 'leave')).toBe('leave');
    expect(iconOf('news.anything', 'news')).toBe('news');
    expect(iconOf('decision.qual-fail.A', 'decision')).toBe('decision');
  });
  it('scene and plain lines get no picture', () => {
    expect(iconOf('log.degree', 'scene')).toBeUndefined();
    expect(iconOf('log.career-year', 'plain')).toBeUndefined();
  });
  it('notes() carries the log key on every line, scene lines included', () => {
    const s = createLife({ track: 'computer', auto: true }, newSeed('pixel'), data);
    const list = notes(s, ko);
    expect(list.length).toBeGreaterThan(0);
    for (const n of list) expect(s.log.some(e => e.textKey === n.key), n.key).toBe(true);
  });
});

const STAGES: SceneStage[] = ['phd', 'career', 'retire'];

describe('scenes (#151)', () => {
  it('centered scenes stay inside the box at several widths, bubble included', () => {
    for (const st of STAGES) for (const width of [96, 128, 160]) {
      for (const r of sceneRects(st, { width, bubble: 'star' })) {
        expect(r.x >= 0 && r.y >= 0 && r.x + r.w <= width && r.y + r.h <= SCENE_H, `${st} ${width} ${JSON.stringify(r)}`).toBe(true);
      }
    }
  });
  it('a person stands in each scene', () => {
    for (const st of STAGES) {
      const p = scenePerson(st);
      expect(p.x).toBeGreaterThan(0);
      expect(p.y).toBeGreaterThanOrEqual(17);
    }
  });
  it('the same arguments return the cached list', () => {
    expect(sceneRects('phd', { width: 96 })).toBe(sceneRects('phd', { width: 96 }));
  });
  it('stage → scene covers every engine stage', () => {
    const base = { career: undefined, log: [] as { month: number; textKey: string; tags: string[]; creative: boolean }[] };
    expect(sceneOf({ ...base, stage: 'pre' })).toBeUndefined();
    expect(sceneOf({ ...base, stage: 'phd' })).toBe('phd');
    expect(sceneOf({ ...base, stage: 'career' })).toBe('career');
    expect(sceneOf({ ...base, stage: 'retired' })).toBe('retire');
    expect(sceneOf({ ...base, stage: 'end' })).toBe('phd');
    expect(sceneOf({ ...base, stage: 'end', career: {} as never })).toBe('career');
    expect(sceneOf({ ...base, stage: 'end', log: [{ month: 9, textKey: 'log.retired', tags: [], creative: false }] })).toBe('retire');
  });
  it('big events are enrolment, degree, hiring, retirement and every record end', () => {
    for (const k of ['life.start', 'log.degree', 'log.hired', 'log.retired', 'log.end-age80', 'log.end-financial']) expect(isBigEvent(k), k).toBe(true);
    for (const k of ['log.qual-pass', 'news.x', 'decision.qual-fail.A', 'log.month']) expect(isBigEvent(k), k).toBe(false);
  });
});

describe('pixel color tokens (#151)', () => {
  const css = readFileSync(resolve(__dirname, '../src/style.css'), 'utf8');
  const defined = (block: string) => new Set([...block.matchAll(/--([a-z0-9-]+):/g)].map(m => m[1]!));
  const lightBlocks = [...css.matchAll(/(?:^|\n):root\s*\{([^}]*)\}/g)].map(m => m[1]!).join('\n');
  const darkBlocks = [...css.matchAll(/prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([^}]*)\}/g)].map(m => m[1]!).join('\n');
  const used = new Set<string>();
  for (const name of Object.keys(ICONS) as Icon[]) for (const r of iconRects(name)) used.add(r.c);
  for (const st of STAGES) for (const r of sceneRects(st, { width: 160, bubble: 'star' })) used.add(r.c);

  it('every color the pictures use is a token defined in a light :root block', () => {
    const light = defined(lightBlocks);
    for (const c of used) expect(light.has(c), c).toBe(true);
  });
  it('scene colors are redefined for the dark theme (night scenes)', () => {
    const dark = defined(darkBlocks);
    for (const c of used) if (/^(lab|car|ret)-/.test(c)) expect(dark.has(c), c).toBe(true);
  });
  it('icons sit on a tile that every icon color stands out from, in both themes (review of #151)', () => {
    // 아이콘 색(잉크·흰 종이·노랑…)은 테마와 상관없이 같으므로, 페이지 배경이 아니라 타일과의 대비가 아이콘을 보이게 한다.
    expect(css).toMatch(/\.px-icon\s*\{[^}]*background:\s*var\(--px-tile\)/);
    const hex = (block: string, name: string) => new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(block)?.[1];
    const lum = (h: string) => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!; };
    const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };
    const iconColors = new Set<string>();
    for (const name of Object.keys(ICONS) as Icon[]) for (const r of iconRects(name)) iconColors.add(r.c);
    for (const block of [lightBlocks, darkBlocks]) {
      const tile = hex(block, 'px-tile');
      expect(tile, 'px-tile defined').toBeDefined();
      for (const c of iconColors) expect(ratio(hex(block, c) ?? hex(lightBlocks, c)!, tile!), `${c} on tile`).toBeGreaterThanOrEqual(1.4);
    }
  });
});

describe('icons on screen (#151)', () => {
  const css = readFileSync(resolve(__dirname, '../src/style.css'), 'utf8');
  const main = readFileSync(resolve(__dirname, '../src/main.ts'), 'utf8');
  it('the kind label is hidden only while an icon is shown, and comes back when pictures are off', () => {
    expect(css).toMatch(/html:not\(\[data-art="off"\]\) \.px-icon \+ \.note-kind\s*\{[^}]*clip/);
    expect(css).toMatch(/html\[data-art="off"\] \.px-icon/);
  });
  it('icons are drawn with SVG elements, never innerHTML, and are hidden from screen readers', () => {
    expect(main).not.toMatch(/innerHTML/);
    expect(main).toMatch(/createElementNS\(SVG_NS, 'rect'\)/);
    expect(main).toMatch(/aria-hidden', 'true'/);
  });
});
