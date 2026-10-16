# 픽셀 그림: 모바일 설계(#153) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 화면 폭 64rem 미만에서 (1) 위에 고정되는 상태 줄(24칸 초상, `statusLine` 단계 문장, 나이·진행 기간·현금), (2) 화면 아래 고정 알림 막대(최근 사건 아이콘 + 문장, `aria-hidden`), (3) `<details>`로 접히는 자금 카드(요약 줄에 현금)를 넣고, 390px 폭에서 가로 넘침이 없게 한다.

**Architecture:** 상태 줄·알림 막대에 보일 값(`statusBarView`, `moneySummary`, `moneyFoldOpen`, 24칸 자르기)은 #152의 DOM 없는 `web/src/artview.ts`에 더해 시험한다. `main.ts`는 `index.html`의 빈 `#statusbar`·`#alertbar`를 매 렌더에 다시 채우고, 자금 카드를 `<details class="fold">`로 감싼다. 보이고 숨기는 일은 CSS(`@media not all and (min-width: 64rem)`, 곧 64rem 미만)가 한다. 넓은 화면에서는 두 막대가 숨고 #152의 초상 창이 나온다.

**Tech Stack:** TypeScript, Vite, vitest(`node node_modules/vitest/vitest.mjs run`), 엔진은 `engine/src/browser`로만 import.

**Spec:** `docs/design/pixel-scenes.md`(§2 모바일 상태 줄 초상 24×24칸, §4 배치 표 좁은 화면 칸, §5 그림 설정, §6 코드 구조, §7 시험), 실험 `docs/design/experiments/0002-pixel-scenes.md`.

**전제:** #152가 머지돼 있다. 아래 이름은 #152 plan의 Interfaces와 #151 plan에서 온다: `artview.ts`의 `Crop`, `CropKind`(`'portrait' | 'strip'`), `PORTRAIT_W`, `WIDE_W`, `cropOf`, `LatestEvent`, `latestEvent`; `main.ts`의 `recent`(renderInner가 정함), `sceneSvg(rects, crop, label?, fit?)`, `pixelSvg(..., opts)`, `portraitEl`, `iconEl`, `renderMoneyCard`; `web/test/helpers.ts`의 `balanced`, `blocks`, `stripBlocks`, `ruleBody`, `fnBody`; `pixel.ts`의 `sceneRects`, `sceneOf`, `SCENE_W`, `SCENE_H`, `scenePerson`; `ko.art.scene`.

## Global Constraints
- 화면 문장은 `web/src/strings.ko.ts`에만 둔다. `index.html`에 한글 금지(0001). 이 issue는 새 문장이 필요 없다: 기존 `ko.play.age`·`ko.month`·`ko.play.money.{heading,cash,ledgerHeading}`·`ko.cohort.heading`·`ko.cohort.branchHeading`·`ko.art.scene`를 쓴다.
- web은 엔진을 `engine/src/browser`로만 import한다(`web/test/boundary.test.ts`).
- `main.ts`의 이벤트 리스너는 `button()`의 click과 자동 checkbox의 change뿐이다(`web/test/a11y.test.ts`). `<details>`의 열고 닫기는 브라우저 기본 동작이고 `toggle` 리스너를 달지 않는다. 열림 상태는 다시 그리기 직전의 `details.open`을 읽어 이어받는다.
- 알림 막대는 `aria-hidden="true"`이고 새 낭독 영역(`aria-live`·`role="status"`·`role="alert"`)을 만들지 않는다. 같은 문장이 연구노트에 글자로 있다(§4).
- 새 CSS는 파일 맨 아래에 덧붙인다. 기존 대비 토큰 블록(2–3행)은 바꾸지 않는다.
- **그림 요소의 `display`는 클래스 선택자로만 정한다**(`#statusbar { display: … }` 금지). `html[data-art="lite|off"] .px-scene { display: none }`(명시도 0,2,1)이 `#id`(1,0,0)에게 지면 "끄기"에서 그림이 남는다.
- 그림 안에는 글자를 넣지 않는다. 막대의 글자는 `--fg`/`--bg`를 쓴다.
- 커밋 메시지 끝: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` 과 `Claude-Session: https://claude.ai/code/session_01XePbKtbt9aEiscpsxEuCTJ`.

