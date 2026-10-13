// 가상 뉴스와 수요 계수 (노동 §5). 뉴스는 전부 창작이라 로그 줄에 creative: true 를 붙인다.
import { ASSUMED } from '../assumed';
import type { DataBundle } from '../data/load';
import { clamp } from '../odds';
import { draw } from '../rng';
import type { LifeState, NewsEffect, Route } from '../types';

// 효과 크기를 0.01 단위로 반올림한다(노동 §5.2). 스펙에 이름 붙은 상수가 없어 여기에 둔다.
const EFFECT_PRECISION = 100;
// NRF 코드는 문자 1 + 숫자 6 이고 중분류는 앞 3자 + '0000' 이다(예: D131100 → D130000). 형식 규칙이라 상수가 아니다.
const NRF_LEVEL2_PREFIX_LEN = 3;
const NRF_LEVEL2_SUFFIX = '0000';

/** 가중치 표에서 하나 고른다: 누적해 u·합계를 처음 넘는 항목(util.ts 의 pickWeighted 와 같은 의미). */
function pickIndexWeighted(u: number, weights: readonly number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  const target = u * total;
  let acc = 0;
  for (let i = 0; i < weights.length; i++) { acc += weights[i]!; if (target < acc) return i; }
  return weights.length - 1;
}

const level2Of = (nrfCode: string): string => nrfCode.slice(0, NRF_LEVEL2_PREFIX_LEN).toUpperCase() + NRF_LEVEL2_SUFFIX;

/**
 * 달마다 한 번(노동 §5.2): 만료된 효과를 지우고(untilMonth < month) 새 뉴스를 뽑는다.
 * 추첨은 `state.newsSeed`, 스트림 news, 슬롯 `arrive`·`news:type`·`news:size`·`news:months` — 동기는 플레이어의 뉴스를 함께 겪는다.
 */
export function updateNews(state: LifeState, _data?: DataBundle): LifeState {
  const month = state.month;
  const news = state.news.filter(n => n.untilMonth >= month);
  let log = state.log;
  if (draw(state.newsSeed, 'news', month, 'arrive') < ASSUMED.NEWS_MONTHLY_P) {
    const types = ASSUMED.NEWS_TYPES;
    const t = types[pickIndexWeighted(draw(state.newsSeed, 'news', month, 'news:type'), types.map(x => x.weight))]!;
    const [eLo, eHi] = t.effect;
    const effect = Math.round((eLo + draw(state.newsSeed, 'news', month, 'news:size') * (eHi - eLo)) * EFFECT_PRECISION) / EFFECT_PRECISION;
    const [mLo, mHi] = t.months;
    const months = mLo + Math.min(mHi - mLo, Math.floor(draw(state.newsSeed, 'news', month, 'news:months') * (mHi - mLo + 1)));
    const item: NewsEffect = {
      id: `${t.id}:${month}`, type: t.id, startMonth: month, untilMonth: month + months - 1, effect,
      target: { kind: t.target.kind, values: [...t.target.values] }, routes: [...t.routes],
    };
    news.push(item);
    log = [...log, { month, textKey: t.headlineKey, tags: ['news', t.id], creative: true }];
  }
  return { ...state, news, log };
}

function covers(n: NewsEffect, state: LifeState): boolean {
  const c = state.choices;
  switch (n.target.kind) {
    case 'all': return true;
    case 'group': return n.target.values.includes(c.group);
    case 'kedi': return n.target.values.includes(c.kedi);
    case 'track': return n.target.values.includes(c.track);
    case 'nrf2': return n.target.values.includes(level2Of(c.subfield));
  }
}

/** 수요 계수 D_r,u(t) = clamp(Π(1 + e_j), 0.70, 1.30) (노동 §5.1, 0014#117). 뉴스가 없으면 1. */
export function demand(state: LifeState, route: Route): number {
  let d = 1;
  for (const n of state.news) if (n.routes.includes(route) && covers(n, state)) d *= 1 + n.effect;
  return clamp(d, ASSUMED.DEMAND_BOUNDS.lo, ASSUMED.DEMAND_BOUNDS.hi);
}
