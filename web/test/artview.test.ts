// 픽셀 그림의 화면 규칙(#152 docs/design/pixel-scenes.md §4): 잘라 쓰는 부분, 최근 사건.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createLife, newSeed, type LifeState } from '../../engine/src/browser';
import { loadData } from '../../engine/src/index';
import { WIDE_W, cropOf, latestEvent } from '../src/artview';
import { SCENE_H, SCENE_W, scenePerson, type SceneStage } from '../src/pixel';
import { notes } from '../src/play';
import { ko } from '../src/strings.ko';
import { blocks, fnBody, ruleBody, stripBlocks } from './helpers';

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

const css = readFileSync(resolve(__dirname, '../src/style.css'), 'utf8');
const main = readFileSync(resolve(__dirname, '../src/main.ts'), 'utf8');
const wide = blocks(css, '@media (min-width: 64rem)').join('\n');
// 여백 풍경은 본문 바깥 여백이 생기는 76rem 부터(#152 검토: 64–76rem 에서는 본문이 화면을 채운다)
const scenery = blocks(css, '@media (min-width: 76rem)').join('\n');

describe('portrait window (#152)', () => {
  it('every scene has a Korean description for screen readers, and none names a real institution', () => {
    for (const st of STAGES) {
      expect(ko.art.scene[st], st).toMatch(/[가-힣]/);
      expect(ko.art.scene[st], st).not.toMatch(/대학교|연구원|KAIST|POSTECH/);
    }
  });
  it('a labelled SVG is a role=img with its description; an unlabelled one stays hidden from screen readers', () => {
    const body = fnBody(main, 'pixelSvg');
    expect(body).toMatch(/setAttribute\('role', 'img'\)/);
    expect(body).toMatch(/setAttribute\('aria-label', opts\.label\)/);
    expect(body).toMatch(/setAttribute\('aria-hidden', 'true'\)/);
  });
  it('the portrait is labelled with the stage description and shows the latest event icon as a bubble', () => {
    const body = fnBody(main, 'portraitEl');
    expect(body).toMatch(/t\.art\.scene\[stage\]/);
    expect(body).toMatch(/bubble: recent\?\.icon/);
    expect(body).toMatch(/figcaption/);
    expect(body).toMatch(/px-scene portrait/);
  });
  it('the portrait sits above the money card content, and is shown only from 64rem up', () => {
    expect(ruleBody(css, '.portrait')).toMatch(/display:\s*none/);
    expect(wide).toMatch(/\.portrait\s*\{[^}]*display:\s*block/);
    const card = fnBody(main, 'renderMoneyCard');
    expect(card.indexOf('portraitEl(')).toBeGreaterThan(-1);
    expect(card.indexOf('portraitEl(')).toBeLessThan(card.indexOf('glanceRows('));
  });
  it('the caption uses the normal text color', () => {
    expect(ruleBody(css, '.portrait figcaption')).toMatch(/color:\s*var\(--fg\)/);
  });
  it('the portrait is hidden by the picture setting (lite and off), not by an id rule that would outrank it', () => {
    expect(css).toMatch(/html\[data-art="lite"\] \.px-scene/);
    expect(css).not.toMatch(/#portrait|#money\s+\.portrait\s*\{[^}]*display/);
  });
  it('the feed gets the note list from renderInner, so the log is turned into notes once per render', () => {
    expect(main).toMatch(/function renderFeed\(root: HTMLElement, list: readonly Note\[\]\)/);
    expect(fnBody(main, 'renderInner')).toMatch(/recent = latestEvent\(list, t\)/);
  });
});

const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8');
const lightRoot = css.match(/(?:^|\n):root\s*\{([^}]*)\}/g)!.join('\n');
const darkRoot = [...css.matchAll(/prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([^}]*)\}/g)].map(m => m[1]!).join('\n');
const defines = (block: string, token: string): boolean => new RegExp(`--${token}:`).test(block);

describe('margin scenery (#152)', () => {
  it('the backdrop is an empty, decorative element in index.html', () => {
    expect(html).toMatch(/<div id="backdrop" class="backdrop px-scene" aria-hidden="true"><\/div>/);
  });
  it('the body stays opaque, so scenery shows only in the margins', () => {
    expect(ruleBody(css, 'body')).toMatch(/background:\s*var\(--bg\)/);
    expect(wide).not.toMatch(/(^|\s)body\s*\{[^}]*background/);
  });
  it('the html background takes the scene color only on wide screens and only when pictures are full', () => {
    const rules = [...scenery.matchAll(/html\[data-art="full"\]\[data-scene="(\w+)"\]\s*\{\s*background:\s*var\(--([a-z0-9-]+)\)/g)];
    expect(rules.map(m => m[1]).sort()).toEqual(['career', 'phd', 'retire']);
    for (const m of rules) {
      expect(defines(lightRoot, m[2]!), `light ${m[2]}`).toBe(true);
      expect(defines(darkRoot, m[2]!), `dark ${m[2]} (night colors)`).toBe(true);
    }
    expect(stripBlocks(css, '@media (min-width: 76rem)')).not.toMatch(/html\[data-art="full"\]\[data-scene/);
  });
  it('the strip is fixed to the bottom, behind the body, ignores the pointer, and is hidden until the margins appear (76rem)', () => {
    const rule = ruleBody(css, '.backdrop')!;
    expect(rule).toMatch(/display:\s*none/);
    const w = ruleBody(scenery, '.backdrop')!;
    expect(w).toMatch(/display:\s*block/);
    expect(w).toMatch(/position:\s*fixed/);
    expect(w).toMatch(/bottom:\s*0/);
    expect(w).toMatch(/z-index:\s*-1/);
    expect(w).toMatch(/pointer-events:\s*none/);
  });
  it('the strip svg is decoration (no label) cropped from the 160-wide scene, and data-scene follows the stage', () => {
    const body = fnBody(main, 'renderBackdrop');
    expect(body).toMatch(/sceneRects\(stage, \{ width: WIDE_W \}\)/);
    expect(body).toMatch(/cropOf\('strip', stage\)/);
    expect(body).toMatch(/undefined, 'xMidYMax slice'/);
    expect(body).toMatch(/dataset\.scene = stage/);
    expect(body).toMatch(/delete document\.documentElement\.dataset\.scene/);
  });
  it('the strip is redrawn only when the stage changes', () => {
    expect(fnBody(main, 'renderBackdrop')).toMatch(/dataset\.stage/);
  });
});
