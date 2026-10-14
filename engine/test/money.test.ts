import { describe, it, expect } from 'vitest';
import { ASSUMED } from '../src/assumed';
import { loadData } from '../src/data/load';
import { tuitionPerSemester } from '../src/data/tuition';
import { createLife } from '../src/pre/createLife';
import { applyCashflow, crisisStage, isSemesterBoundary, livingCost, tuitionCharge, updateCoursework } from '../src/phd/money';
import { spendingOf } from '../src/spending';
import type { FundingState, LifeState } from '../src/types';

const data = loadData();
const SEED = 'APHD-AAAAAAAA';
const SELF: FundingState = { route: 'self', monthly: 0, tuitionWaiver: 0, until: -1, dutyHours: 0, recordIds: [] };

/** 철학·서울대·자비. 가족 지원 0, 현금은 충분히 둔다(대출이 끼지 않게). */
function base(over: { month?: number; cash?: number; debt?: number; coursework?: boolean; funding?: FundingState; family?: number; leave?: boolean; enrolled?: number; studentLoanFull?: boolean } = {}): LifeState {
  const s = createLife({ funding: 'self', school: 'snu', track: 'philosophy', group: '인문사회' }, SEED, data);
  return {
    ...s, month: over.month ?? 1, ledger: [],
    money: { ...s.money, cash: over.cash ?? 100_000_000, debt: over.debt ?? 0, spending: livingCost(s.choices.school), ...(over.studentLoanFull ? { studentLoan: { tuition: 90_000_000, living: 44_000_000, livingSemester: 2_000_000, rate: 0.017 } } : {}) },   // 지역 기본값으로 고정(씀씀이 모형은 spending.test)
    phd: {
      ...s.phd!, coursework: over.coursework ?? true, familySupport: over.family ?? 0, fundingState: over.funding ?? SELF,
      leave: { active: over.leave ?? false, until: over.leave ? 99 : -1, totalMonths: 0 }, enrolledMonths: over.enrolled ?? 1,
    },
  };
}
const tuitionOf = (s: LifeState) => tuitionPerSemester(data, s.choices.school, s.choices.field, s.choices.departmentRecord);
const kind = (s: LifeState, k: string) => s.ledger.filter(e => e.kind === k);

describe('helpers', () => {
  it('isSemesterBoundary is month mod 6 === 0', () => {
    expect([0, 1, 5, 6, 7, 12, 30].map(isSemesterBoundary)).toEqual([true, false, false, true, false, true, true]);
  });
  it('living cost: capital schools 1.6M, regional 1.3M', () => {
    expect(livingCost('snu')).toBe(1_600_000);
    expect(livingCost('ewha')).toBe(1_600_000);
    expect(livingCost('kaist')).toBe(1_300_000);
    expect(livingCost('pusan')).toBe(1_300_000);
  });
  it('updateCoursework: true for the first 24 enrolled months only', () => {
    const at = (n: number) => updateCoursework({ ...base(), phd: { ...base().phd!, enrolledMonths: n, coursework: true } }).phd!.coursework;
    expect([0, 23, 24, 25].map(at)).toEqual([true, true, false, false]);
    const s = base({ enrolled: 30, coursework: true });
    expect(updateCoursework(s).phd!.coursework).toBe(false);
    expect(s.phd!.coursework).toBe(true);   // 입력은 그대로
  });
});

