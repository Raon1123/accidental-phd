// 등록금·입학금·감면 접근자(선택권 §5.1). 값은 레코드에서 읽고, 레코드가 없을 때의 규칙 (c) 값만 assumed.ts 상수를 쓴다.
import { ASSUMED } from '../assumed';
import type { Field, FundingRoute } from '../types';
import { indexDepartments, type DeptIndex } from './departments';
import { find, get, has, type DataBundle, type DataRecord, type DataValue } from './bundle';

export type TuitionRuleTag = 'department' | 'school-field' | 'school-all' | 'rule-c' | 'ewha-median';

// indexDepartments 는 483건을 파싱하므로 번들마다 한 번만 만든다.
const deptCache = new WeakMap<DataBundle, DeptIndex>();
function deptIndex(data: DataBundle): DeptIndex {
  let idx = deptCache.get(data);
  if (!idx) { idx = indexDepartments(data); deptCache.set(data, idx); }
  return idx;
}

/** 정렬한 값의 중앙값. 짝수 개이면 가운데 두 값의 평균(8개이면 4·5번째). */
function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const n = s.length;
  if (n === 0) throw new Error('median of empty list');
  return n % 2 ? s[(n - 1) / 2]! : (s[n / 2 - 1]! + s[n / 2]!) / 2;
}

/**
 * 학기당 등록금. 값 선택 순서: (1) 학과별 레코드, (2) 학교·계열, (3) 학교 공통, (4) 규칙 (c).
 * (1)은 선택한 학과 레코드와 같은 묶음 구성원 모두에서 찾는다(§10 규칙 6).
 */
export function tuitionPerSemester(
  data: DataBundle, school: string, field: Field, departmentRecord: string,
): DataValue & { ruleTag: TuitionRuleTag } {
  const bundle = deptIndex(data).bundles.find(b => b.members.includes(departmentRecord));
  const candidates = [departmentRecord, ...(bundle ? bundle.members.filter(m => m !== departmentRecord) : [])];
  for (const id of candidates) {
    const tid = `${id}-tuition`;
    if (has(data, tid)) return { ...get(data, tid), ruleTag: 'department' };
  }
  const fieldId = `schools-${school}-${field}-tuition`;
  if (has(data, fieldId)) return { ...get(data, fieldId), ruleTag: 'school-field' };
  const allId = `schools-${school}-all-tuition`;
  if (has(data, allId)) return { ...get(data, allId), ruleTag: 'school-all' };

  // 규칙 (c): cs 레코드가 없는 학교
  if (field === 'cs' && (ASSUMED.TUITION_CS_FROM_ENGINEERING_SCHOOLS as readonly string[]).includes(school)) {
    const eng = `schools-${school}-engineering-tuition`;
    if (has(data, eng)) return { ...get(data, eng), ruleTag: 'rule-c' };
  }
  if (school === 'ewha') {
    if (field === 'cs' || field === 'engineering') {
      return { value: ASSUMED.EWHA_ENGINEERING_TUITION, confidence: 'assumed', id: '0014#58', unit: 'krw', ruleTag: 'ewha-median' };
    }
    if (field === 'math' || field === 'bio') {
      return { value: ASSUMED.EWHA_MATH_TUITION, confidence: 'assumed', id: '0014#59', unit: 'krw', ruleTag: 'ewha-median' };
    }
  }
  throw new Error(`no tuition record for ${school}/${field} (${departmentRecord})`);
}

/** 입학금(1회). 레코드가 없으면 0원(0014#54: kaist·dgist·unist). */
export function entranceFee(data: DataBundle, school: string): DataValue {
  const id = `schools-${school}-all-entrance-fee`;
  return has(data, id) ? get(data, id) : { value: 0, confidence: 'assumed', id: '0014#54', unit: 'krw' };
}

/**
 * 등록금 감면 비율(0014#21). 장학 = `-scholarship-tuition-rate` 레코드 중 최대값.
 * 과제 = 그 접미 뒤 id 토큰에 `ra` 또는 `ta` 가 있는 레코드(id 사전순 첫째). 자비 = 0.
 * 주의: `-rate` 안에 `-ra` 부분 문자열이 들어 있고 `-rate-taa`·`-rate-tac` 는 `-ta` 로 시작하므로, 접미를 토큰으로 갈라 비교한다.
 */
export function waiverRate(data: DataBundle, school: string, route: FundingRoute): DataValue {
  const none: DataValue = { value: 0, confidence: 'assumed', id: '0014#21', unit: 'ratio' };
  if (route === 'self') return none;
  const infix = ASSUMED.TUITION_WAIVER_RECORD_INFIX;
  const recs = find(data, `schools-${school}-`).filter(r => r.id.includes(infix));
  if (route === 'scholarship') {
    let best: DataRecord | undefined;
    for (const r of recs) if (!best || r.value > best.value) best = r;
    return best ? get(data, best.id) : none;
  }
  const tokens = ASSUMED.TUITION_WAIVER_PROJECT_MARKERS.map(m => m.slice(1));   // '-ra' → 'ra'
  const hit = recs.find(r => r.id.slice(r.id.indexOf(infix) + infix.length).split('-').some(t => tokens.includes(t)));
  return hit ? get(data, hit.id) : none;
}

/** 서울 사립 8곳의 공학·수학 등록금 중앙값(0014#58·#59). 엔진 상수 EWHA_*_TUITION 과 같아야 한다. */
export function ewhaMedian(data: DataBundle, field: 'engineering' | 'math'): number {
  return median(ASSUMED.EWHA_TUITION_REFERENCE_SCHOOLS.map(s => get(data, `schools-${s}-${field}-tuition`).value));
}
