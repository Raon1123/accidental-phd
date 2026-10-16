// 픽셀 그림의 화면 규칙(#152 docs/design/pixel-scenes.md §4): 잘라 쓰는 부분, 최근 사건.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createLife, newSeed, type LifeState } from '../../engine/src/browser';
import { loadData } from '../../engine/src/index';
import { AUTO_SKIP_SPEED, WIDE_W, bigIcon, bigSceneAfter, cropOf, latestEvent, moneyFoldOpen, moneySummary, newBigEntry, showsBigScene, statusBarView } from '../src/artview';
import { SCENE_H, SCENE_W, scenePerson, type SceneStage } from '../src/pixel';
import { notes, statusLine, wonText } from '../src/play';
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

describe('mobile status line (#153)', () => {
  it('the status crop is 24×24, inside the 96×40 scene, and holds the whole person', () => {
    for (const st of STAGES) {
      const c = cropOf('status', st);
      const p = scenePerson(st);
      expect([c.w, c.h], st).toEqual([24, 24]);
      expect(c.x >= 0 && c.x + c.w <= SCENE_W && c.y >= 0 && c.y + c.h <= SCENE_H, st).toBe(true);
      expect(c.x <= p.x && p.x + 8 <= c.x + c.w, `${st} width`).toBe(true);
      expect(c.y <= p.y && p.y + 12 <= c.y + c.h, `${st} height`).toBe(true);
    }
  });
  it('shows the stage sentence, then age, elapsed time and cash', () => {
    const s = withLog([], { stage: 'phd', month: 40, ageMonths: 27 * 12 + 5, money: { ...base.money, cash: 11_025_000 } });
    const v = statusBarView(s, ko);
    expect(v.line).toBe(statusLine(s, ko));
    expect(v.facts).toEqual([
      `${ko.play.age} 27${ko.play.ageUnit}`,
      `${ko.month} 3년 4개월`,
      `${ko.play.money.cash} ${wonText(11_025_000, ko)}`,
    ]);
    expect(v.facts[2]).toContain('1,102.5');
    expect(v.stage).toBe('phd');
  });
  it('has no picture before the life starts', () => {
    expect(statusBarView(withLog([], { stage: 'pre' }), ko).stage).toBeUndefined();
  });
});

describe('money card fold (#153)', () => {
  it('the summary line carries the cash', () => {
    const s = withLog([], { money: { ...base.money, cash: -2_500_000 } });
    expect(moneySummary(s, ko)).toBe(`${ko.play.money.heading} · ${ko.play.money.cash} ${wonText(-2_500_000, ko)}`);
  });
  it('the open state continues from before the redraw, and starts open only on wide screens', () => {
    expect(moneyFoldOpen(undefined, true)).toBe(true);
    expect(moneyFoldOpen(undefined, false)).toBe(false);
    expect(moneyFoldOpen(false, true)).toBe(false);
    expect(moneyFoldOpen(true, false)).toBe(true);
  });
});

