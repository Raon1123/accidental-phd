# 픽셀 그림 기반(#151) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 픽셀 그림 모듈(아이콘 9, 장면 3), 색 토큰, 연구노트·삶의 정리 줄 아이콘, 그림 설정(모두·간단히·끄기)을 넣는다.

**Architecture:** `web/src/pixel.ts`는 DOM 없이 그림을 사각형 목록(`Rect[]`, 색은 토큰 이름)으로 만든다. `main.ts`가 `createElementNS`로 SVG를 그린다(`innerHTML` 쓰지 않음). 그림 설정은 `web/src/art.ts`가 읽고 쓰며 `<html data-art>`로 CSS가 보이고 숨긴다. 장면은 이 issue에서 데이터와 시험만 넣고 화면에는 #152부터 그린다.

**Tech Stack:** TypeScript, Vite, vitest(`node node_modules/vitest/vitest.mjs run`), 엔진은 `engine/src/browser`로만 import.

**Spec:** `docs/design/pixel-scenes.md`(§2 그림 자산, §3 색, §4 기록→아이콘, §5 그림 설정, §6 코드 구조, §7 시험), 실험 `docs/design/experiments/0002-pixel-scenes.md`.

## Global Constraints
- 화면 문장은 `web/src/strings.ko.ts`에만 둔다. `index.html`에 한글 금지(0001, `web/test/strings.test.ts`).
- web은 엔진을 `engine/src/browser`로만 import한다(`web/test/boundary.test.ts`).
- `main.ts`의 이벤트 리스너는 `button()` 도우미의 click과 자동 checkbox의 change뿐이다(`web/test/a11y.test.ts`). 새 조작은 `button()`으로 만든다.
- 기존 대비 토큰 블록(`style.css` 2–3행)은 바꾸지 않는다. 그림 토큰은 파일 맨 아래 새 블록에 둔다.
- 그림 색은 토큰 이름으로만 적는다. SVG에 색 리터럴 금지.
- 실제 기관 건물·로고를 본뜨지 않는다(0004). 그림은 새로 그린 것(0002).
- 기록에서 장면 줄(`kind: 'scene'`)과 평범한 줄(`plain`)에는 아이콘이 없다.
- 커밋 메시지 끝: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` 과 `Claude-Session: https://claude.ai/code/session_01XePbKtbt9aEiscpsxEuCTJ`.

