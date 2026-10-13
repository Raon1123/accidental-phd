import { describe, it, expect } from 'vitest';
import { ASSUMED } from '../src/assumed';
import { loadData, get } from '../src/data/load';
import { INSTITUTES, industryPay, institutePay, lecturerAnnual, nationalStep0, officerStepFrom, privateFacultyPay, stepPay } from '../src/data/salaries';
import { pensionMonthly, promotion, retireAge, startingPay, yearEnd } from '../src/career/pay';
import { odds } from '../src/odds';
import { draw, drawNormal } from '../src/rng';
import type { CareerState, Choices, LifeState, Route, Stats } from '../src/types';

const data = loadData();
const SEED = 'APHD-AAAAAAAA';

type Overrides = Partial<Omit<LifeState, 'career' | 'choices' | 'stats'>> & { career?: Partial<CareerState>; choices?: Partial<Choices>; stats?: Partial<Stats> };

// 경력 단계 테스트용 손수 만든 상태. 모든 LifeState 필드를 채우고 능력치는 50이다.
function fixtureCareerState(o: Overrides = {}): LifeState {
  const { career, choices, stats, ...rest } = o;
  return {
    version: 1, engineRevision: 'wave4', dataRevision: data.dataRevision, seed: SEED, stage: 'career', month: 100, ageMonths: 35 * 12,
    stats: { health: 50, mind: 50, skill: 50, relation: 50, network: 50, ...stats },
    choices: {
      group: '이공', track: 'computer', subfield: 'D131100', department: 'cs', departmentRecord: 'departments-snu-computer', school: 'snu',
      funding: 'scholarship', advisorPref: 'support', kedi: 'engineering', ksced: 'ict', field: 'cs',
      byLuck: { group: false, track: false, subfield: false, department: false, funding: false, advisorPref: false }, ...choices,
    },
    money: { cash: 0, debt: 0, loanLimit: ASSUMED.LOAN_LIMIT }, ledger: [], news: [], decisions: [], log: [], pending: null, snapshots: [], auto: false, newsSeed: SEED,
    career: { degreeMonth: 40, degree: 'phd', route: 'none', annualPay: 0, yearsInRoute: 0, workYears: 0, academicMonths: 0, paperScore: 0, careerPapers: 0, ...career },
    ...rest,
  };
}


const age35 = { ageMonths: 35 * 12 };

