// 학자금대출(#80): 등록금대출·생활비대출을 일반 대출과 따로 두고, 잔액·이자·상환을 따로 기록한다. 조건은 레코드에서 온다.
import { describe, expect, it } from 'vitest';
import { ASSUMED } from '../src/assumed';
import { loadData } from '../src/data/load';
import { studentLoanTerms } from '../src/data/loans';
import { careerFlow } from '../src/career/tick';
import { applyCashflow } from '../src/phd/money';
import { createLife } from '../src/pre/createLife';
import { advanceYear } from '../src/career/tick';
import type { LifeState } from '../src/types';

const data = loadData();
const T = studentLoanTerms(data);
const SEED = 'APHD-LOAN0080';
const SELF = { route: 'self' as const, monthly: 0, tuitionWaiver: 0, until: -1, dutyHours: 0, recordIds: [] };
const phdLife = (month: number, cash: number, over: Partial<LifeState['money']> = {}): LifeState => {
  const s = createLife({ funding: 'self', school: 'snu', track: 'philosophy', group: '인문사회' }, SEED, data);
  return { ...s, month, ledger: [], money: { ...s.money, cash, debt: 0, spending: 1_600_000, ...over }, phd: { ...s.phd!, familySupport: 0, fundingState: SELF } };
};
const kind = (s: LifeState, k: string) => s.ledger.filter(e => e.kind === k).reduce((a, e) => a + e.amount, 0);

describe('student loan terms (#80)', () => {
  it('come from the official records', () => {
    expect(T).toEqual({ rate: 0.017, tuitionLimit: 90_000_000, livingLimit: 44_000_000, livingPerSemester: 2_000_000 });
  });
});

describe('student loans in the PhD cash flow (#80, 0014#132)', () => {
  it('a semester month: the tuition loan covers the tuition, the living loan the shortfall within 2,000,000 a semester, before the general loan', () => {
    const s = applyCashflow(phdLife(6, 0), data);
    const tuition = -kind(s, 'tuition');
    expect(tuition).toBeGreaterThan(0);
    expect(kind(s, 'tuition-loan')).toBe(tuition);
    expect(kind(s, 'living-loan')).toBe(1_600_000);   // 생활비 160만은 학기 한도 200만 안이다: 부족분만 빌린다
    expect(kind(s, 'loan')).toBe(0);
    expect(s.money.studentLoan).toMatchObject({ tuition, living: 1_600_000, livingSemester: 1_600_000 });
    expect(s.money.cash).toBe(0);
    expect(s.money.debt).toBe(0);
  });

  it('the semester living limit runs out, then the general loan takes the rest; it resets at the next semester', () => {
    let s = phdLife(7, 0);
    for (let m = 7; m <= 11; m++) s = applyCashflow({ ...s, month: m }, data);
    expect(s.money.studentLoan!.livingSemester).toBe(T.livingPerSemester);
    expect(s.money.studentLoan!.living).toBeGreaterThanOrEqual(T.livingPerSemester);   // 이자가 붙는다
    expect(s.money.debt).toBeGreaterThan(0);                                      // 학기 한도를 넘은 생활비는 일반 대출
    s = applyCashflow({ ...s, month: 12 }, data);
    expect(s.money.studentLoan!.livingSemester).toBeGreaterThan(0);
    expect(s.money.studentLoan!.livingSemester).toBeLessThanOrEqual(T.livingPerSemester);
  });

  it('interest accrues on each balance at the record rate, separately from the general loan', () => {
    const s = applyCashflow(phdLife(7, 10_000_000, { studentLoan: { tuition: 12_000_000, living: 6_000_000, livingSemester: 0, rate: T.rate } }), data);
    expect(-kind(s, 'tuition-loan-interest')).toBe(Math.round(12_000_000 * T.rate / 12));
    expect(-kind(s, 'living-loan-interest')).toBe(Math.round(6_000_000 * T.rate / 12));
    expect(kind(s, 'interest')).toBe(0);
  });

  it('no student loan during leave', () => {
    const s0 = phdLife(7, 0);
    const s = applyCashflow({ ...s0, phd: { ...s0.phd!, leave: { active: true, until: 12, totalMonths: 1 } } }, data);
    expect(kind(s, 'living-loan')).toBe(0);
    expect(kind(s, 'loan')).toBeGreaterThan(0);
  });
});

describe('student loan repayment after the PhD (#80, 0014#132)', () => {
  const careerLife = (debt: number, tuition: number, living: number): LifeState => {
    const s = phdLife(100, 0);
    return {
      ...s, stage: 'career', money: { cash: 0, debt, loanLimit: ASSUMED.LOAN_LIMIT, spending: 1_600_000, studentLoan: { tuition, living, livingSemester: 0, rate: T.rate } },
      career: { degreeMonth: 90, degree: 'phd', route: 'industry', employer: { kind: 'company' }, annualPay: 60_000_000, yearsInRoute: 0, workYears: 0, academicMonths: 0, paperScore: 0, careerPapers: 0 },
    };
  };

  it('the repayment budget pays the general loan first, then the tuition loan, then the living loan', () => {
    const f = careerFlow(careerLife(100_000, 10_000_000, 10_000_000));
    const budget = Math.round(5_000_000 * ASSUMED.CAREER_REPAY_SHARE);
    expect(f.repay).toBe(100_000 + f.interest);
    expect(f.tuitionLoanRepay).toBe(Math.min(budget - f.repay, 10_000_000 + f.tuitionLoanInterest));
    expect(f.livingLoanRepay).toBe(Math.max(0, budget - f.repay - f.tuitionLoanRepay));
    const g = careerFlow(careerLife(0, 0, 10_000_000));
    expect(g.livingLoanRepay).toBe(budget);
  });

  it('a career year writes separate repayment rows and lowers each balance', () => {
    const s = careerLife(0, 10_000_000, 10_000_000);
    const r = advanceYear(s, data);
    expect(r.ledger.filter(e => e.kind === 'tuition-loan-repay').length).toBeGreaterThan(0);
    expect(r.money.studentLoan!.tuition).toBeLessThan(10_000_000);
    expect(r.ledger.filter(e => e.kind === 'living-loan-repay').length).toBeGreaterThan(0);   // 등록금대출을 다 갚은 뒤 생활비대출
    expect(r.money.studentLoan!.living).toBeLessThanOrEqual(10_000_000 + 12 * Math.round(10_000_000 * T.rate / 12));
  });
});
