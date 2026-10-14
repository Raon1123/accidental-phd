// 경력 단계 급여 접근자(선택권 §9.1). 모든 금액은 세전 연봉(원 정수).
import { ASSUMED } from '../assumed';
import type { Confidence, Group } from '../types';
import { find, get, loadData, type DataBundle, type DataValue } from './load';

export const INSTITUTES: readonly string[] = ['etri', 'kaeri', 'kimm', 'kist', 'kisti', 'kribb', 'krict'];

const CONF_ORDER: Confidence[] = ['assumed', 'indexed', 'verified'];   // 앞쪽이 더 약하다
const worst = (...cs: Confidence[]): Confidence => cs.reduce((a, b) => (CONF_ORDER.indexOf(b) < CONF_ORDER.indexOf(a) ? b : a));

/**
 * 사립대 교원 연봉, 규칙 (a)(0014#87). 교수 = 관측 평균 레코드, 부교수·조교수 = 교수 × (2017 직급 값 ÷ 2017 교수 값).
 * 입력이 모두 indexed 이므로 부교수·조교수는 indexed(입력 중 가장 약한 것).
 */
export function privateFacultyPay(data: DataBundle, rank: 'assistant' | 'associate' | 'professor'): DataValue {
  const recs = ASSUMED.PRIVATE_FACULTY_PAY_RECORDS;
  const prof = get(data, recs.professor);
  if (rank === 'professor') return prof;
  const num = get(data, recs.ratio2017[rank]);
  const den = get(data, recs.ratio2017.professor);
  return { value: Math.round(prof.value * num.value / den.value), confidence: worst(prof.confidence, num.confidence, den.confidence), id: prof.id, unit: 'krw' };
}

export type StepRank = 'assistant' | 'associate' | 'professor' | 'researcher';

// 가감 레코드를 읽으려면 DataBundle 이 필요하다. 계획서의 시그니처 nationalStep0(age, rank)를 그대로 받기 위해
// data 를 끝에 선택 인자로 두고, 없으면 저장소의 기본 팩을 한 번 읽어 쓴다.
let defaultData: DataBundle | undefined;

/**
 * 국립대 교원·연구사 초임 호봉, 규칙 (b)(0014#88·#90): clamp(기산 + (나이 − 24) + 박사 가산 + 가감, 1, 상한).
 * 가감 레코드의 값은 이미 음수 연수다(교수 −10, 부교수 −7, 조교수 −4). 연구사는 RESEARCHER_STEP(−4, 상한 36).
 */
export function nationalStep0(ageYears: number, rank: StepRank, data?: DataBundle): number {
  const s = ASSUMED.NATIONAL_STEP;
  let adjust: number;
  let max: number;
  if (rank === 'researcher') {
    adjust = ASSUMED.RESEARCHER_STEP.adjust;
    max = ASSUMED.RESEARCHER_STEP.stepMax;
  } else {
    const d = data ?? (defaultData ??= loadData());
    adjust = get(d, s.adjustRecords[rank]).value;
    max = s.stepMax;
  }
  const n = s.base + (ageYears - s.ageBase) + s.doctorBonus + adjust;
  return Math.min(max, Math.max(s.stepMin, n));
}

/** 연구사 호봉 → 연구관 호봉(0014#90): max(1, n − 5). */
export function officerStepFrom(researcherStep: number): number {
  const r = ASSUMED.RESEARCHER_STEP;
  return Math.max(r.officerMin, researcherStep + r.officerOffset);
}

export type StepTable = 'univ-faculty' | 'researcher' | 'research-officer';
const STEP_PREFIX: Record<StepTable, string> = {
  'univ-faculty': 'salaries-public-univ-faculty-',
  'researcher': 'salaries-public-researcher-',
  'research-officer': 'salaries-public-research-officer-',
};
const stepRangeCache = new WeakMap<DataBundle, Partial<Record<StepTable, number>>>();
function maxStep(data: DataBundle, table: StepTable): number {
  let byTable = stepRangeCache.get(data);
  if (!byTable) { byTable = {}; stepRangeCache.set(data, byTable); }
  let m = byTable[table];
  if (m === undefined) {
    const prefix = STEP_PREFIX[table];
    m = Math.max(...find(data, prefix).map(r => Number(r.id.slice(prefix.length))).filter(Number.isInteger));
    byTable[table] = m;
  }
  return m;
}

/** 호봉표 연봉 = 월 본봉 × 12 × 수당 배수(0014#89). 호봉은 표의 범위로 자른다. */
export function stepPay(data: DataBundle, table: StepTable, step: number): DataValue {
  const n = Math.min(maxStep(data, table), Math.max(ASSUMED.NATIONAL_STEP.stepMin, Math.round(step)));
  const rec = get(data, `${STEP_PREFIX[table]}${n}`);
  return { ...rec, value: Math.round(rec.value * ASSUMED.MONTHS_PER_YEAR * ASSUMED.ALLOWANCE_MULT) };
}

/** 출연연(이공) 기관·직급별 초임 레코드 `salaries-institutes-{institute}-{grade}`. */
export function institutePay(data: DataBundle, institute: string, grade: 'new-hire' | 'senior-researcher' | 'principal-researcher'): DataValue {
  if (!INSTITUTES.includes(institute)) throw new Error(`unknown institute: ${institute}`);
  return get(data, `salaries-institutes-${institute}-${grade}`);
}

const LECTURER_RE = /^salaries-faculty-([a-z0-9]+)-lecturer-hourly-hourly$/;
const LECTURER_AGGREGATES = ['all', 'national', 'private'];

/** 시간강사 연봉 = 시급 × 주 시수 × 주 수(0014#82). 학교 레코드가 없으면 학교 레코드 전체(18건)의 중앙값 시급을 쓰고 assumed. */
export function lecturerAnnual(data: DataBundle, school: string): DataValue {
  const mult = ASSUMED.LECTURE.hoursPerWeek * ASSUMED.LECTURE.weeks;
  const own = `salaries-faculty-${school}-lecturer-hourly-hourly`;
  if (data.records.has(own) && !LECTURER_AGGREGATES.includes(school)) {
    const r = get(data, own);
    return { ...r, value: Math.round(r.value * mult) };
  }
  const hourly = find(data, 'salaries-faculty-')
    .filter(r => { const m = LECTURER_RE.exec(r.id); return m !== null && !LECTURER_AGGREGATES.includes(m[1]!); })
    .map(r => r.value)
    .sort((a, b) => a - b);
  if (hourly.length === 0) throw new Error('no school lecturer-hourly records');
  const n = hourly.length;
  const med = n % 2 ? hourly[(n - 1) / 2]! : (hourly[n / 2 - 1]! + hourly[n / 2]!) / 2;
  return { value: Math.round(med * mult), confidence: 'assumed', id: '0014#82', unit: 'krw' };
}

/** 기업 초임 대리값(0014#84): 이공 = 이공 현 직장 연봉(2021), 인문사회 = 비이공(2022). */
export function industryPay(data: DataBundle, group: Group): DataValue {
  return get(data, ASSUMED.COMPANY_PAY_RECORD[group]);
}