describe('applyCashflow: income and living cost (선택권 §5.2, §5.3)', () => {
  it('cash += stipend + family − living on a non-boundary month', () => {
    const f: FundingState = { ...SELF, route: 'project', monthly: 1_100_000, until: 24 };
    const s = applyCashflow(base({ month: 1, funding: f, family: 300_000 }), data);
    expect(s.money.cash).toBe(100_000_000 + 1_100_000 + 300_000 - 1_600_000);
    expect(s.money.debt).toBe(0);
    expect(kind(s, 'stipend')).toEqual([{ month: 1, kind: 'stipend', amount: 1_100_000 }]);
    expect(kind(s, 'living')).toEqual([{ month: 1, kind: 'living', amount: -1_600_000 }]);
    expect(kind(s, 'tuition')).toEqual([]);
  });

  it('stipend stops after fundingState.until (until ≥ 0) but not for until = −1', () => {
    const f: FundingState = { ...SELF, route: 'project', monthly: 1_000_000, until: 24 };
    expect(applyCashflow(base({ month: 24, funding: f }), data).money.cash).toBe(100_000_000 + 1_000_000 - 1_600_000 - expectedCharge(24, f));
    expect(kind(applyCashflow(base({ month: 25, funding: f }), data), 'stipend')).toEqual([]);
    const forever: FundingState = { ...f, until: -1 };
    expect(kind(applyCashflow(base({ month: 99, funding: forever }), data), 'stipend')).toHaveLength(1);
  });

  it('on leave: no stipend, no tuition, living cost and family support continue', () => {
    const f: FundingState = { ...SELF, route: 'scholarship', monthly: 1_000_000, until: 48, tuitionWaiver: 0.5 };
    const s = applyCashflow(base({ month: 6, funding: f, family: 600_000, leave: true }), data);
    expect(s.money.cash).toBe(100_000_000 + 600_000 - 1_600_000);
    expect(kind(s, 'tuition')).toEqual([]);
    expect(kind(s, 'stipend')).toEqual([]);
  });

  it('sums this month\'s pending ledger entries (work, network-cost, leave-work) and ignores other months and settled kinds', () => {
    const s0 = base({ month: 3 });
    const ledger = [
      { month: 3, kind: 'work', amount: 1_000_000 }, { month: 3, kind: 'network-cost', amount: -100_000 },
      { month: 3, kind: 'leave-work', amount: 2_000_000 },
      { month: 2, kind: 'work', amount: 1_000_000 },            // 지난 달: 이미 정산
      { month: 3, kind: 'entrance-fee', amount: -999 },         // createLife 가 이미 현금에서 뺐다
    ];
    const s = applyCashflow({ ...s0, ledger }, data);
    expect(s.money.cash).toBe(100_000_000 + 1_000_000 - 100_000 + 2_000_000 - 1_600_000);
  });

  it('does not double-count the entrance fee at month 0 (createLife already paid it)', () => {
    const s0 = createLife({ funding: 'self', school: 'snu', track: 'philosophy', group: '인문사회' }, SEED, data);
    expect(s0.ledger.some(e => e.kind === 'entrance-fee')).toBe(true);
    const s = applyCashflow({ ...s0, month: 1, money: { ...s0.money, cash: 50_000_000 } }, data);
    expect(s.money.cash).toBe(50_000_000 - spendingOf(s0) + s0.phd!.familySupport);   // 생활비는 사람별 씀씀이(0014#131)
  });
});

function expectedCharge(month: number, f: FundingState): number {
  const s = base({ month, funding: f });
  if (!isSemesterBoundary(month)) return 0;
  const active = f.until < 0 || month <= f.until;
  return Math.round(tuitionOf(s).value * (1 - (active ? f.tuitionWaiver : 0)));
}

describe('applyCashflow: tuition (선택권 §5.1)', () => {
  it('semester boundary charges tuition × (1 − waiver); month 7 charges nothing', () => {
    const f: FundingState = { ...SELF, route: 'scholarship', monthly: 0, tuitionWaiver: 0.5, until: 48 };
    const s0 = base({ month: 6, funding: f });
    const full = tuitionOf(s0).value;
    const s = applyCashflow(s0, data);
    const expected = Math.round(full * 0.5);
    expect(kind(s, 'tuition')).toEqual([{ month: 6, kind: 'tuition', amount: -expected, recordId: tuitionOf(s0).id }]);
    expect(s.money.cash).toBe(100_000_000 - 1_600_000 - expected);
    expect(kind(applyCashflow(base({ month: 7, funding: f }), data), 'tuition')).toEqual([]);
  });

  it('after coursework the registration fee is 0.1 of the (waived) tuition: month 6 vs month 30', () => {
    const f: FundingState = { ...SELF, route: 'scholarship', tuitionWaiver: 0.25, until: 48 };
    const early = applyCashflow(base({ month: 6, funding: f, coursework: true }), data);
    const late = applyCashflow(base({ month: 30, funding: f, coursework: false }), data);
    const a = -kind(early, 'tuition')[0]!.amount, b = -kind(late, 'tuition')[0]!.amount;
    expect(b).toBe(Math.round(tuitionOf(base()).value * 0.75 * ASSUMED.POST_COURSEWORK_TUITION_RATIO));
    expect(b / a).toBeCloseTo(0.1, 5);
  });

  it('self-funded pays the full amount; waiver ends together with the funding', () => {
    const full = tuitionOf(base()).value;
    expect(-kind(applyCashflow(base({ month: 12, funding: SELF }), data), 'tuition')[0]!.amount).toBe(full);
    const expired: FundingState = { ...SELF, route: 'project', monthly: 1_000_000, tuitionWaiver: 1, until: 24 };
    const s = applyCashflow(base({ month: 30, coursework: true, funding: expired }), data);
    expect(-kind(s, 'tuition')[0]!.amount).toBe(full);
  });
});

