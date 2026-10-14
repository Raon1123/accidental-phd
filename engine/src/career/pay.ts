// 경력 단계 급여·승진·계약·은퇴·노후 수입 (선택권 §9, 상태 §7.2).
import { ASSUMED } from '../assumed';
import { get, type DataBundle } from '../data/load';
import { INSTITUTES, industryPay, institutePay, lecturerAnnual, nationalStep0, officerStepFrom, privateFacultyPay, stepPay, type StepTable } from '../data/salaries';
import { odds, z } from '../odds';
import { draw, drawNormal } from '../rng';
import type { CareerState, LifeState, Route } from '../types';

type Employer = NonNullable<CareerState['employer']>;

/** 학계 경로. 구직 순서(박사후 → 강사 → 비정년 → 교수)를 겸한다. 구조 상수라 0014 번호가 없다. */
export const ACADEMIC_ROUTES: readonly Route[] = ['postdoc', 'lecturer', 'nontenure', 'professor'];
// 경력 논문을 쓰는 경로: 학계 + 출연연 (선택권 §9.2)
const PAPER_ROUTES: readonly Route[] = [...ACADEMIC_ROUTES, 'institute'];
// 해마다 +3% 오르는 경로 (선택권 §9.1 "해마다" 열). 사립 교수·박사후·강사·브리지는 고정, 국립·공무원은 호봉, 창업은 재추첨.
const RAISE_ROUTES: readonly Route[] = ['nontenure', 'institute', 'industry'];

export function addLog(state: LifeState, textKey: string, tags: string[], creative = false): LifeState {
  return { ...state, log: [...state.log, { month: state.month, textKey, tags, creative }] };
}

/** 논문 점수 S (선택권 §6.4, 0014#71). 박사과정 채택 논문의 계층 가중합 + 경력 논문 점수(`career.paperScore`는 경력 중 얻은 점수만 센다). */
export function scoreOf(state: LifeState): number {
  let s = state.career?.paperScore ?? 0;
  for (const p of state.phd?.papers ?? []) if (p.status === 'accepted') s += ASSUMED.PAPER_SCORE_WEIGHT[p.tier ?? 'T4'];
  return s;
}

const ageYears = (state: LifeState): number => Math.floor(state.ageMonths / ASSUMED.MONTHS_PER_YEAR);
const payMult = (c: CareerState | undefined): number => (c?.degree === 'master-exit' ? ASSUMED.MASTER_EXIT.payMult : 1);   // 0014#32

// 호봉제 경로의 표와 호봉 상한 (0014#88, #90)
function stepTable(c: CareerState): { table: StepTable; max: number } | undefined {
  if (c.route === 'professor' && c.employer?.national) return { table: 'univ-faculty', max: ASSUMED.NATIONAL_STEP.stepMax };
  if (c.route === 'public') return { table: c.rank === 'officer' ? 'research-officer' : 'researcher', max: ASSUMED.RESEARCHER_STEP.stepMax };
  return undefined;
}

/**
 * 채용 직후 연봉(선택권 §9.1). 호봉제는 초임 호봉 규칙 (b), 사립 교원은 규칙 (a).
 * 석사 수료 이탈자(`career.degree === 'master-exit'`)는 급여에 payMult 를 곱한다(0014#32).
 * 창업은 로그정규 추첨이라 `state.month` 의 슬롯 `startup:income`(life)을 쓴다.
 */
