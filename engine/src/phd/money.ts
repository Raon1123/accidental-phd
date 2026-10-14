// 돈: 장려금·가족 지원·근로 − 생활비 − 등록금 − 이자, 부족분 대출, 재정 위기 카운터(선택권 §5.1–§5.5).
// applyCashflow 는 달마다 한 번 부른다(틱 순서 6번, 포커스 효과 뒤). 같은 달에 두 번 부르면 아직 정산되지 않은 원장 항목을 다시 합산한다.
import { ASSUMED } from '../assumed';
import { nextSpending, spendingOf } from '../spending';
import type { DataBundle } from '../data/bundle';
import { tuitionPerSemester } from '../data/tuition';
import type { LifeState, PhdState } from '../types';
import { stipendScale, drawParticipation } from './work';

/** applyCashflow 가 직접 쓰거나(또는 createLife 가 이미 현금에 반영한) 원장 종류. 이 밖의 종류는 이번 달 정산 대기 항목으로 보고 합산한다. */
export const SETTLED_KINDS: readonly string[] = ['entrance-fee', 'stipend', 'family', 'living', 'tuition', 'interest', 'loan'];

/** 학기 경계 달(3월·9월): month mod 6 === 0. */
export function isSemesterBoundary(month: number): boolean {
  return month % ASSUMED.SEMESTER_MONTHS === 0;
}

/** 월 생활비: 수도권 학교 160만 원, 그 밖 130만 원(0014#60). */
export function livingCost(school: string): number {
  return (ASSUMED.CAPITAL_SCHOOLS as readonly string[]).includes(school) ? ASSUMED.LIVING_COST.capital : ASSUMED.LIVING_COST.regional;   // 지역 기본값(0014#60). 실제 지출은 spendingOf(0014#131)
}

/** 수업 기간 여부: 입학 후 24개월 동안. 학기 경계 달에 틱이 부른다. */
export function updateCoursework(state: LifeState): LifeState {
  const phd = state.phd;
  if (!phd) throw new Error('phd state required');
  const coursework = phd.enrolledMonths < ASSUMED.COURSEWORK_MONTHS;
  return coursework === phd.coursework ? state : { ...state, phd: { ...phd, coursework } };
}

/** 장려금이 지급되는 달인가: 휴학이 아니고, 기한(until ≥ 0)이 지나지 않았다. */
function fundingActive(phd: PhdState, month: number): boolean {
  const f = phd.fundingState;
  return !phd.leave.active && !(f.until >= 0 && month > f.until);
}

/**
 * 이번 달 학기 등록금(감면과 수료 후 0.1 배율 반영). 학기 경계 달이 아니거나 휴학 중이면 null.
 * applyCashflow 가 쓰고, createLife 가 0개월째 첫 학기 청구에도 쓴다.
 */
export function tuitionCharge(state: LifeState, data: DataBundle): { amount: number; recordId: string } | null {
  const phd = state.phd;
  if (!phd) throw new Error('phd state required');
  if (!isSemesterBoundary(state.month) || phd.leave.active) return null;
  const t = tuitionPerSemester(data, state.choices.school, state.choices.field, state.choices.departmentRecord);
  const waiver = fundingActive(phd, state.month) ? phd.fundingState.tuitionWaiver : 0;   // 장려금이 끝나면 감면도 끝난다
  return { amount: Math.round(t.value * (1 - waiver) * (phd.coursework ? 1 : ASSUMED.POST_COURSEWORK_TUITION_RATIO)), recordId: t.id };
}

function crisisStartMonth(state: LifeState, monthsSoFar: number): number {
  return state.month - monthsSoFar;
}

/** crisisMonths 가 3 이상인 위기 시작 달 이후에 funding-expiry 결정이 이미 기록됐는가. */
function expiryDecidedSince(state: LifeState, start: number): boolean {
  return state.decisions.some(d => d.dp === 'funding-expiry' && d.month >= start);
}

/**
 * 이 달(state.month)에 정산될 정기 수입·지출(원장 kind 와 같은 이름). stipend·family 는 수입, living·tuition 은 지출(양수)이다.
 * 포커스의 근로 수입 같은 정산 대기 항목은 들어 있지 않다. applyCashflow 가 쓴다.
 */
function monthlyCashflow(state: LifeState, data: DataBundle): { stipend: number; family: number; living: number; tuition: number; tuitionRecordId?: string } {
  const phd = state.phd;
  if (!phd) throw new Error('phd state required');
  const charge = tuitionCharge(state, data);
  return {
    stipend: fundingActive(phd, state.month) ? Math.round(phd.fundingState.monthly * stipendScale(state)) : 0,   // 과제 참여율 #79
    family: phd.familySupport,
    living: spendingOf(state),   // 사람별 씀씀이(0014#131)
    tuition: charge?.amount ?? 0,
    ...(charge ? { tuitionRecordId: charge.recordId } : {}),
  };
}

