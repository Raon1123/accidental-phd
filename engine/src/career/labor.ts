// 노동시장: 교수·강사 기준값, 월 공고 확률, 채용 확률, 월 구직 처리 (노동 §2–§4).
import { ASSUMED } from '../assumed';
import type { DataBundle } from '../data/bundle';
import { INSTITUTES } from '../data/salaries';
import { facultyMarket } from '../data/statistics';
import { clamp, hazardMonth, odds, z } from '../odds';
import { draw } from '../rng';
import type { CareerState, EndReason, Group, Kedi, LifeState, MonthInput, Path, Route } from '../types';
import { demand } from './news';
import { ACADEMIC_ROUTES, addLog, isContractRoute, scoreOf, startingPay } from './pay';

/** 교수 공고 기준값 B_k = (신규채용 × stock_k ÷ stock_전체) ÷ 박사 학위 취득자_k, h = min(0.10, 0.5·B_k) (노동 §2.2·§2.3, 0014#103·#104). */
export function professorBaseline(data: DataBundle, kedi: Kedi): { B: number; h: number } {
  const m = facultyMarket(data);
  const B = (m.newHiresAll.value * m.stock[kedi]!.value / m.stockAll.value) / m.phdAwarded[kedi].value;
  return { B, h: Math.min(ASSUMED.PROFESSOR_H.cap, ASSUMED.PROFESSOR_H.kappa * B) };
}

/** 강사 비중 s = 강사 ÷ (비전임 − 명예교수), 일반대학 전체(2025: 40,180 ÷ 77,061 = 0.5214). 계열별 강사 분해가 없어 전 계열 공통으로 쓴다 (노동 §3.1, 0014#106 2026-10-23). */
export function lecturerShare(data: DataBundle): number {
  const m = facultyMarket(data);
  return m.lecturersAll.value / (m.nonFulltimeAll.value - m.honorary.value);
}

/** 시간강사 연 채용 h = clamp(0.15·L_k, 0.20, 0.85), L_k = (비전임_k − 명예교수 배분_k) × 강사 비중 s ÷ 박사 학위 취득자_k (노동 §3.1, 0014#105·#106). */
export function lecturerH(data: DataBundle, kedi: Kedi): number {
  const m = facultyMarket(data);
  const honoraryShare = m.honorary.value * m.stock[kedi]!.value / m.stockAll.value;
  const L = (m.nonFulltime[kedi].value - honoraryShare) * lecturerShare(data) / m.phdAwarded[kedi].value;
  const p = ASSUMED.LECTURER_H;
  return clamp(p.coef * L, p.lo, p.hi);
}

/** 경로별 연 채용 확률 h (노동 §3.2 표). 교수·강사는 레코드에서, 나머지는 assumed 표에서 읽는다. */
export function routeH(data: DataBundle, route: Route, group: Group, kedi: Kedi): number {
  switch (route) {
    case 'professor': return professorBaseline(data, kedi).h;
    case 'lecturer': return lecturerH(data, kedi);
    case 'nontenure': case 'postdoc': case 'institute': case 'public': case 'industry': return ASSUMED.ROUTE_H[route][group];
    default: throw new Error(`routeH: route has no posting rate: ${route}`);
  }
}

function s0Of(route: Route): number {
  const v = (ASSUMED.S0 as Partial<Record<Route, number>>)[route];
  if (v === undefined) throw new Error(`no s0 for route: ${route}`);
  return v;
}

// π0 = hazard_month(h) / s0, 공고 확률 = clamp(π0·D, 0.005, 0.60)
function postingFromH(h: number, route: Route, demandCoef: number): number {
  return clamp(hazardMonth(h) / s0Of(route) * demandCoef, ASSUMED.POST_BOUNDS.lo, ASSUMED.POST_BOUNDS.hi);
}

/** 월 공고 도달 확률 (노동 §4.1 1단계). `hMult` 는 구직 보정(경로 변경 ×0.8, 석사 수료 ×0.7)을 h 에 곱한다. */
export function postingProbability(data: DataBundle, route: Route, group: Group, kedi: Kedi, demandCoef: number, hMult = 1): number {
  return postingFromH(routeH(data, route, group, kedi) * hMult, route, demandCoef);
}

