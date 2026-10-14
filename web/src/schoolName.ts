// 학교 이름을 화면에 내는 유일한 경로(결정 기록 0004, #59). 엔진·저장 기록은 school_id(`snu`, `kaist` …)만 들고,
// 화면·공유 카드·연구노트는 이 함수로 가상 표시명을 받는다. 매핑에 없는 id 는 실명이 새지 않도록 예외를 던진다.
import type { Strings } from './strings.ko';

export function schoolDisplayName(schoolId: string, t: Strings): string {
  const names: Readonly<Record<string, string>> = t.schoolNames;
  const name = Object.hasOwn(names, schoolId) ? names[schoolId] : undefined;
  if (name === undefined) throw new Error(`no display name for school id: ${schoolId}`);
  return name;
}
