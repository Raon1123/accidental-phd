// DOM 없이 시험할 수 있는 표시 데이터. 학교 이름은 schoolDisplayName 으로만 낸다(결정 기록 0004).
import type { LifeState } from '../../engine/src/browser';
import { schoolDisplayName } from './schoolName';
import { trackLabel } from './select';
import type { Strings } from './strings.ko';

export function summaryRows(s: LifeState, t: Strings): [string, string][] {
  return [
    [t.seed, s.seed],
    [t.stage, t.play.stageNames[s.stage]],
    [t.month, String(s.month)],
    [t.play.age, `${Math.floor(s.ageMonths / 12)}${t.play.ageUnit}`],
    [t.track, trackLabel(s.choices.track, t)],
    [t.school, schoolDisplayName(s.choices.school, t)],
    [t.funding, t.play.fundingNames[s.choices.funding]],
    [t.play.stats, (Object.keys(t.play.statNames) as (keyof typeof t.play.statNames)[]).map(k => `${t.play.statNames[k]} ${s.stats[k]}`).join(' · ')],
  ];
}

/** 자금 카드 위에 두는 한눈 정보(단계·달·나이·분야·학교). 나머지는 지금 삶 구역에 남는다. */
export function glanceRows(s: LifeState, t: Strings): [string, string][] {
  return summaryRows(s, t).slice(1, 6);
}
export function detailRows(s: LifeState, t: Strings): [string, string][] {
  const r = summaryRows(s, t);
  return [r[0]!, ...r.slice(6)];
}
