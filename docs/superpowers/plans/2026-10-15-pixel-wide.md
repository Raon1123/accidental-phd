# 픽셀 그림: 넓은 화면(#152) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 화면 폭 64rem 이상에서 왼쪽 칸 자금 카드 위에 초상 창(안 d: 인물 말풍선에 최근 사건 아이콘, 아래 한 줄에 그 사건 문장)을 넣고, 본문 바깥 여백에만 단계 풍경(안 c: `html` 배경은 장면 색, 화면 아래 풍경 띠 고정, 본문 불투명)을 넣는다. 그림 설정 "간단히"·"끄기"에서는 둘 다 숨긴다.

**Architecture:** 어느 부분을 잘라 쓸지(`cropOf`)와 어느 사건을 보일지(`latestEvent`)는 DOM 없는 `web/src/artview.ts`에 두고 시험한다. `main.ts`는 `pixelSvg`를 viewBox 자르기·`role="img"` 설명을 받도록 넓히고, 초상 창은 `renderMoneyCard` 맨 위에, 풍경 띠는 `index.html`의 빈 `#backdrop`에 그린다. 보이고 숨기는 일은 CSS 미디어 질의(`min-width: 64rem`)와 `<html data-art data-scene>`가 한다. 장면 SVG는 사각형 목록(`sceneRects`)에서 오고, 이 issue에서 새 그림은 그리지 않는다.

**Tech Stack:** TypeScript, Vite, vitest(`node node_modules/vitest/vitest.mjs run`), 엔진은 `engine/src/browser`로만 import.

**Spec:** `docs/design/pixel-scenes.md`(§2 자르기 셋, §4 배치 표 "지금 상태"·"분위기"·"최근 사건 문장" 넓은 화면 칸, §5 그림 설정, §6 코드 구조, §7 시험), 실험 `docs/design/experiments/0002-pixel-scenes.md`.

**전제:** #151이 머지돼 있다. 아래 이름은 #151 plan의 Interfaces에서 온다: `pixel.ts`의 `Rect`, `Icon`, `SceneStage`, `SCENE_W`(96), `SCENE_H`(40), `scenePerson`, `sceneRects`, `sceneOf`, `iconOf`, `iconRects`, `isBigEvent`; `main.ts`의 `pixelSvg(width, height, rects)`, `iconEl(icon)`, `button()`, `pressed()`, `el()`; `style.css` 맨 아래의 `--px-*`·`--lab-*`·`--car-*`·`--ret-*` 토큰과 `html[data-art="off"] .px-scene, html[data-art="lite"] .px-scene { display: none }` 규칙; `ko.art.{label,full,lite,off}`; `Note.key`.

## Global Constraints
- 화면 문장은 `web/src/strings.ko.ts`에만 둔다. `index.html`에 한글 금지(0001, `web/test/strings.test.ts`).
- web은 엔진을 `engine/src/browser`로만 import한다(`web/test/boundary.test.ts`).
- `main.ts`의 이벤트 리스너는 `button()`의 click과 자동 checkbox의 change뿐이다(`web/test/a11y.test.ts`). 이 issue는 조작을 더하지 않는다(초상·풍경은 보기만 한다).
- 기존 대비 토큰 블록(`style.css` 2–3행)은 바꾸지 않는다. 새 CSS는 파일 맨 아래에 덧붙인다.
- 그림 색은 토큰 이름으로만 적는다. SVG에 색 리터럴 금지. 그림은 새로 그린 것이고 실제 기관을 본뜨지 않는다(0002, 0004).
- 그림 안에는 글자를 넣지 않는다. 그림 위·옆 글자는 `--fg`/`--bg`를 쓴다.
- **그림 요소의 `display`는 클래스 선택자로만 정한다.** `html[data-art="lite|off"] .px-scene { display: none }`(명시도 0,2,1)이 이기려면 `#id` 선택자로 `display`를 주면 안 된다.
- 움직임(`animation`·`transition`)을 더하지 않는다. 카드가 매 틱 다시 그려지므로 애니메이션은 틱마다 되풀이돼 번쩍인다. 움직임 줄이기 규칙은 움직임이 처음 생기는 #154에서 넣는다.
- 커밋 메시지 끝: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` 과 `Claude-Session: https://claude.ai/code/session_01XePbKtbt9aEiscpsxEuCTJ`.