## Review Focus
1. 위·아래 고정 막대가 키보드 초점이나 `h2` 이동(`scrollIntoView`)을 가리면 안 된다(WCAG 2.2 "초점이 가려지지 않음"). `scroll-padding-top/bottom`이 막대 높이 이상이어야 한다 → Task 3 CSS 시험.
2. 알림 막대가 새 낭독 영역이 되면 틱마다 낭독기가 문장을 읽는다 → Task 2 시험(`aria-hidden`, 라이브 영역 없음).
3. 자금 카드가 매 틱 다시 그려지는데도 접힘·펼침이 유지되고, 요약 줄에 키보드 초점이 있으면 초점이 그대로 남아야 한다 → Task 3 시험(`details.open` 이어받기, `data-k`, `closest('section[id], aside[id]')`).
4. 넓은 화면에서 두 막대가 숨고 초상 창만 나와야 한다(좁은 화면의 반대). 장면이 한 화면에 둘 나오면 안 된다 → Task 2 CSS 시험.
5. "끄기"·"간단히"에서 상태 줄의 초상과 알림 막대가 사라지고, 상태 줄 글자는 남는다 → Task 2 시험.
6. 390px에서 가로 넘침 없음. 표(월별 계산서·동기·분기 비교)가 가장 먼저 넘친다 → Task 3 `scrollBox`, Task 4 Chrome 확인.

---

### Task 1: 상태 줄 값, 24칸 자르기, 자금 카드 요약 (DOM 없음)

**Files:**
- Modify: `web/src/artview.ts`
- Test: `web/test/artview.test.ts`

**Interfaces:**
- Consumes: `LifeState`, `statusLine`, `wonText` (play.ts), `elapsedLabel` (dates.ts), `sceneOf`.
- Produces: `CropKind`에 `'status'` 추가(`cropOf('status', stage)`는 24×24), `export const STATUS_W = 24`, `export interface StatusBarView { stage: SceneStage | undefined; line: string; facts: string[] }`, `export function statusBarView(s: LifeState, t: Strings): StatusBarView`, `export function moneySummary(s: LifeState, t: Strings): string`, `export function moneyFoldOpen(prev: boolean | undefined, wide: boolean): boolean`.

- [ ] **Step 1: Write the failing tests** — append to `web/test/artview.test.ts`

Merge into the imports at the top:

```ts
import { WIDE_W, cropOf, latestEvent, moneyFoldOpen, moneySummary, statusBarView } from '../src/artview';
import { notes, statusLine, wonText } from '../src/play';
```

(`notes` is already imported from `../src/play`; keep one import line.) Append:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node node_modules/vitest/vitest.mjs run web/test/artview.test.ts`
Expected: FAIL(`statusBarView` 등이 export되지 않음).

- [ ] **Step 3: Extend `web/src/artview.ts`**

Replace the import block at the top:

```ts
import { calendarLabel } from './dates';
import { SCENE_H, SCENE_W, iconOf, scenePerson, type Icon, type SceneStage } from './pixel';
import type { Note } from './play';
import type { Strings } from './strings.ko';
```

with:

```ts
import type { LifeState } from '../../engine/src/browser';
import { calendarLabel, elapsedLabel } from './dates';
import { SCENE_H, SCENE_W, iconOf, sceneOf, scenePerson, type Icon, type SceneStage } from './pixel';
import { statusLine, wonText, type Note } from './play';
import type { Strings } from './strings.ko';
```

Replace `export type CropKind = 'portrait' | 'strip';` with:

```ts
export type CropKind = 'portrait' | 'status' | 'strip';
```

Add under `export const WIDE_W = 160; …`:

```ts
export const STATUS_W = 24;     // 모바일 상태 줄 초상: 24×24칸(§2)
```

Add the `status` case to `cropOf` (before `case 'strip'`) and extend its comment:

```ts
    case 'status': return { x: clamp(p.x + PERSON_W / 2 - STATUS_W / 2, 0, SCENE_W - STATUS_W), y: clamp(p.y - 6, 0, SCENE_H - STATUS_W), w: STATUS_W, h: STATUS_W };