describe('startingPay (선택권 §9.1)', () => {
  it('national professor at 35 starts at step 15 = 59,531,160', () => {
    const s = fixtureCareerState(age35);
    const p = startingPay(s, data, 'professor', { kind: 'university', national: true });
    expect(p).toMatchObject({ annualPay: 59_531_160, step: 15, rank: 'assistant' });
    expect(p.recordIds).toEqual(['salaries-public-univ-faculty-15']);
    expect(p.annualPay).toBe(stepPay(data, 'univ-faculty', nationalStep0(35, 'assistant', data)).value);
  });
  it('private professor = privateFacultyPay assistant', () => {
    const p = startingPay(fixtureCareerState(age35), data, 'professor', { kind: 'university', national: false });
    expect(p.annualPay).toBe(privateFacultyPay(data, 'assistant').value);
    expect(p.step).toBeUndefined();
  });
  it('nontenure, postdoc, lecturer', () => {
    const s = fixtureCareerState(age35);
    expect(startingPay(s, data, 'nontenure', { kind: 'university' }).annualPay).toBe(get(data, ASSUMED.NONTENURE_PAY_RECORD).value);
    expect(startingPay(s, data, 'postdoc', { kind: 'university' }).annualPay).toBe(37_800_000);
    expect(startingPay(s, data, 'postdoc', { kind: 'institute', instituteId: 'kribb' }).annualPay).toBe(get(data, 'salaries-institutes-kribb-postdoc').value);
    expect(startingPay(s, data, 'lecturer', { kind: 'university' }).annualPay).toBe(lecturerAnnual(data, 'snu').value);
    // 학교 레코드가 없는 박사 학교는 중앙값 시급(0014#82)
    const noRec = fixtureCareerState({ ...age35, choices: { school: 'dgist' } });
    expect(startingPay(noRec, data, 'lecturer', { kind: 'university' }).annualPay).toBe(14_316_480);
  });
  it('institute: 이공 reads the institute new-hire record, 인문사회 the non-scitech proxy', () => {
    expect(startingPay(fixtureCareerState(age35), data, 'institute', { kind: 'institute', instituteId: 'kist' }).annualPay).toBe(institutePay(data, 'kist', 'new-hire').value);
    const hs = fixtureCareerState({ ...age35, choices: { group: '인문사회', kedi: 'social', ksced: 'social' } });
    expect(startingPay(hs, data, 'institute', { kind: 'institute' }).annualPay).toBe(get(data, ASSUMED.HUMSOC_INSTITUTE_PAY_RECORD).value);
    for (const i of INSTITUTES) expect(startingPay(fixtureCareerState(age35), data, 'institute', { kind: 'institute', instituteId: i }).annualPay).toBeGreaterThan(40_000_000);
  });
  it('public researcher starts from the researcher step table', () => {
    const p = startingPay(fixtureCareerState(age35), data, 'public', { kind: 'government' });
    expect(p.step).toBe(nationalStep0(35, 'researcher'));
    expect(p.annualPay).toBe(stepPay(data, 'researcher', p.step!).value);
    expect(p.rank).toBe('researcher');
  });
  it('industry by group, bridge, none', () => {
    expect(startingPay(fixtureCareerState(age35), data, 'industry', { kind: 'company' }).annualPay).toBe(industryPay(data, '이공').value);
    const hs = fixtureCareerState({ ...age35, choices: { group: '인문사회' } });
    expect(startingPay(hs, data, 'industry', { kind: 'company' }).annualPay).toBe(industryPay(data, '인문사회').value);
    expect(startingPay(fixtureCareerState(), data, 'bridge', { kind: 'company' }).annualPay).toBe(24_000_000);
    expect(startingPay(fixtureCareerState(), data, 'none', undefined).annualPay).toBe(0);
  });
  it('startup draws lognormal(median 30M, σ 0.8) from slot startup:income (life) at the current month', () => {
    const incomes: number[] = [];
    for (let m = 1; m <= 400; m++) {
      const s = fixtureCareerState({ month: m });
      const p = startingPay(s, data, 'startup', { kind: 'self' }).annualPay;
      expect(p).toBe(Math.round(ASSUMED.STARTUP.incomeMedian * Math.exp(ASSUMED.STARTUP.sigma * drawNormal(SEED, 'life', m, 'startup:income'))));
      incomes.push(p);
    }
    incomes.sort((a, b) => a - b);
    expect(Math.abs(incomes[200]! / ASSUMED.STARTUP.incomeMedian - 1)).toBeLessThan(0.15);
  });
  it('master-exit multiplies pay by 0.85', () => {
    const s = fixtureCareerState({ career: { degree: 'master-exit' } });
    expect(startingPay(s, data, 'industry', { kind: 'company' }).annualPay).toBe(Math.round(industryPay(data, '이공').value * ASSUMED.MASTER_EXIT.payMult));
  });
});

