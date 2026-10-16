// 픽셀 그림의 화면 규칙(#152–#154, docs/design/pixel-scenes.md §4). DOM 없음: 장면의 어느 부분을 쓰고 어느 사건을 보일지만 정한다.
// 그리기는 main.ts 가 하고, 사각형 목록은 pixel.ts 의 sceneRects 가 만든다.
import type { LifeState } from '../../engine/src/browser';
import { calendarLabel, elapsedLabel } from './dates';
import { SCENE_H, SCENE_W, iconOf, sceneOf, scenePerson, type Icon, type SceneStage } from './pixel';
import { statusLine, wonText, type Note } from './play';
import type { Strings } from './strings.ko';

/** 그림 한 장에서 잘라 쓰는 사각형(칸 단위). SVG viewBox 가 된다. */
export interface Crop { x: number; y: number; w: number; h: number }
export type CropKind = 'portrait' | 'status' | 'strip';

export const PORTRAIT_W = 48;   // 초상 창: 인물 중심 48칸(§2)
export const WIDE_W = 160;      // 넓은 장면: 160칸(§2). 풍경 띠와 큰 사건 장면(#154)이 쓴다
export const STATUS_W = 24;     // 모바일 상태 줄 초상: 24×24칸(§2)
const STRIP_H = 16;
const PERSON_W = 8;             // pixel.ts 의 PERSON 스프라이트 폭

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/**
 * 장면에서 잘라 쓰는 부분.
 * portrait = 96×40 그림에서 인물이 가운데 오게 48칸(말풍선 16칸이 인물 오른쪽에 붙으므로 가장자리에서도 담긴다),
 * status = 인물이 가운데 오는 24×24(위로 6칸 여유, 말풍선 없음),
 * strip = 160칸 그림의 아래 16줄(땅과 하늘 일부. 본문이 가리는 가운데를 빼고 양옆 여백에서 보인다).
 */
export function cropOf(kind: CropKind, stage: SceneStage): Crop {
  const p = scenePerson(stage);
  switch (kind) {
    case 'portrait': return { x: clamp(p.x + PERSON_W / 2 - PORTRAIT_W / 2, 0, SCENE_W - PORTRAIT_W), y: 0, w: PORTRAIT_W, h: SCENE_H };
    case 'status': return { x: clamp(p.x + PERSON_W / 2 - STATUS_W / 2, 0, SCENE_W - STATUS_W), y: clamp(p.y - 6, 0, SCENE_H - STATUS_W), w: STATUS_W, h: STATUS_W };
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
 * 처음에는 넓은 화면(>=64rem)에서만 펼친다. 폭이 바뀌어도 사용자가 정한 상태를 뒤집지 않는다.
 */
export function moneyFoldOpen(prev: boolean | undefined, wide: boolean): boolean {
  return prev ?? wide;
}