export function startingPay(state: LifeState, data: DataBundle, route: Route, employer: CareerState['employer']): { annualPay: number; step?: number; rank?: string; recordIds: string[] } {
  const age = ageYears(state);
  const mult = payMult(state.career);
  const out = (annualPay: number, recordIds: string[], extra: { step?: number; rank?: string } = {}) =>
    ({ annualPay: Math.round(annualPay * mult), recordIds, ...extra });
  switch (route) {
    case 'professor': {
      if (employer?.national) {
        const step = nationalStep0(age, 'assistant', data);
        const v = stepPay(data, 'univ-faculty', step);
        return out(v.value, [v.id], { step, rank: 'assistant' });
      }
      const v = privateFacultyPay(data, 'assistant');
      return out(v.value, [v.id], { rank: 'assistant' });
    }
    case 'nontenure': { const v = get(data, ASSUMED.NONTENURE_PAY_RECORD); return out(v.value, [v.id], { rank: 'nontenure' }); }
    case 'postdoc': {
      if (employer?.kind === 'institute') { const v = get(data, 'salaries-institutes-kribb-postdoc'); return out(v.value, [v.id]); }
      return out(ASSUMED.POSTDOC_UNIV_PAY, ['0014#81']);
    }
    case 'lecturer': { const v = lecturerAnnual(data, state.choices.school); return out(v.value, [v.id]); }
    case 'institute': {
      if (state.choices.group === '이공') {
        const v = institutePay(data, employer?.instituteId ?? INSTITUTES[0]!, 'new-hire');
        return out(v.value, [v.id], { rank: 'junior' });
      }
      const v = get(data, ASSUMED.HUMSOC_INSTITUTE_PAY_RECORD);
      return out(v.value, [v.id], { rank: 'junior' });
    }
    case 'public': {
      const step = nationalStep0(age, 'researcher', data);
      const v = stepPay(data, 'researcher', step);
      return out(v.value, [v.id], { step, rank: 'researcher' });
    }
    case 'industry': { const v = industryPay(data, state.choices.group); return out(v.value, [v.id], { rank: 'staff' }); }
    case 'startup': {
      const income = ASSUMED.STARTUP.incomeMedian * Math.exp(ASSUMED.STARTUP.sigma * drawNormal(state.seed, 'life', state.month, 'startup:income'));
      return out(income, ['0014#85']);
    }
    case 'bridge': return out(ASSUMED.BRIDGE_PAY, ['0014#86']);
    case 'none': return { annualPay: 0, recordIds: [] };
  }
}

const lostJob = (c: CareerState, month: number, routes: Route[]): CareerState => {
  const { employer: _e, step: _s, rank: _r, contractUntil: _c, ...rest } = c;
  return { ...rest, route: 'none', annualPay: 0, yearsInRoute: 0, searching: { routes, since: month, penalty: 1 }, retireAge: undefined };
};

/** 경력 논문 한 해 확률 odds(p0, 1.0·z(skill)). 연구 집중 해(career-10y B, 0014#38)는 p0 를 CAREER_10Y_RESEARCH.paperP0 로 바꾼다. */
export function careerPaperProbability(skill: number, researchFocus: boolean): number {
  const p0 = researchFocus ? ASSUMED.CAREER_10Y_RESEARCH.paperP0 : ASSUMED.CAREER_PAPER.p0;
  return odds(p0, ASSUMED.CAREER_PAPER.beta * z(skill));
}

/**
 * 연말 처리(상태 §7.2 2단계, 선택권 §9). 나이는 월 틱이 올린다.
 * 순서: 근속 → 호봉·연봉 인상 → 계약 만료 → 창업 존속 → 경력 논문.
 * 재계약 실패·폐업 뒤 다시 찾는 경로는 스펙에 없어 가정이다: 박사후·강사 = 학계 4경로, 창업 = 기업(`industry`).
 * 계약 만료는 상태 §7.2 2단계(연말 처리)에서만 확인하므로 만료 달이 지난 첫 연말에 판정한다(최대 11개월 늦다).
 */