/**
 * 공고 하나에 지원했을 때 채용 확률 (노동 §4.1 3단계).
 * s = odds(s0, β_skill·z(skill) + β_net·z(network) + γ_S·(min(S, 12) − S_ref) + γ_exp·[학계 경력 ≥ 24개월], 0.01, 0.60).
 * 박사과정 중(career 없음)이면 academicMonths = 0, S 는 채택 논문 점수다.
 */
export function hireProbability(state: LifeState, _data: DataBundle, route: Route): number {
  const groupKey = (ASSUMED.ROUTE_COEF_GROUP as Partial<Record<Route, keyof typeof ASSUMED.HIRE_COEF>>)[route];
  if (!groupKey) throw new Error(`hireProbability: route has no hire coefficients: ${route}`);
  const k = ASSUMED.HIRE_COEF[groupKey];
  const exp = (state.career?.academicMonths ?? 0) >= ASSUMED.HIRE_EXP_MONTHS ? 1 : 0;
  const terms = k.betaSkill * z(state.stats.skill) + k.betaNet * z(state.stats.network)
    + k.gammaS * (Math.min(scoreOf(state), ASSUMED.HIRE_SCORE_CAP) - ASSUMED.S_REF[state.choices.group]) + k.gammaExp * exp;
  return odds(s0Of(route), terms, ASSUMED.HIRE_BOUNDS.lo, ASSUMED.HIRE_BOUNDS.hi);
}

// 졸업 직전 구직(선택권 §3.4)이 찾는 경로: 학계 = 박사후·강사·비정년·교수, 산업 = 기업, 공공 = 출연연·연구직 공무원, 창업 = 없음.
const PATH_ROUTES: Record<Path, readonly Route[]> = {
  academia: ACADEMIC_ROUTES, industry: ['industry'], public: ['institute', 'public'], startup: [],
};

function searchSpec(state: LifeState): { routes: readonly Route[]; penalty: number } | undefined {
  if (state.career) return state.career.searching ? { routes: state.career.searching.routes, penalty: state.career.searching.penalty } : undefined;
  const path = state.stage === 'phd' ? state.phd?.path : undefined;
  return path ? { routes: PATH_ROUTES[path], penalty: 1 } : undefined;
}

/**
 * 채용을 상태에 반영한다. 급여·계약 기간·학계 개월은 채용 달부터 센다. 시작 대기 상태는 두지 않는다(노동 §4.1 3단계, 월 단위 처리는 tick 이 한다).
 * 박사과정 중 채용이면 `career` 를 새로 만든다(degree 'phd', degreeMonth = 졸업 예정 달 또는 지금). 단계는 그대로 두고 졸업 처리는 phd 틱이 한다.
 * 고용주 추첨 슬롯(labor): `hire:national`, `hire:institute`, `hire:postdoc-employer`.
 */
export function applyHire(state: LifeState, data: DataBundle, route: Route, month: number): LifeState {
  const base: CareerState = state.career ?? {
    degreeMonth: state.phd?.graduationMonth ?? month, degree: 'phd', route: 'none', annualPay: 0,
    yearsInRoute: 0, workYears: 0, academicMonths: 0, paperScore: 0, careerPapers: 0,
  };
  const seed = state.seed;
  let employer: CareerState['employer'];
  switch (route) {
    case 'professor': employer = { kind: 'university', national: draw(seed, 'labor', month, 'hire:national') < ASSUMED.NATIONAL_HIRE_SHARE }; break;
    case 'nontenure': employer = { kind: 'university', national: false }; break;
    case 'lecturer': employer = { kind: 'university', schoolId: state.choices.school }; break;
    case 'postdoc':
      // 출연연 박사후 급여는 기관 하나(kribb) 레코드뿐이다(선택권 §9.1).
      employer = draw(seed, 'labor', month, 'hire:postdoc-employer') < ASSUMED.POSTDOC_INSTITUTE_SHARE[state.choices.group]
        ? { kind: 'institute', instituteId: 'kribb' } : { kind: 'university' };
      break;
    case 'institute':
      employer = state.choices.group === '이공'
        ? { kind: 'institute', instituteId: INSTITUTES[Math.min(INSTITUTES.length - 1, Math.floor(draw(seed, 'labor', month, 'hire:institute') * INSTITUTES.length))]! }
        : { kind: 'institute' };
      break;
    case 'public': employer = { kind: 'government' }; break;
    case 'startup': employer = { kind: 'self' }; break;
    default: employer = { kind: 'company' };
  }
  const pay = startingPay({ ...state, month, career: base }, data, route, employer);
  const contract = isContractRoute(route) ? ASSUMED.CONTRACT[route] : undefined;   // 0014 #95·#133·#134
  const career: CareerState = {
    ...base, route, rank: pay.rank, employer, annualPay: pay.annualPay, step: pay.step, yearsInRoute: 0,
    searching: undefined, retireAge: undefined,
    contractUntil: contract ? month + contract.years * ASSUMED.MONTHS_PER_YEAR : undefined,
  };
  return addLog({ ...state, career }, 'log.hired', ['career', 'hire', route]);
}