```

(status = 인물이 가운데 오는 24×24. 위로 6칸 여유를 둬 머리 위 공간을 남긴다. 말풍선은 없다.)

Append to the file:

```ts
export interface StatusBarView { stage: SceneStage | undefined; line: string; facts: string[] }

/** 모바일 위 고정 상태 줄(#153, §4): 초상 장면, 단계 문장(`statusLine`), 나이·진행 기간·현금. 값은 상태에서만 정한다. */
export function statusBarView(s: LifeState, t: Strings): StatusBarView {
  return {
    stage: sceneOf(s),
    line: statusLine(s, t),
    facts: [
      `${t.play.age} ${Math.floor(s.ageMonths / 12)}${t.play.ageUnit}`,
      `${t.month} ${elapsedLabel(s.month, t)}`,
      `${t.play.money.cash} ${wonText(s.money.cash, t)}`,
    ],
  };
}

/** 접힌 자금 카드의 요약 줄: 제목과 현금. */
export function moneySummary(s: LifeState, t: Strings): string {
  return `${t.play.money.heading} · ${t.play.money.cash} ${wonText(s.money.cash, t)}`;
}

/**
 * 자금 카드의 열림 상태. 카드는 틱마다 다시 그려지므로 직전에 그려진 `details.open`(없으면 undefined)을 이어받고,
 * 처음에는 넓은 화면(≥64rem)에서만 펼친다. 폭이 바뀌어도 사용자가 정한 상태를 뒤집지 않는다.
 */