## Review Focus
1. 본문이 불투명해야 한다. 여백 풍경이 글자 뒤로 비치면 대비 검사(`a11y.test.ts`)가 보지 않는 색이 글자 배경이 된다 → Task 3 CSS 시험(`body`의 `background: var(--bg)`, 풍경 색은 `html`에만).
2. "간단히"·"끄기"에서 초상 창, 풍경 띠, `html` 배경이 모두 사라져야 한다. `html` 배경은 `[data-art="full"]`일 때만 준다 → Task 3 CSS 시험.
3. 초상 자르기가 인물과 말풍선을 통째로 담아야 한다. 어느 장면에서든 말풍선이 잘리면 최근 사건이 보이지 않는다 → Task 1 `cropOf` 시험.
4. 뜻이 있는 장면(초상)은 `role="img"` + 한국어 설명, 장식(풍경 띠)은 `aria-hidden`. 좁은 화면에서 초상은 `display: none`이라 낭독기가 읽지 않는다 → Task 2·3 시험.
5. 어두운 테마에서 `html` 배경으로 쓰는 토큰이 어두운 블록에 재정의돼 있어야 한다(밝은 하늘색 배경이 밤 화면에 남으면 안 된다) → Task 3 CSS 시험.
6. 최근 사건이 없거나(`pre`·기록 비어 있음) 장면이 없을 때(`sceneOf` 없음) 빈 상자나 깨진 SVG가 남지 않는다 → Task 1 `latestEvent` 시험, Task 2 `portraitEl` 규칙.

---

### Task 1: 자르기와 최근 사건 (DOM 없음) + CSS 시험 도우미

