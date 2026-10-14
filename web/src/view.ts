// DOM 없이 시험할 수 있는 표시 데이터. 학교 이름은 schoolDisplayName 으로만 낸다(결정 기록 0004).
import type { LifeState } from '../../engine/src/browser';
import { schoolDisplayName } from './schoolName';
import type { Strings } from './strings.ko';

export function summaryRows(s: LifeState, t: Strings): [string, string][] {
  return [
    [t.seed, s.seed],
    [t.stage, s.stage],
    [t.month, String(s.month)],
    [t.track, s.choices.track],
    [t.school, schoolDisplayName(s.choices.school, t)],
    [t.funding, s.choices.funding],
  ];
}
