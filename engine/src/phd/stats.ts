// 능력치 갱신 공통 헬퍼. stats 는 0–100 정수(상태 §1.3), 소수 변화는 phd.statCarry 에 누적한다(계획 "공유 인터페이스").
import { ASSUMED } from '../assumed';
import { clamp } from '../odds';
import type { LifeState, Stats } from '../types';

export type StatDelta = Partial<Stats>;

/** 새 상태를 돌려준다. carry 는 |carry| ≥ 1 이 되는 몫만 정수로 옮기고 나머지를 남긴다. 경력 단계(phd 없음)에서는 반올림해 바로 더한다. */
export function addStats(state: LifeState, delta: StatDelta): LifeState {
  const stats: Stats = { ...state.stats };
  const carry: Stats = state.phd ? { ...state.phd.statCarry } : { health: 0, mind: 0, skill: 0, relation: 0, network: 0 };
  for (const key of Object.keys(delta) as (keyof Stats)[]) {
    const d = delta[key] ?? 0;
    if (d === 0) continue;
    const total = carry[key] + d;
    const whole = total >= 0 ? Math.floor(total) : Math.ceil(total);
    carry[key] = total - whole;
    stats[key] = clamp(stats[key] + whole, ASSUMED.STAT_MIN, ASSUMED.STAT_MAX);
    if (stats[key] === ASSUMED.STAT_MIN && carry[key] < 0) carry[key] = 0;
    if (stats[key] === ASSUMED.STAT_MAX && carry[key] > 0) carry[key] = 0;
  }
  return state.phd ? { ...state, stats, phd: { ...state.phd, statCarry: carry } } : { ...state, stats };
}