describe('status bar and alert bar (#153)', () => {
  const narrow = blocks(css, '@media not all and (min-width: 64rem)').join('\n');
  it('index.html: the status bar comes right after the skip link and is not focusable; the alert bar is aria-hidden', () => {
    expect(html).toMatch(/<a class="skip" id="skip" href="#main"><\/a>\s*<div id="statusbar" class="statusbar"><\/div>/);
    expect(html).toMatch(/<div id="alertbar" class="alertbar px-scene" aria-hidden="true"><\/div>/);
  });
  it('both bars are hidden by default and shown only below 64rem; the wide layout shows the portrait instead', () => {
    expect(ruleBody(css, '.statusbar')).toMatch(/display:\s*none/);
    expect(ruleBody(css, '.alertbar')).toMatch(/display:\s*none/);
    expect(ruleBody(narrow, '.statusbar')).toMatch(/display:\s*flex/);
    expect(ruleBody(narrow, '.alertbar')).toMatch(/display:\s*flex/);
    expect(wide).not.toMatch(/\.(statusbar|alertbar)\s*\{[^}]*display:\s*(flex|block)/);
  });
  it('the status bar sticks to the top and the alert bar to the bottom, above the content, in the normal text colors', () => {
    const top = ruleBody(narrow, '.statusbar')!;
    expect(top).toMatch(/position:\s*sticky/);
    expect(top).toMatch(/top:\s*0/);
    expect(top).toMatch(/color:\s*var\(--fg\)/);
    expect(top).toMatch(/background:\s*var\(--bg\)/);
    const bottom = ruleBody(narrow, '.alertbar')!;
    expect(bottom).toMatch(/position:\s*fixed/);
    expect(bottom).toMatch(/bottom:\s*0/);
    expect(bottom).toMatch(/color:\s*var\(--fg\)/);
    expect(bottom).toMatch(/background:\s*var\(--bg\)/);
    for (const r of [top, bottom]) expect(r).toMatch(/z-index:\s*\d+/);
  });
  it('the bars do not hide a focused control or a heading scrolled into view (scroll padding at least the bar height)', () => {
    const root = ruleBody(narrow, 'html')!;
    // 상태 줄은 단계 문장과 사실 줄이 각각 두 줄로 꺾이면 약 5.8rem 이 된다(#153 검토). 그보다 넉넉해야 한다.
    expect(Number(/scroll-padding-top:\s*([\d.]+)rem/.exec(root)![1])).toBeGreaterThanOrEqual(6);
    expect(root).toMatch(/scroll-padding-bottom:\s*[\d.]+rem/);
    expect(ruleBody(narrow, 'body')).toMatch(/padding-bottom:\s*[\d.]+rem/);
  });
  it('the skip link, when focused, draws above the fixed status bar (#153 review)', () => {
    const z = (r: string | undefined) => Number(/z-index:\s*(\d+)/.exec(r ?? '')?.[1] ?? 0);
    expect(z(ruleBody(css, '.skip:focus'))).toBeGreaterThan(z(ruleBody(narrow, '.statusbar')));
  });
  it('table boxes keep keyboard focus and sideways scroll across auto-run redraws (#153 review)', () => {
    expect(fnBody(main, 'scrollBox')).toMatch(/dataset\.k = `scroll:\$\{label\}`/);
    expect(fnBody(main, 'render')).toMatch(/scrollLeft/);
  });
  it('display of the bars is set by classes only, so the picture setting can hide them', () => {
    expect(css).not.toMatch(/#(statusbar|alertbar)\s*[,{][^}]*display/);
    expect(css).toMatch(/html\[data-art="off"\] \.px-scene/);
  });
  it('the status bar portrait is a labelled scene that the picture setting hides; its text stays in every mode', () => {
    const body = fnBody(main, 'renderStatusBar');
    expect(body).toMatch(/px-scene sb-portrait/);
    expect(body).toMatch(/cropOf\('status', v\.stage\)/);
    expect(body).toMatch(/t\.art\.scene\[v\.stage\]/);
    expect(body).toMatch(/statusBarView\(life, t\)/);
    expect(ruleBody(narrow, '.sb-portrait')).toMatch(/display:\s*block/);
  });
  it('the alert bar shows the latest event as an icon and a sentence, and creates no live region', () => {
    const body = fnBody(main, 'renderAlertBar');
    expect(body).toMatch(/iconEl\(recent\.icon\)/);
    expect(body).toMatch(/recent\.line/);
    expect(body).not.toMatch(/aria-live|'role'|aria-atomic/);
    expect(fnBody(main, 'renderInner')).toMatch(/renderStatusBar\(document\.getElementById\('statusbar'\)!\)/);
    expect(fnBody(main, 'renderInner')).toMatch(/renderAlertBar\(document\.getElementById\('alertbar'\)!\)/);
  });
  it('the bars are filled after the latest event is known', () => {
    const inner = fnBody(main, 'renderInner');
    expect(inner.indexOf('recent = latestEvent')).toBeLessThan(inner.indexOf('renderAlertBar('));
  });
});

describe('money card fold and tables (#153)', () => {
  it('the card body is a details.fold whose open state continues from the previous draw', () => {
    const body = fnBody(main, 'renderMoneyCard');
    expect(body).toMatch(/host\.querySelector<HTMLDetailsElement>\('details\.fold'\)/);
    expect(body).toMatch(/moneyFoldOpen\(prevFold\?\.open, window\.matchMedia\('\(min-width: 64rem\)'\)\.matches\)/);
    expect(body).toMatch(/moneySummary\(life, t\)/);
    expect(body).toMatch(/dataset\.k = 'money-fold'/);
    expect(main).not.toMatch(/addEventListener\('toggle'/);
  });
  it('the portrait stays above the fold, so it is not folded away on wide screens', () => {
    const body = fnBody(main, 'renderMoneyCard');
    expect(body.indexOf('portraitEl(')).toBeLessThan(body.indexOf("el('details')"));
  });
  it('focus on the summary survives a redraw: the restore also looks inside aside[id]', () => {
    expect(main).toMatch(/closest\('section\[id\], aside\[id\]'\)/);
  });
  it('wide tables scroll inside their own labelled, keyboard-reachable box instead of widening the page', () => {
    const body = fnBody(main, 'scrollBox');
    expect(body).toMatch(/role', 'region'/);
    expect(body).toMatch(/aria-label', label/);
    expect(body).toMatch(/tabIndex = 0/);
    expect(main.match(/scrollBox\(/g)!.length).toBeGreaterThanOrEqual(4);   // 정의 + 월별 계산서·동기·분기 비교
    expect(ruleBody(css, '.table-scroll')).toMatch(/overflow-x:\s*auto/);
  });
});

describe('big event scene rules (#154)', () => {
  it('the wide crop is the whole 160×40 scene', () => {
    for (const st of STAGES) expect(cropOf('wide', st)).toEqual({ x: 0, y: 0, w: WIDE_W, h: SCENE_H });
  });
  it('auto-advance at 4× or faster shows no big scene; manual and slow auto do', () => {
    expect(AUTO_SKIP_SPEED).toBe(4);
    for (const v of [undefined, 1, 2]) expect(showsBigScene(v), String(v)).toBe(true);
    for (const v of [4, 8, 16]) expect(showsBigScene(v), String(v)).toBe(false);
  });
  it('only entries added since the previous state count, and the last big one wins', () => {
    const log = [entry(0, 'life.start'), entry(30, 'log.qual-pass'), entry(70, 'log.degree'), entry(70, 'log.month')];
    expect(newBigEntry(log, 0)?.textKey).toBe('log.degree');
    expect(newBigEntry(log, 3)).toBeUndefined();
    expect(newBigEntry(log, 1)?.textKey).toBe('log.degree');
    expect(newBigEntry(log, 99)).toBeUndefined();   // 다른 삶을 불러온 경우
    expect(newBigEntry([entry(0, 'life.start'), entry(30, 'log.qual-pass')], 1)).toBeUndefined();   // 새 줄이 큰 사건이 아니면 없다
  });
  it('starting a life keeps the enrolment scene in view: the page stays at the top while focus goes to the current-life heading (#154 browser check)', () => {
    const body = fnBody(main, 'focusCurrent');
    expect(body).toMatch(/#bigscene/);
    expect(body).toMatch(/focus\(\{ preventScroll: true \}\)/);
    expect(body).toMatch(/scrollTo\(0, 0\)/);
  });
  it('a new life starts with the enrolment scene, with the record sentence in the dialog', () => {
    const s = withLog([entry(0, 'life.start')], { stage: 'phd' });
    const v = bigSceneAfter(s, ko, 0, undefined)!;
    expect(v.stage).toBe('phd');
    expect(v.icon).toBe('start');
    expect(v.id).toBe(`${s.seed}:0:life.start`);
    expect(v.lines[0]).toEqual({ text: ko.texts['life.start'], creative: false });
    expect(v.lines.slice(1).every(l => l.creative)).toBe(true);   // 붙는 서사 장면 줄은 창작 표시 대상
  });
  it('the degree scene is the career scene with the degree icon', () => {
    const s = withLog([entry(0, 'life.start'), entry(70, 'log.degree')], { stage: 'career' });
    const v = bigSceneAfter(s, ko, 1, 2)!;
    expect(v.stage).toBe('career');
    expect(v.icon).toBe('degree');
    expect(v.lines[0]!.text).toBe(ko.texts['log.degree']);
  });
  it('a record end shows the scene of the stage the life ended in, with a picture that fits the reason', () => {
    const s = withLog([entry(0, 'life.start'), entry(40, 'log.end-financial')], { stage: 'end', career: undefined });
    const v = bigSceneAfter(s, ko, 1, undefined)!;
    expect(v.stage).toBe('phd');
    expect(v.icon).toBe('fail');
    const r = withLog([entry(0, 'life.start'), entry(500, 'log.retired'), entry(600, 'log.end-age80')], { stage: 'end' });
    expect(bigSceneAfter(r, ko, 2, undefined)!.stage).toBe('retire');
    expect(bigSceneAfter(r, ko, 2, undefined)!.icon).toBe('end');
  });
  it('nothing for a previous state, a non-big new entry, or fast auto-advance', () => {
    const s = withLog([entry(0, 'life.start'), entry(30, 'log.qual-pass')], { stage: 'phd' });
    expect(bigSceneAfter(s, ko, 2, undefined)).toBeUndefined();   // 새 줄이 없다
    expect(bigSceneAfter(s, ko, 1, undefined)).toBeUndefined();   // 새 줄이 큰 사건이 아니다
    expect(bigSceneAfter(s, ko, 0, 8)).toBeUndefined();           // 8× 자동 진행
    expect(bigSceneAfter(s, ko, 0, 2)).toBeDefined();             // 2× 자동 진행은 띄운다
  });
  it('no scene before the life has a stage', () => {
    expect(bigSceneAfter(withLog([entry(0, 'life.start')], { stage: 'pre' }), ko, 0, undefined)).toBeUndefined();
  });
  it('a new engine end key still gets a picture', () => {
    expect(bigIcon('log.end-laid-off')).toBe('end');
    expect(bigIcon('log.hired')).toBe('hired');
  });
});

describe('big event scene on screen (#154)', () => {
  it('index.html: an empty section right above the feed', () => {
    expect(html).toMatch(/<section id="bigscene" class="bigscene px-scene"><\/section>\s*<section id="feed"><\/section>/);
  });
  it('strings: region name and close button are Korean text outside main.ts', () => {
    expect(ko.bigScene.region).toMatch(/[가-힣]/);
    expect(ko.bigScene.close).toMatch(/[가-힣]/);
  });
  it('the scene is a labelled 160-wide picture followed by the dialog, with a real close button', () => {
    const body = fnBody(main, 'renderBigScene');
    expect(body).toMatch(/t\.art\.scene\[v\.stage\]/);
    expect(body).toMatch(/sceneRects\(v\.stage, \{ width: WIDE_W \}\)/);
    expect(body).toMatch(/cropOf\('wide', v\.stage\)/);
    expect(body).toMatch(/button\(t\.bigScene\.close/);
    expect(body).toMatch(/\[\$\{t\.play\.creative\}\]/);
    expect(body).not.toMatch(/role', 'dialog'|aria-modal|aria-live/);
  });
  it('closing clears the scene and moves focus to the research notes heading, not to a removed element', () => {
    const body = fnBody(main, 'renderBigScene');
    expect(body).toMatch(/bigScene = undefined; render\(\); document\.querySelector<HTMLElement>\('#feed h2'\)\?\.focus\(\)/);
  });
  it('when the next step folds the scene while its close button has focus, focus goes to the research notes heading (#154 review)', () => {
    expect(fnBody(main, 'render')).toMatch(/\?\? document\.querySelector<HTMLElement>\('#feed h2'\)\)\?\.focus\(\)/);
  });
  it('the entrance effect is asked for only when a different scene is drawn for the first time', () => {
    const body = fnBody(main, 'renderBigScene');
    expect(body).toMatch(/classList\.toggle\('fresh', v\.id !== bigShown\)/);
    expect(body).toMatch(/bigShown = v\.id/);
  });
  it('every place that replaces the life goes through adopt, so the scene is decided in one spot', () => {
    expect(main).not.toMatch(/\blife = (advanceWith|decide|setAuto|createLife)\(/);
    expect(fnBody(main, 'tick')).toMatch(/adopt\(next, life\.log\.length, halted\(next\) \? undefined : speed\)/);
    expect(fnBody(main, 'startLife')).toMatch(/adopt\(createLife\(/);
    expect(main).toMatch(/adopt\(advanceWith\(life, data\), life\.log\.length\)/);
    expect(main).toMatch(/adopt\(decide\(life, data, i\), life\.log\.length\)/);
    expect(main).toMatch(/adopt\(setAuto\(life, data, cb\.checked\), life\.log\.length\)/);
  });
  it('a loaded life shows no scene for events that are already past', () => {
    expect(main).toMatch(/life = loadLife\(store, e\.id\); bigScene = undefined;/);
  });
  it('adopt keeps the scene when the engine was not called (same state back)', () => {
    expect(fnBody(main, 'adopt')).toMatch(/if \(next === life\) return;/);
  });
  it('renderInner draws the scene', () => {
    expect(fnBody(main, 'renderInner')).toMatch(/renderBigScene\(document\.getElementById\('bigscene'\)!\)/);
  });
  it('the dialog text uses the normal colors and the box is capped in width', () => {
    const d = ruleBody(css, '.dialog')!;
    expect(d).toMatch(/color:\s*var\(--fg\)/);
    expect(d).toMatch(/background:\s*var\(--bg\)/);
    expect(ruleBody(css, '.bigscene')).toMatch(/max-width:\s*48rem/);
    expect(css).toMatch(/\.bigscene:empty\s*\{[^}]*display:\s*none/);
    expect(css).not.toMatch(/#bigscene\s*[,{]/);
  });
  it('all motion lives in the no-preference block (reduced motion gets none)', () => {
    const rest = stripBlocks(css, '@media (prefers-reduced-motion: no-preference)');
    expect(rest).not.toMatch(/animation\s*:|animation-name|transition\s*:|@keyframes/);
    const motion = blocks(css, '@media (prefers-reduced-motion: no-preference)').join('\n');
    expect(motion).toMatch(/@keyframes px-pop/);
    expect(motion).toMatch(/\.bigscene\.fresh \.dialog\s*\{[^}]*animation:\s*px-pop/);
  });
});
