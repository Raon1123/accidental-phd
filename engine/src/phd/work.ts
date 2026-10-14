// 과제 참여율과 박사과정 중 근로(#79, 선택권 §4.7).
// 참여율 r 은 주 40시간 중 과제에 쓰는 비율이고, 근로(아르바이트·강의)는 플레이어가 주당 시간을 정한다.
// 성장 배수 = max(0, 1 − 근로 시간/40 − r/2)가 진척·초고 집필·역량 상승에 곱해진다(사용자 규칙, 두 차감은 합산).
import { ASSUMED } from '../assumed';
import type { DataBundle } from '../data/bundle';
import { get } from '../data/bundle';
import { lecturerHourly } from '../data/salaries';
import type { LifeState, MonthInput, PartTime, PhdState } from '../types';
import { acceptedCount } from './papers';

const W = ASSUMED.PART_WEEK_HOURS;

function phdOf(s: LifeState): PhdState {
  if (!s.phd) throw new Error('phd state required');
  return s.phd;
}

/** 과제 참여율. 과제 경로가 아니면 0, 과제 경로는 저장된 값 또는 기본 0.5. */
export function participationOf(s: LifeState): number {
  const phd = phdOf(s);
  if (phd.fundingState.route !== 'project') return 0;
  return phd.participation ?? ASSUMED.PARTICIPATION.projectDefault;
}

/** 장려금 배수: 과제 경로는 r / 기본값(기본 참여율이면 레코드 값 그대로), 다른 경로는 1. */
export function stipendScale(s: LifeState): number {
  if (phdOf(s).fundingState.route !== 'project') return 1;
  return participationOf(s) / ASSUMED.PARTICIPATION.projectDefault;
}

/** 강의 자격: 인문사회, 자격시험 합격, 채택 논문 1편 이상. */
export function lectureEligible(s: LifeState): boolean {
  const phd = phdOf(s);
  return s.choices.group === '인문사회' && phd.qualified && acceptedCount(phd.papers, 'T4') >= 1;
}

/** 근로 설정 하나가 쓰는 주당 시간. 강의는 시수 × 3. */
export function partTimeWeekHours(p: PartTime | undefined): number {
  if (!p) return 0;
  return p.kind === 'lecture' ? p.hours * ASSUMED.PHD_LECTURE.timeMult : p.hours;
}

/** 근로 시간 상한(주): 40 − 필수 시간(조교 의무) − 참여 시간. 하한 0. */
export function partTimeCap(s: LifeState, participation = participationOf(s)): number {
  return Math.max(0, W - phdOf(s).fundingState.dutyHours - W * participation);
}

/** 이번 달 근로 시간(주): 근로 설정 + 근로 포커스의 20시간(0014 #40). 휴학 중이면 0. */
export function workWeekHours(s: LifeState): number {
  const phd = phdOf(s);
  if (phd.leave.active) return 0;
  return partTimeWeekHours(phd.partTime) + (phd.focus === 'work' ? ASSUMED.JOB_HOURS : 0);
}

/** 성장 배수 = max(0, 1 − 근로 시간/40 − 참여율/2). */
export function growthMultiplier(s: LifeState): number {
  return Math.max(ASSUMED.GROWTH_FLOOR, 1 - workWeekHours(s) / W - participationOf(s) / 2);
}

/** 그 달의 연도(입학 2027년 3월 = 0개월째). */
export function calendarYear(month: number): number {
  return ASSUMED.MIN_WAGE_YEAR + Math.floor((month + 2) / ASSUMED.MONTHS_PER_YEAR);
}

/** 아르바이트 시급: 2027 최저시급 레코드 × (1 + 물가안정목표 레코드)^(연도 − 2027) (0014#127). */
export function hourlyWage(month: number, data: DataBundle): number {
  const base = get(data, `salaries-minwage-hourly-${ASSUMED.MIN_WAGE_YEAR}`).value;
  const inflation = get(data, 'statistics-bok-inflation-target').value / 100;
  return Math.round(base * (1 + inflation) ** Math.max(0, calendarYear(month) - ASSUMED.MIN_WAGE_YEAR));
}

/** 근로 월 수입(원). 아르바이트 = 시간 × 4.345주 × 시급, 강의 = 시수 × 학교 시간강사 시급 × (연 32주 / 12개월). */
export function partTimePay(p: PartTime | undefined, month: number, data: DataBundle, school: string): number {
  if (!p || p.hours <= 0) return 0;
  if (p.kind === 'lecture') return Math.round(p.hours * lecturerHourly(data, school).value * ASSUMED.LECTURE.weeks / ASSUMED.MONTHS_PER_YEAR);
  return Math.round(p.hours * ASSUMED.WEEKS_PER_MONTH * hourlyWage(month, data));
}

