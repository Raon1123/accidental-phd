// DOM 없이 시험할 수 있는 표시 데이터. 학교 이름은 schoolDisplayName 으로만 낸다(결정 기록 0004).
import { applyWorkInput, growthMultiplier, lectureEligible, participationOf, partTimeCap, partTimePay, partTimeWeekHours, type DataBundle, type LifeState, type MonthInput, type Paper, type PartTime } from '../../engine/src/browser';
import { schoolDisplayName } from './schoolName';
import { departmentLabel, subfieldName, trackLabel } from './select';
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

/** 엔진 계산에만 쓰는 학교 키(화면 글자로 내지 않는다, 0004). */
const schoolKey = (s: LifeState): string => { const { school } = s.choices; return school; };

export type WorkDraft = Pick<MonthInput, 'participation' | 'partTime'>;
export interface WorkView {
  participation: number;            // 지금 적용될 참여율(0이면 과제 경로가 아님)
  canParticipate: boolean;          // 과제 경로이고 학기 경계 달이다
  isProject: boolean;
  partTime: PartTime | undefined;   // 지금 적용될 근로 설정
  weekHours: number;                // 근로 주당 시간(강의는 시수×3)
  cap: number;                      // 근로 상한(주당)
  hourOptions: number[];            // 아르바이트 시간 단추(5시간 단위 + 상한)
  cleared: boolean;                 // 초안의 근로가 상한을 넘어 버려졌다(참여율만 반영)
  lecture: boolean;                 // 강의 자격
  growth: number;                   // 성장 배수(0–1)
  pay: number;                      // 근로 월 수입(원)
}

/** 근로·참여율 조작의 표시 값(#110). 초안(draft)을 엔진 함수로 적용해 본 결과이고, 규칙 계산은 엔진이 한다. */
export function workView(s: LifeState, data: DataBundle, draft: WorkDraft = {}): WorkView | undefined {
  if (s.stage !== 'phd' || !s.phd || s.phd.leave.active) return undefined;
  const isProject = s.phd.fundingState.route === 'project';
  const canParticipate = isProject && s.month % 6 === 0;
  // 초안이 상한을 넘으면 엔진이 던진다. 근로를 빼고 참여율만, 그것도 안 되면 지금 상태를 보인다.
  let next = s;
  try { next = applyWorkInput(s, { ...draft }); } catch {
    try { next = applyWorkInput(s, draft.participation === undefined ? {} : { participation: draft.participation }); } catch { next = s; }
  }
  const participation = participationOf(next);
  const cap = partTimeCap(next);
  const hourOptions: number[] = [];
  for (let h = 5; h < cap; h += 5) hourOptions.push(h);
  if (cap > 0) hourOptions.push(Math.floor(cap));
  const pt = next.phd?.partTime;
  const want = draft.partTime;
  const cleared = want !== undefined && want.hours > 0 && !(pt && pt.kind === want.kind && pt.hours === want.hours);
  return {
    participation, canParticipate, isProject, partTime: pt, weekHours: partTimeWeekHours(pt), cap,
    hourOptions: [...new Set(hourOptions)], cleared, lecture: lectureEligible(next),
    growth: growthMultiplier(next), pay: partTimePay(pt, s.month, data, schoolKey(s)),
  };
}

/**
 * 투고처 표시(사용자 규칙 2026-10-15): 실제 학술지·학회 이름은 내보내지 않고 사분위 Q1–Q4 와 종류만 보인다.
 * 계층 T1–T4 는 저널 SJR 사분위·KCI 등재, 학회 CORE 등급에서 온다(결정 기록 0003, engine data/venues.ts). T1 ↔ Q1 … T4 ↔ Q4.
 */
export function venueLabel(p: Paper, t: Strings): string {
  const P = t.play.papers;
  const q = `Q${(p.tier ?? 'T4').slice(1)}`;
  const kind = p.venueId?.startsWith('venues-conf-') ? P.venueKind.conference : P.venueKind.journal;
  return P.venueTier.replace('{q}', q).replace('{kind}', kind);
}

export interface PaperRow { n: number; status: string; topic: string; venue: string; value: number }
export interface PaperView { accepted: number; required: number; rows: PaperRow[] }

/** 진행 중인 논문(#105): 집필 진척(0–100), 상태, 주제(세부전공 이름), 투고처 이름. 박사과정이 아니면 undefined. */
export function paperView(s: LifeState, t: Strings, data?: DataBundle): PaperView | undefined {
  if (!s.phd) return undefined;
  const P = t.play.papers;
  const topic = subfieldName(s.choices.subfield, data) || trackLabel(s.choices.track, t);
  const rows = s.phd.papers.map((p, i): PaperRow => {
    const venue = p.status === 'draft' ? P.notYet : venueLabel(p, t);
    return { n: i + 1, status: P.status[p.status], topic, venue, value: Math.min(STAT_MAX, Math.round(p.writing)) };
  });
  return { accepted: s.phd.papers.filter(p => p.status === 'accepted').length, required: s.phd.requiredPapers, rows };
}
