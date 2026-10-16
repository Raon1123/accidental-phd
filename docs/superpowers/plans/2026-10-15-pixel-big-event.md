# 픽셀 그림: 큰 사건 장면(#154) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 큰 사건(입학, 학위, 채용, 은퇴, 모든 기록 종료)이 생긴 달에 연구노트 위에 넓은 장면(160칸)과 대화 상자를 띄운다. 닫기 단추(`button()`)로 닫고, 다음 진행 때 접히며, 자동 진행이 4× 이상일 때는 띄우지 않는다. `prefers-reduced-motion`을 존중한다.

**Architecture:** "어느 사건이 새로 생겼나, 띄울 것인가, 대화 상자에 무슨 글을 넣나"는 DOM 없는 `web/src/artview.ts`의 `bigSceneAfter`가 정한다. `main.ts`는 상태를 바꿔 끼우는 모든 자리를 하나의 `adopt(next, prevLogLength, autoSpeed)`로 모아 거기서만 `bigScene`을 정하고(진행할 때마다 새로 정하므로 새 큰 사건이 없으면 접힌다), `renderBigScene`이 `index.html`의 빈 `#bigscene`을 채운다. 움직임(등장 효과)은 처음 그릴 때만 걸고 CSS가 `prefers-reduced-motion: no-preference`일 때만 켠다.

**Tech Stack:** TypeScript, Vite, vitest(`node node_modules/vitest/vitest.mjs run`), 엔진은 `engine/src/browser`로만 import.

**Spec:** `docs/design/pixel-scenes.md`(§2 넓은 장면 160칸, §4 배치 표 "큰 순간"과 큰 사건 정의·4× 이상 생략, §5 움직임 줄이기, §6 코드 구조, §7 시험), 실험 `docs/design/experiments/0002-pixel-scenes.md`.

**전제:** #153이 머지돼 있다. 아래 이름은 앞 plan들의 Interfaces에서 온다: `pixel.ts`의 `isBigEvent`, `iconOf`, `sceneOf`, `sceneRects`, `SceneStage`, `Icon`; `artview.ts`의 `Crop`, `CropKind`(`'portrait' | 'status' | 'strip'`), `WIDE_W`, `cropOf`, `latestEvent`; `main.ts`의 `sceneSvg(rects, crop, label?, fit?)`, `iconEl`, `button()`, `renderInner`, `recent`; `play.ts`의 `noteKind`, `noteText`, `step`, `halted`, `Speed`; `scenes.ts`의 `logScene`; `web/test/helpers.ts`의 `blocks`, `stripBlocks`, `ruleBody`, `fnBody`; `ko.art.scene`.

## Global Constraints
- 화면 문장은 `web/src/strings.ko.ts`에만 둔다. `index.html`에 한글 금지(0001).
- web은 엔진을 `engine/src/browser`로만 import한다(`web/test/boundary.test.ts`).
- `main.ts`의 이벤트 리스너는 `button()`의 click과 자동 checkbox의 change뿐이다(`web/test/a11y.test.ts`). 닫기는 `button()`으로 만들고 `Esc` 같은 키 리스너는 달지 않는다.
- 대화 상자는 `role="dialog"`·`aria-modal`을 쓰지 않는다. 가두지 않는 보조 요소이고, 같은 문장이 연구노트에 글자로 있다. 초점을 자동으로 옮기지 않는다(진행 중 틱마다 초점을 빼앗지 않기 위해).
- 큰 장면은 `px-scene` 클래스를 달아 그림 설정 "간단히"·"끄기"에서 통째로 숨긴다. `display`는 클래스 선택자로만 정한다(`#bigscene { display: … }` 금지: `html[data-art] .px-scene`(0,2,1)이 이겨야 한다).
- **`animation`·`transition`·`@keyframes`는 `@media (prefers-reduced-motion: no-preference)` 블록 안에만 둔다**(시험으로 강제). 이 블록이 이 저장소의 첫 움직임이다.
- 그림 안에는 글자를 넣지 않는다. 대화 상자 글자는 `--fg`/`--bg`를 쓴다.
- 커밋 메시지 끝: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` 과 `Claude-Session: https://claude.ai/code/session_01XePbKtbt9aEiscpsxEuCTJ`.

