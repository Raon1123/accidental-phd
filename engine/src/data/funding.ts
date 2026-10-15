// 장학·과제·조교 장려금 접근자(선택권 §5.2, §3.3). 월액은 원 정수.
import { ASSUMED } from '../assumed';
import type { FundingState, Group } from '../types';
import { find, get, type DataBundle, type DataRecord, type DataValue } from './bundle';
import { waiverRate } from './tuition';

export type RecordPeriod = 'krw-per-month' | 'krw-per-semester' | 'krw-per-year' | 'krw-total';

// 기간 판정 휴리스틱. 장려금 레코드 49건은 unit 이 전부 'krw' 이고 기간은 note 문장에 있다.
//  1) unit 이 이미 'krw-per-month|semester|year' 또는 'krw-total' 이면 그대로 쓴다.
//  2) note 안의 영어 표지 'total'(총액) · 'annual'/'per year'(연) · 'per semester'(학기) · 'per month'(월) 중
//     가장 앞에 나오는 것을 쓴다. 노트는 기간을 첫 문장 머리에 적고, 뒤에 "학기당 …"·"= 연 …" 같은 환산 설명을 덧붙이기 때문이다
//     (예: "per month. 박사 월 200만원(학기당 1,200만원)" → 월; "annual (… 학기당 13,000,000원 병기)" → 연).
//  3) 영어 표지가 없으면 한국어 '학기당'·'매학기' → 학기. 그래도 없으면 예외(추측하지 않는다).
const NOTE_MARKERS: { re: RegExp; period: RecordPeriod }[] = [
  { re: /\btotal\b/i, period: 'krw-total' },
  { re: /\bannual\b|\bper year\b/i, period: 'krw-per-year' },
  { re: /\bper semester\b/i, period: 'krw-per-semester' },
  { re: /\bper month\b/i, period: 'krw-per-month' },
];

export function periodOf(rec: DataRecord): RecordPeriod {
  if (rec.unit === 'krw-per-month' || rec.unit === 'krw-per-semester' || rec.unit === 'krw-per-year' || rec.unit === 'krw-total') return rec.unit;
  let best: { idx: number; period: RecordPeriod } | undefined;
  for (const m of NOTE_MARKERS) {
    const idx = rec.note.search(m.re);
    if (idx >= 0 && (!best || idx < best.idx)) best = { idx, period: m.period };
  }
  if (best) return best.period;
  if (/학기당|매학기/.test(rec.note)) return 'krw-per-semester';
  throw new Error(`cannot determine payment period: ${rec.id}`);
}

/** 월 환산(0014#23): 학기 ÷ 6, 연 ÷ 12, 총액 ÷ 48, 월은 그대로. 원 정수로 반올림. */
export function monthlyFromRecord(rec: DataRecord): number {
  const d = ASSUMED.SCHOLARSHIP_MONTHLY_DIVISOR;
  switch (periodOf(rec)) {
    case 'krw-per-month': return Math.round(rec.value);
    case 'krw-per-semester': return Math.round(rec.value / d.semester);
    case 'krw-per-year': return Math.round(rec.value / d.year);
    case 'krw-total': return Math.round(rec.value / d.total);
  }
}

const monthlyValue = (rec: DataRecord): DataValue => ({ value: monthlyFromRecord(rec), confidence: rec.confidence, id: rec.id, unit: 'krw-per-month' });

/** 학교의 생활 장학 레코드(`schools-{school}-all-scholarship-living-*`, id 사전순). unist·khu·pusan·uos 는 빈 배열. */
export function scholarshipOptions(data: DataBundle, school: string): DataRecord[] {
  return find(data, `schools-${school}-all${ASSUMED.SCHOLARSHIP_RECORD_INFIX}`);
}

// 레코드 id 조각(값이 아니라 id 이므로 상수 파일 밖에 둔다). 선택권 §5.2 과제 행.
const STEM_LIVING_MIN_RECORD = 'salaries-stipend-stem-living-phd-min';
const BK21_LINK_SUFFIX = '-scholarship-living-bk21';

/**
 * 과제 월 장려금(0014#27). 학교의 `-stipend-min*` 첫 레코드 → 없으면 이공은 국가 하한 레코드,
 * 인문사회는 학교의 BK21 연계 레코드 → 그것도 없으면 600,000원(assumed).
 */
export function projectStipend(data: DataBundle, school: string, group: Group): DataValue {
  const own = find(data, `schools-${school}-all-stipend-min`)[0];
  if (own) return monthlyValue(own);
  if (group === '이공') return { ...get(data, STEM_LIVING_MIN_RECORD), unit: 'krw-per-month' };
  const bk21 = data.records.get(`schools-${school}-all${BK21_LINK_SUFFIX}`);
  if (bk21) return monthlyValue(bk21);
  return { value: ASSUMED.HUMSOC_PROJECT_STIPEND, confidence: 'assumed', id: '0014#27', unit: 'krw-per-month' };
}

/** 조교 월 수입(0014#35). `schools-{school}-all-stipend-ta*` 중 id 사전순 첫 레코드의 월 환산, 없으면 40만 원(assumed). */
export function taStipend(data: DataBundle, school: string): DataValue {
  const own = find(data, `schools-${school}-all-stipend-ta`)[0];
  return own ? monthlyValue(own) : { value: ASSUMED.TA_FALLBACK_MONTHLY, confidence: 'assumed', id: '0014#35', unit: 'krw-per-month' };
}

// 입학 때 조교 추첨 확률의 레코드 id(값이 아니라 id 이므로 상수 파일 밖에 둔다). 결정 기록 0022.
const SELF_TA_P_RECORD = 'statistics-ta-income-living-cost-2015';

/** 자비로 확정된 삶이 입학 때 조교 수입을 얻을 확률(0014#136) = 대학원생 생활비 재원 조사의 조교 수입 비율 레코드. */
export function selfTaProbability(data: DataBundle): DataValue {
  return get(data, SELF_TA_P_RECORD);
}

/**
 * 조교 자금 상태(0014#137). funding-expiry B(선택권 §3.3)와 입학 때 조교 추첨(선택권 §5.2)이 같은 값을 쓴다:
 * 월 수입 = taStipend(0014#35 규칙), 감면 = 과제 감면 규칙(0014#21 `-ra`·`-ta` 토큰), 기한 없음(until −1), 의무 주 10시간.
 * 표식은 경로 'self' + 의무 시간(0014#140, 결정 기록 0026): 조교 판정 술어는 dutyHours > 0 이고, 참여율 추첨·장려금 배수·성장 배수·근로 상한의
 * 참여율 항(0014#125·#126·#130)은 과제 경로에만 걸리므로 조교 수입에 걸리지 않는다. 경로 'project' 인 조교 상태는 만들 수 없다.
 */
export function taFundingState(data: DataBundle, school: string): FundingState {
  const ta = taStipend(data, school);
  const waiver = waiverRate(data, school, 'project');   // 조교·연구조교 레코드의 등록금 감면 비율(자금 경로 'project' 규칙)
  return { route: 'self', monthly: ta.value, tuitionWaiver: waiver.value, until: -1, dutyHours: ASSUMED.TA_DUTY_HOURS, recordIds: [ta.id, waiver.id] };
}
