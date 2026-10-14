// 경력 연 틱 advanceYear (상태 §7.2·§7.3).
import { ASSUMED } from '../assumed';
import { nextSpending, spendingOf } from '../spending';
import type { DataBundle } from '../data/bundle';
import type { DecisionId, LifeState, MonthInput, PendingDecision, Route } from '../types';
import { searchMonth } from './labor';
import { updateNews } from './news';
import { ACADEMIC_ROUTES, addLog, pensionMonthly, retireAge, yearEnd } from './pay';
import { decide } from '../decide';
import { policyDecision } from '../policy';

// 결정 지점 트리거 시점(선택권 §3.5–§3.7). 0014 항목이 아닌 구조 상수다.
const FIVE_YEARS_MONTHS = 5 * ASSUMED.MONTHS_PER_YEAR;   // 선택권 §3.5 career-5y: degreeMonth + 60
const TEN_YEARS_MONTHS = 10 * ASSUMED.MONTHS_PER_YEAR;   // 선택권 §3.6 career-10y: degreeMonth + 120
const PRE_RETIREMENT_LEAD_YEARS = 2;   // 나이 = retireAge − 2; 선택권 §3.7 pre-retirement

const ageYears = (s: LifeState): number => Math.floor(s.ageMonths / ASSUMED.MONTHS_PER_YEAR);

/** 경력·은퇴 단계 한 달 정산 항목(선택권 §5.6, #96). 금액은 모두 양수이고 부호는 원장에서 붙는다. */
export interface CareerFlow { pay: number; pension: number; research: number; living: number; interest: number; repay: number; loan: number }

/**
 * 이 달(state.month)의 월 정산(선택권 §5.6, #96). 경력이면 급여/12, 은퇴면 노후 월수입과 은퇴 뒤 연구 수입이 들어오고,
 * 생활비(0014#60, 은퇴 뒤에도 같은 값 0014#123)가 나간다. 부채 이자는 박사과정과 같이 부채에 붙고(0014 #61),
 * 남는 현금이 있으면 그달 소득의 CAREER_REPAY_SHARE 까지 갚는다(0014#122). 현금이 모자라면 한도 안에서 빌린다(위기 판정은 없다).
 */
export function careerFlow(s: LifeState): CareerFlow {
  const c = s.career;
  const retired = s.stage === 'retired';
  const pay = !retired && c ? Math.round(c.annualPay / ASSUMED.MONTHS_PER_YEAR) : 0;
  const pension = retired ? (c?.pensionMonthly ?? (c ? pensionMonthly(s) : 0)) : 0;
  const research = retired && c?.postRetireResearchUntil !== undefined && s.month <= c.postRetireResearchUntil ? ASSUMED.POST_RETIRE_RESEARCH.monthly : 0;
  const living = spendingOf(s);   // 사람별 씀씀이(0014#131)
  const interest = Math.round(s.money.debt * ASSUMED.LOAN_RATE_ANNUAL / ASSUMED.MONTHS_PER_YEAR);
  const debt = s.money.debt + interest;
  const cash = s.money.cash + pay + pension + research - living;
  const repay = cash > 0 ? Math.min(debt, cash, Math.round((pay + pension + research) * ASSUMED.CAREER_REPAY_SHARE)) : 0;
  const loan = cash < 0 ? Math.min(-cash, Math.max(0, s.money.loanLimit - debt)) : 0;
  return { pay, pension, research, living, interest, repay, loan };
}

/** 월 정산을 원장과 현금·부채에 반영한다. 경력이면 학계 근무 개월도 센다. */
function settleMonth(s: LifeState): LifeState {
  const f = careerFlow(s);
  const month = s.month;
  const ledger = [...s.ledger];
  const push = (kind: string, amount: number) => { if (amount !== 0) ledger.push({ month, kind, amount }); };
  push('pay', f.pay);
  push('pension', f.pension);
  push('post-retire-research', f.research);
  push('living', -f.living);
  push('interest', -f.interest);   // 현금이 아니라 부채에 붙는 항목이다
  push('repay', -f.repay);
  push('loan', f.loan);
  const cash = s.money.cash + f.pay + f.pension + f.research - f.living - f.repay + f.loan;
  const debt = s.money.debt + f.interest - f.repay + f.loan;
  const c = s.career;
  const career = c && s.stage === 'career' ? { ...c, academicMonths: c.academicMonths + (ACADEMIC_ROUTES.includes(c.route) ? 1 : 0) } : c;
  return { ...s, money: { ...s.money, cash, debt, spending: nextSpending(s, f.pay + f.pension + f.research) }, ledger, ...(career ? { career } : {}) };
}

/** 다음 한 달(month + 1)에 정산될 값(화면 자금 카드용). 경력 틱은 달을 먼저 올리고 정산하므로 같은 순서로 계산한다. */
export function previewCareerFlow(s: LifeState): CareerFlow {
  return careerFlow({ ...s, month: s.month + 1, ageMonths: s.ageMonths + 1 });
}

function optionsFor(dp: DecisionId, route: Route): PendingDecision['options'] {
  const letters = dp === 'pre-retirement' ? ['A', 'B', 'C'] : dp === 'career-10y' ? ['A', 'B', 'C', 'D']
    : (['postdoc', 'lecturer', 'nontenure'] as Route[]).includes(route) ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C'];   // 5년 D 는 학계 비정규만 (선택권 §3.5)
  return letters.map(k => ({ key: k, textKey: `decision.${dp}.${k}` }));
}