## Review Focus
1. 자동 진행이 4× 이상이면 띄우지 않되, 수동 진행("한 칸 진행")·결정·새 삶·진행이 멈추는 칸(결정 지점, 기록 끝)에서는 배속 설정과 무관하게 띄운다 → Task 1 `showsBigScene`·`bigSceneAfter` 시험, Task 2 `tick` 호출 시험.
2. 상태를 바꾸는 모든 자리(진행, 한 칸, 결정, 자동 전환, 새 삶, 불러오기)가 `adopt`를 거쳐야 한다. 한 곳이라도 `life = …`로 직접 바꾸면 큰 장면이 낡은 채로 남거나 안 뜬다 → Task 2 소스 시험(`life = advanceWith(` 등이 남지 않음).
3. 불러온 저장 삶(`loadLife`)에서는 이미 지난 큰 사건 장면이 뜨면 안 된다 → Task 2 시험(`bigScene = undefined`), Task 1 `prevLogLength` 시험.
4. 닫기 단추: 키보드로 닿고(Tab), 누르면 장면이 사라지고 초점이 연구노트 제목으로 가야 한다(초점이 사라진 요소에 남으면 안 된다) → Task 2 시험, Task 3 Chrome 확인.
5. 움직임 줄이기: 어떤 움직임도 `no-preference` 블록 밖에 없어야 한다. 등장 효과는 새 장면을 처음 그릴 때만(카드가 다른 이유로 다시 그려질 때마다 되풀이되지 않게) → Task 2 CSS·소스 시험.
6. 새 큰 사건이 없는 진행에서 장면이 접히고, 같은 사건이 두 번 뜨지 않는다(`prevLogLength` 이후의 새 기록만 본다) → Task 1 시험.

---

### Task 1: 큰 장면을 정하는 규칙 (DOM 없음)

**Files:**
- Modify: `web/src/artview.ts`
- Test: `web/test/artview.test.ts`

**Interfaces:**
- Consumes: `isBigEvent`, `iconOf`, `sceneOf`, `Icon`, `SceneStage` (pixel.ts); `noteKind`, `noteText` (play.ts); `logScene` (scenes.ts); `LifeState`.
- Produces: `CropKind`에 `'wide'` 추가(`cropOf('wide', stage)` = `{ x: 0, y: 0, w: 160, h: 40 }`), `export const AUTO_SKIP_SPEED = 4`, `export function showsBigScene(autoSpeed: number | undefined): boolean`, `export function newBigEntry(log: LifeState['log'], prevLogLength: number): LifeState['log'][number] | undefined`, `export function bigIcon(textKey: string): Icon`, `export interface BigSceneView { id: string; stage: SceneStage; icon: Icon; lines: { text: string; creative: boolean }[] }`, `export function bigSceneAfter(s: LifeState, t: Strings, prevLogLength: number, autoSpeed: number | undefined): BigSceneView | undefined`.

- [ ] **Step 1: Write the failing tests** — append to `web/test/artview.test.ts`

Merge into the imports at the top:

```ts
import { AUTO_SKIP_SPEED, bigIcon, bigSceneAfter, newBigEntry, showsBigScene } from '../src/artview';
```

(`cropOf`, `WIDE_W`, `withLog`, `entry`, `STAGES`, `base`, `ko` already exist in the file.) Append:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node node_modules/vitest/vitest.mjs run web/test/artview.test.ts`
Expected: FAIL(`bigSceneAfter` 등이 export되지 않음).

- [ ] **Step 3: Extend `web/src/artview.ts`**

Replace the import lines:

```ts
import { SCENE_H, SCENE_W, iconOf, sceneOf, scenePerson, type Icon, type SceneStage } from './pixel';
import { statusLine, wonText, type Note } from './play';
import type { Strings } from './strings.ko';
```

with:

```ts
import { SCENE_H, SCENE_W, iconOf, isBigEvent, sceneOf, scenePerson, type Icon, type SceneStage } from './pixel';
import { noteKind, noteText, statusLine, wonText, type Note } from './play';
import { logScene } from './scenes';
import type { Strings } from './strings.ko';
```

Replace `export type CropKind = 'portrait' | 'status' | 'strip';` with:

```ts
export type CropKind = 'portrait' | 'status' | 'strip' | 'wide';
```

Add to `cropOf` (after `case 'strip'`):

```ts
    case 'wide': return { x: 0, y: 0, w: WIDE_W, h: SCENE_H };
```

Append to the file:

```ts
/** 자동 진행이 이 배속 이상이면 큰 장면을 띄우지 않는다(번쩍임 방지, §4). 초상 말풍선은 그대로 바뀐다. */
export const AUTO_SKIP_SPEED = 4;