export function moneyFoldOpen(prev: boolean | undefined, wide: boolean): boolean {
  return prev ?? wide;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node node_modules/vitest/vitest.mjs run web/test/artview.test.ts web/test/play.test.ts web/test/dates.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck and commit**

```bash
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
git add web/src/artview.ts web/test/artview.test.ts
git commit -m "feat(web): status line values, 24-cell portrait crop and money card fold rules for the mobile layout (#153)"
```

---

### Task 2: 위 고정 상태 줄과 아래 고정 알림 막대

**Files:**
- Modify: `web/index.html`
- Modify: `web/src/main.ts` (`renderStatusBar`, `renderAlertBar`, `renderInner`)
- Modify: `web/src/style.css` (맨 아래)
- Test: `web/test/artview.test.ts`

**Interfaces:**
- Consumes: Task 1의 `statusBarView`, `cropOf('status', …)`; #152의 `recent`, `sceneSvg`, `sceneRects`, `iconEl`, `SCENE_W`.
- Produces: `index.html`의 `<div id="statusbar" class="statusbar"></div>`(건너뛰기 링크 바로 아래)와 `<div id="alertbar" class="alertbar px-scene" aria-hidden="true"></div>`(`#backdrop` 아래). CSS 클래스 `.statusbar`, `.sb-portrait`(`px-scene`), `.sb-text`, `.sb-facts`, `.alertbar`, `.alert-text`.

- [ ] **Step 1: Write the failing tests** — append to `web/test/artview.test.ts`

```ts
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
    expect(root).toMatch(/scroll-padding-top:\s*[\d.]+rem/);
    expect(root).toMatch(/scroll-padding-bottom:\s*[\d.]+rem/);
    expect(ruleBody(narrow, 'body')).toMatch(/padding-bottom:\s*[\d.]+rem/);
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node node_modules/vitest/vitest.mjs run web/test/artview.test.ts`
Expected: FAIL(`#statusbar` 없음, `renderStatusBar` 없음).

- [ ] **Step 3: `index.html`**

`<a class="skip" id="skip" href="#main"></a>` 바로 아래에:

```html
  <div id="statusbar" class="statusbar"></div>
```

`<div id="backdrop" …></div>` 바로 아래에:

```html
  <div id="alertbar" class="alertbar px-scene" aria-hidden="true"></div>
```

- [ ] **Step 4: `main.ts` — bars**

Add `statusBarView` to the artview import: `import { WIDE_W, cropOf, latestEvent, statusBarView, type Crop, type LatestEvent } from './artview';`

Add after `renderBackdrop`:

```ts
/**
 * 모바일 위 고정 상태 줄(#153): 24칸 초상, 단계 문장, 나이·진행 기간·현금. 64rem 미만에서만 보인다(CSS).
 * 초상은 뜻이 있는 장면이라 설명을 달고 그림 설정(간단히·끄기)이 숨긴다. 글자는 모든 설정에서 남는다.
 */
function renderStatusBar(root: HTMLElement): void {
  root.replaceChildren();
  if (!life) return;
  const v = statusBarView(life, t);
  if (v.stage) {
    const pic = el('span');
    pic.className = 'px-scene sb-portrait';
    pic.append(sceneSvg(sceneRects(v.stage, { width: SCENE_W }), cropOf('status', v.stage), t.art.scene[v.stage]));
    root.append(pic);
  }
  const text = el('div');
  text.className = 'sb-text';
  const facts = el('span');
  facts.className = 'sb-facts';
  for (const f of v.facts) facts.append(el('span', f));
  text.append(el('strong', v.line), facts);
  root.append(text);
}

/**
 * 화면 아래 고정 알림 막대(#153): 최근 사건 아이콘 + 문장. 같은 문장이 연구노트에 글자로 있으므로 요소 전체가
 * aria-hidden 이고(index.html) 여기서 낭독 영역을 만들지 않는다.
 */
function renderAlertBar(root: HTMLElement): void {
  root.replaceChildren();
  if (!recent) return;
  const text = el('span', recent.line);
  text.className = 'alert-text';
  root.append(iconEl(recent.icon), text);
}
```

In `renderInner`, right after `renderBackdrop(...)` (which follows `recent = latestEvent(list, t);`), add:

```ts
  renderStatusBar(document.getElementById('statusbar')!);
  renderAlertBar(document.getElementById('alertbar')!);
```

- [ ] **Step 5: CSS** — append to `web/src/style.css`

```css
/* 모바일 설계(#153, 64rem 미만): 위 고정 상태 줄, 아래 고정 알림 막대. 기본은 숨김이고 좁은 화면에서만 보인다.
   넓은 화면에서는 초상 창(#152)이 같은 일을 한다. display 는 클래스로만 정해 그림 설정 규칙이 이긴다. */
.statusbar { display: none; }
.alertbar { display: none; }
@media not all and (min-width: 64rem) {
  html { scroll-padding-top: 5rem; scroll-padding-bottom: 4.5rem; }
  body { padding-bottom: 4.5rem; }
  .statusbar { position: sticky; top: 0; z-index: 20; display: flex; gap: .6rem; align-items: center; margin: 0 -1rem; padding: .35rem 1rem; background: var(--bg); color: var(--fg); border-bottom: 2px solid var(--accent); }
  .alertbar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; display: flex; gap: .5rem; align-items: center; padding: .4rem 1rem; background: var(--bg); color: var(--fg); border-top: 2px solid var(--accent); font-size: .9rem; }
  .statusbar:empty, .alertbar:empty { display: none; }
  .sb-portrait { display: block; flex: none; width: 3rem; height: 3rem; }
  .sb-portrait svg { width: 100%; height: 100%; border: 2px solid var(--fg); box-sizing: border-box; }
  .sb-text { flex: 1; min-width: 0; line-height: 1.35; }
  .sb-text strong { display: block; overflow-wrap: anywhere; }
  .sb-facts { display: flex; flex-wrap: wrap; gap: 0 .75rem; font-size: .85rem; }
  .alertbar .px-icon { flex: none; margin-right: 0; }
  .alert-text { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; min-width: 0; }
  main, #feed, #money { overflow-wrap: anywhere; }
}
```

- [ ] **Step 6: Run tests**

Run: `node node_modules/vitest/vitest.mjs run web/test`
Expected: PASS(`a11y.test.ts`의 첫 Tab 시험: 새 `div`는 초점을 받지 않는다).

- [ ] **Step 7: Typecheck and commit**

```bash
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
git add web/index.html web/src/main.ts web/src/style.css web/test/artview.test.ts
git commit -m "feat(web): fixed status line on top and fixed alert bar at the bottom below 64rem (#153)"
```

---

### Task 3: 자금 카드 접기와 표 상자

**Files:**
- Modify: `web/src/main.ts` (`render`, `renderMoneyCard`, `scrollBox`, `renderLedger`, `renderCohort`, `renderBranch`)
- Modify: `web/src/style.css` (맨 아래)
- Test: `web/test/artview.test.ts`

**Interfaces:**
- Consumes: Task 1의 `moneySummary`, `moneyFoldOpen`.
- Produces: `<details class="fold">`(자금 카드 본문. `<summary data-k="money-fold">`), `main.ts`의 `scrollBox(child, label)`(가로로 넘칠 수 있는 표를 `div.table-scroll[role=region][tabindex=0]`로 감싼다).

- [ ] **Step 1: Write the failing tests** — append to `web/test/artview.test.ts`

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node node_modules/vitest/vitest.mjs run web/test/artview.test.ts`
Expected: FAIL.

- [ ] **Step 3: `main.ts` — fold**

Add `moneyFoldOpen, moneySummary` to the artview import.

In `render()`, replace:

```ts
  const focusIn = active?.closest('section[id]')?.id;
```

with:

```ts
  const focusIn = active?.closest('section[id], aside[id]')?.id;   // 자금 카드(aside#money)의 요약 줄도 포커스를 되돌린다(#153)
```

Replace the start of `renderMoneyCard`:

```ts
function renderMoneyCard(root: HTMLElement): void {
  root.replaceChildren();
  if (!life || !data) return;
  const M = t.play.money;
  root.setAttribute('aria-label', M.heading);
  const portrait = portraitEl(life);   // 자금 카드 위 초상 창(#152). 좁은 화면에서는 CSS 가 숨긴다
  if (portrait) root.append(portrait);
  const v = moneyView(life, data);
```

with:

```ts
function renderMoneyCard(host: HTMLElement): void {
  const prevFold = host.querySelector<HTMLDetailsElement>('details.fold');   // 다시 그리기 전의 열림 상태(리스너 없이 읽는다)
  host.replaceChildren();
  if (!life || !data) return;
  const M = t.play.money;
  host.setAttribute('aria-label', M.heading);
  const portrait = portraitEl(life);   // 자금 카드 위 초상 창(#152). 좁은 화면에서는 CSS 가 숨긴다. 접히는 몫이 아니다
  if (portrait) host.append(portrait);
  // 카드 본문은 <details> 로 접는다(#153): 좁은 화면에서는 접고 요약 줄에 현금, 넓은 화면에서는 지금처럼 펼친다.
  const root = el('details');
  root.className = 'fold';
  root.open = moneyFoldOpen(prevFold?.open, window.matchMedia('(min-width: 64rem)').matches);
  const sum = el('summary', moneySummary(life, t));
  sum.dataset.k = 'money-fold';
  root.append(sum);
  host.append(root);
  const v = moneyView(life, data);
```

The rest of the function keeps using `root` (now the `details`); `renderCareerFlow(root, …)` and `renderLedger(root, …)` take any `HTMLElement`.

- [ ] **Step 4: `main.ts` — table box**

Add after `pressed()`:

```ts
/** 가로로 넘칠 수 있는 표를 감싼다(#153): 좁은 화면에서 페이지가 아니라 표만 가로로 민다. 키보드로 닿도록 tabindex 0, 이름은 표 제목. */
function scrollBox(child: HTMLElement, label: string): HTMLElement {
  const box = el('div');
  box.className = 'table-scroll';
  box.tabIndex = 0;
  box.setAttribute('role', 'region');
  box.setAttribute('aria-label', label);
  box.append(child);
  return box;
}
```

Use it at the three table sites.

`renderLedger`: replace `    det.append(tbl);` with:

```ts
    det.append(scrollBox(tbl, M.ledgerHeading));
```

`renderCohort`: replace

```ts
  root.append(table);
}

function renderBranch
```

with:

```ts
  root.append(scrollBox(table, t.cohort.heading));
}

function renderBranch
```

`renderBranch`: replace

```ts
  root.append(table, el('p', fill(t.cohort.shared, { n: sharedPrefix(life, b) })));
```

with:

```ts
  root.append(scrollBox(table, t.cohort.branchHeading), el('p', fill(t.cohort.shared, { n: sharedPrefix(life, b) })));
```

- [ ] **Step 5: CSS** — append to `web/src/style.css`

```css
/* 자금 카드 접기와 표 상자(#153) */
.fold > summary { cursor: pointer; font-weight: 600; }
.fold[open] > summary { margin-bottom: .5rem; padding-bottom: .35rem; border-bottom: 1px solid var(--muted); }
.table-scroll { overflow-x: auto; max-width: 100%; }
@media not all and (min-width: 64rem) {
  #money { padding: .4rem .75rem; margin: .75rem 0; }
  th, td { padding: .2rem .35rem; }
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
git add web/src/main.ts web/src/style.css web/test/artview.test.ts
git commit -m "feat(web): money card folds into a details with cash in the summary below 64rem; wide tables scroll in their own box (#153)"
```

---

### Task 4: 화면 확인(390px), 실험 기록, PR

**Files:**
- Modify: `docs/design/experiments/0002-pixel-scenes.md` (`## 반응`에 한 줄)

- [ ] **Step 1: Build and serve**

`npm run build:web` 후 `node node_modules/vite/bin/vite.js preview --port 4317 --strictPort`를 백그라운드로 띄운다. 폭 390은 Chrome 확장의 `resize_window`가 창 최소 폭에 막히면 DevTools 프로토콜의 `Emulation.setDeviceMetricsOverride({ width: 390, height: 844, deviceScaleFactor: 2, mobile: true })`로 한다. 스크린샷이 시간 초과되면 DOM 검사로 대신하고 PR에 그렇게 적는다.

- [ ] **Step 2: 가로 넘침 검사 (폭 390, 세 장면, 두 테마)**

분야 하나를 고르고 자동 모드로 진행한다. 기록 끝까지 가며(월별 계산서·동기·분기 표가 길어진 뒤에도) 아래를 실행한다.

```js
(() => {
  const w = document.documentElement.clientWidth;
  return {
    overflow: document.documentElement.scrollWidth > w,
    culprits: [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > w + 1 && !e.closest('.table-scroll')).slice(0, 8).map(e => `${e.tagName}.${e.className}#${e.id}`),
  };
})()
```

기대: `overflow: false`, `culprits: []`. 걸리는 요소가 있으면 그 요소의 규칙에 `min-width: 0`(그리드·플렉스 자식)이나 `overflow-wrap: anywhere`를 더하고, 같은 검사를 다시 돌려 통과를 확인한 뒤 어떤 요소였는지 PR 본문에 적는다.

- [ ] **Step 3: 좁은 화면 확인**

- `#statusbar`가 스크롤해도 화면 위에 남는다(`getBoundingClientRect().top === 0`). 24칸 초상이 `role="img"`와 설명을 갖고, 단계 문장·나이·진행 기간·현금이 보인다. 현금이 틱마다 바뀐다.
- `#alertbar`가 화면 아래에 남고 최근 사건 아이콘과 문장이 보인다. `aria-hidden="true"`이고 안에 `[aria-live]`·`[role]`이 없다(`#alertbar.querySelector('[aria-live],[role]') === null`).
- `#money details.fold`가 처음에 접혀 있고 요약 줄에 `자금 카드 · 현금 …`이 보인다. 요약 줄에 Tab으로 초점을 주고 Enter로 펼친다. 자동 진행 중 틱이 지나도 펼친 채로 있고 `document.activeElement.dataset.k === 'money-fold'`다.
- `#money figure.portrait`는 보이지 않는다(`offsetParent === null`).
- 키보드로 Tab 이동할 때 초점이 있는 단추가 위·아래 막대에 가려지지 않는다(`scrollIntoView` 뒤 `getBoundingClientRect()`가 두 막대 사이).
- "간단히": 상태 줄 초상과 알림 막대가 사라지고 상태 줄 글자는 남는다. "끄기": 아이콘도 사라지고 종류 글자가 돌아온다.
- 어두운 테마(`Emulation.setEmulatedMedia`): 두 막대의 글자가 `--fg`/`--bg`로 읽힌다.

