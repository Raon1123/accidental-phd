// 통계 팩 접근자: 휴학·이탈·재학 기간·취업·교원 시장(선택권 §4.5, §8, 노동 §2.2·§3.1).
import { ASSUMED } from '../assumed';
import type { Kedi, Ksced } from '../types';
import { get, has, type DataBundle, type DataValue } from './load';

export const leaveRate = (data: DataBundle, kedi: Kedi): DataValue => get(data, `${ASSUMED.LEAVE_RATE_RECORD_PREFIX}${kedi}`);
export const dropoutRate = (data: DataBundle, kedi: Kedi): DataValue => get(data, `${ASSUMED.DROPOUT_RATE_RECORD_PREFIX}${kedi}`);
export const durationYears = (data: DataBundle, kedi: Kedi): DataValue => get(data, ASSUMED.DURATION_RECORD_BY_KEDI[kedi]);
export const employedRate = (data: DataBundle, ksced: Ksced): DataValue => get(data, `statistics-employed-${ksced}`);
/** 상용직 비율, 4년 합산판(0014#76). */
export const permanentShare = (data: DataBundle, ksced: Ksced): DataValue =>
  get(data, `${ASSUMED.PERMANENT_RECORD_PREFIX}${ksced}${ASSUMED.PERMANENT_RECORD_SUFFIX}`);

export type PostdocFunder = 'university' | 'other' | 'government' | 'public-institute' | 'private-institute' | 'private-company';
const POSTDOC_FUNDERS: readonly PostdocFunder[] = ['university', 'other', 'government', 'public-institute', 'private-institute', 'private-company'];
export function postdocFunders(data: DataBundle): Record<PostdocFunder, DataValue> {
  const out = {} as Record<PostdocFunder, DataValue>;
  for (const k of POSTDOC_FUNDERS) out[k] = get(data, `statistics-postdoc-funder-${k}`);
  return out;
}

// 계열 키: 박사 학위 취득자는 KEDI 계열 이름, 전임·비전임 스톡은 레코드 접미를 그대로 키로 쓴다.
const AWARDED_KEYS = ['humanities', 'social', 'natural', 'engineering', 'education'] as const;
const AWARDED_OPTIONAL = ['medical', 'arts-sports'] as const;
const STOCK_KEYS = ['humanities', 'social', 'education', 'engineering', 'natural', 'medical', 'arts', 'nodept', 'undeclared'] as const;
const KEDI4: readonly Kedi[] = ['humanities', 'social', 'natural', 'engineering'];

export interface FacultyMarket {
  newHiresAll: DataValue; phdAwardedTotal: DataValue; stock: Record<string, DataValue>; stockAll: DataValue;
  phdAwarded: Record<Kedi | 'education', DataValue> & Partial<Record<'medical' | 'arts-sports', DataValue>>;
  nonFulltime: Record<Kedi, DataValue>; honorary: DataValue;
}

/** 교수 시장 기준값 레코드 묶음(노동 §2.2, §3.1). 기본 연도는 LABOR_BASE_YEAR(0014#102). */
export function facultyMarket(data: DataBundle, year: number = ASSUMED.LABOR_BASE_YEAR): FacultyMarket {
  // 2024 신규채용은 출처가 둘이라 `-a`(verified)를 쓴다.
  const hires = has(data, `statistics-faculty-new-hires-all-${year}`) ? `statistics-faculty-new-hires-all-${year}` : `statistics-faculty-new-hires-all-${year}-a`;
  const stock: Record<string, DataValue> = {};
  for (const k of STOCK_KEYS) { const id = `statistics-faculty-fulltime-stock-${k}-${year}`; if (has(data, id)) stock[k] = get(data, id); }
  const phdAwarded = {} as FacultyMarket['phdAwarded'];
  for (const k of AWARDED_KEYS) phdAwarded[k] = get(data, `statistics-phd-awarded-${k}-${year}`);
  for (const k of AWARDED_OPTIONAL) { const id = `statistics-phd-awarded-${k}-${year}`; if (has(data, id)) phdAwarded[k] = get(data, id); }
  const nonFulltime = {} as Record<Kedi, DataValue>;
  for (const k of KEDI4) nonFulltime[k] = get(data, `statistics-faculty-nonfulltime-stock-${k}-${year}`);
  return {
    newHiresAll: get(data, hires),
    phdAwardedTotal: get(data, `statistics-phd-awarded-total-${year}`),
    stock, stockAll: get(data, `statistics-faculty-fulltime-stock-all-${year}`),
    phdAwarded, nonFulltime,
    honorary: get(data, `statistics-faculty-honorary-all-${year}`),
  };
}

/** 대계열별 박사과정 입학자 수(명). 이름은 shares 이지만 값은 인원이다(인원 비율은 호출하는 쪽이 계산). */
export function admittedShares(data: DataBundle, year: number = ASSUMED.LABOR_BASE_YEAR): Record<'humanities' | 'social' | 'engineering' | 'natural', DataValue> {
  return {
    humanities: get(data, `statistics-phd-admitted-humanities-${year}`),
    social: get(data, `statistics-phd-admitted-social-${year}`),
    engineering: get(data, `statistics-phd-admitted-engineering-${year}`),
    natural: get(data, `statistics-phd-admitted-natural-${year}`),
  };
}