/** autoSpeed = 자동 진행 중인 배속(수동 진행·결정·새 삶은 undefined). */
export function showsBigScene(autoSpeed: number | undefined): boolean {
  return autoSpeed === undefined || autoSpeed < AUTO_SKIP_SPEED;
}

type LogEntry = LifeState['log'][number];

/** 이전 상태 이후(`prevLogLength` 번째부터) 새로 쌓인 기록 중 마지막 큰 사건. 같은 사건이 두 번 뜨지 않게 이전 기록은 보지 않는다. */
export function newBigEntry(log: LifeState['log'], prevLogLength: number): LogEntry | undefined {
  for (let i = log.length - 1; i >= prevLogLength; i--) if (isBigEvent(log[i]!.textKey)) return log[i];
  return undefined;
}

/** 큰 사건의 그림: 기록 키·종류 규칙(iconOf)을 따르고, 아직 종류를 모르는 새 기록 종료 키(`log.end-*`)는 깃발. */
export function bigIcon(textKey: string): Icon {
  return iconOf(textKey, noteKind(textKey)) ?? 'end';
}

export interface BigSceneView {
  /** 같은 장면인지 가리는 값(등장 효과를 처음 그릴 때만 걸기 위해). */
  id: string;
  stage: SceneStage;
  icon: Icon;
  /** 대화 상자 글: 기록 문장, 그 아래 붙는 서사 장면(있으면, 창작). */
  lines: { text: string; creative: boolean }[];
}

/**
 * 진행 직후의 큰 장면. `prevLogLength` = 진행 전 상태의 기록 길이(새 삶은 0, 불러온 삶은 그 기록 길이).
 * 자동 진행이 너무 빠르거나, 새 큰 사건이 없거나, 장면이 없는 단계(시작 전)면 undefined.
 */