export function yearEnd(state: LifeState, data: DataBundle): LifeState {
  if (!state.career) return state;
  const month = state.month;
  let c: CareerState = { ...state.career };
  let next = state;
  if (c.route !== 'none') { c.workYears += 1; c.yearsInRoute += 1; }

  const st = stepTable(c);
  if (st) {
    c.step = Math.min(st.max, (c.step ?? ASSUMED.NATIONAL_STEP.stepMin) + ASSUMED.STEP_INCREMENT);
    c.annualPay = Math.round(stepPay(data, st.table, c.step).value * payMult(c));
  } else if (RAISE_ROUTES.includes(c.route)) {
    c.annualPay = Math.round(c.annualPay * (1 + ASSUMED.SALARY_RAISE_RATE));
  }

  if ((c.route === 'postdoc' || c.route === 'lecturer') && c.contractUntil !== undefined && month >= c.contractUntil) {
    const rule = ASSUMED.CONTRACT[c.route];
    if (draw(state.seed, 'labor', month, 'renew') < rule.renewP) c.contractUntil = month + rule.years * ASSUMED.MONTHS_PER_YEAR;
    else { c = lostJob(c, month, [...ACADEMIC_ROUTES]); next = addLog(next, 'log.contract-ended', ['career', 'contract']); }
  }

  if (c.route === 'startup') {
    if (draw(state.seed, 'labor', month, 'startup:close') < ASSUMED.STARTUP.closeP) {
      c = lostJob(c, month, ['industry']); next = addLog(next, 'log.startup-closed', ['career', 'startup']);
    } else {
      c.annualPay = startingPay({ ...state, career: c }, data, 'startup', c.employer).annualPay;
    }
  }

  if (PAPER_ROUTES.includes(c.route)) {
    const p = careerPaperProbability(state.stats.skill, c.researchFocusYear === true);
    if (draw(state.seed, 'paper', month, 'career-paper') < p) {
      c.paperScore += ASSUMED.PAPER_SCORE_WEIGHT[ASSUMED.CAREER_PAPER.tier];
      c.careerPapers += 1;
    }
  }
  delete c.researchFocusYear;   // 연구 집중은 그해 한 번뿐이다(경로가 논문 경로가 아니어도 지운다)
  return { ...next, career: c };
}

type Transition = { key: keyof typeof ASSUMED.PROMOTION_P0; nextRank: string };

function transitionFor(c: CareerState, dp: 'career-5y' | 'career-10y'): Transition | undefined {
  const five = dp === 'career-5y';
  switch (c.route) {
    case 'professor':
      if (five && c.rank === 'assistant') return { key: 'professor:assistant-to-associate', nextRank: 'associate' };
      if (!five && c.rank === 'associate') return { key: 'professor:associate-to-full', nextRank: 'professor' };
      return undefined;
    case 'nontenure': return five ? { key: 'nontenure:to-tenure-track', nextRank: 'assistant' } : undefined;
    case 'institute':
      if (five && c.rank === 'junior') return { key: 'institute:junior-to-senior', nextRank: 'senior' };
      if (!five && c.rank === 'senior') return { key: 'institute:senior-to-principal', nextRank: 'principal' };
      return undefined;
    case 'public': return !five && c.rank === 'researcher' ? { key: 'public:researcher-to-officer', nextRank: 'officer' } : undefined;
    case 'industry': return { key: 'industry:promotion', nextRank: c.rank ?? 'staff' };
    default: return undefined;
  }
}

/**
 * 5·10년 승진·정규 전환(선택권 §9.3). 해당 전이가 없으면 추첨하지 않고 그대로 낸다.
 * 확률은 odds(p0, 0.8·z(skill) + 0.4·z(network) + 0.4·z(relation) + 0.15·min(S, 10)), 슬롯 `promotion`(labor).
 * 점수 항은 스펙대로 중심화하지 않는다(S = 0 이면 항이 0이다).
 * 성공: 사립 교수 = 다음 직급 사립 연봉, 국립 교수 = 호봉 유지(직급만 바뀜), 출연연(이공) = 다음 직급 초임 레코드,
 * 출연연(인문사회) = 연봉 유지(직급 레코드 없음), 연구직 = 연구관 호봉 환산, 기업 = ×(1 + 0.10), 비정년 → 정년트랙 조교수.
 */