function nextTrigger(s: LifeState, retire: number): DecisionId | null {
  const c = s.career!;
  const decided = (dp: DecisionId): boolean => s.decisions.some(d => d.dp === dp);
  if (ageYears(s) >= retire - PRE_RETIREMENT_LEAD_YEARS && !decided('pre-retirement')) return 'pre-retirement';
  if (s.month >= c.degreeMonth + TEN_YEARS_MONTHS && !decided('career-10y')) return 'career-10y';
  if (s.month >= c.degreeMonth + FIVE_YEARS_MONTHS && !decided('career-5y')) return 'career-5y';
  return null;
}

function retiredYear(s: LifeState): LifeState {
  let n: LifeState = s.career && s.career.pensionMonthly === undefined ? { ...s, career: { ...s.career, pensionMonthly: pensionMonthly(s) } } : s;
  for (let i = 0; i < ASSUMED.MONTHS_PER_YEAR; i++) n = settleMonth({ ...n, month: n.month + 1, ageMonths: n.ageMonths + 1 });   // 은퇴 뒤에도 달마다 정산(#96)
  if (n.ageMonths >= ASSUMED.END_AGE * ASSUMED.MONTHS_PER_YEAR) {
    n = addLog({ ...n, stage: 'end', end: { reason: 'age80', month: n.month } }, 'log.end-age80', ['end']);
  }
  return n;
}

/**
 * 경력 연 틱. 순서: 월 하위 단계 12회(뉴스 → 구직 → 현금) → 연말 처리 → 결정 지점 트리거 → 은퇴 확인 → 기록(상태 §7.2 1–5단계).
 * 은퇴 나이에 이른 해에도 아직 열리지 않은 결정 지점(pre-retirement 등)은 은퇴 확인보다 먼저 연다. 자동이면 정책이 닫은 뒤 은퇴 확인으로 간다.
 * 결정 지점은 한 틱에 하나이고 우선순위는 pre-retirement > career-10y > career-5y 이며, 걸리면 snapshot 을 먼저 쌓고 `pending` 을 채운다.
 * 결정 처리(`decide`)는 호출하는 쪽의 몫이다. 단 `auto` 이면 걸린 결정을 정책(`policyDecision`)으로 이 틱 안에서 바로 닫는다.
 */
export function advanceYear(state: LifeState, data: DataBundle, input?: { apply?: Partial<Record<Route, boolean>> }): LifeState {
  if (state.pending) throw new Error('advanceYear: decision pending');
  if (state.stage === 'end') return state;
  if (state.stage === 'retired') return retiredYear(state);
  if (state.stage !== 'career' || !state.career) throw new Error(`advanceYear: stage ${state.stage} has no career year`);

  const monthInput: Pick<MonthInput, 'apply'> | undefined = input;
  let s: LifeState = state;
  for (let i = 0; i < ASSUMED.MONTHS_PER_YEAR; i++) {
    s = { ...s, month: s.month + 1, ageMonths: s.ageMonths + 1 };
    s = updateNews(s, data);
    if (s.career!.searching) s = searchMonth(s, data, s.month, monthInput).state;
    s = settleMonth(s);
  }
  s = yearEnd(s, data);

  // 은퇴 나이는 경로가 정해진 뒤 한 번 굳힌다(무직이면 굳히지 않는다).
  let retire = retireAge(s, data);
  if (s.career!.route !== 'none' && s.career!.retireAge === undefined) s = { ...s, career: { ...s.career!, retireAge: retire } };
  retire = retireAge(s, data);

  // 상태 §7.2 3단계(결정 지점 트리거) → 4단계(은퇴 확인). 은퇴 나이에 이른 해에도 아직 못 연 결정 지점은 먼저 연다.
  const dp = nextTrigger(s, retire);
  if (dp) {
    s = addLog(s, 'log.career-year', ['career', 'year']);
    const pending = { dp, month: s.month, context: { route: s.career!.route, rank: s.career!.rank }, options: optionsFor(dp, s.career!.route) };
    // 스냅샷 계약(상태 §6.3, branch.ts): 결정 직전 상태 + 그 결정의 pending 프롬프트, decisions 에는 그 결정이 없다
    const snapshot = { dp, month: s.month, decisionIndex: s.decisions.length, state: structuredClone({ ...s, snapshots: [], pending }) };
    s = { ...s, snapshots: [...s.snapshots, snapshot], pending };
    // 자동 진행(동기 정책, 선택권 §4.4): 월 틱과 같이 연 틱 안에서 바로 고른다. 닫은 뒤에는 은퇴 확인으로 간다.
    if (s.auto) s = decide(s, data, policyDecision(s, data, pending), true);
    // 플레이어가 고를 차례이거나, pre-retirement B 가 이미 stage 를 retired 로 옮겼으면 여기서 끝낸다
    if (s.pending || s.stage !== 'career') return s;
  }
  if (ageYears(s) >= retire) {
    // 이미 정해진 노후 월수입(예: pre-retirement B 조기 은퇴 ×0.85)은 덮어쓰지 않는다
    s = { ...s, stage: 'retired', career: { ...s.career!, pensionMonthly: s.career!.pensionMonthly ?? pensionMonthly(s) } };
    return addLog(s, 'log.retired', ['career', 'retire']);
  }
  if (!dp) s = addLog(s, 'log.career-year', ['career', 'year']);
  return s;
}