export function bigSceneAfter(s: LifeState, t: Strings, prevLogLength: number, autoSpeed: number | undefined): BigSceneView | undefined {
  if (!showsBigScene(autoSpeed)) return undefined;
  const e = newBigEntry(s.log, prevLogLength);
  const stage = sceneOf(s);
  if (!e || !stage) return undefined;
  const lines = [{ text: noteText(e, t, s), creative: e.creative }];
  const extra = logScene(s, e, s.log.indexOf(e))?.text;
  if (extra) lines.push({ text: extra, creative: true });
  return { id: `${s.seed}:${e.month}:${e.textKey}`, stage, icon: bigIcon(e.textKey), lines };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node node_modules/vitest/vitest.mjs run web/test/artview.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck and commit**

```bash
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
git add web/src/artview.ts web/test/artview.test.ts
git commit -m "feat(web): rules for the big event scene: newest big record, 4x auto-advance skip, dialog lines (#154)"
```

---

### Task 2: 큰 장면 그리기, 닫기, 움직임 줄이기

**Files:**
- Modify: `web/index.html`
- Modify: `web/src/strings.ko.ts` (`bigScene` 묶음)
- Modify: `web/src/main.ts` (`adopt`, 상태를 바꾸는 자리, `renderBigScene`, `renderInner`)
- Modify: `web/src/style.css` (맨 아래)
- Test: `web/test/artview.test.ts`

**Interfaces:**
- Consumes: Task 1의 `bigSceneAfter`, `BigSceneView`, `cropOf('wide', …)`; #152의 `sceneSvg`, `sceneRects`, `WIDE_W`; `iconEl`, `button()`.
- Produces: `<section id="bigscene" class="bigscene px-scene"></section>`(`#feed` 바로 위), `ko.bigScene = { region, close }`, `main.ts`의 `adopt(next, prevLogLength, autoSpeed?)`, `renderBigScene(root)`, 상태 `bigScene`·`bigShown`. CSS 클래스 `.bigscene`(`.fresh`는 처음 그릴 때만), `.dialog`, `.dialog-body`.

- [ ] **Step 1: Write the failing tests** — append to `web/test/artview.test.ts`

Merge into the imports at the top: `import { blocks, fnBody, ruleBody, stripBlocks } from './helpers';` already exists; nothing else is needed. Append:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node node_modules/vitest/vitest.mjs run web/test/artview.test.ts`
Expected: FAIL(`#bigscene` 없음, `ko.bigScene` 없음, `renderBigScene` 없음).

- [ ] **Step 3: `index.html`**

`<section id="feed"></section>` 바로 위에:

```html
  <section id="bigscene" class="bigscene px-scene"></section>
```

- [ ] **Step 4: Strings** — `web/src/strings.ko.ts`

`  title: '어쩌다 박사: 한국 연구자의 일생',` 바로 위에 넣는다:

```ts
  bigScene: { region: '큰 사건 장면', close: '장면 닫기' },
```

- [ ] **Step 5: `main.ts` — state and `adopt`**

Update the artview import: `import { WIDE_W, bigSceneAfter, cropOf, latestEvent, moneyFoldOpen, moneySummary, statusBarView, type BigSceneView, type Crop, type LatestEvent } from './artview';`

Add after `let recent: …`:

```ts
let bigScene: BigSceneView | undefined;   // 큰 사건 장면(#154). adopt 가 진행할 때마다 새로 정한다
let bigShown = '';                        // 마지막으로 그린 큰 장면 id(처음 그릴 때만 등장 효과)
```

Add after `advanceWith`:

```ts
/**
 * 상태를 바꿔 끼우고, 이번 진행에서 새로 쌓인 큰 사건이 있으면 큰 장면을 정한다(#154).
 * 진행할 때마다 새로 정하므로 새 큰 사건이 없으면 장면은 접힌다("다음 진행 때 접힘").
 * prevLogLength = 진행 전 기록 길이(새 삶은 0). autoSpeed = 자동 진행 중인 배속, 수동 진행·결정은 undefined.
 */
function adopt(next: LifeState, prevLogLength: number, autoSpeed?: number): void {
  if (next === life) return;   // 엔진을 부르지 않은 같은 상태: 장면을 그대로 둔다
  life = next;
  bigScene = bigSceneAfter(next, t, prevLogLength, autoSpeed);
}
```

- [ ] **Step 6: `main.ts` — route every state change through `adopt`**

`tick`: replace

```ts
  life = advanceWith(life, data);
  if (halted(life)) stop();
```

with:

```ts
  const next = advanceWith(life, data);
  adopt(next, life.log.length, halted(next) ? undefined : speed);   // 멈추는 칸은 자동 진행이 아니다: 결정 지점·기록 끝의 큰 사건은 배속과 무관하게 보인다
  if (halted(life)) stop();
```

`renderControls`: replace `life = advanceWith(life, data); render(); }` (inside the `t.play.stepOnce` button) so the line becomes:

```ts
    button(t.play.stepOnce, () => { if (life && data) { adopt(advanceWith(life, data), life.log.length); render(); } }, running || halted(s)),
```

and the auto checkbox handler:

```ts
  cb.addEventListener('change', () => { if (life && data) { adopt(setAuto(life, data, cb.checked), life.log.length); render(); } });
```

`renderCurrent`: replace

```ts
  renderDecision(root, life, i => { if (life && data) { life = decide(life, data, i); render(); } });
```

with:

```ts
  renderDecision(root, life, i => { if (life && data) { adopt(decide(life, data, i), life.log.length); render(); } });
```

`renderArchive`: in the open button, replace `life = loadLife(store, e.id); resetSide();` with `life = loadLife(store, e.id); bigScene = undefined; resetSide();`(불러온 삶은 지난 큰 사건 장면을 다시 띄우지 않는다.)

`startLife`: replace

```ts
  life = createLife(lifeConfig(track), newSeed(`${Date.now()}-${Math.random()}`), data);
  resetSide();
```

with:

```ts
  adopt(createLife(lifeConfig(track), newSeed(`${Date.now()}-${Math.random()}`), data), 0);   // 새 삶은 입학 장면으로 시작한다
  resetSide();
```

- [ ] **Step 7: `main.ts` — `renderBigScene`**

Add after `renderAlertBar`:

```ts
/**
 * 큰 사건 장면(#154, 안 a): 연구노트 위에 넓은 장면(160칸)과 대화 상자. 닫기 단추로 닫고 다음 진행 때 접힌다.
 * 대화 상자 글은 연구노트와 같은 문장이고 낭독 영역이 아니다. 등장 효과(.fresh)는 다른 장면을 처음 그릴 때만 건다.
 */
function renderBigScene(root: HTMLElement): void {
  root.replaceChildren();
  const v = bigScene;
  if (!v) {
    bigShown = '';
    for (const a of ['role', 'aria-label']) root.removeAttribute(a);
    root.classList.remove('fresh');
    return;
  }
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', t.bigScene.region);
  root.classList.toggle('fresh', v.id !== bigShown);
  bigShown = v.id;
  const body = el('div');
  body.className = 'dialog-body';
  for (const l of v.lines) body.append(el('p', l.creative ? `${l.text} [${t.play.creative}]` : l.text));
  body.append(button(t.bigScene.close, () => { bigScene = undefined; render(); document.querySelector<HTMLElement>('#feed h2')?.focus(); }, false, 'bigscene:close'));
  const dlg = el('div');
  dlg.className = 'dialog';
  dlg.append(iconEl(v.icon), body);
  root.append(sceneSvg(sceneRects(v.stage, { width: WIDE_W }), cropOf('wide', v.stage), t.art.scene[v.stage]), dlg);
}
```

In `renderInner`, add right after `recent = latestEvent(list, t);` (before `renderBackdrop`):

```ts
  renderBigScene(document.getElementById('bigscene')!);
```

- [ ] **Step 8: CSS** — append to `web/src/style.css`

```css
/* 큰 사건 장면(#154, 안 a): 연구노트 위의 넓은 장면과 대화 상자. 간단히·끄기에서는 .px-scene 규칙이 통째로 숨긴다.
   움직임은 처음 그릴 때(.fresh)의 등장 효과 하나뿐이고, 움직임 줄이기 설정이면 걸지 않는다. */
.bigscene { max-width: 48rem; margin: 0 auto 1rem; }
.bigscene:empty { display: none; }
.bigscene > svg { width: 100%; height: auto; border: 3px solid var(--fg); }
.dialog { position: relative; display: flex; gap: .6rem; align-items: flex-start; margin: -.2rem .5rem 0; padding: .6rem .9rem; background: var(--bg); color: var(--fg); border: 3px solid var(--fg); }
.dialog .px-icon { flex: none; width: 1.75rem; height: 1.75rem; margin: 0; }
.dialog-body { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.dialog-body p { margin: .2rem 0; }
.dialog-body button { margin-top: .4rem; }
@media (prefers-reduced-motion: no-preference) {
  @keyframes px-pop { from { opacity: 0; transform: translateY(.5rem); } to { opacity: 1; transform: none; } }
  .bigscene.fresh .dialog { animation: px-pop .35s steps(4) both; }
}
```

- [ ] **Step 9: Run all checks**

```bash
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
node node_modules/vitest/vitest.mjs run
node scripts/validate-data.mjs
```
Expected: 출력 없음 / 전부 PASS(`a11y.test.ts`의 리스너 시험은 그대로 `b:click`, `cb:change`) / `validate-data: ok`.

- [ ] **Step 10: Commit**

```bash
git add web/index.html web/src/strings.ko.ts web/src/main.ts web/src/style.css web/test/artview.test.ts
git commit -m "feat(web): big event scene above the research notes with a dialog box and a close button; skipped at 4x auto-advance (#154)"
```

---

### Task 3: 화면 확인, 실험 기록, PR

**Files:**
- Modify: `docs/design/experiments/0002-pixel-scenes.md` (`## 반응`에 한 줄)

- [ ] **Step 1: Build and serve**

`npm run build:web` 후 `node node_modules/vite/bin/vite.js preview --port 4317 --strictPort`를 백그라운드로 띄운다. Chrome 확장 스크린샷이 시간 초과되면 DOM 검사(`javascript_tool`)로 대신하고 PR에 그렇게 적는다. 확장이 연결되지 않으면 프로젝트 메모의 헤드리스 Chrome 방식(`node --experimental-websocket`, DevTools 프로토콜)을 쓴다. 움직임 줄이기는 `Emulation.setEmulatedMedia({ features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })`로, 어두운 테마는 `prefers-color-scheme: dark`로 켠다.

- [ ] **Step 2: 시나리오 확인 (폭 1440과 390)**

- 새 삶을 시작하면 `#bigscene`에 입학 장면이 있다: `svg[role=img]`에 설명이 있고, `.dialog` 안에 "박사과정에 입학했습니다." 문장과 시작 아이콘, 닫기 단추가 있다. 장면은 연구노트(`#feed`) 위에 있다.
- 닫기 단추: Tab으로 닿는다. 누르면 장면이 사라지고 `document.activeElement`가 `#feed h2`다.
- 닫지 않고 "한 칸 진행"을 누르면 장면이 접힌다(새 큰 사건이 없는 칸).
- 속도 1×로 자동 진행을 켜고 큰 사건(학위·채용·은퇴·기록 끝) 칸에서 장면이 한 칸 동안 보였다가 다음 칸에 접히는지 본다. 같은 시나리오를 8×·16×로 되풀이해 진행 중에는 장면이 뜨지 않는지 본다(초상 창 말풍선(≥64rem)·알림 막대(<64rem)는 계속 바뀐다).
- 8×로 기록 끝까지 진행하면, 진행이 멈춘 칸(기록 끝)에서는 장면이 뜬다.
- 기록 끝까지 가기 전에 보관 목록에서 저장한 삶을 "열기"하면 장면이 없다.
- 움직임 줄이기: 장면을 처음 그릴 때 `getComputedStyle(document.querySelector('#bigscene .dialog')).animationName`이 기본에서는 `px-pop`, 움직임 줄이기에서는 `none`이다. 닫기와 무관한 이유로 다시 그려질 때(속도 단추 누름)는 `.fresh`가 없어 `none`이다.
- "간단히"·"끄기": `#bigscene`이 `display: none`이고 닫기 단추에 Tab이 닿지 않는다.
- 어두운 테마: 대화 상자 글자가 `--fg`/`--bg`로 읽히고 장면이 밤 색이다. 폭 390: `document.documentElement.scrollWidth <= clientWidth`, 장면과 대화 상자가 폭에 맞는다.
- 세 장면(박사과정·경력·은퇴) 중 기록에서 본 것은 적고, 못 본 것은 못 봤다고 적는다.

- [ ] **Step 3: 실험 기록과 커밋**

`docs/design/experiments/0002-pixel-scenes.md`의 `## 반응` 끝에 한 줄을 덧붙인다(날짜, 확인한 폭·장면·테마, 못 본 것, 시험 수). 안 E 네 배치(A–D)를 모두 화면에서 본 날이므로 그 사실을 적고, 사용자에게 시안 반응을 물을 차례임을 한 줄 덧붙인다.

```bash
git add docs/design/experiments/0002-pixel-scenes.md
git commit -m "docs(design): pixel scenes big event check recorded in experiment 0002 (#154)"
```

- [ ] **Step 4: PR**

```bash
git push -u origin design/pixel-big-event
gh pr create --base main --title "feat(web): 큰 사건 장면과 대화 상자 (#154)" --label enhancement --label area/ui --body-file <본문 파일>
```

본문: `Closes #154`, 바뀐 것(`adopt`, 큰 장면, 닫기, 움직임 줄이기), 시험 수, Chrome 확인 결과(못 본 것은 못 봤다고), 정하고 간 것(아래), 안 E 네 배치가 모두 들어갔다는 점(디자인 큐 #151–#154 끝). 끝에 `🤖 Generated with [Claude Code](https://claude.com/claude-code)` 와 세션 링크.

## 스펙이 정하지 않아 이 plan이 정한 것 (PR 본문에 옮긴다)
- "큰 사건이 생긴 달" = 이번 진행(`adopt`)으로 기록에 새로 쌓인 줄 중 마지막 큰 사건. 경력·은퇴 단계는 한 칸이 한 해이므로 그 해에 생긴 사건이다.
- "다음 진행 때 접힘" = 어떤 진행이든(자동, 한 칸, 결정, 자동 전환) 새 큰 사건이 없으면 접힌다. 엔진을 부르지 않은 클릭(진행이 막힌 상태의 단추 등)은 접지 않는다.
- "자동 진행 4× 이상" = 자동으로 돌고 있고 배속이 4× 이상일 때만. 수동 진행은 배속 설정과 무관하게 띄운다. 자동 진행이 멈추는 칸(결정 지점, 기록 끝)은 자동 진행이 아니므로 띄운다: 8×로 돌려도 기록 끝의 마무리 장면은 보인다.
- 대화 상자는 기록 문장과, 붙는 서사 장면이 있으면 그 문장(창작 표시 포함)을 함께 보인다. `role="dialog"`·초점 이동은 쓰지 않는다(진행 중 틱마다 초점을 가져가지 않기 위해).
- 닫으면 초점은 연구노트 제목(`#feed h2`)으로 간다. 장면이 연구노트 바로 위에 있고 그 사건이 기록된 곳이기 때문이다.
- 자동 진행 1×·2×에서는 장면이 한 칸(0.8초·0.4초) 동안만 보인다. 읽으려면 멈춤을 눌러야 한다. 장면과 함께 자동 진행을 잠시 멈출지는 별도 논의 거리다(스펙은 "다음 진행 때 접힘"이다).
- 새 삶 시작 직후 `focusCurrent()`가 "지금 삶" 제목으로 스크롤하므로 페이지 맨 위의 입학 장면은 화면 밖에 있을 수 있다. 이 issue는 그 동작을 바꾸지 않았다.
