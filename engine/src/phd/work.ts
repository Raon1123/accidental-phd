// 과제 참여율과 박사과정 중 근로(#79, 선택권 §4.7).
// 참여율 r 은 주 40시간 중 과제에 쓰는 비율로, 학기마다 추첨한다(연구 직종 시황 × 지도교수와의 관계). 근로(아르바이트·강의)는 플레이어가 주당 시간을 정한다.
// 성장 배수 = max(0, 1 − 근로 시간/40 − r/2)가 진척·초고 집필·역량 상승에 곱해진다(사용자 규칙, 두 차감은 합산).
import { ASSUMED } from '../assumed';
import type { DataBundle } from '../data/bundle';
import { get } from '../data/bundle';
import { lecturerHourly } from '../data/salaries';
import { demand } from '../career/news';
import { clamp, z } from '../odds';
import { drawNormal } from '../rng';
import type { LifeState, MonthInput, PartTime, PhdState } from '../types';
import { acceptedCount } from './papers';

const W = ASSUMED.PART_WEEK_HOURS;

function phdOf(s: LifeState): PhdState {
  if (!s.phd) throw new Error('phd state required');
  return s.phd;
}

/** 과제 참여율. 과제 경로가 아니면 0, 과제 경로는 추첨된 값(학기마다, `drawParticipation`) 또는 첫 추첨 전 기본 0.5. */
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

/** 연구 직종 시황: 연구 직종 경로(교수·비정년·박사후·연구소)의 뉴스 수요 계수 평균(노동 §5.1). 뉴스가 없으면 1. */
export function researchMarket(s: LifeState): number {
  const routes = ASSUMED.PARTICIPATION_DRAW.routes;
  return routes.reduce((a, r) => a + demand(s, r), 0) / routes.length;
}

/** 참여율 기대값(추첨 잡음 전): 0.5 × 연구 직종 시황 × (1 + 0.5·z(relation)) (0014#130). */
export function participationMean(s: LifeState): number {
  return ASSUMED.PARTICIPATION.projectDefault * researchMarket(s) * (1 + ASSUMED.PARTICIPATION_DRAW.betaRelation * z(s.stats.relation));
}

/**
 * 과제 참여율 추첨(사용자 규칙 2026-10-15, 0014#130). 과제 경로에서 학기 경계 달 또는 첫 달(아직 값이 없을 때)에
 * r = 0.25 단위 반올림(clamp(기대값 × (1 + 0.3·N), 0, 1))을 뽑아 저장한다. 플레이어는 고르지 않는다(지도교수가 배정한다).
 * 휴학 중에는 뽑지 않는다(이전 값 유지).
 */
export function drawParticipation(s: LifeState): LifeState {
  const phd = phdOf(s);
  if (phd.fundingState.route !== 'project' || phd.leave.active) return s;
  if (phd.participation !== undefined && s.month % ASSUMED.SEMESTER_MONTHS !== 0) return s;
  const noise = 1 + ASSUMED.PARTICIPATION_DRAW.sigma * drawNormal(s.seed, 'funding', s.month, 'participation');
  const step = ASSUMED.PARTICIPATION.step;
  const r = Math.round(clamp(participationMean(s) * noise, 0, 1) / step) * step;
  return { ...s, phd: { ...phd, participation: r } };
}

/**
 * 입력의 근로 설정을 반영한다. 근로는 상한 안에서만. 참여율은 입력이 아니라 추첨이다(`drawParticipation`).
 * 자동이면 근로 입력이 없을 때 정책(`autoPartTime`)을 쓴다. 휴학 중에는 근로하지 않는다(휴학 근로는 funding-expiry D).
 */
export function applyWorkInput(s: LifeState, input: MonthInput): LifeState {
  const phd = phdOf(s);
  const effR = participationOf(s);
  let partTime = input.partTime ?? (s.auto ? autoPartTime(s, effR) : phd.partTime);
  if (input.partTime) validate(s, input.partTime, effR);
  else if (partTime && partTimeWeekHours(partTime) > partTimeCap(s, effR)) partTime = undefined;   // 상한이 줄면(의무 시간·참여율 증가) 그만둔다
  const out: PhdState = { ...phd };
  if (!partTime || partTime.hours === 0) delete out.partTime; else out.partTime = partTime;
  return { ...s, phd: out };
}

/** 지난달 정산의 대출 원장 종류(§5.4, 0014 #132). `money.ts` 가 이 파일을 import 하므로 순환을 피해 여기에 둔다. */
const LOAN_KINDS: readonly string[] = ['loan', 'tuition-loan', 'living-loan'];

/**
 * 지난달 정산에 부족분이 있었는가(§5.4의 대출 전 현금 < 0). 한도가 남았으면 지난달 대출 항목(학자금·일반)으로,
 * 한도가 다 찼으면 음수로 남은 현금으로 나타난다(결정 기록 0025).
 */
function shortLastMonth(s: LifeState): boolean {
  return s.money.cash < 0 || s.ledger.some(e => e.month === s.month - 1 && LOAN_KINDS.includes(e.kind) && e.amount > 0);
}

/**
 * 자동 정책(0014 #129, 선택권 §4.7): 지난달 정산에서 부족분이 있었고(대출 전 현금 < 0: 그달 학자금대출·일반 대출을 받았거나,
 * 한도가 다 차 현금이 음수로 남았다) 근로하지 않으면 근로를 시작하고(강의 자격이면 강의 3시수, 아니면 아르바이트 min(상한, 15)시간),
 * 현금이 생활비 3개월치 이상이면 그만둔다. 2026-10-15 결정 기록 0025: 정산 뒤 현금은 대출로 0이 되어 옛 조건 "현금 < 0"은 한도 도달 뒤에만 켜졌다.
 */
export function autoPartTime(s: LifeState, participation = participationOf(s)): PartTime | undefined {
  const phd = phdOf(s);
  const A = ASSUMED.AUTO_PART_TIME;
  if (phd.leave.active) return phd.partTime;
  const living = (ASSUMED.CAPITAL_SCHOOLS as readonly string[]).includes(s.choices.school) ? ASSUMED.LIVING_COST.capital : ASSUMED.LIVING_COST.regional;
  if (s.money.cash >= living * A.stopCashMonths) return undefined;
  if (phd.partTime || !shortLastMonth(s)) return phd.partTime;
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
