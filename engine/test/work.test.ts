// 과제 참여율과 박사과정 중 근로(#79, 선택권 §4.7): 참여율 학기 조정, 근로 상한, 성장 배수(합산), 시급·강의료, 자동 정책.
import { describe, expect, it } from 'vitest';
import { ASSUMED } from '../src/assumed';
import { get } from '../src/data/bundle';
import { loadData } from '../src/data/load';
import { lecturerHourly } from '../src/data/salaries';
import { advanceMonth } from '../src/phd/tick';
import { applyProgress } from '../src/phd/progress';
import {
  applyPartTimePay, applyWorkInput, autoPartTime, calendarYear, growthMultiplier, hourlyWage, lectureEligible,
  participationOf, partTimeCap, partTimePay, stipendScale,
} from '../src/phd/work';
import { createLife } from '../src/pre/createLife';
import type { FundingState, LifeState, Paper } from '../src/types';

const data = loadData();
const SEED = 'APHD-WORK0079';
const PROJECT: FundingState = { route: 'project', monthly: 1_100_000, tuitionWaiver: 0, until: -1, dutyHours: 0, recordIds: [] };
const SELF: FundingState = { route: 'self', monthly: 0, tuitionWaiver: 0, until: -1, dutyHours: 0, recordIds: [] };
const ACCEPTED: Paper = { id: 'p1', status: 'accepted', writing: 100, quality: 60, attempts: 1, logitBonus: 0, tier: 'T3' };

function base(over: { month?: number; funding?: FundingState; group?: '인문사회' | '이공'; qualified?: boolean; papers?: Paper[]; cash?: number; auto?: boolean } = {}): LifeState {
  const s = over.group === '이공'
    ? createLife({ funding: 'self', school: 'snu', track: 'computer', group: '이공', auto: over.auto ?? false }, SEED, data)
    : createLife({ funding: 'self', school: 'snu', track: 'philosophy', group: '인문사회', auto: over.auto ?? false }, SEED, data);
  return {
    ...s, month: over.month ?? 1, ledger: [], money: { ...s.money, cash: over.cash ?? 10_000_000, debt: 0 },
    phd: { ...s.phd!, fundingState: over.funding ?? SELF, qualified: over.qualified ?? false, papers: over.papers ?? [], focus: 'research' },
  };
}

describe('participation (#79)', () => {
  it('only the project route has a participation; default 0.5 keeps the recorded stipend', () => {
    expect(participationOf(base())).toBe(0);
    expect(participationOf(base({ funding: PROJECT }))).toBe(ASSUMED.PARTICIPATION.projectDefault);
    expect(stipendScale(base({ funding: PROJECT }))).toBe(1);
    expect(stipendScale(base())).toBe(1);
  });

  it('changes only at a semester boundary, only on the project route, in steps of 0.25', () => {
    const p = base({ funding: PROJECT, month: 6 });
    const r = applyWorkInput(p, { participation: 1 });
    expect(participationOf(r)).toBe(1);
    expect(stipendScale(r)).toBe(2);
    expect(() => applyWorkInput(base({ funding: PROJECT, month: 7 }), { participation: 1 })).toThrow(/semester boundary/);
    expect(() => applyWorkInput(base({ month: 6 }), { participation: 0.5 })).toThrow(/project/);
    expect(() => applyWorkInput(p, { participation: 0.3 })).toThrow(/steps/);
  });

  it('the stipend in the ledger follows the participation', () => {
    const p = { ...base({ funding: PROJECT, month: 5 }), money: { cash: 50_000_000, debt: 0, loanLimit: 42_000_000 } };
    const stipend = (s: LifeState) => s.ledger.filter(e => e.kind === 'stipend' && e.month === s.month).reduce((a, e) => a + e.amount, 0);
    const half = advanceMonth(p, data);
    const full = advanceMonth(p, data, { participation: 1 });
    expect(stipend(full)).toBe(2 * stipend(half));
  });
});

describe('part-time work and its cap (#79)', () => {
  it('cap = 40 − duty hours − 40·participation', () => {
    expect(partTimeCap(base())).toBe(40);
    expect(partTimeCap(base({ funding: PROJECT }))).toBe(20);
    expect(partTimeCap(base({ funding: { ...PROJECT, dutyHours: 10 } }))).toBe(10);
  });

  it('hours above the cap throw; zero hours stop the work', () => {
    expect(() => applyWorkInput(base({ funding: PROJECT }), { partTime: { kind: 'job', hours: 21 } })).toThrow(/cap/);
    const on = applyWorkInput(base(), { partTime: { kind: 'job', hours: 10 } });
    expect(on.phd!.partTime).toEqual({ kind: 'job', hours: 10 });
    expect(applyWorkInput(on, { partTime: { kind: 'job', hours: 0 } }).phd!.partTime).toBeUndefined();
    expect(applyWorkInput(on, {}).phd!.partTime).toEqual({ kind: 'job', hours: 10 });   // 입력이 없으면 유지
  });

  it('the hourly wage is the 2027 minimum-wage record grown by the inflation-target record', () => {
    const w2027 = get(data, 'salaries-minwage-hourly-2027').value;
    const infl = get(data, 'statistics-bok-inflation-target').value / 100;
    expect(calendarYear(0)).toBe(2027);
    expect(calendarYear(10)).toBe(2028);   // 0개월째 = 2027년 3월
    expect(hourlyWage(0, data)).toBe(w2027);
    expect(hourlyWage(10, data)).toBe(Math.round(w2027 * (1 + infl)));
    expect(partTimePay({ kind: 'job', hours: 10 }, 0, data, 'snu')).toBe(Math.round(10 * ASSUMED.WEEKS_PER_MONTH * w2027));
  });

  it('pay goes to the ledger as a pending item and applyCashflow adds it to cash', () => {
    const s = applyWorkInput(base(), { partTime: { kind: 'job', hours: 10 } });
    const paid = applyPartTimePay(s, data);
    expect(paid.ledger.at(-1)).toMatchObject({ kind: 'part-time', amount: partTimePay({ kind: 'job', hours: 10 }, s.month, data, 'snu') });
    const t = advanceMonth(base(), data, { partTime: { kind: 'job', hours: 10 } });
    expect(t.ledger.filter(e => e.kind === 'part-time').length).toBe(1);
  });
});