export function promotion(state: LifeState, data: DataBundle, dp: 'career-5y' | 'career-10y'): { state: LifeState; promoted: boolean } {
  const c = state.career;
  if (!c) return { state, promoted: false };
  const tr = transitionFor(c, dp);
  if (!tr) return { state, promoted: false };
  const P = ASSUMED.PROMOTION;
  const terms = P.betaSkill * z(state.stats.skill) + P.betaNetwork * z(state.stats.network) + P.betaRelation * z(state.stats.relation)
    + P.gammaScore * Math.min(scoreOf(state), P.scoreCap);
  const p = odds(ASSUMED.PROMOTION_P0[tr.key], terms, P.lo, P.hi);
  if (draw(state.seed, 'labor', state.month, 'promotion') >= p) return { state: addLog(state, 'log.promotion-failed', ['career', 'promotion', dp]), promoted: false };

  let n: CareerState = { ...c, rank: tr.nextRank };
  const mult = payMult(c);
  if (c.route === 'professor') {
    if (!c.employer?.national) n.annualPay = Math.round(privateFacultyPay(data, tr.nextRank as 'associate' | 'professor').value * mult);
  } else if (c.route === 'nontenure') {
    n = { ...n, route: 'professor', employer: { kind: 'university', national: false }, yearsInRoute: 0, retireAge: undefined,
      annualPay: Math.round(privateFacultyPay(data, 'assistant').value * mult) };
  } else if (c.route === 'institute') {
    if (state.choices.group === '이공' && c.employer?.instituteId) {
      const grade = tr.nextRank === 'senior' ? 'senior-researcher' : 'principal-researcher';
      n.annualPay = Math.round(institutePay(data, c.employer.instituteId, grade).value * mult);
    }
  } else if (c.route === 'public') {
    n.step = officerStepFrom(c.step ?? ASSUMED.NATIONAL_STEP.stepMin);
    n.annualPay = Math.round(stepPay(data, 'research-officer', n.step).value * mult);
  } else if (c.route === 'industry') {
    n.annualPay = Math.round(c.annualPay * (1 + ASSUMED.INDUSTRY_PROMOTION_RAISE));
  }
  return { state: addLog({ ...state, career: n }, 'log.promotion', ['career', 'promotion', dp]), promoted: true };
}

/**
 * 은퇴 나이(0014#99·#100). `career.retireAge` 가 있으면 그것이 정본이다(조기 은퇴·경로 변경 때 호출하는 쪽이 지우거나 덮는다).
 * 없으면 경로별 고정 나이, 그 밖은 U{60…67}. 균등 추첨은 경로가 바뀌어도 값이 흔들리지 않게 학위 달을 월 키로 쓴다(슬롯 `retire`, life).
 */
export function retireAge(state: LifeState, _data?: DataBundle): number {
  const c = state.career;
  if (c?.retireAge !== undefined) return c.retireAge;
  const fixed = (ASSUMED.RETIRE_AGE as Partial<Record<Route, number>>)[c?.route ?? 'none'];
  if (fixed !== undefined) return fixed;
  const [lo, hi] = ASSUMED.RETIRE_AGE_OTHER_RANGE;
  const u = draw(state.seed, 'life', c?.degreeMonth ?? 0, 'retire');
  return lo + Math.min(hi - lo, Math.floor(u * (hi - lo + 1)));
}

/**
 * 노후 월수입(0014#101, 선택권 §9.4): 55만 원 + min(0.6·W_last, a·근속연수·W_last).
 * W_last 는 은퇴 시점 월 급여(연봉 ÷ 12)다. 평균 급여를 저장하는 필드가 없어 평균 대신 W_last 를 쓴다(선택권 §9.4).
 */
export function pensionMonthly(state: LifeState): number {
  const c = state.career;
  if (!c) throw new Error('pensionMonthly: no career');
  const wLast = c.annualPay / ASSUMED.MONTHS_PER_YEAR;
  const a = ASSUMED.PENSION_PUBLIC_ROUTES.includes(c.route as 'professor' | 'public') ? ASSUMED.PENSION_ACCRUAL_PUBLIC : ASSUMED.PENSION_ACCRUAL_OTHER;
  return Math.round(ASSUMED.PENSION_BASE_MONTHLY + Math.min(ASSUMED.PENSION_CAP_RATIO * wLast, a * c.workYears * wLast));
}

