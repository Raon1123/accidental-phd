// 픽셀 그림(#151, docs/design/pixel-scenes.md): 그림 지도 모양, 기록 → 아이콘, 색은 토큰만.
import { describe, expect, it } from 'vitest';
import { createLife, newSeed } from '../../engine/src/browser';
import { loadData } from '../../engine/src/index';
import { notes } from '../src/play';
import { ICONS, PAL, iconOf, iconRects, spriteRects, type Icon } from '../src/pixel';
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