**Files:**
- Create: `web/src/artview.ts`
- Create: `web/test/helpers.ts` (CSS·소스 읽기 도우미, #153·#154도 쓴다)
- Test: `web/test/artview.test.ts`

**Interfaces:**
- Consumes: `SceneStage`, `SCENE_W`, `SCENE_H`, `scenePerson`, `iconOf`, `Icon` (pixel.ts), `Note` (play.ts), `calendarLabel` (dates.ts).
- Produces:
  - `export interface Crop { x: number; y: number; w: number; h: number }`
  - `export type CropKind = 'portrait' | 'strip'`(#153이 `'status'`, #154가 `'wide'`를 더한다)
  - `export const PORTRAIT_W = 48`, `export const WIDE_W = 160`
  - `export function cropOf(kind: CropKind, stage: SceneStage): Crop`
  - `export interface LatestEvent { key: string; month: number; icon: Icon; line: string }`
  - `export function latestEvent(list: readonly Note[], t: Strings): LatestEvent | undefined`
  - 시험 도우미(`web/test/helpers.ts`): `balanced(src, open)`, `blocks(css, head)`, `stripBlocks(css, head)`, `ruleBody(css, selector)`, `fnBody(src, name)`.

- [ ] **Step 1: Write the failing test** — `web/test/artview.test.ts`

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node node_modules/vitest/vitest.mjs run web/test/artview.test.ts`
Expected: FAIL, `Cannot find module '../src/artview'`.

- [ ] **Step 3: Create `web/src/artview.ts`**

```ts
// 픽셀 그림의 화면 규칙(#152–#154, docs/design/pixel-scenes.md §4). DOM 없음: 장면의 어느 부분을 쓰고 어느 사건을 보일지만 정한다.
// 그리기는 main.ts 가 하고, 사각형 목록은 pixel.ts 의 sceneRects 가 만든다.
import { calendarLabel } from './dates';
import { SCENE_H, SCENE_W, iconOf, scenePerson, type Icon, type SceneStage } from './pixel';
import type { Note } from './play';
import type { Strings } from './strings.ko';

/** 그림 한 장에서 잘라 쓰는 사각형(칸 단위). SVG viewBox 가 된다. */
export interface Crop { x: number; y: number; w: number; h: number }
export type CropKind = 'portrait' | 'strip';

export const PORTRAIT_W = 48;   // 초상 창: 인물 중심 48칸(§2)
export const WIDE_W = 160;      // 넓은 장면: 160칸(§2). 풍경 띠와 큰 사건 장면(#154)이 쓴다
const STRIP_H = 16;
const PERSON_W = 8;             // pixel.ts 의 PERSON 스프라이트 폭

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/**
 * 장면에서 잘라 쓰는 부분.
 * portrait = 96×40 그림에서 인물이 가운데 오게 48칸(말풍선 16칸이 인물 오른쪽에 붙으므로 가장자리에서도 담긴다),
 * strip = 160칸 그림의 아래 16줄(땅과 하늘 일부. 본문이 가리는 가운데를 빼고 양옆 여백에서 보인다).
 */
export function cropOf(kind: CropKind, stage: SceneStage): Crop {
  const p = scenePerson(stage);
  switch (kind) {
    case 'portrait': return { x: clamp(p.x + PERSON_W / 2 - PORTRAIT_W / 2, 0, SCENE_W - PORTRAIT_W), y: 0, w: PORTRAIT_W, h: SCENE_H };
    case 'strip': return { x: 0, y: SCENE_H - STRIP_H, w: WIDE_W, h: STRIP_H };
  }
}

export interface LatestEvent { key: string; month: number; icon: Icon; line: string }

/**
 * 가장 최근 사건: 연구노트(최신순 목록)에서 아이콘이 있는 첫 줄. 장면 줄과 평범한 줄은 아이콘이 없어 건너뛴다.
 * 문장은 `달력 연월 · 문장`이고 창작 줄이면 연구노트와 같이 창작 표시를 붙인다. 아이콘이 있는 줄이 없으면 undefined.
 */
export function latestEvent(list: readonly Note[], t: Strings): LatestEvent | undefined {
  for (const n of list) {
    const icon = iconOf(n.key, n.kind);
    if (!icon) continue;
    const text = n.creative ? `${n.text} [${t.play.creative}]` : n.text;
    return { key: n.key, month: n.month, icon, line: `${calendarLabel(n.month, t)} · ${text}` };
  }
  return undefined;
}
```

- [ ] **Step 4: Create `web/test/helpers.ts`**

```ts
// 소스·CSS 를 글자로 읽어 확인하는 시험 도우미(이 저장소의 web 시험은 DOM 없이 돈다). #152 에서 만들고 #153·#154 가 쓴다.
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** `{` 가 있는 위치 open 에서 짝이 맞는 `}` 까지의 안쪽 글. */
export function balanced(src: string, open: number): string {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(open + 1, i);
  }
  throw new Error('unbalanced braces');
}

/** `head {` 로 시작하는 모든 블록의 안쪽 글(같은 @media 가 여러 번 있을 수 있다). */
export function blocks(css: string, head: string): string[] {
  const out: string[] = [];
  for (const m of css.matchAll(new RegExp(`${escapeRe(head)}\\s*\\{`, 'g'))) out.push(balanced(css, m.index! + m[0].length - 1));
  return out;
}

/** `head {…}` 블록을 통째로 뺀 CSS. */
export function stripBlocks(css: string, head: string): string {
  let out = css;
  for (;;) {
    const m = new RegExp(`${escapeRe(head)}\\s*\\{`).exec(out);
    if (!m) return out;
    const open = m.index + m[0].length - 1;
    out = out.slice(0, m.index) + out.slice(open + balanced(out, open).length + 2);
  }
}

/** 선택자 하나의 규칙 안쪽 글. 선택자 앞은 `}`·공백·글 처음이어야 하고 뒤는 곧바로 `{` 여야 한다(`.a svg {` 는 `.a` 가 아니다). 없으면 undefined. */
export function ruleBody(css: string, selector: string): string | undefined {
  const m = new RegExp(`(?:^|[}\\s])${escapeRe(selector)}\\s*\\{`).exec(css);
  return m ? balanced(css, m.index + m[0].length - 1) : undefined;
}

/** `function name(…)` 의 본문(매개변수에 `)` 가 없는 함수만). */
export function fnBody(src: string, name: string): string {
  const m = new RegExp(`function ${escapeRe(name)}\\([^)]*\\)[^{]*\\{`).exec(src);
  if (!m) throw new Error(`no function ${name}`);
  return balanced(src, m.index + m[0].length - 1);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node node_modules/vitest/vitest.mjs run web/test/artview.test.ts`
Expected: PASS(6 tests).

- [ ] **Step 6: Typecheck and commit**

Run: `node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` — Expected: 출력 없음.

```bash
git add web/src/artview.ts web/test/artview.test.ts web/test/helpers.ts
git commit -m "feat(web): crops for portrait and strip, latest event from the research notes, css test helpers (#152)"
```

---

### Task 2: 초상 창 (안 d)

**Files:**
- Modify: `web/src/strings.ko.ts` (`art.scene` 장면 설명)
- Modify: `web/src/main.ts` (`pixelSvg` 넓힘, `sceneSvg`, `portraitEl`, `renderFeed` 매개변수, `renderMoneyCard`, `renderInner`)
- Modify: `web/src/style.css` (맨 아래)
- Test: `web/test/artview.test.ts`

**Interfaces:**
- Consumes: Task 1의 `cropOf`, `latestEvent`, `LatestEvent`; #151의 `sceneRects`, `sceneOf`, `SCENE_W`.
- Produces: `ko.art.scene: Record<SceneStage, string>`(장면 설명), `main.ts`의 `pixelSvg(width, height, rects, opts?: { label?: string; x?: number; y?: number; fit?: string })`(`label`이 있으면 `role="img"` + `aria-label`, 없으면 `aria-hidden="true"`), `sceneSvg(rects, crop, label?, fit?)`, `portraitEl(s)`. CSS 클래스 `.portrait`(초상 `figure`, `px-scene`도 단다).

- [ ] **Step 1: Write the failing tests** — append to `web/test/artview.test.ts`

Merge into the imports at the top:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { blocks, fnBody, ruleBody, stripBlocks } from './helpers';
```

Append:

```ts
const css = readFileSync(resolve(__dirname, '../src/style.css'), 'utf8');
const main = readFileSync(resolve(__dirname, '../src/main.ts'), 'utf8');
const wide = blocks(css, '@media (min-width: 64rem)').join('\n');

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node node_modules/vitest/vitest.mjs run web/test/artview.test.ts`
Expected: FAIL(`ko.art.scene` undefined 등).

- [ ] **Step 3: Strings** — `web/src/strings.ko.ts`

Replace the `art` line:

```ts
  art: { label: '그림', full: '모두', lite: '간단히', off: '끄기' },
```

with:

```ts
  art: {
    label: '그림', full: '모두', lite: '간단히', off: '끄기',
    // 장면 그림의 설명(role="img" 의 aria-label). 실제 기관을 가리키지 않는다.
    scene: {
      phd: '밤의 연구실 그림. 창밖에 달이 떠 있고 인물이 모니터 앞에 앉아 있다.',
      career: '낮의 연구 기관 건물 앞 그림. 인물이 가방을 들고 서 있다.',
      retire: '노을 지는 공원 그림. 인물이 벤치에 앉아 있다.',
    },
  },
```

- [ ] **Step 4: `main.ts` — imports and state**

Replace the pixel import line:

```ts
import { iconOf, iconRects, type Icon, type Rect } from './pixel';
```

with:

```ts
import { WIDE_W, cropOf, latestEvent, type Crop, type LatestEvent } from './artview';
import { SCENE_W, iconOf, iconRects, sceneOf, sceneRects, type Icon, type Rect } from './pixel';
```

Add `type Note` to the `./play` import (the line that starts `import { FOCUSES, SPEEDS, …`): `… notes, setAuto, step, wonText, type Note, type Speed } from './play';`

Add after `let art: ArtMode = …`:

```ts
let recent: LatestEvent | undefined;   // 가장 최근 사건(초상 말풍선과 문장, #152). renderInner 가 매번 새로 정한다
```

- [ ] **Step 5: `main.ts` — `pixelSvg` with label and crop**

Replace the whole `pixelSvg` function (keep `SVG_NS` and `iconEl`) with:

```ts
/**
 * 픽셀 사각형 → SVG(#151). 색은 토큰(var(--…))만 쓴다.
 * label 이 있으면 뜻을 가진 그림이라 role="img" + 설명을 단다(#152). 없으면 장식이라 화면 낭독기에서 숨긴다.
 * x·y 는 viewBox 의 왼쪽 위(큰 그림에서 부분만 쓸 때), fit 은 preserveAspectRatio.
 */
function pixelSvg(width: number, height: number, rects: readonly Rect[], opts: { label?: string; x?: number; y?: number; fit?: string } = {}): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `${opts.x ?? 0} ${opts.y ?? 0} ${width} ${height}`);
  svg.setAttribute('class', 'px');
  if (opts.fit) svg.setAttribute('preserveAspectRatio', opts.fit);
  if (opts.label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', opts.label);
  } else svg.setAttribute('aria-hidden', 'true');
  for (const r of rects) {
    const e = document.createElementNS(SVG_NS, 'rect');
    e.setAttribute('x', String(r.x)); e.setAttribute('y', String(r.y));
    e.setAttribute('width', String(r.w)); e.setAttribute('height', String(r.h));
    e.setAttribute('fill', `var(--${r.c})`);
    svg.append(e);
  }
  return svg;
}
/** 큰 그림에서 crop 부분만 보이는 SVG(#152). label 은 뜻이 있는 장면에만 준다. */
function sceneSvg(rects: readonly Rect[], c: Crop, label?: string, fit?: string): SVGSVGElement {
  return pixelSvg(c.w, c.h, rects, { x: c.x, y: c.y, ...(label ? { label } : {}), ...(fit ? { fit } : {}) });
}
```

- [ ] **Step 6: `main.ts` — portrait, feed, card**

Add after `iconEl`:

```ts
/** 초상 창(#152, 안 d): 인물 위 말풍선에 최근 사건 아이콘, 아래 한 줄에 그 사건 문장. 장면이 없으면(시작 전) 만들지 않는다. */
function portraitEl(s: LifeState): HTMLElement | undefined {
  const stage = sceneOf(s);
  if (!stage) return undefined;
  const fig = el('figure');
  fig.className = 'px-scene portrait';
  fig.append(sceneSvg(sceneRects(stage, { width: SCENE_W, bubble: recent?.icon }), cropOf('portrait', stage), t.art.scene[stage]));
  if (recent) fig.append(el('figcaption', recent.line));
  return fig;
}
```

`renderFeed`: change the signature and drop its own `notes()` call.

Replace:

```ts
function renderFeed(root: HTMLElement): void {
  root.replaceChildren();
  if (!life) return;
  root.append(el('h2', t.play.notes));
  const list = notes(life, t);
```

with:

```ts
function renderFeed(root: HTMLElement, list: readonly Note[]): void {
  root.replaceChildren();
  if (!life) return;
  root.append(el('h2', t.play.notes));
```

`renderMoneyCard`: insert the portrait right after the `aria-label` line. Replace:

```ts
  root.setAttribute('aria-label', M.heading);
  const v = moneyView(life, data);
```

with:

```ts
  root.setAttribute('aria-label', M.heading);
  const portrait = portraitEl(life);   // 자금 카드 위 초상 창(#152). 좁은 화면에서는 CSS 가 숨긴다
  if (portrait) root.append(portrait);
  const v = moneyView(life, data);
```

`renderInner`: compute the list once. Replace:

```ts
  renderFeed(document.getElementById('feed')!);
```

with:

```ts
  const list = life ? notes(life, t) : [];
  recent = latestEvent(list, t);
  renderFeed(document.getElementById('feed')!, list);
```

(`WIDE_W`는 Task 3의 `renderBackdrop`이 쓴다. `tsconfig.json`에 `noUnusedLocals`가 없어 이 커밋의 타입 검사는 통과한다.)

- [ ] **Step 7: CSS** — append to `web/src/style.css`

```css
/* 초상 창(#152, 안 d): 왼쪽 칸 자금 카드 위. 64rem 미만에서는 숨기고 상태 줄이 대신한다(#153). 보이고 숨기는 display 는 클래스로만 정한다. */
.portrait { display: none; margin: 0 0 .75rem; }
.portrait svg { width: 100%; height: auto; border: 3px solid var(--fg); }
.portrait figcaption { margin-top: .3rem; font-size: .9rem; color: var(--fg); }
@media (min-width: 64rem) {
  .portrait { display: block; }
}
```

- [ ] **Step 8: Run tests**

Run: `node node_modules/vitest/vitest.mjs run web/test`
Expected: PASS(`pixel.test.ts`·`art.test.ts`·`a11y.test.ts`·`strings.test.ts` 포함. `a11y.test.ts`의 리스너 시험은 그대로 `b:click`, `cb:change`).

- [ ] **Step 9: Typecheck and commit**

```bash
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
git add web/src/strings.ko.ts web/src/main.ts web/src/style.css web/test/artview.test.ts
git commit -m "feat(web): portrait window above the money card with the latest event as a speech bubble, wide screens only (#152)"
```

---

### Task 3: 여백 풍경 (안 c)

**Files:**
- Modify: `web/index.html` (빈 `#backdrop`)
- Modify: `web/src/main.ts` (`renderBackdrop`, `renderInner`)
- Modify: `web/src/style.css` (맨 아래)
- Test: `web/test/artview.test.ts`, `web/test/a11y.test.ts`(첫 Tab 시험은 그대로 통과해야 한다)

**Interfaces:**
- Consumes: Task 1의 `cropOf('strip', …)`, `WIDE_W`; Task 2의 `sceneSvg`.
- Produces: `index.html`의 `<div id="backdrop" class="backdrop px-scene" aria-hidden="true"></div>`, `<html data-scene="phd|career|retire">`(장면이 없으면 속성 없음), `main.ts`의 `renderBackdrop(root, s)`.

- [ ] **Step 1: Write the failing tests** — append to `web/test/artview.test.ts`

```ts
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
    const rules = [...wide.matchAll(/html\[data-art="full"\]\[data-scene="(\w+)"\]\s*\{\s*background:\s*var\(--([a-z0-9-]+)\)/g)];
    expect(rules.map(m => m[1]).sort()).toEqual(['career', 'phd', 'retire']);
    for (const m of rules) {
      expect(defines(lightRoot, m[2]!), `light ${m[2]}`).toBe(true);
      expect(defines(darkRoot, m[2]!), `dark ${m[2]} (night colors)`).toBe(true);
    }
    expect(stripBlocks(css, '@media (min-width: 64rem)')).not.toMatch(/html\[data-art="full"\]\[data-scene/);
  });
  it('the strip is fixed to the bottom, behind the body, ignores the pointer, and is hidden below 64rem', () => {
    const rule = ruleBody(css, '.backdrop')!;
    expect(rule).toMatch(/display:\s*none/);
    const w = ruleBody(wide, '.backdrop')!;
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node node_modules/vitest/vitest.mjs run web/test/artview.test.ts`
Expected: FAIL(`#backdrop` 없음, `renderBackdrop` 없음).

- [ ] **Step 3: `index.html`**

`<script type="module" src="./src/variant.ts"></script>` 바로 위에 한 줄을 넣는다(한글 없음):

```html
  <div id="backdrop" class="backdrop px-scene" aria-hidden="true"></div>
```

- [ ] **Step 4: `main.ts` — `renderBackdrop`**

Add after `portraitEl`:

```ts
/**
 * 본문 바깥 여백의 풍경(#152, 안 c): <html data-scene> 이 하늘·벽 색을 정하고(CSS), 화면 아래에 풍경 띠를 깐다.
 * 장식이라 화면 낭독기에서 숨긴다(뜻은 초상 창의 설명이 전한다). 단계가 그대로면 다시 그리지 않는다.
 */
function renderBackdrop(root: HTMLElement, s: LifeState | undefined): void {
  const stage = s ? sceneOf(s) : undefined;
  if (stage) document.documentElement.dataset.scene = stage;
  else delete document.documentElement.dataset.scene;
  if ((root.dataset.stage ?? '') === (stage ?? '')) return;
  root.dataset.stage = stage ?? '';
  root.replaceChildren();
  if (stage) root.append(sceneSvg(sceneRects(stage, { width: WIDE_W }), cropOf('strip', stage), undefined, 'xMidYMax slice'));
}
```

In `renderInner`, add as the line right after `recent = latestEvent(list, t);`:

```ts
  renderBackdrop(document.getElementById('backdrop')!, life);
```

- [ ] **Step 5: CSS** — append to `web/src/style.css`

```css
/* 여백 풍경(#152, 안 c): html 배경이 장면 색이고, 화면 아래에 풍경 띠를 고정한다. 본문(body)은 불투명(--bg)이라 글자 뒤에는 비치지 않는다.
   색은 그림 토큰이라 어두운 테마에서 밤 색으로 바뀐다. 간단히·끄기에서는 .px-scene 규칙이 띠를 숨기고, 배경 색은 data-art="full" 일 때만 준다. */
.backdrop { display: none; }
@media (min-width: 64rem) {
  .backdrop { display: block; position: fixed; left: 0; right: 0; bottom: 0; height: 9rem; z-index: -1; pointer-events: none; }
  .backdrop svg { width: 100%; height: 100%; }
  html[data-art="full"][data-scene="phd"] { background: var(--lab-wall); }
  html[data-art="full"][data-scene="career"] { background: var(--car-sky); }
  html[data-art="full"][data-scene="retire"] { background: var(--ret-d2); }
}
```

- [ ] **Step 6: Run all checks**

```bash
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/vitest/vitest.mjs run
node scripts/validate-data.mjs
```
Expected: 출력 없음 / 전부 PASS / `validate-data: ok`.

- [ ] **Step 7: Commit**

```bash
git add web/index.html web/src/main.ts web/src/style.css web/test/artview.test.ts
git commit -m "feat(web): stage scenery in the margins: html background and a fixed strip behind an opaque body (#152)"
```

---

### Task 4: 화면 확인, 실험 기록, PR

**Files:**
- Modify: `docs/design/experiments/0002-pixel-scenes.md` (`## 반응`에 한 줄)

- [ ] **Step 1: Build and serve**

`npm run build:web` 후 `node node_modules/vite/bin/vite.js preview --port 4317 --strictPort`를 백그라운드로 띄운다. Chrome 확장이 연결되면 `http://localhost:4317/`를 열고, 스크린샷이 시간 초과되면 DOM 검사(`javascript_tool`)로 대신한다. 확장이 연결되지 않으면 프로젝트 메모의 헤드리스 Chrome 방식(`node --experimental-websocket`, DevTools 프로토콜의 `Runtime.evaluate`, `Page.captureScreenshot`, 어두운 테마는 `Emulation.setEmulatedMedia`로 `prefers-color-scheme: dark`)을 쓴다.

- [ ] **Step 2: 넓은 화면 확인(폭 1440)**

분야 하나를 고르고 자동 모드 16×로 진행하면서 `document.documentElement.dataset.scene`이 `phd` → `career` → `retire`로 바뀔 때마다 아래를 본다. 기록이 은퇴 전에 끝나면(돈이 바닥나는 삶이 많다) 본 장면만 적고 못 본 장면은 못 봤다고 적는다.
- `#money > figure.portrait`가 자금 카드 맨 위에 있고 `role="img"`와 한국어 `aria-label`이 있다. 말풍선에 최근 사건 아이콘이 있고 아래 문장이 연구노트 첫 아이콘 줄과 같다.
- `getComputedStyle(document.documentElement).backgroundColor`가 장면 색이다. `getComputedStyle(document.body).backgroundColor`는 `--bg` 값이다(불투명).
- `#backdrop svg`가 화면 아래에 붙어 있고 `aria-hidden="true"`이며 본문 글자를 가리지 않는다(`elementFromPoint`가 본문 요소를 돌려준다).
- 어두운 테마에서 `html` 배경과 장면이 밤 색이다. 초상 창의 인물·말풍선이 어두운 배경에서 구별된다.

- [ ] **Step 3: 그림 설정과 좁은 화면 확인**

- "간단히": 초상 창과 풍경 띠가 `display: none`이고 `html` 배경이 기본 색이다. 연구노트 아이콘은 남는다. "끄기": 아이콘도 사라지고 종류 글자가 돌아온다. 새로고침해도 선택이 남는다. "모두"로 되돌린다.
- 폭 390: 초상 창과 풍경 띠가 보이지 않고(`offsetParent === null`) `document.documentElement.scrollWidth <= clientWidth`.

- [ ] **Step 4: 실험 기록과 커밋**

`docs/design/experiments/0002-pixel-scenes.md`의 `## 반응` 끝에 한 줄을 덧붙인다(날짜, 확인한 폭·장면·테마, 못 본 것, 시험 수).

```bash
git add docs/design/experiments/0002-pixel-scenes.md
git commit -m "docs(design): pixel scenes wide-screen check recorded in experiment 0002 (#152)"
```

- [ ] **Step 5: PR**

```bash
git push -u origin design/pixel-wide
gh pr create --base main --title "feat(web): 넓은 화면의 초상 창과 여백 풍경 (#152)" --label enhancement --label area/ui --body-file <본문 파일>
```

본문: `Closes #152`, 바뀐 것(초상 창, 풍경 띠, `data-scene`, `pixelSvg` 설명·자르기), 시험 수, Chrome 확인 결과(못 본 것은 못 봤다고), 정하고 간 것(아래 "스펙이 정하지 않아 이 plan이 정한 것"), 다음 큐 #153. 끝에 `🤖 Generated with [Claude Code](https://claude.com/claude-code)` 와 세션 링크.

## 스펙이 정하지 않아 이 plan이 정한 것 (PR 본문에 옮긴다)
- 최근 사건 = 연구노트에서 아이콘이 있는 가장 새 줄. 오래된 사건도 새 아이콘 줄이 생길 때까지 그대로 보이고, 문장 앞의 달력 연월이 시점을 알린다.
- 풍경 띠 = 160칸 장면의 아래 16줄. 인물은 가운데에 있어 본문이 가리고, 여백에는 땅·하늘·벽이 보인다. 띠는 장식(`aria-hidden`)이고 뜻은 초상 창의 설명이 전한다.
- 말풍선 깜빡임은 넣지 않았다. 자금 카드가 매 틱 다시 그려져 움직임이 틱마다 되풀이되기 때문이다. 움직임 줄이기 규칙은 움직임이 처음 생기는 #154에서 넣는다.
- 한 화면에 장면이 하나만 크게 나오는 규칙(§4)은 초상 창만 `role="img"`로 두고 띠를 장식으로 둬서 낭독기에도 지킨다.