- [ ] **Step 4: 넓은 화면 회귀 확인(폭 1440)**

`#statusbar`·`#alertbar`가 `display: none`이고, 초상 창과 풍경 띠(#152)가 그대로이며, 자금 카드가 처음부터 펼쳐져 있다.

- [ ] **Step 5: 실험 기록과 커밋**

`docs/design/experiments/0002-pixel-scenes.md`의 `## 반응` 끝에 한 줄을 덧붙인다(날짜, 확인한 폭 390·1440, 장면·테마, 못 본 것, 시험 수).

```bash
git add docs/design/experiments/0002-pixel-scenes.md
git commit -m "docs(design): pixel scenes mobile check recorded in experiment 0002 (#153)"
```

- [ ] **Step 6: PR**

```bash
git push -u origin design/pixel-mobile
gh pr create --base main --title "feat(web): 모바일 고정 상태 줄과 알림 막대, 자금 카드 접기 (#153)" --label enhancement --label area/ui --body-file <본문 파일>
```

본문: `Closes #153`, 바뀐 것(상태 줄, 알림 막대, 접는 자금 카드, 표 상자), 시험 수, Chrome 확인 결과(못 본 것은 못 봤다고, 넘침 검사 결과와 고친 요소), 정하고 간 것(아래), 다음 큐 #154. 끝에 `🤖 Generated with [Claude Code](https://claude.com/claude-code)` 와 세션 링크.

## 스펙이 정하지 않아 이 plan이 정한 것 (PR 본문에 옮긴다)
- 위 고정은 `position: sticky`(본문 안에서 맨 위에 붙음), 아래 고정은 `position: fixed`다. 아래 막대가 푸터를 가리지 않도록 좁은 화면의 `body`에 아래 여백을 준다.
- 그림 설정: 상태 줄은 정보(단계·나이·기간·현금)라 "간단히"·"끄기"에서도 글자가 남고 초상만 숨는다. 알림 막대는 넓은 화면의 초상 창 문장과 짝이어서 둘 다 숨는다.
- 자금 카드의 열림 상태는 `toggle` 리스너 없이 다시 그리기 직전 `details.open`을 읽어 이어받는다(`a11y.test.ts`가 리스너를 `button`·자동 checkbox로 한정한다). 처음 상태만 폭으로 정한다.
- 초상 창은 접히는 카드 밖(위)에 둔다. 넓은 화면에서 사용자가 카드를 접어도 초상은 남는다.
- 표 가로 넘침은 표를 `role="region"` 상자로 감싸 상자만 가로로 밀게 했다(`display: block` 표는 표 의미가 약해질 수 있어 쓰지 않았다).
