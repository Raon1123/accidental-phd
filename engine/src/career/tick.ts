// 경력 연 틱 advanceYear (상태 §7.2·§7.3).
import { ASSUMED } from '../assumed';
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

function livingCost(s: LifeState): number {
  const capital = (ASSUMED.CAPITAL_SCHOOLS as readonly string[]).includes(s.choices.school);
  return capital ? ASSUMED.LIVING_COST.capital : ASSUMED.LIVING_COST.regional;
}

/**
 * 월 현금 흐름(상태 §7.2 1단계 (4)): 급여/12 − 생활비를 그대로 현금에 더한다.
 * 대출·이자·재정 위기는 박사과정 규칙(선택권 §5.3–§5.5)이라 경력 단계에는 적용하지 않으므로 무직이 길면 현금이 음수가 될 수 있다.
 */
function monthlyCash(s: LifeState): LifeState {
  const c = s.career!;
  const pay = Math.round(c.annualPay / ASSUMED.MONTHS_PER_YEAR);
  const living = livingCost(s);
  const ledger = [...s.ledger];
  if (pay !== 0) ledger.push({ month: s.month, kind: 'pay', amount: pay });
  ledger.push({ month: s.month, kind: 'living', amount: -living });
  const academic = ACADEMIC_ROUTES.includes(c.route) ? 1 : 0;
  return { ...s, money: { ...s.money, cash: s.money.cash + pay - living }, ledger, career: { ...c, academicMonths: c.academicMonths + academic } };
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
  const c = s.career;
  const monthly = c?.pensionMonthly ?? (c ? pensionMonthly(s) : 0);
  const month = s.month + ASSUMED.MONTHS_PER_YEAR;
  // 은퇴 후 연구 수입(선택권 §3.7 C, 0014#98): 이 해에 걸친 달 수만큼 월 수입을 더한다.
  const researchMonths = c?.postRetireResearchUntil === undefined ? 0 : Math.max(0, Math.min(ASSUMED.MONTHS_PER_YEAR, c.postRetireResearchUntil - s.month));
  const research = researchMonths * ASSUMED.POST_RETIRE_RESEARCH.monthly;
  const income = monthly * ASSUMED.MONTHS_PER_YEAR;
  const ledger = [...s.ledger, { month, kind: 'pension', amount: income }];
  if (research > 0) ledger.push({ month, kind: 'post-retire-research', amount: research });
  let n: LifeState = { ...s, month, ageMonths: s.ageMonths + ASSUMED.MONTHS_PER_YEAR, money: { ...s.money, cash: s.money.cash + income + research }, ledger };
  if (n.ageMonths >= ASSUMED.END_AGE * ASSUMED.MONTHS_PER_YEAR) {
    n = addLog({ ...n, stage: 'end', end: { reason: 'age80', month } }, 'log.end-age80', ['end']);
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
    s = monthlyCash(s);
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