/** 학위 없이 경력으로 넘어간 사람의 구직 경로(선택권 §3.1): 학계 경로는 닫힌다. */
export const NO_DEGREE_SEARCH_ROUTES: readonly Route[] = ['institute', 'public', 'industry', 'bridge'];

/**
 * 학위 없이 박사과정을 마치고 경력 단계로 넘어간다(석사 수료 이탈, 이탈, 재학연한 초과, 재정 파탄; #85).
 * `end` 는 박사과정이 끝난 이유로 남고, 생애는 경력 단계에서 80세까지 이어진다. 구직은 다음 달부터 비학계 경로로 한다.
 */
export function leavePhd(s: LifeState, reason: Exclude<EndReason, 'degree' | 'age80'>): LifeState {
  const career: CareerState = {
    degreeMonth: s.month, degree: reason === 'exit-master' ? 'master-exit' : 'none', route: 'none', annualPay: 0, yearsInRoute: 0, workYears: 0, academicMonths: 0,
    paperScore: 0, careerPapers: 0, searching: { routes: [...NO_DEGREE_SEARCH_ROUTES], since: s.month, penalty: 1 },
  };
  return { ...s, stage: 'career', end: { reason, month: s.month }, career };
}

/**
 * 월 구직 처리 (노동 §4.1).
 * 1) 경로마다 슬롯 `post:<경로>` 로 공고를 추첨한다(경로당 한 번, 같은 달 공고 ≤ 1). 2) 경로 순서대로 지원(`input.apply` 기본 true) → 슬롯 `apply:<경로>:<n>` 로 채용 추첨.
 * 임시직(bridge)은 공고 없이 슬롯 `bridge` 로 월 BRIDGE_SEARCH_P 를 바로 추첨한다. 한 달에 채용은 많아야 한 건이고 공고 추첨은 채용 결과와 무관하다.
 * 학위 없이 넘어온 사람(석사 수료 이탈, #85의 이탈·재학연한·재정 파탄)은 학계 경로를 못 찾고 나머지 경로의 확률에 hireMult 를 곱한다(선택권 §3.1). 구직 보정(penalty)은 h 에 곱한다.
 */
export function searchMonth(state: LifeState, data: DataBundle, month: number, input?: Pick<MonthInput, 'apply'>): { state: LifeState; postings: Route[]; hired?: Route } {
  const spec = searchSpec(state);
  if (!spec) return { state, postings: [] };
  const masterExit = state.career !== undefined && state.career.degree !== 'phd';   // 석사 수료·이탈·재학연한·재정 파탄(#85)
  const routes = masterExit ? spec.routes.filter(r => !ACADEMIC_ROUTES.includes(r)) : spec.routes;
  const exitMult = masterExit ? ASSUMED.MASTER_EXIT.hireMult : 1;
  const { group, kedi } = state.choices;
  const seed = state.seed;

  const postings: Route[] = [];
  for (const r of routes) {
    if (r === 'bridge') continue;
    const p = postingProbability(data, r, group, kedi, demand(state, r), spec.penalty * exitMult);
    if (draw(seed, 'labor', month, `post:${r}`) < p) postings.push(r);
  }

  let hired: Route | undefined;
  const applied: Partial<Record<Route, number>> = {};
  for (const r of routes) {
    if (hired) break;
    if (r === 'bridge') {
      if (draw(seed, 'labor', month, 'bridge') < ASSUMED.BRIDGE_SEARCH_P * exitMult) hired = r;
    } else if (postings.includes(r) && (input?.apply?.[r] ?? true)) {
      const n = applied[r] ?? 0;
      applied[r] = n + 1;
      if (draw(seed, 'labor', month, `apply:${r}:${n}`) < hireProbability(state, data, r)) hired = r;
    }
  }
  if (!hired) return { state, postings };
  return { state: applyHire(state, data, hired, month), postings, hired };
}