describe('yearEnd (선택권 §9.1·§9.3, 상태 §7.2)', () => {
  const emp = (route: Route, annualPay: number, o: Partial<CareerState> = {}, s: Overrides = {}) =>
    fixtureCareerState({ ...s, career: { route, annualPay, ...o } });

  it('counts years only while employed', () => {
    const a = yearEnd(emp('industry', 60_000_000, { workYears: 2, yearsInRoute: 1 }), data).career!;
    expect([a.workYears, a.yearsInRoute]).toEqual([3, 2]);
    const b = yearEnd(emp('none', 0, { workYears: 2, yearsInRoute: 1 }), data).career!;
    expect([b.workYears, b.yearsInRoute]).toEqual([2, 1]);
  });
  it('national professor and public researcher advance one step; private professor stays flat', () => {
    const nat = yearEnd(emp('professor', 59_531_160, { step: 15, rank: 'assistant', employer: { kind: 'university', national: true } }), data).career!;
    expect(nat.step).toBe(16);
    expect(nat.annualPay).toBe(stepPay(data, 'univ-faculty', 16).value);
    const pub = yearEnd(emp('public', 50_000_000, { step: 15, rank: 'researcher', employer: { kind: 'government' } }), data).career!;
    expect(pub.step).toBe(16); expect(pub.annualPay).toBe(stepPay(data, 'researcher', 16).value);
    const off = yearEnd(emp('public', 50_000_000, { step: 10, rank: 'officer', employer: { kind: 'government' } }), data).career!;
    expect(off.annualPay).toBe(stepPay(data, 'research-officer', 11).value);
    const priv = yearEnd(emp('professor', 51_770_000, { rank: 'assistant', employer: { kind: 'university', national: false } }), data).career!;
    expect(priv.annualPay).toBe(51_770_000);
  });
  it('step is capped at the table maximum', () => {
    const top = yearEnd(emp('professor', 1, { step: 33, rank: 'professor', employer: { kind: 'university', national: true } }), data).career!;
    expect(top.step).toBe(ASSUMED.NATIONAL_STEP.stepMax);
  });
  it('+3% for nontenure, institute, industry; none for postdoc, lecturer, bridge', () => {
    for (const r of ['nontenure', 'institute', 'industry'] as Route[]) expect(yearEnd(emp(r, 40_000_000), data).career!.annualPay).toBe(41_200_000);
    for (const r of ['postdoc', 'lecturer', 'bridge'] as Route[]) expect(yearEnd(emp(r, 40_000_000), data).career!.annualPay).toBe(40_000_000);
  });
  it('contract expiry: renew with p 0.5 (postdoc) via slot renew, otherwise search again', () => {
    let renewed = 0, lost = 0;
    for (let m = 100; m < 700; m++) {
      const s = emp('postdoc', 37_800_000, { contractUntil: 100, employer: { kind: 'university' } }, { month: m });
      const c = yearEnd(s, data).career!;
      if (draw(SEED, 'labor', m, 'renew') < ASSUMED.CONTRACT.postdoc.renewP) {
        renewed++; expect(c.route).toBe('postdoc'); expect(c.contractUntil).toBe(m + 24);
      } else {
        lost++; expect(c).toMatchObject({ route: 'none', annualPay: 0 });
        expect(c.searching).toEqual({ routes: ['postdoc', 'lecturer', 'nontenure', 'professor'], since: m, penalty: 1 });
        expect(c.employer).toBeUndefined(); expect(c.contractUntil).toBeUndefined();
      }
    }
    expect(renewed).toBeGreaterThan(200); expect(lost).toBeGreaterThan(200);
  });
  it('contract that has not expired is untouched; lecturer renews at 0.70', () => {
    const c = yearEnd(emp('postdoc', 37_800_000, { contractUntil: 150 }, { month: 100 }), data).career!;
    expect(c).toMatchObject({ route: 'postdoc', contractUntil: 150 });
    let renewed = 0;
    for (let m = 100; m < 1100; m++) if (yearEnd(emp('lecturer', 14_000_000, { contractUntil: 100 }, { month: m }), data).career!.route === 'lecturer') renewed++;
    expect(Math.abs(renewed / 1000 - ASSUMED.CONTRACT.lecturer.renewP)).toBeLessThan(0.05);
  });
  it('startup closes with p 0.20 via slot startup:close and otherwise redraws its income', () => {
    for (let m = 1; m <= 300; m++) {
      const c = yearEnd(emp('startup', 30_000_000, { employer: { kind: 'self' } }, { month: m }), data).career!;
      if (draw(SEED, 'labor', m, 'startup:close') < ASSUMED.STARTUP.closeP) {
        expect(c).toMatchObject({ route: 'none', annualPay: 0 }); expect(c.searching!.routes).toEqual(['industry']);
      } else {
        expect(c.route).toBe('startup');
        expect(c.annualPay).toBe(Math.round(ASSUMED.STARTUP.incomeMedian * Math.exp(ASSUMED.STARTUP.sigma * drawNormal(SEED, 'life', m, 'startup:income'))));
      }
    }
  });
  it('career paper: academia and institute routes score a T2 paper with p = odds(0.5, z(skill)) via slot career-paper', () => {
    let n = 0;
    for (let m = 1; m <= 600; m++) {
      const c = yearEnd(emp('professor', 50_000_000, { paperScore: 1, employer: { kind: 'university', national: false } }, { month: m }), data).career!;
      const hit = draw(SEED, 'paper', m, 'career-paper') < odds(ASSUMED.CAREER_PAPER.p0, 0);
      expect(c.paperScore).toBe(hit ? 1 + ASSUMED.PAPER_SCORE_WEIGHT.T2 : 1);
      expect(c.careerPapers).toBe(hit ? 1 : 0);
      if (hit) n++;
    }
    expect(Math.abs(n / 600 - 0.5)).toBeLessThan(0.07);
    const strong = fixtureCareerState({ stats: { skill: 100 }, career: { route: 'institute', annualPay: 1 } });
    let k = 0; for (let m = 1; m <= 600; m++) if (yearEnd({ ...strong, month: m }, data).career!.careerPapers > 0) k++;
    expect(k / 600).toBeGreaterThan(0.6);
  });
  it('industry and public routes write no career papers', () => {
    for (let m = 1; m <= 100; m++) {
      expect(yearEnd(emp('industry', 60_000_000, {}, { month: m }), data).career!.careerPapers).toBe(0);
      expect(yearEnd(emp('public', 50_000_000, { step: 5, rank: 'researcher' }, { month: m }), data).career!.careerPapers).toBe(0);
    }
  });
  it('does not mutate its input and ignores a state without a career', () => {
    const s = emp('professor', 50_000_000, { employer: { kind: 'university', national: true }, step: 5, rank: 'assistant' });
    const clone = structuredClone(s);
    yearEnd(s, data); expect(s).toEqual(clone);
    const none = { ...s, career: undefined }; expect(yearEnd(none, data)).toBe(none);
  });
});