/**
 * 다음 틱이 정산할 값(화면의 자금 카드용). 틱은 먼저 월과 재학 개월을 올리고 수업 기간을 갱신한 뒤 정산하므로(tick 1단계),
 * 같은 순서로 한 칸 앞선 상태에서 계산한다(학기 경계면 참여율 추첨 포함). 장학 유지 판정은 기한을 이번 달로 당길 뿐이라 이번 달 지급에는 영향이 없다.
 */
export function previewCashflow(state: LifeState, data: DataBundle): { stipend: number; family: number; living: number; tuition: number; tuitionRecordId?: string } {
  const phd = state.phd;
  if (!phd) throw new Error('phd state required');
  const ahead = drawParticipation(updateCoursework({
    ...state, month: state.month + 1,
    phd: { ...phd, enrolledMonths: phd.enrolledMonths + (phd.leave.active ? 0 : 1) },
  }));   // 참여율 추첨도 틱 1단계에서 한다(seed 고정이라 미리보기와 같은 값)
  return monthlyCashflow(ahead, data);
}

export function applyCashflow(state: LifeState, data: DataBundle): LifeState {
  const phd = state.phd;
  if (!phd) throw new Error('phd state required');
  const month = state.month;
  const entries: LifeState['ledger'] = [];
  const push = (kind: string, amount: number, recordId?: string) => {
    if (amount !== 0) entries.push(recordId === undefined ? { month, kind, amount } : { month, kind, amount, recordId });
  };

  // 정산 대기 항목(포커스의 work·network-cost, 휴학 중 leave-work 등)
  const pending = state.ledger.filter(e => e.month === month && !SETTLED_KINDS.includes(e.kind)).reduce((a, e) => a + e.amount, 0);

  const { stipend, living, tuition, tuitionRecordId } = monthlyCashflow(state, data);

  push('stipend', stipend);
  push('family', phd.familySupport);
  push('living', -living);
  push('tuition', -tuition, tuitionRecordId);
  let cash = state.money.cash + stipend + phd.familySupport + pending - living - tuition;

  // 이자는 부채에 더한다(§5.4). 한도는 새 대출에만 걸린다.
  const { loanLimit } = state.money;
  let debt = state.money.debt;
  const interest = Math.round(debt * ASSUMED.LOAN_RATE_ANNUAL / ASSUMED.MONTHS_PER_YEAR);
  push('interest', -interest);   // 현금이 아니라 부채에 붙는 항목이다
  debt += interest;

  if (cash < 0) {
    const borrowed = Math.min(-cash, Math.max(0, loanLimit - debt));
    debt += borrowed;
    cash += borrowed;
    push('loan', borrowed);
  }

  // 한도를 다 써도 현금이 음수이면 위기 달이다. 현금은 음수로 남는다(선택권 §5.5: `debt ≥ loanLimit` 이고 `cash < 0` 이 위기 조건이고, §5.4 이자 문장은 한도와 무관하게 부채에 붙는다).
  let { crisisMonths, postCrisisMonths } = phd;
  if (cash < 0) {
    const done = crisisMonths >= ASSUMED.CRISIS_MONTHS && expiryDecidedSince(state, crisisStartMonth(state, crisisMonths + postCrisisMonths));
    if (done) postCrisisMonths += 1; else crisisMonths += 1;
  } else {
    crisisMonths = 0;
    postCrisisMonths = 0;
  }

  return {
    ...state,
    money: { cash, debt, loanLimit, spending: nextSpending(state, stipend + phd.familySupport + Math.max(0, pending)) },
    ledger: [...state.ledger, ...entries],
    phd: { ...phd, crisisMonths, postCrisisMonths },
  };
}

export type CrisisStage = 'none' | 'force-funding-expiry' | 'financial-end';

/**
 * 틱이 applyCashflow 직후에 읽는다(§5.5).
 *  - 위기 3개월째이고 그 위기 안에서 funding-expiry 결정이 아직 없으면 'force-funding-expiry'.
 *  - 결정 뒤 위기가 3개월 더 이어지면 'financial-end'.
 */
export function crisisStage(state: LifeState): CrisisStage {
  const phd = state.phd;
  if (!phd) throw new Error('phd state required');
  if (phd.postCrisisMonths >= ASSUMED.POST_CRISIS_MONTHS) return 'financial-end';
  if (phd.crisisMonths < ASSUMED.CRISIS_MONTHS) return 'none';
  const start = crisisStartMonth(state, phd.crisisMonths + phd.postCrisisMonths) + 1;   // 위기 첫 달(이번 달 포함)
  return expiryDecidedSince(state, start) ? 'none' : 'force-funding-expiry';
}