describe('tuitionCharge', () => {
  it('returns the semester charge on a boundary month and null otherwise or on leave', () => {
    const f: FundingState = { ...SELF, route: 'scholarship', tuitionWaiver: 0.5, until: 48 };
    const t = tuitionOf(base());
    expect(tuitionCharge(base({ month: 6, funding: f }), data)).toEqual({ amount: Math.round(t.value * 0.5), recordId: t.id });
    expect(tuitionCharge(base({ month: 0, funding: SELF }), data)).toEqual({ amount: t.value, recordId: t.id });
    expect(tuitionCharge(base({ month: 30, coursework: false, funding: SELF }), data)!.amount).toBe(Math.round(t.value * 0.1));
    expect(tuitionCharge(base({ month: 7 }), data)).toBeNull();
    expect(tuitionCharge(base({ month: 6, leave: true }), data)).toBeNull();
  });
});

describe('applyCashflow: interest (선택권 §5.4)', () => {
  it('interest = debt × 0.03 / 12 rounded to integer won: 12,000,000 → 30,000', () => {
    const s = applyCashflow(base({ debt: 12_000_000 }), data);
    expect(s.money.debt).toBe(12_030_000);
    expect(kind(s, 'interest')).toEqual([{ month: 1, kind: 'interest', amount: -30_000 }]);
    expect(s.money.cash).toBe(100_000_000 - 1_600_000);      // 이자는 부채에 붙고 현금은 그대로
  });
  it('rounds to the nearest won', () => {
    expect(applyCashflow(base({ debt: 1_000 }), data).money.debt).toBe(1_003);       // 2.5 → 3
    expect(applyCashflow(base({ debt: 12_000_001 }), data).money.debt).toBe(12_030_001);
    expect(applyCashflow(base({ debt: 0 }), data).money.debt).toBe(0);
  });
  it('interest is not capped by the loan limit (the cap applies to new borrowing only)', () => {
    const s = applyCashflow(base({ debt: ASSUMED.LOAN_LIMIT }), data);
    const interest = Math.round(ASSUMED.LOAN_LIMIT * ASSUMED.LOAN_RATE_ANNUAL / 12);   // 4,200만 → 105,000
    expect(s.money.debt).toBe(ASSUMED.LOAN_LIMIT + interest);
    expect(kind(s, 'interest')).toEqual([{ month: 1, kind: 'interest', amount: -interest }]);
  });
});