## Review Focus
1. 그림 설정 "끄기"에서 아이콘이 사라지면 종류 글자 표지(성취·실패 등)가 다시 보여야 한다. 표지가 숨은 채로 남으면 종류를 알 길이 없다 → Task 4 CSS 시험.
2. 저장소 접근이 막힌 브라우저(사생활 모드 등)에서 그림 설정 읽기·쓰기가 예외로 화면을 멈추면 안 된다 → Task 3 `loadArt`/`saveArt` 예외 시험.
3. 엔진에 새 기록 키가 생겨도(#84 `log.laid-off`) 종류만 맞으면 아이콘이 나와야 한다 → Task 1 `iconOf('log.laid-off','bad')` 시험.
4. 어두운 테마에서 장면 색이 밝은 값 그대로 남으면 밤 장면이 안 된다 → Task 2 어두운 블록 재정의 시험.
5. 그림 설정 단추를 누른 뒤 키보드 포커스가 사라지면 안 된다(다시 그리지 않고 `aria-pressed`만 바꾼다) → Task 3 구현 규칙.

---

### Task 1: 아이콘과 기록 → 아이콘 규칙

**Files:**
- Create: `web/src/pixel.ts`
- Modify: `web/src/play.ts:140-165` (`Note`에 `key` 추가)
- Test: `web/test/pixel.test.ts`

**Interfaces:**
- Produces: `export interface Rect { x: number; y: number; w: number; h: number; c: string }`, `export type Icon = 'star' | 'fail' | 'leave' | 'degree' | 'hired' | 'news' | 'decision' | 'start' | 'end'`, `export const ICONS: Readonly<Record<Icon, readonly string[]>>`, `export const PAL: Readonly<Record<string, string>>`, `export function spriteRects(map: readonly string[], x0?: number, y0?: number): Rect[]`, `export function iconRects(icon: Icon): readonly Rect[]`, `export function iconOf(textKey: string, kind: NoteKind): Icon | undefined`. `Note`에 `key: string`(그 줄을 만든 기록의 `textKey`, 장면 줄도 부모 키).

- [ ] **Step 1: Write the failing test** — `web/test/pixel.test.ts`

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node node_modules/vitest/vitest.mjs run web/test/pixel.test.ts`
Expected: FAIL, `Cannot find module '../src/pixel'`.

- [ ] **Step 3: Add `key` to `Note`** — `web/src/play.ts`

Replace the `Note` interface and the two object literals in `notes()`:

```ts
export interface Note { month: number; key: string; text: string; creative: boolean; scene?: true; kind: NoteKind }
```

```ts
    const out: Note[] = [{ month: e.month, key: e.textKey, text: noteText(e, t, s), creative: e.creative, kind: noteKind(e.textKey) }];
    const extra = e.textKey.startsWith('decision.') ? decisionResult(s.choices.group, e.textKey) : logScene(s, e, i)?.text;
    if (extra) out.push({ month: e.month, key: e.textKey, text: extra, creative: true, scene: true, kind: 'scene' });
```

- [ ] **Step 4: Create `web/src/pixel.ts`**

```ts
// 픽셀 장면과 삽화(#151, docs/design/pixel-scenes.md). DOM 없음: 사각형 목록만 만들고 그리기는 main.ts 가 한다.
// 색은 style.css 의 토큰 이름(앞의 -- 없이)으로만 적는다. 그림은 이 저장소에서 새로 그렸다(0002, 0004).
import type { NoteKind } from './play';

export interface Rect { x: number; y: number; w: number; h: number; c: string }
export type Icon = 'star' | 'fail' | 'leave' | 'degree' | 'hired' | 'news' | 'decision' | 'start' | 'end';

/** 그림 지도 글자 → 색 토큰. '.' 은 빈칸. */
export const PAL: Readonly<Record<string, string>> = {
  k: 'px-ink', w: 'px-white', s: 'px-skin', h: 'px-hair', t: 'px-shirt', p: 'px-pants',
  y: 'px-sun', r: 'px-red', b: 'px-wood', o: 'px-wood2', g: 'px-leaf',
};

/** 문자 지도 → 사각형. 한 행에서 같은 글자가 이어지면 한 사각형으로 합친다. */
export function spriteRects(map: readonly string[], x0 = 0, y0 = 0): Rect[] {
  const out: Rect[] = [];
  map.forEach((row, j) => {
    let i = 0;
    while (i < row.length) {
      const ch = row[i]!;
      let n = 1;
      while (row[i + n] === ch) n++;
      if (ch !== '.') out.push({ x: x0 + i, y: y0 + j, w: n, h: 1, c: PAL[ch]! });
      i += n;
    }
  });
  return out;
}

/** 사건 아이콘 12×12. */
export const ICONS: Readonly<Record<Icon, readonly string[]>> = {
  star: ['.....yy.....', '.....yy.....', '....yyyy....', 'yyyyyyyyyyyy', '.yyyyyyyyyy.', '..yyyyyyyy..', '...yyyyyy...', '..yyyyyyyy..', '..yyy..yyy..', '.yyy....yyy.', '.yy......yy.', '............'],
  fail: ['.wwwwwwww...', '.wkkkkwwww..', '.wwwwwwwwww.', '.wr.wwww.rw.', '.wwr.ww.rww.', '.wwwr..rwww.', '.wwwwrrwwww.', '.wwwr..rwww.', '.wwr.ww.rww.', '.wr.wwww.rw.', '.wwwwwwwwww.', '............'],
  leave: ['.oooooooooo.', '..o......o..', '..o.yyyy.o..', '...o.yy.o...', '....o..o....', '.....oo.....', '....o..o....', '...o....o...', '..o..yy..o..', '..oyyyyyyo..', '.oooooooooo.', '............'],
  degree: ['............', '.....kk.....', '...kkkkkk...', '.kkkkkkkkkk.', 'kkkkkkkkkkkk', '.kkkkkkkkkky', '...kkkkkk..y', '...kkkkkk..y', '...kkkkkk.yy', '....kkkk..yy', '............', '............'],
  hired: ['............', '....oooo....', '....o..o....', '.bbbbbbbbbb.', '.bbbbbbbbbb.', '.bbbbyybbbb.', '.oooobboooo.', '.bbbbbbbbbb.', '.bbbbbbbbbb.', '.oooooooooo.', '............', '............'],
  news: ['............', '............', '.wwwwwwwwww.', '.wkwwwwwwkw.', '.wwkwwwwkww.', '.wwwkwwkwww.', '.wwwwkkwwww.', '.wwwwwwwwww.', '.wwwwwwwwww.', '.kkkkkkkkkk.', '............', '............'],
  decision: ['.....oo.....', '.bbbbbbbbb..', '.bbbbbbbbbb.', '.bbbbbbbbb..', '.....oo.....', '..bbbbbbbbb.', '.bbbbbbbbbb.', '..bbbbbbbbb.', '.....oo.....', '.....oo.....', '....oooo....', '............'],
  start: ['............', '.kkkk..kkkk.', 'kwwwwkkwwwwk', 'kwkkwkkwkkwk', 'kwwwwkkwwwwk', 'kwkkwkkwkkwk', 'kwwwwkkwwwwk', 'kwkkwkkwkkwk', 'kwwwwkkwwwwk', '.kkkkkkkkkk.', '.....kk.....', '............'],
  end: ['.k..........', '.kyyyyyy....', '.kyyyyyyyy..', '.kyyyyyyy...', '.kyyyyyyyyy.', '.kyyyyyy....', '.k..........', '.k..........', '.k..........', '.k..........', 'kkk.........', '............'],
};

const iconCache = new Map<Icon, readonly Rect[]>();
export function iconRects(icon: Icon): readonly Rect[] {
  let r = iconCache.get(icon);
  if (!r) { r = spriteRects(ICONS[icon]); iconCache.set(icon, r); }
  return r;
}

const ICON_BY_KEY: Readonly<Record<string, Icon>> = {
  'log.qual-pass': 'star', 'log.promotion': 'star',
  'log.defense-pass': 'degree', 'log.degree': 'degree', 'log.end-degree': 'degree',
  'log.hired': 'hired', 'life.start': 'start', 'log.retired': 'end', 'log.end-age80': 'end',
};
const ICON_BY_KIND: Readonly<Partial<Record<NoteKind, Icon>>> = {
  good: 'star', bad: 'fail', leave: 'leave', news: 'news', decision: 'decision', start: 'start', end: 'end',
};

/** 연구노트 한 줄의 아이콘. 키로 먼저 정하고 나머지는 종류를 따른다. 장면·평범한 줄은 없음. */
export function iconOf(textKey: string, kind: NoteKind): Icon | undefined {
  if (kind === 'scene' || kind === 'plain') return undefined;
  return ICON_BY_KEY[textKey] ?? ICON_BY_KIND[kind];
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node node_modules/vitest/vitest.mjs run web/test/pixel.test.ts web/test/play.test.ts web/test/dates.test.ts`
Expected: PASS(기존 `play`·`dates` 시험도 그대로).

- [ ] **Step 6: Typecheck and commit**

Run: `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` — Expected: 출력 없음.

```bash
git add web/src/pixel.ts web/src/play.ts web/test/pixel.test.ts
git commit -m "feat(web): pixel icons and note-to-icon rule; notes carry their log key (#151)"
```

---

### Task 2: 장면 데이터, 단계 → 장면, 큰 사건, 색 토큰

**Files:**
- Modify: `web/src/pixel.ts` (아래 코드를 파일 끝에 덧붙임)
- Modify: `web/src/style.css` (파일 맨 아래에 그림 토큰 블록)
- Test: `web/test/pixel.test.ts` (describe 블록 추가)

**Interfaces:**
- Consumes: Task 1의 `Rect`, `Icon`, `spriteRects`, `ICONS`.
- Produces: `export type SceneStage = 'phd' | 'career' | 'retire'`, `export const SCENE_W = 96`, `export const SCENE_H = 40`, `export function scenePerson(stage: SceneStage): { x: number; y: number }`, `export function sceneRects(stage: SceneStage, opts: { width: number; ox?: number; bubble?: Icon }): readonly Rect[]`, `export function sceneOf(s: Pick<LifeState, 'stage' | 'career' | 'log'>): SceneStage | undefined`, `export function isBigEvent(textKey: string): boolean`. #152–#154가 이 이름을 쓴다.

- [ ] **Step 1: Write the failing test** — append to `web/test/pixel.test.ts`

Add imports at the top of the file (merge into the existing import lines):

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ICONS, PAL, SCENE_H, iconOf, iconRects, isBigEvent, sceneOf, scenePerson, sceneRects, spriteRects, type Icon, type SceneStage } from '../src/pixel';
```

Append:

```ts
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node node_modules/vitest/vitest.mjs run web/test/pixel.test.ts`
Expected: FAIL, `sceneRects` 등이 export되지 않음.

- [ ] **Step 3: Append scenes to `web/src/pixel.ts`**

Add to the import line: `import type { LifeState } from '../../engine/src/browser';`

```ts
// ── 단계 장면: 가운데 96×40 그림 + 좌우로 늘어나는 바탕. 넓은 장면·초상·상태 줄 초상은 width·ox 로 잘라 쓴다(#152–#154) ──
export type SceneStage = 'phd' | 'career' | 'retire';
export const SCENE_W = 96;
export const SCENE_H = 40;

const R = (x: number, y: number, w: number, h: number, c: string): Rect => ({ x, y, w, h, c });
const PERSON = ['..hhhh..', '.hhhhhh.', '.hssssh.', '.skssks.', '.ssssss.', '..ssss..', '.tttttt.', 'tttttttt', 's.tttt.s', '..pppp..', '..p..p..', '..k..k..'];

interface SceneDef { person: { x: number; y: number }; ground(width: number): Rect[]; art(): Rect[] }

const SCENES: Readonly<Record<SceneStage, SceneDef>> = {
  // 박사과정: 밤의 연구실. 창문과 달, 책장, 모니터 앞에 앉은 인물
  phd: {
    person: { x: 34, y: 17 },
    ground: W => [R(0, 0, W, 26, 'lab-wall'), R(0, 26, W, 8, 'lab-wall2'), R(0, 34, W, 6, 'lab-floor'), R(0, 34, W, 1, 'px-wood2')],
    art: () => {
      const r = [R(6, 5, 22, 16, 'lab-frame'), R(7, 6, 20, 14, 'lab-night'), R(16, 6, 1, 14, 'lab-frame'), R(7, 12, 20, 1, 'lab-frame'),
        R(22, 8, 3, 3, 'lab-moon'), R(9, 8, 1, 1, 'lab-moon'), R(13, 15, 1, 1, 'lab-moon'), R(19, 17, 1, 1, 'lab-moon'), R(10, 17, 1, 1, 'lab-moon'),
        R(70, 6, 20, 28, 'px-wood'), R(71, 7, 18, 26, 'px-wood2')];
      const books = ['px-book1', 'px-book2', 'px-book3', 'px-sun', 'px-white'];
      [8, 15, 22, 29].forEach((y, row) => {
        r.push(R(71, y + 5, 18, 1, 'px-wood'));
        for (let i = 0; i < 7; i++) { const short = i % 3 === 0 ? 1 : 0; r.push(R(72 + i * 2 + (row % 2), y + short, 2, 5 - short, books[(i + row) % 5]!)); }
      });
      r.push(R(33, 20, 10, 9, 'px-chair'), ...spriteRects(PERSON, 34, 17),
        R(44, 13, 14, 10, 'px-ink'), R(45, 14, 12, 8, 'lab-screen'), R(46, 16, 6, 1, 'px-ink'), R(46, 18, 8, 1, 'px-ink'), R(46, 20, 4, 1, 'px-ink'), R(50, 23, 2, 1, 'px-ink'),
        R(28, 24, 36, 2, 'px-wood'), R(29, 26, 2, 8, 'px-wood2'), R(61, 26, 2, 8, 'px-wood2'), R(59, 21, 3, 3, 'px-white'));
      return r;
    },
  },
  // 경력: 낮의 연구 기관 건물 앞, 가방 든 인물(실제 건물을 본뜨지 않는다)
  career: {
    person: { x: 70, y: 22 },
    ground: W => [R(0, 0, W, 34, 'car-sky'), R(0, 34, W, 6, 'car-grass')],
    art: () => {
      const r = [R(80, 4, 6, 6, 'px-sun'), R(4, 6, 10, 2, 'car-cloud'), R(6, 4, 5, 2, 'car-cloud'), R(56, 3, 12, 2, 'car-cloud'), R(59, 1, 6, 2, 'car-cloud'),
        R(30, 3, 24, 3, 'car-bldg2'), R(18, 6, 48, 2, 'car-bldg2'), R(20, 8, 44, 26, 'car-bldg')];
      for (let j = 0; j < 3; j++) for (let i = 0; i < 6; i++) if (!(j === 2 && (i === 2 || i === 3))) r.push(R(23 + i * 7, 11 + j * 7, 3, 4, 'car-win'));
      r.push(R(38, 26, 8, 8, 'px-ink'), R(41, 26, 2, 8, 'car-bldg2'), R(38, 34, 8, 6, 'car-path'),
        R(9, 24, 3, 10, 'px-trunk'), R(4, 14, 13, 11, 'px-leaf'), R(6, 12, 9, 2, 'px-leaf'), R(6, 15, 4, 3, 'px-leaf2'),
        ...spriteRects(PERSON, 70, 22), R(78, 29, 4, 4, 'px-wood'), R(79, 28, 2, 1, 'px-wood2'));
      return r;
    },
  },
  // 은퇴: 노을 지는 공원 벤치에 앉은 인물
  retire: {
    person: { x: 62, y: 18 },
    ground: W => [R(0, 0, W, 8, 'ret-d1'), R(0, 8, W, 8, 'ret-d2'), R(0, 16, W, 8, 'ret-d3'), R(0, 24, W, 6, 'ret-d4'), R(0, 26, W, 8, 'ret-hill'), R(0, 34, W, 6, 'ret-grass')],
    art: () => [R(42, 20, 12, 10, 'px-sun'), R(40, 22, 16, 6, 'px-sun'), R(0, 26, 42, 8, 'ret-hill'), R(30, 28, 66, 6, 'ret-hill2'),
      R(18, 6, 1, 1, 'px-ink'), R(19, 7, 1, 1, 'px-ink'), R(20, 6, 1, 1, 'px-ink'), R(26, 9, 1, 1, 'px-ink'), R(27, 10, 1, 1, 'px-ink'), R(28, 9, 1, 1, 'px-ink'),
      R(56, 24, 18, 1, 'px-wood2'), R(56, 25, 1, 4, 'px-wood2'), R(73, 25, 1, 4, 'px-wood2'),
      ...spriteRects(PERSON.slice(0, 9), 62, 18), R(64, 27, 4, 2, 'px-pants'),
      R(54, 29, 22, 2, 'px-wood'), R(56, 31, 1, 3, 'px-wood2'), R(73, 31, 1, 3, 'px-wood2'),
      R(85, 22, 3, 12, 'px-trunk'), R(80, 12, 13, 11, 'px-leaf'), R(82, 10, 9, 2, 'px-leaf'), R(83, 13, 4, 3, 'px-leaf2')],
  },
};

export function scenePerson(stage: SceneStage): { x: number; y: number } { return SCENES[stage].person; }

const sceneCache = new Map<string, readonly Rect[]>();
/** width = 그림 가로 칸 수, ox = 가운데 그림의 왼쪽 시작(없으면 가운데 정렬), bubble = 인물 위 말풍선 아이콘. */
export function sceneRects(stage: SceneStage, opts: { width: number; ox?: number; bubble?: Icon }): readonly Rect[] {
  const ox = opts.ox ?? Math.floor((opts.width - SCENE_W) / 2);
  const key = `${stage}|${opts.width}|${ox}|${opts.bubble ?? ''}`;
  const hit = sceneCache.get(key);
  if (hit) return hit;
  const d = SCENES[stage];
  const shift = (r: Rect): Rect => ({ ...r, x: r.x + ox });
  const out = [...d.ground(opts.width), ...d.art().map(shift)];
  if (opts.bubble) {
    const bx = d.person.x + 7, by = Math.max(0, d.person.y - 17);
    out.push(...[R(bx, by, 16, 16, 'px-ink'), R(bx + 1, by + 1, 14, 14, 'px-white'), R(bx + 1, by + 16, 2, 1, 'px-ink'), ...spriteRects(ICONS[opts.bubble], bx + 2, by + 2)].map(shift));
  }
  sceneCache.set(key, out);
  return out;
}

/** 엔진 단계 → 장면. 기록 종료는 은퇴했으면 은퇴, 경력이 있으면 경력, 아니면 박사과정. 시작 전은 그림 없음. */
export function sceneOf(s: Pick<LifeState, 'stage' | 'career' | 'log'>): SceneStage | undefined {
  switch (s.stage) {
    case 'pre': return undefined;
    case 'phd': return 'phd';
    case 'career': return 'career';
    case 'retired': return 'retire';
    case 'end': return s.log.some(e => e.textKey === 'log.retired') ? 'retire' : s.career ? 'career' : 'phd';
  }
}

const BIG = new Set(['life.start', 'log.degree', 'log.hired', 'log.retired']);
/** 큰 사건(#154에서 넓은 장면을 띄운다): 입학, 학위, 채용, 은퇴, 모든 기록 종료. */
export function isBigEvent(textKey: string): boolean {
  return BIG.has(textKey) || textKey.startsWith('log.end-');
}
```

- [ ] **Step 4: Append color tokens to `web/src/style.css`** (맨 아래, 기존 2–3행 블록은 건드리지 않음)

```css
/* 픽셀 장면과 삽화(#151, docs/design/pixel-scenes.md): 그림 색 토큰. 그림은 비글자라 대비 검사 대상이 아니고,
   그림 위 글자는 --fg/--bg 를 쓴다. 장면 토큰(lab·car·ret)은 어두운 테마에서 밤 색으로 바뀐다. */
:root {
  --px-ink: #1d1b2a; --px-white: #f4f4ee; --px-skin: #f1c27d; --px-hair: #3b2a20; --px-shirt: #2f6db5; --px-pants: #38405a;
  --px-sun: #ffc93c; --px-red: #d6453d; --px-wood: #9a6233; --px-wood2: #6b4020; --px-leaf: #3f9b4a; --px-leaf2: #69c06b; --px-trunk: #6b4020;
  --px-book1: #c0392b; --px-book2: #2e86c1; --px-book3: #27ae60; --px-chair: #5a5f73;
  --lab-wall: #d9d2c5; --lab-wall2: #bfb5a3; --lab-floor: #8c7a66; --lab-frame: #6b4020; --lab-night: #24305e; --lab-moon: #fff3b0; --lab-screen: #9fe3c9;
  --car-sky: #8fd0ff; --car-cloud: #ffffff; --car-bldg: #e8dcc4; --car-bldg2: #c9b48f; --car-win: #4a6fa5; --car-grass: #6cc070; --car-path: #d8c6a0;
  --ret-d1: #ffb37a; --ret-d2: #ff9a76; --ret-d3: #f07c8a; --ret-d4: #c9739e; --ret-hill: #5e8f5a; --ret-hill2: #46704a; --ret-grass: #4f7f4d;
}
@media (prefers-color-scheme: dark) { :root {
  --px-white: #e6e3d8;
  --lab-wall: #3a3550; --lab-wall2: #2d2940; --lab-floor: #4a3d33; --lab-frame: #6b4020; --lab-night: #0f1430; --lab-moon: #fff3b0; --lab-screen: #7fe0c0;
  --car-sky: #26315e; --car-cloud: #3d4a7a; --car-bldg: #6e6656; --car-bldg2: #5a5243; --car-win: #ffd36b; --car-grass: #2f6a3a; --car-path: #6b604c;
  --ret-d1: #5b3a6e; --ret-d2: #4a2f63; --ret-d3: #3a2657; --ret-d4: #2b1d47; --ret-hill: #2d4a33; --ret-hill2: #22392a; --ret-grass: #1f3324;
} }
svg.px { display: block; shape-rendering: crispEdges; }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node node_modules/vitest/vitest.mjs run web/test/pixel.test.ts web/test/a11y.test.ts`
Expected: PASS(a11y 대비 시험은 2–3행 블록만 읽으므로 그대로 통과).

- [ ] **Step 6: Typecheck and commit**

Run: `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit`

```bash
git add web/src/pixel.ts web/src/style.css web/test/pixel.test.ts
git commit -m "feat(web): pixel scenes for PhD, career and retirement, stage-to-scene and big-event rules, picture color tokens (#151)"
```

---

### Task 3: 그림 설정(모두·간단히·끄기)

**Files:**
- Create: `web/src/art.ts`
- Modify: `web/src/strings.ko.ts` (최상위에 `art` 묶음)
- Modify: `web/src/main.ts` (import, 설정 단추, 시작 시 `data-art`)
- Modify: `web/src/style.css` (맨 아래)
- Test: `web/test/art.test.ts`

**Interfaces:**
- Consumes: `KeyValueStore` from `web/src/archive.ts`, `button()`·`pressed()`·`el()`·`store` in `main.ts`.
- Produces: `export const ART_MODES = ['full', 'lite', 'off'] as const`, `export type ArtMode`, `export const ART_KEY = 'aphd-art'`, `export function loadArt(store: KeyValueStore | undefined): ArtMode`, `export function saveArt(store: KeyValueStore | undefined, mode: ArtMode): void`. `<html data-art="full|lite|off">`. 문구 `ko.art = { label, full, lite, off }`.

- [ ] **Step 1: Write the failing test** — `web/test/art.test.ts`

```ts
// 그림 설정(#151): 모두 / 간단히 / 끄기. 저장소가 없거나 막혀도 화면이 멈추지 않는다.
import { describe, expect, it } from 'vitest';
import { ART_KEY, ART_MODES, loadArt, saveArt } from '../src/art';
import { ko } from '../src/strings.ko';

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } }; };
const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };

describe('picture setting (#151)', () => {
  it('defaults to full when nothing, an unknown value or no store is there', () => {
    expect(loadArt(mem())).toBe('full');
    const s = mem(); s.setItem(ART_KEY, 'loud');
    expect(loadArt(s)).toBe('full');
    expect(loadArt(undefined)).toBe('full');
  });
  it('round-trips every mode', () => {
    for (const m of ART_MODES) { const s = mem(); saveArt(s, m); expect(loadArt(s)).toBe(m); }
  });
  it('a blocked store neither throws nor changes the default', () => {
    expect(() => saveArt(broken, 'off')).not.toThrow();
    expect(loadArt(broken)).toBe('full');
  });
  it('every mode has a label', () => {
    for (const m of ART_MODES) expect(ko.art[m]).not.toBe('');
    expect(ko.art.label).not.toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node node_modules/vitest/vitest.mjs run web/test/art.test.ts`
Expected: FAIL, `Cannot find module '../src/art'`.

- [ ] **Step 3: Create `web/src/art.ts`**

```ts
// 그림 설정(#151, docs/design/pixel-scenes.md §5): 모두 / 간단히(아이콘만) / 끄기. 선택은 이 브라우저에만 남는다.
import type { KeyValueStore } from './archive';

export const ART_MODES = ['full', 'lite', 'off'] as const;
export type ArtMode = typeof ART_MODES[number];
export const ART_KEY = 'aphd-art';

export function loadArt(store: KeyValueStore | undefined): ArtMode {
  try {
    const v = store?.getItem(ART_KEY) ?? '';
    return (ART_MODES as readonly string[]).includes(v) ? (v as ArtMode) : 'full';
  } catch { return 'full'; }
}

export function saveArt(store: KeyValueStore | undefined, mode: ArtMode): void {
  try { store?.setItem(ART_KEY, mode); } catch { /* 저장이 막힌 환경은 이번 화면에만 적용한다 */ }
}
```

- [ ] **Step 4: Add strings** — in `web/src/strings.ko.ts`, as a top-level key right after `title` (or the first top-level key):

```ts
  art: { label: '그림', full: '모두', lite: '간단히', off: '끄기' },
```

- [ ] **Step 5: Wire into `web/src/main.ts`**

Add import: `import { ART_MODES, loadArt, saveArt, type ArtMode } from './art';`

Add near the other `let` state (after `let timer`):

```ts
let art: ArtMode = loadArt(store);   // 그림 설정(#151). 다시 그리지 않고 <html data-art> 와 aria-pressed 만 바꾼다(포커스 유지)
```

Add a function before `start()`:

```ts
/** 그림 설정 단추(#151): 제목 아래 한 줄. */
function renderArt(root: HTMLElement): void {
  document.documentElement.dataset.art = art;
  const box = el('p');
  box.className = 'art';
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', t.art.label);
  box.append(el('span', t.art.label));
  for (const m of ART_MODES) {
    box.append(pressed(button(t.art[m], () => {
      art = m;
      saveArt(store, m);
      document.documentElement.dataset.art = m;
      box.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === `art:${m}`)));
    }, false, `art:${m}`), art === m));
  }
  root.append(box);
}
```

At the bottom, after `document.getElementById('title')!.textContent = t.title;` add:

```ts
renderArt(document.querySelector('header')!);
```

- [ ] **Step 6: CSS** — append to `web/src/style.css`

```css
/* 그림 설정(#151): 끄기면 그림을 숨긴다. 간단히는 장면만 숨긴다(#152 부터 장면에 .px-scene). */
.art { display: flex; flex-wrap: wrap; gap: .3rem; align-items: center; margin: 0 0 .75rem; font-size: .85rem; color: var(--muted); }
.art button { padding: .1rem .55rem; }
html[data-art="off"] .px-icon, html[data-art="off"] .px-scene, html[data-art="lite"] .px-scene { display: none; }
```

- [ ] **Step 7: Run tests**

Run: `node node_modules/vitest/vitest.mjs run web/test`
Expected: PASS(특히 `a11y.test.ts`의 리스너 시험: 새 조작이 `button()`이므로 `b:click`만 남음; `strings.test.ts`: 새 문구가 비어 있지 않음).

- [ ] **Step 8: Typecheck and commit**

```bash
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
git add web/src/art.ts web/src/strings.ko.ts web/src/main.ts web/src/style.css web/test/art.test.ts
git commit -m "feat(web): picture setting all / icons only / off, kept in this browser (#151)"
```

---

### Task 4: 연구노트·삶의 정리 아이콘, 화면 확인, PR

**Files:**
- Modify: `web/src/view.ts:130-150` (`SummaryItem.icon`)
- Modify: `web/src/main.ts` (`pixelSvg`, `iconEl`, `renderFeed`, `renderSummary`)
- Modify: `web/src/style.css` (맨 아래)
- Modify: `docs/design/experiments/0002-pixel-scenes.md` (`## 반응`에 한 줄)
- Test: `web/test/pixel.test.ts`, `web/test/dates.test.ts`

**Interfaces:**
- Consumes: `iconOf`, `iconRects`, `Rect`, `Icon` (Task 1), `Note.key` (Task 1).
- Produces: `SummaryItem { when: string; kind: string; text: string; icon?: Icon }`. CSS 클래스 `.px-icon`(아이콘 칸, `aria-hidden` SVG를 담음), `.px-scene`(#152부터 장면에 씀).

- [ ] **Step 1: Write the failing tests**

Append to `web/test/dates.test.ts` inside `describe('life summary (#129)', …)` a new `it`:

```ts
  it('each summary line carries the icon of its record (#151)', () => {
    const s = createLife({ track: 'computer', auto: true }, newSeed('summary-icons'), data);
    const log = [...s.log, { month: 30, textKey: 'log.qual-pass', tags: [], creative: false }, { month: 70, textKey: 'log.degree', tags: [], creative: false }];
    const v = lifeSummary({ ...s, log, stage: 'end' as const, end: { reason: 'degree' as const, month: 70 } }, ko);
    expect(v.items.find(i => i.when === '2029년 9월')?.icon).toBe('star');
    expect(v.items.find(i => i.when === '2033년 1월')?.icon).toBe('degree');
    expect(v.items.every(i => i.icon !== undefined)).toBe(true);
  });
```

Append to `web/test/pixel.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node node_modules/vitest/vitest.mjs run web/test/pixel.test.ts web/test/dates.test.ts`
Expected: FAIL(`icon` undefined, CSS·main 패턴 없음).

- [ ] **Step 3: `SummaryItem.icon`** — `web/src/view.ts`

Add `import { iconOf, type Icon } from './pixel';` and change:

```ts
export interface SummaryItem { when: string; kind: string; text: string; icon?: Icon }
```

```ts
    .map(n => ({ when: calendarLabel(n.month, t), kind: t.play.noteKinds[n.kind], text: n.text, icon: iconOf(n.key, n.kind) }));
```

- [ ] **Step 4: Draw icons in `web/src/main.ts`**

Add import: `import { iconOf, iconRects, type Icon, type Rect } from './pixel';`

Add after `el()`:

```ts
const SVG_NS = 'http://www.w3.org/2000/svg';
/** 픽셀 사각형 → SVG(#151). 색은 토큰(var(--…))만 쓴다. 장식이므로 화면 낭독기에서 숨긴다. */
function pixelSvg(width: number, height: number, rects: readonly Rect[]): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('class', 'px');
  svg.setAttribute('aria-hidden', 'true');
  for (const r of rects) {
    const e = document.createElementNS(SVG_NS, 'rect');
    e.setAttribute('x', String(r.x)); e.setAttribute('y', String(r.y));
    e.setAttribute('width', String(r.w)); e.setAttribute('height', String(r.h));
    e.setAttribute('fill', `var(--${r.c})`);
    svg.append(e);
  }
  return svg;
}
function iconEl(icon: Icon): HTMLElement {
  const s = el('span');
  s.className = 'px-icon';
  s.append(pixelSvg(12, 12, iconRects(icon)));
  return s;
}
```

In `renderFeed`, replace `li.append(tag, el('span', …));` with:

```ts
    const icon = iconOf(n.key, n.kind);
    if (icon) li.append(iconEl(icon));
    li.append(tag, el('span', ` ${calendarLabel(n.month, t)} · ${n.text}`));
```

In `renderSummary`, replace `li.append(el('strong', it.when), ' ', tag, el('span', ` ${it.text}`));` with:

```ts
    li.append(el('strong', it.when), ' ');
    if (it.icon) li.append(iconEl(it.icon));
    li.append(tag, el('span', ` ${it.text}`));
```

- [ ] **Step 5: CSS** — append to `web/src/style.css`

```css
/* 연구노트·삶의 정리 아이콘(#151, 안 b). 아이콘이 보이는 동안 종류 글자는 화면 낭독기용으로만 남는다. */
.px-icon { display: inline-block; width: 1.25rem; height: 1.25rem; vertical-align: -0.3rem; margin-right: .3rem; }
.px-icon svg { width: 100%; height: 100%; }
html:not([data-art="off"]) .px-icon + .note-kind { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
```

- [ ] **Step 6: Run all checks**

Run:
```bash
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/vitest/vitest.mjs run
node scripts/validate-data.mjs
```
Expected: 출력 없음 / 전부 PASS / `validate-data: ok`.

- [ ] **Step 7: Chrome 화면 확인**

`npm run build:web` 후 `node node_modules/vite/bin/vite.js preview --port 4317 --strictPort`를 백그라운드로 띄우고 Chrome 확장으로 `http://localhost:4317/`를 연다. 분야 하나를 고르고 자동 모드로 기록 끝까지 진행한 뒤 확인한다.
- 연구노트 줄마다 아이콘이 보이고 종류 글자(성취·실패…)는 화면에 보이지 않는다. 장면 줄에는 아이콘이 없다.
- 삶의 정리 줄에도 아이콘이 있다.
- "끄기"를 누르면 아이콘이 사라지고 종류 글자가 다시 보인다. 새로고침해도 "끄기"가 남는다. "모두"로 되돌린다.
- 어두운 테마에서 아이콘이 보인다(편지·찢긴 종이의 흰색이 배경과 구별됨).
- 390px 폭(`resize_window`)에서 가로 넘침이 없다(`document.documentElement.scrollWidth <= clientWidth`).

스크린샷이 시간 초과되면 DOM 검사(`javascript_tool`)로 대신하고 PR에 그렇게 적는다.

- [ ] **Step 8: 실험 기록과 커밋**

`docs/design/experiments/0002-pixel-scenes.md`의 `## 반응` 끝에 한 줄을 덧붙인다(날짜, 확인한 것, 시험 수). 그다음:

```bash
git add web/src/view.ts web/src/main.ts web/src/style.css web/test/pixel.test.ts web/test/dates.test.ts docs/design/experiments/0002-pixel-scenes.md
git commit -m "feat(web): pixel icons on research-note and life-summary lines; kind label stays for screen readers (#151)"
```

- [ ] **Step 9: PR**

```bash
git push -u origin design/pixel-base
gh pr create --base main --title "feat(web): 픽셀 그림 기반과 연구노트 아이콘, 그림 설정 (#151)" --label enhancement --label area/ui --body-file <본문 파일>
```

본문: `Closes #151`, 바뀐 것(모듈·토큰·아이콘·설정), 시험 수, Chrome 확인 결과(못 본 것은 못 봤다고), 다음 큐 #152. 끝에 `🤖 Generated with [Claude Code](https://claude.com/claude-code)` 와 세션 링크.