describe('growth multiplier (#79, user rule: the two deductions add up)', () => {
  it('= max(0, 1 − work hours/40 − participation/2)', () => {
    expect(growthMultiplier(base())).toBe(1);
    expect(growthMultiplier(base({ funding: PROJECT }))).toBe(0.75);
    const job = applyWorkInput(base({ funding: PROJECT }), { partTime: { kind: 'job', hours: 10 } });
    expect(growthMultiplier(job)).toBe(0.5);
    const workFocus = { ...base(), phd: { ...base().phd!, focus: 'work' as const } };
    expect(growthMultiplier(workFocus)).toBe(1 - ASSUMED.JOB_HOURS / 40);
    const heavy = applyWorkInput(base({ funding: { ...PROJECT, dutyHours: 0 } }), { participation: undefined, partTime: { kind: 'job', hours: 20 } });
    expect(growthMultiplier({ ...heavy, phd: { ...heavy.phd!, participation: 1 } })).toBe(0);   // 바닥 0
  });

  it('project progress scales with the multiplier', () => {
    const plain = applyProgress(base(), data);
    const s = applyWorkInput(base(), { partTime: { kind: 'job', hours: 20 } });
    const working = applyProgress(s, data);
    const gain = (x: LifeState) => x.phd!.project - base().phd!.project;
    expect(gain(working)).toBeCloseTo(gain(plain) * 0.5, 9);
  });
});

describe('lecturing (#79, 인문사회 after a paper)', () => {
  it('needs 인문사회, a passed qualifying exam and an accepted paper', () => {
    expect(lectureEligible(base())).toBe(false);
    expect(lectureEligible(base({ qualified: true }))).toBe(false);
    expect(lectureEligible(base({ qualified: true, papers: [ACCEPTED] }))).toBe(true);
    expect(lectureEligible(base({ group: '이공', qualified: true, papers: [ACCEPTED] }))).toBe(false);
    expect(() => applyWorkInput(base(), { partTime: { kind: 'lecture', hours: 3 } })).toThrow(/lecture/);
  });

  it('a class hour costs three hours a week and pays the school lecturer hourly rate over 32 weeks a year', () => {
    const s = applyWorkInput(base({ qualified: true, papers: [ACCEPTED] }), { partTime: { kind: 'lecture', hours: 6 } });
    expect(growthMultiplier(s)).toBe(1 - 18 / 40);
    const hourly = lecturerHourly(data, 'snu').value;
    expect(partTimePay(s.phd!.partTime, s.month, data, 'snu')).toBe(Math.round(6 * hourly * ASSUMED.LECTURE.weeks / 12));
    expect(() => applyWorkInput(base({ qualified: true, papers: [ACCEPTED] }), { partTime: { kind: 'lecture', hours: 4 } })).toThrow(/one of/);
    expect(() => applyWorkInput(base({ qualified: true, papers: [ACCEPTED], funding: PROJECT }), { partTime: { kind: 'lecture', hours: 9 } })).toThrow(/cap/);
  });
});

describe('auto policy (#79)', () => {
  it('starts work when cash is negative, lectures when eligible, and stops when cash covers three months of living', () => {
    expect(autoPartTime(base({ cash: -1 }))).toEqual({ kind: 'job', hours: ASSUMED.AUTO_PART_TIME.jobHours });
    expect(autoPartTime(base({ cash: -1, qualified: true, papers: [ACCEPTED] }))).toEqual({ kind: 'lecture', hours: ASSUMED.AUTO_PART_TIME.lectureHours });
    expect(autoPartTime(base({ cash: 1 }))).toBeUndefined();
    const working = applyWorkInput(base(), { partTime: { kind: 'job', hours: 10 } });
    expect(autoPartTime({ ...working, money: { ...working.money, cash: 1 } })).toEqual({ kind: 'job', hours: 10 });
    expect(autoPartTime({ ...working, money: { ...working.money, cash: 100_000_000 } })).toBeUndefined();
  });

  it('an auto life with a cash shortfall picks up part-time work', () => {
    let s = { ...base({ auto: true, cash: -1 }) };
    s = advanceMonth(s, data);
    expect(s.phd!.partTime).toBeDefined();
    expect(s.ledger.some(e => e.kind === 'part-time' || e.kind === 'lecture')).toBe(true);
  });
});
