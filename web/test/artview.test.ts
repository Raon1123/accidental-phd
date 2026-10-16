// 픽셀 그림의 화면 규칙(#152 docs/design/pixel-scenes.md §4): 잘라 쓰는 부분, 최근 사건.
import { describe, expect, it } from 'vitest';
import { createLife, newSeed, type LifeState } from '../../engine/src/browser';
import { loadData } from '../../engine/src/index';
import { WIDE_W, cropOf, latestEvent } from '../src/artview';
import { SCENE_H, SCENE_W, scenePerson, type SceneStage } from '../src/pixel';
import { notes } from '../src/play';
import { ko } from '../src/strings.ko';

const data = loadData();
const STAGES: SceneStage[] = ['phd', 'career', 'retire'];
const base = createLife({ track: 'computer', auto: true }, newSeed('artview'), data);
const entry = (month: number, textKey: string) => ({ month, textKey, tags: [] as string[], creative: false });
const withLog = (log: ReturnType<typeof entry>[], over: Partial<LifeState> = {}): LifeState => ({ ...base, ...over, log });

describe('crops (#152)', () => {
  it('the portrait is 48 wide, inside the 96×40 scene, and holds the person and the bubble', () => {
    for (const st of STAGES) {
      const c = cropOf('portrait', st);
      const p = scenePerson(st);
      expect(c.w, st).toBe(48);
      expect(c.h, st).toBe(SCENE_H);
      expect(c.x >= 0 && c.x + c.w <= SCENE_W, st).toBe(true);
      expect(c.x <= p.x && p.x + 8 <= c.x + c.w, `${st} person`).toBe(true);
      const bx = p.x + 7;   // 말풍선은 16칸이고 인물 왼쪽에서 7칸 오른쪽에서 시작한다(sceneRects 와 같은 규칙)
      expect(c.x <= bx && bx + 16 <= c.x + c.w, `${st} bubble`).toBe(true);
    }
  });
  it('the strip is the bottom 16 rows of the 160-wide scene', () => {
    for (const st of STAGES) expect(cropOf('strip', st)).toEqual({ x: 0, y: SCENE_H - 16, w: WIDE_W, h: 16 });
  });
});

describe('latest event (#152)', () => {
  it('is the newest line that has an icon, with its calendar date', () => {
    const s = withLog([entry(0, 'life.start'), entry(1, 'log.month'), entry(30, 'log.qual-pass'), entry(31, 'log.month')]);
    const e = latestEvent(notes(s, ko), ko)!;
    expect(e.key).toBe('log.qual-pass');
    expect(e.icon).toBe('star');
    expect(e.month).toBe(30);
    expect(e.line.startsWith('2029년 9월 · ')).toBe(true);
    expect(e.line).toContain(ko.texts['log.qual-pass']);
  });
  it('ignores the monthly line and falls back to the enrolment', () => {
    const s = withLog([entry(0, 'life.start'), entry(5, 'log.month')]);
    expect(latestEvent(notes(s, ko), ko)?.key).toBe('life.start');
  });
  it('is undefined when nothing has an icon', () => {
    expect(latestEvent([], ko)).toBeUndefined();
    expect(latestEvent(notes(withLog([entry(3, 'log.month')]), ko), ko)).toBeUndefined();
  });
  it('a creative line carries the creative mark', () => {
    const list = notes(withLog([entry(0, 'life.start')]), ko).map(n => ({ ...n, creative: true }));
    expect(latestEvent(list, ko)!.line.endsWith(`[${ko.play.creative}]`)).toBe(true);
  });
});