describe('promotion (선택권 §9.3)', () => {
  const prof = (rank: string, o: Overrides = {}) => fixtureCareerState({ career: { route: 'professor', rank, annualPay: 51_770_000, employer: { kind: 'university', national: false } }, ...o });

  it('private assistant → associate sets the rank and the associate pay when the draw succeeds, keeps both otherwise', () => {
    let ok = 0, no = 0;
    for (let m = 1; m <= 500; m++) {
      const s = prof('assistant', { month: m });
      const r = promotion(s, data, 'career-5y');
      const hit = draw(SEED, 'labor', m, 'promotion') < odds(ASSUMED.PROMOTION_P0['professor:assistant-to-associate'], 0, ASSUMED.PROMOTION.lo, ASSUMED.PROMOTION.hi);
      expect(r.promoted).toBe(hit);
      if (hit) { ok++; expect(r.state.career).toMatchObject({ rank: 'associate', annualPay: privateFacultyPay(data, 'associate').value }); expect(r.state.log.at(-1)!.tags).toContain('promotion'); }
      else { no++; expect(r.state.career).toEqual(s.career); }
    }
    expect(Math.abs(ok / 500 - 0.75)).toBeLessThan(0.06); expect(no).toBeGreaterThan(80);
  });
  it('probability rises with skill, network, relation and the paper score', () => {
    let low = 0, high = 0;
    for (let m = 1; m <= 800; m++) {
      if (promotion(prof('assistant', { month: m }), data, 'career-5y').promoted) low++;
      const strong = prof('assistant', { month: m, stats: { skill: 100, network: 100, relation: 100 }, career: { route: 'professor', rank: 'assistant', annualPay: 1, paperScore: 20, employer: { kind: 'university', national: false } } });
      if (promotion(strong, data, 'career-5y').promoted) high++;
    }
    expect(high).toBeGreaterThan(low);
    expect(high / 800).toBeLessThanOrEqual(ASSUMED.PROMOTION.hi + 0.04);
  });
  it('no transition → no draw and the same state object', () => {
    const s = prof('assistant');
    const r = promotion(s, data, 'career-10y');
    expect(r.promoted).toBe(false); expect(r.state).toBe(s);
    for (const route of ['postdoc', 'lecturer', 'bridge', 'startup', 'none'] as Route[]) {
      const x = fixtureCareerState({ career: { route, annualPay: 1 } });
      expect(promotion(x, data, 'career-5y').state).toBe(x);
    }
  });
  it('associate → full professor at career-10y', () => {
    for (let m = 1; m <= 200; m++) {
      const r = promotion(prof('associate', { month: m }), data, 'career-10y');
      if (r.promoted) { expect(r.state.career).toMatchObject({ rank: 'professor', annualPay: privateFacultyPay(data, 'professor').value }); return; }
    }
    throw new Error('no promotion in 200 months');
  });
  it('national professor keeps the step on promotion', () => {
    const nat = fixtureCareerState({ career: { route: 'professor', rank: 'assistant', step: 15, annualPay: 59_531_160, employer: { kind: 'university', national: true } } });
    for (let m = 1; m <= 200; m++) {
      const r = promotion({ ...nat, month: m }, data, 'career-5y');
      if (r.promoted) { expect(r.state.career).toMatchObject({ rank: 'associate', step: 15, annualPay: 59_531_160 }); return; }
    }
    throw new Error('no promotion in 200 months');
  });
  it('nontenure → tenure-track assistant professor (p0 0.15)', () => {
    let ok = 0;
    for (let m = 1; m <= 1500; m++) {
      const s = fixtureCareerState({ month: m, career: { route: 'nontenure', rank: 'nontenure', annualPay: 38_710_000, yearsInRoute: 5, retireAge: 99, employer: { kind: 'university', national: false } } });
      const r = promotion(s, data, 'career-5y');
      if (r.promoted) {
        ok++;
        expect(r.state.career).toMatchObject({ route: 'professor', rank: 'assistant', yearsInRoute: 0, annualPay: privateFacultyPay(data, 'assistant').value });
        expect(r.state.career!.retireAge).toBeUndefined();
      }
    }
    expect(Math.abs(ok / 1500 - 0.15)).toBeLessThan(0.04);
  });
  it('institute 이공: junior → senior → principal read the next grade record', () => {
    const j = fixtureCareerState({ career: { route: 'institute', rank: 'junior', annualPay: 1, employer: { kind: 'institute', instituteId: 'kaeri' } } });
    let senior: LifeState | undefined;
    for (let m = 1; m <= 200 && !senior; m++) { const r = promotion({ ...j, month: m }, data, 'career-5y'); if (r.promoted) senior = r.state; }
    expect(senior!.career).toMatchObject({ rank: 'senior', annualPay: institutePay(data, 'kaeri', 'senior-researcher').value });
    for (let m = 1; m <= 200; m++) {
      const r = promotion({ ...senior!, month: m }, data, 'career-10y');
      if (r.promoted) { expect(r.state.career).toMatchObject({ rank: 'principal', annualPay: institutePay(data, 'kaeri', 'principal-researcher').value }); return; }
    }
    throw new Error('no promotion');
  });
  it('public researcher → officer uses officerStepFrom and the officer table', () => {
    const p = fixtureCareerState({ career: { route: 'public', rank: 'researcher', step: 20, annualPay: 1, employer: { kind: 'government' } } });
    for (let m = 1; m <= 300; m++) {
      const r = promotion({ ...p, month: m }, data, 'career-10y');
      if (r.promoted) { expect(r.state.career).toMatchObject({ rank: 'officer', step: officerStepFrom(20), annualPay: stepPay(data, 'research-officer', officerStepFrom(20)).value }); return; }
    }
    throw new Error('no promotion');
  });
  it('industry promotion raises pay by 10% at either decision point', () => {
    const i = fixtureCareerState({ career: { route: 'industry', rank: 'staff', annualPay: 70_000_000 } });
    for (const dp of ['career-5y', 'career-10y'] as const) {
      let got = false;
      for (let m = 1; m <= 100 && !got; m++) { const r = promotion({ ...i, month: m }, data, dp); if (r.promoted) { got = true; expect(r.state.career!.annualPay).toBe(77_000_000); } }
      expect(got).toBe(true);
    }
  });
  it('does not mutate its input', () => {
    const s = prof('assistant'); const clone = structuredClone(s);
    promotion(s, data, 'career-5y'); expect(s).toEqual(clone);
  });
});