function validate(s: LifeState, p: PartTime, participation: number): void {
  if (!Number.isFinite(p.hours) || p.hours < 0) throw new Error(`partTime: hours must be ≥ 0 (got ${p.hours})`);
  if (p.kind === 'lecture' && p.hours > 0) {
    if (!lectureEligible(s)) throw new Error('partTime: lecture needs 인문사회, a passed qualifying exam and an accepted paper');
    if (!(ASSUMED.PHD_LECTURE.steps as readonly number[]).includes(p.hours)) throw new Error(`partTime: lecture hours must be one of ${ASSUMED.PHD_LECTURE.steps.join(', ')}`);
  }
  const cap = partTimeCap(s, participation);
  if (partTimeWeekHours(p) > cap) throw new Error(`partTime: ${partTimeWeekHours(p)} h/week exceeds the cap ${cap}`);
}

/**
 * 입력의 참여율·근로 설정을 반영한다. 참여율은 학기 경계 달에만, 과제 경로에서만 바꿀 수 있고, 근로는 상한 안에서만.
 * 자동이면 근로 입력이 없을 때 정책(`autoPartTime`)을 쓴다. 휴학 중에는 근로하지 않는다(휴학 근로는 funding-expiry D).
 */
export function applyWorkInput(s: LifeState, input: MonthInput): LifeState {
  const phd = phdOf(s);
  let participation = phd.participation;
  if (input.participation !== undefined) {
    const r = input.participation;
    if (s.month % ASSUMED.SEMESTER_MONTHS !== 0) throw new Error('participation can change only at a semester boundary');
    if (phd.fundingState.route !== 'project') throw new Error('participation applies to the project funding route only');
    const steps = r / ASSUMED.PARTICIPATION.step;
    if (r < 0 || r > 1 || Math.abs(steps - Math.round(steps)) > 1e-9) throw new Error(`participation must be 0–1 in steps of ${ASSUMED.PARTICIPATION.step}`);
    participation = r;
  }
  const effR = phd.fundingState.route === 'project' ? (participation ?? ASSUMED.PARTICIPATION.projectDefault) : 0;
  let partTime = input.partTime ?? (s.auto ? autoPartTime(s, effR) : phd.partTime);
  if (input.partTime) validate(s, input.partTime, effR);
  else if (partTime && partTimeWeekHours(partTime) > partTimeCap(s, effR)) partTime = undefined;   // 상한이 줄면(의무 시간·참여율 증가) 그만둔다
  const out: PhdState = { ...phd };
  if (participation === undefined) delete out.participation; else out.participation = participation;
  if (!partTime || partTime.hours === 0) delete out.partTime; else out.partTime = partTime;
  return { ...s, phd: out };
}

/** 자동 정책(0014 #129): 현금이 음수면 근로를 시작하고(강의 자격이면 강의 3시수), 현금이 생활비 3개월치 이상이면 그만둔다. */
export function autoPartTime(s: LifeState, participation = participationOf(s)): PartTime | undefined {
  const phd = phdOf(s);
  const A = ASSUMED.AUTO_PART_TIME;
  if (phd.leave.active) return phd.partTime;
  const living = (ASSUMED.CAPITAL_SCHOOLS as readonly string[]).includes(s.choices.school) ? ASSUMED.LIVING_COST.capital : ASSUMED.LIVING_COST.regional;
  if (s.money.cash >= living * A.stopCashMonths) return undefined;
  if (phd.partTime || s.money.cash >= 0) return phd.partTime;
  const cap = partTimeCap(s, participation);
  if (lectureEligible(s) && A.lectureHours * ASSUMED.PHD_LECTURE.timeMult <= cap) return { kind: 'lecture', hours: A.lectureHours };
  const hours = Math.min(cap, A.jobHours);
  return hours > 0 ? { kind: 'job', hours } : undefined;
}

/** 이번 달 근로 수입을 정산 대기 원장 항목으로 적는다(applyCashflow 가 합산). 휴학 중이면 없다. */
export function applyPartTimePay(s: LifeState, data: DataBundle): LifeState {
  const phd = phdOf(s);
  if (phd.leave.active || !phd.partTime) return s;
  const amount = partTimePay(phd.partTime, s.month, data, s.choices.school);
  if (amount === 0) return s;
  return { ...s, ledger: [...s.ledger, { month: s.month, kind: phd.partTime.kind === 'lecture' ? 'lecture' : 'part-time', amount }] };
}
