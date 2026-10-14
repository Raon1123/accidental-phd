// DOM 없이 시험할 수 있는 표시 데이터. 학교 이름은 schoolDisplayName 으로만 낸다(결정 기록 0004).
import type { DataBundle, LifeState } from '../../engine/src/browser';
import { schoolDisplayName } from './schoolName';
import { departmentLabel } from './select';
import type { Strings } from './strings.ko';

export function summaryRows(s: LifeState, t: Strings, data?: DataBundle): [string, string][] {
  return [
    [t.seed, s.seed],
    [t.stage, t.play.stageNames[s.stage]],
    [t.month, String(s.month)],
    [t.play.age, `${Math.floor(s.ageMonths / 12)}${t.play.ageUnit}`],
    [t.department, departmentLabel(s.choices, data, t)],
    [t.school, schoolDisplayName(s.choices.school, t)],
    [t.funding, t.play.fundingNames[s.choices.funding]],
    [t.play.stats, (Object.keys(t.play.statNames) as (keyof typeof t.play.statNames)[]).map(k => `${t.play.statNames[k]} ${s.stats[k]}`).join(' · ')],
  ];
}

/** 자금 카드 위에 두는 한눈 정보(단계·달·나이·분야·학교). 나머지는 지금 삶 구역에 남는다. */
export function glanceRows(s: LifeState, t: Strings, data?: DataBundle): [string, string][] {
  return summaryRows(s, t, data).slice(1, 6);
}
export function detailRows(s: LifeState, t: Strings, data?: DataBundle): [string, string][] {
  const r = summaryRows(s, t, data);
  return [r[0]!, ...r.slice(6, 7)];   // 능력치 줄(8번째)은 막대(statBars)가 대신한다
}

export interface StatBar { key: string; label: string; value: number; delta: number; pct: number; base: number; changed: number }
export const STAT_MAX = 100;   // 능력치는 0–100 정수(상태 §1.3)

/**
 * 능력치 막대(#89): 값, 직전 변화량, 막대 길이(%). 진한 구간은 `base`%(변하지 않은 몫), 연한 구간은 `changed`%(늘거나 줄어든 몫)이다.
 * 늘었으면 진한 구간이 직전 값까지, 연한 구간이 그 위로 현재 값까지. 줄었으면 진한 구간이 현재 값까지, 연한 구간이 직전 값까지다.
 */
export function statBars(s: LifeState, prev: LifeState['stats'] | undefined, t: Strings): StatBar[] {
  const keys = Object.keys(t.play.statNames) as (keyof typeof t.play.statNames)[];
  return keys.map(k => {
    const value = s.stats[k];
    const delta = prev ? value - prev[k] : 0;
    const lo = Math.min(value, prev ? prev[k] : value);
    return {
      key: k, label: t.play.statNames[k], value, delta,
      pct: (value / STAT_MAX) * 100, base: (lo / STAT_MAX) * 100, changed: (Math.abs(delta) / STAT_MAX) * 100,
    };
  });
}