describe('applyCashflow: loans and the financial crisis (Review Focus 3)', () => {
  it('negative cash is borrowed into debt; cash returns to 0', () => {
    const s = applyCashflow(base({ studentLoanFull: true, cash: 0 }), data);
    expect(s.money.cash).toBe(0);
    expect(s.money.debt).toBe(1_600_000);
    expect(kind(s, 'loan')).toEqual([{ month: 1, kind: 'loan', amount: 1_600_000 }]);
    expect(s.phd!.crisisMonths).toBe(0);
  });

  it('borrows only up to the limit; cash stays negative and the month counts as a crisis month', () => {
    const s0 = base({ studentLoanFull: true, cash: 0, debt: ASSUMED.LOAN_LIMIT - 1_000_000 });
    const s = applyCashflow(s0, data);
    // 이자: (한도 − 100만) × 0.03 / 12 → 부채에 더해지고, 남은 한도만큼만 빌린다 (한도 4,200만이면 이자 102,500, 대출 가능 897,500)
    const interest = Math.round((ASSUMED.LOAN_LIMIT - 1_000_000) * ASSUMED.LOAN_RATE_ANNUAL / 12);
    const room = 1_000_000 - interest;
    expect(s.money.debt).toBe(ASSUMED.LOAN_LIMIT);
    expect(kind(s, 'loan')).toEqual([{ month: 1, kind: 'loan', amount: room }]);
    expect(s.money.cash).toBe(-1_600_000 + room);
    expect(s.phd!.crisisMonths).toBe(1);
    expect(s.ledger.some(e => e.kind === 'unpaid')).toBe(false);
  });

  it('negative cash borrows up to limit, then crisis after 3 months (no new borrowing, cash stays negative)', () => {
    let s = createLife({ funding: 'self', school: 'snu', track: 'philosophy', group: '인문사회' }, SEED, data);
    s = { ...s, money: { ...s.money, cash: 0, debt: s.money.loanLimit, studentLoan: { tuition: 90_000_000, living: 44_000_000, livingSemester: 2_000_000, rate: 0.017 } } };   // 학자금대출(#80)도 한도까지
    for (let i = 0; i < 3; i++) s = applyCashflow(s, data);
    expect(s.phd!.crisisMonths).toBe(3);
    expect(kind(s, 'loan')).toEqual([]);                       // 한도가 찼으니 새로 빌리지 못한다
    expect(s.money.cash).toBeLessThan(0);
    expect(s.money.debt).toBeGreaterThanOrEqual(s.money.loanLimit);   // 이자만 붙는다
    let d = s.money.loanLimit;
    for (let i = 0; i < 3; i++) d += Math.round(d * ASSUMED.LOAN_RATE_ANNUAL / 12);
    expect(s.money.debt).toBe(d);
  });

  it('a month with enough cash resets both counters', () => {
    const s0 = base({ studentLoanFull: true, cash: 10_000_000 });
    const hurt = { ...s0, phd: { ...s0.phd!, crisisMonths: 2, postCrisisMonths: 1 } };
    const s = applyCashflow(hurt, data);
    expect(s.phd!.crisisMonths).toBe(0);
    expect(s.phd!.postCrisisMonths).toBe(0);
  });

  it('after the funding-expiry decision is recorded, further crisis months count as postCrisisMonths', () => {
    let s = base({ studentLoanFull: true, month: 1, cash: 0, debt: ASSUMED.LOAN_LIMIT });
    const stages: string[] = [];
    for (let m = 1; m <= 3; m++) { s = applyCashflow({ ...s, month: m }, data); stages.push(crisisStage(s)); }
    expect(stages).toEqual(['none', 'none', 'force-funding-expiry']);
    expect([s.phd!.crisisMonths, s.phd!.postCrisisMonths]).toEqual([3, 0]);
    // 틱이 결정 지점을 띄우고 플레이어가 고른 뒤
    s = { ...s, decisions: [{ dp: 'funding-expiry', month: 3, option: 'leave', byPolicy: false }] };
    expect(crisisStage(s)).toBe('none');
    for (let m = 4; m <= 6; m++) {
      s = applyCashflow({ ...s, month: m }, data);
      expect(s.phd!.crisisMonths).toBe(3);
      expect(s.phd!.postCrisisMonths).toBe(m - 3);
      expect(crisisStage(s)).toBe(m === 6 ? 'financial-end' : 'none');
    }
    expect(s.money.debt).toBeGreaterThanOrEqual(s.money.loanLimit);
    expect(s.money.cash).toBeLessThan(0);
  });

  it('a funding-expiry decision from before the crisis does not count', () => {
    let s = base({ studentLoanFull: true, month: 1, cash: 0, debt: ASSUMED.LOAN_LIMIT });
    s = { ...s, decisions: [{ dp: 'funding-expiry', month: 0, option: 'extend', byPolicy: false }] };
    for (let m = 1; m <= 3; m++) s = applyCashflow({ ...s, month: m }, data);
    expect(crisisStage(s)).toBe('force-funding-expiry');
    s = applyCashflow({ ...s, month: 4 }, data);
    expect([s.phd!.crisisMonths, s.phd!.postCrisisMonths]).toEqual([4, 0]);
  });

  it('crisisStage is none while fewer than 3 crisis months', () => {
    const s = base();
    expect(crisisStage(s)).toBe('none');
    expect(crisisStage({ ...s, phd: { ...s.phd!, crisisMonths: 2 } })).toBe('none');
    expect(crisisStage({ ...s, phd: { ...s.phd!, crisisMonths: 3 } })).toBe('force-funding-expiry');
  });

  it('debt is never negative and the input is not mutated', () => {
    const s0 = base({ studentLoanFull: true, cash: 0 });
    const snap = JSON.stringify(s0);
    const s = applyCashflow(s0, data);
    expect(JSON.stringify(s0)).toBe(snap);
    expect(s.money.debt).toBeGreaterThanOrEqual(0);
    expect(applyCashflow(s0, data)).toEqual(s);
  });

  it('requires phd state', () => {
    const { phd: _p, ...rest } = base();
    expect(() => applyCashflow(rest as LifeState, data)).toThrow();
  });
});