describe('retireAge (선택권 §9.4)', () => {
  const r = (route: Route, o: Partial<CareerState> = {}) => fixtureCareerState({ career: { route, annualPay: 1, ...o } });
  it('professor 65, institute 61, public 60', () => {
    expect(retireAge(r('professor'), data)).toBe(65);
    expect(retireAge(r('institute'), data)).toBe(61);
    expect(retireAge(r('public'), data)).toBe(60);
  });
  it('other routes draw U{60..67} once (slot retire, life) and are stable for a given life', () => {
    const seen = new Set<number>();
    for (let k = 0; k < 300; k++) {
      const s = fixtureCareerState({ seed: `APHD-${k}`, career: { route: 'industry', annualPay: 1 } });
      const a = retireAge(s, data);
      expect(a).toBeGreaterThanOrEqual(60); expect(a).toBeLessThanOrEqual(67);
      expect(a).toBe(retireAge({ ...s, month: s.month + 7 }, data));
      expect(a).toBe(retireAge({ ...s, career: { ...s.career!, route: 'startup' } }, data));
      seen.add(a);
    }
    expect([...seen].sort()).toEqual([60, 61, 62, 63, 64, 65, 66, 67]);
  });
  it('a cached career.retireAge wins', () => { expect(retireAge(r('professor', { retireAge: 58 }), data)).toBe(58); });
});

describe('pensionMonthly (0014#101)', () => {
  it('55만 + min(0.6·W_last, a·근속·W_avg) with a = 0.019 for professors and 0.010 otherwise', () => {
    const prof = fixtureCareerState({ career: { route: 'professor', annualPay: 60_000_000, workYears: 30 } });
    expect(pensionMonthly(prof)).toBe(550_000 + Math.round(0.019 * 30 * 5_000_000));   // 0.57 < 0.6
    const ind = fixtureCareerState({ career: { route: 'industry', annualPay: 60_000_000, workYears: 30 } });
    expect(pensionMonthly(ind)).toBe(550_000 + Math.round(0.010 * 30 * 5_000_000));
  });
  it('the 0.6·W_last cap binds for long public careers', () => {
    const pub = fixtureCareerState({ career: { route: 'public', annualPay: 60_000_000, workYears: 40 } });
    expect(pensionMonthly(pub)).toBe(550_000 + 0.6 * 5_000_000);
  });
  it('no career throws', () => { expect(() => pensionMonthly({ ...fixtureCareerState(), career: undefined })).toThrow(); });
});
