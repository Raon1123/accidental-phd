import { describe, it, expect } from 'vitest';
import { ASSUMED } from '../src/assumed';
import { loadData } from '../src/data/load';
import { pensionMonthly } from '../src/career/pay';
import { advanceYear } from '../src/career/tick';
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


const FOUR_STATS_HIGH = { skill: 90, network: 90, relation: 90 };

// 결정 지점을 자동으로 닫는 도우미: pending 을 비우고 decisions 에 기록한다(Task 9 의 decide 를 흉내 낸다).
const resolve = (s: LifeState): LifeState => ({
  ...s, pending: null, decisions: [...s.decisions, { dp: s.pending!.dp, month: s.pending!.month, option: 'A', byPolicy: false }],
});

const employed = (route: Route, annualPay: number, o: Partial<CareerState> = {}, s: Overrides = {}) =>
  fixtureCareerState({ ...s, career: { route, annualPay, ...o } });

describe('advanceYear: career year', () => {
  it('throws while a decision is pending', () => {
    const s = { ...employed('industry', 60_000_000), pending: { dp: 'career-5y' as const, month: 100, context: {}, options: [] } };
    expect(() => advanceYear(s, data)).toThrow(/pending/);
  });

  it('adds 12 months and 12 age-months, is deterministic, and does not mutate its input', () => {
    const s = employed('industry', 60_000_000);
    const clone = structuredClone(s);
    const a = advanceYear(s, data);
    expect(s).toEqual(clone);
    expect(a.month).toBe(s.month + 12);
    expect(a.ageMonths).toBe(s.ageMonths + 12);
    expect(advanceYear(s, data)).toEqual(a);
    expect(a.stage).toBe('career');
  });

  it('cash grows by monthly pay minus living cost (capital 1.6M, regional 1.3M); the +3% raise lands at year end', () => {
    const cap = advanceYear(employed('industry', 60_000_000), data);
    expect(cap.money.cash).toBe(12 * (5_000_000 - ASSUMED.LIVING_COST.capital));
    expect(cap.career!.annualPay).toBe(61_800_000);
    expect(cap.ledger.filter(l => l.kind === 'pay')).toHaveLength(12);
    expect(cap.ledger.filter(l => l.kind === 'living').every(l => l.amount === -ASSUMED.LIVING_COST.capital)).toBe(true);
    const reg = advanceYear(employed('industry', 60_000_000, {}, { choices: { school: 'kaist' } }), data);
    expect(reg.money.cash).toBe(12 * (5_000_000 - ASSUMED.LIVING_COST.regional));
  });

  it('academic months accrue only on academic routes', () => {
    expect(advanceYear(employed('postdoc', 37_800_000, { contractUntil: 10_000 }), data).career!.academicMonths).toBe(12);
    expect(advanceYear(employed('industry', 60_000_000), data).career!.academicMonths).toBe(0);
  });

  it('searching → posting → hire switches the route and clears searching', () => {
    let s = fixtureCareerState({ stats: FOUR_STATS_HIGH, career: { degreeMonth: 95, searching: { routes: ['industry'], since: 100, penalty: 1 } } });
    for (let y = 0; y < 4 && s.career!.route === 'none'; y++) s = advanceYear(s, data);
    expect(s.career!.route).toBe('industry');
    expect(s.career!.searching).toBeUndefined();
    expect(s.career!.annualPay).toBeGreaterThan(0);
    expect(s.log.some(l => l.textKey === 'log.hired')).toBe(true);
    expect(s.money.cash).toBeLessThan(12 * 5_000_000);   // 무직 기간에는 생활비만 나갔다
  });

  it('apply: false for a route keeps the player searching', () => {
    const s = fixtureCareerState({ stats: FOUR_STATS_HIGH, career: { degreeMonth: 95, searching: { routes: ['industry'], since: 100, penalty: 1 } } });
    const r = advanceYear(s, data, { apply: { industry: false } });
    expect(r.career!.route).toBe('none'); expect(r.career!.searching).toBeDefined();
  });

  it('news effects vanish after their untilMonth and new news is logged as creative', () => {
    const manual = { id: 'manual', type: 'x', startMonth: 90, untilMonth: 103, effect: 0.1, target: { kind: 'all' as const, values: [] }, routes: ['industry' as Route] };
    const s = employed('industry', 60_000_000, {}, { news: [manual] });
    const mid = advanceYear(s, data);
    expect(mid.news.map(n => n.id)).not.toContain('manual');   // 104 > 103
    expect(mid.log.filter(l => l.tags[0] === 'news').every(l => l.creative)).toBe(true);
    expect(mid.news.length).toBeGreaterThan(0);   // 12 달 중 하나 이상 새 뉴스가 남아 있다
  });

  it('news is identical for two players sharing newsSeed, whatever their own seed', () => {
    const a = advanceYear(employed('industry', 60_000_000, {}, { seed: 'APHD-BBBBBBBB' }), data);
    const b = advanceYear(employed('postdoc', 37_800_000, { contractUntil: 10_000 }, { seed: 'APHD-CCCCCCCC' }), data);
    expect(a.news).toEqual(b.news);
  });

  it('retire age is cached for employed routes and left open while unemployed', () => {
    expect(advanceYear(employed('professor', 60_000_000, { employer: { kind: 'university', national: false } }), data).career!.retireAge).toBe(65);
    expect(advanceYear(fixtureCareerState({ career: { route: 'none' } }), data).career!.retireAge).toBeUndefined();
  });
});

describe('advanceYear: decision points', () => {
  it('career-5y fires on the first year tick past degreeMonth + 60, once', () => {
    const before = employed('industry', 60_000_000, { degreeMonth: 40 }, { month: 83 });
    expect(advanceYear(before, data).pending).toBeNull();   // month 95 < 100
    const s0 = employed('industry', 60_000_000, { degreeMonth: 40 }, { month: 95 });
    const s1 = advanceYear(s0, data);                       // month 107 ≥ 100
    expect(s1.pending).toMatchObject({ dp: 'career-5y', month: 107, context: { route: 'industry', rank: undefined } });
    expect(s1.pending!.options.map(o => o.key)).toEqual(['A', 'B', 'C']);
    expect(s1.pending!.options[0]).toEqual({ key: 'A', textKey: 'decision.career-5y.A' });
    expect(s1.snapshots).toHaveLength(1);
    const snap = s1.snapshots[0]!;
    expect(snap).toMatchObject({ dp: 'career-5y', month: 107, decisionIndex: 0 });
    // 스냅샷 계약(branch.ts): 스냅샷 상태는 그 결정의 pending 프롬프트를 담고 decisions 에는 그 결정이 없다
    expect(snap.state.pending).toMatchObject({ dp: 'career-5y', month: 107 }); expect(snap.state.snapshots).toEqual([]);
    expect(snap.state.decisions).toEqual([]);
    expect(snap.state.month).toBe(107);
    // 결정을 닫은 뒤에는 다시 걸리지 않는다
    const s2 = advanceYear(resolve(s1), data);
    expect(s2.pending).toBeNull(); expect(s2.snapshots).toHaveLength(1);
  });

  it('career-5y option D exists only for academic non-regular routes', () => {
    const post = advanceYear(employed('postdoc', 37_800_000, { degreeMonth: 40, contractUntil: 10_000 }, { month: 95 }), data);
    expect(post.pending!.options.map(o => o.key)).toEqual(['A', 'B', 'C', 'D']);
    const prof = advanceYear(employed('professor', 60_000_000, { degreeMonth: 40, rank: 'assistant', employer: { kind: 'university', national: false } }, { month: 95 }), data);
    expect(prof.pending!.options.map(o => o.key)).toEqual(['A', 'B', 'C']);
    expect(prof.pending!.context).toEqual({ route: 'professor', rank: 'assistant' });
  });

  it('career-10y fires at degreeMonth + 120 and wins over a still-open career-5y', () => {
    const s = employed('industry', 60_000_000, { degreeMonth: 40 }, { month: 155 });   // → 167 ≥ 160
    expect(advanceYear(s, data).pending!.dp).toBe('career-10y');
    const decided5 = { ...s, decisions: [{ dp: 'career-5y' as const, month: 107, option: 'A', byPolicy: false }] };
    expect(advanceYear(decided5, data).pending!.dp).toBe('career-10y');
    expect(advanceYear({ ...decided5, month: 143 }, data).pending).toBeNull();   // 155 < 160
    expect(advanceYear({ ...decided5, month: 143 }, data).snapshots).toHaveLength(0);
  });

  it('pre-retirement fires from retireAge − 2 and outranks career-10y', () => {
    const s = employed('professor', 90_000_000, { degreeMonth: 0, rank: 'full', employer: { kind: 'university', national: false } }, { month: 400, ageMonths: 62 * 12 });
    const r = advanceYear(s, data);                   // 나이 63 ≥ 65 − 2, career-5y·10y 도 밀려 있다
    expect(r.stage).toBe('career');
    expect(r.pending).toMatchObject({ dp: 'pre-retirement', context: { route: 'professor' } });
    expect(r.pending!.options.map(o => o.key)).toEqual(['A', 'B', 'C']);
    // 결정 뒤 다음 해에는 10년 → 5년 순으로 이어진다
    const next = advanceYear(resolve(r), data);       // 나이 64 < 65
    expect(next.pending!.dp).toBe('career-10y');
    const last = advanceYear(resolve(next), data);
    expect(last.stage).toBe('retired');               // 나이 65 → 결정 없이 은퇴
  });

  it('one pending per year tick, snapshots stack across decisions', () => {
    let s = employed('industry', 60_000_000, { degreeMonth: 40 }, { month: 95 });
    s = advanceYear(s, data); expect(s.pending!.dp).toBe('career-5y');
    s = advanceYear(resolve(s), data); expect(s.pending).toBeNull();
    expect(s.snapshots.map(x => x.dp)).toEqual(['career-5y']);
  });
});

describe('advanceYear: retirement and old age', () => {
  it('reaching retireAge turns the stage to retired with the pension computed', () => {
    const s = employed('professor', 60_000_000, { workYears: 29, degreeMonth: 0, employer: { kind: 'university', national: false } }, { month: 500, ageMonths: 64 * 12, decisions: [
      { dp: 'career-5y', month: 1, option: 'A', byPolicy: false }, { dp: 'career-10y', month: 2, option: 'A', byPolicy: false }] });
    const r = advanceYear(s, data);
    expect(r.stage).toBe('retired'); expect(r.pending).toBeNull();
    expect(r.ageMonths).toBe(65 * 12);
    expect(r.career!.pensionMonthly).toBe(pensionMonthly(r));
    expect(r.career!.pensionMonthly).toBeGreaterThan(ASSUMED.PENSION_BASE_MONTHLY);
    expect(r.log.at(-1)!.tags).toEqual(['career', 'retire']);
  });

  it('a retired year adds one year of age and twelve pension payments', () => {
    const s = employed('professor', 60_000_000, { pensionMonthly: 3_000_000 }, { stage: 'retired', month: 700, ageMonths: 70 * 12, money: { cash: 1_000_000, debt: 0, loanLimit: 0 } });
    const clone = structuredClone(s);
    const r = advanceYear(s, data);
    expect(s).toEqual(clone);
    expect(r).toMatchObject({ stage: 'retired', month: 712, ageMonths: 71 * 12 });
    expect(r.money.cash).toBe(1_000_000 + 36_000_000);
    expect(r.ledger.at(-1)).toMatchObject({ kind: 'pension', amount: 36_000_000 });
  });

  it('retired year without a cached pension computes it from the career', () => {
    const s = employed('industry', 60_000_000, { workYears: 30 }, { stage: 'retired', ageMonths: 70 * 12 });
    expect(advanceYear(s, data).money.cash).toBe(12 * pensionMonthly(s));
  });

  it('post-retirement research income covers the months left in the year', () => {
    const s = employed('professor', 60_000_000, { pensionMonthly: 1_000_000, postRetireResearchUntil: 706 }, { stage: 'retired', month: 700, ageMonths: 70 * 12 });
    expect(advanceYear(s, data).money.cash).toBe(12_000_000 + 6 * ASSUMED.POST_RETIRE_RESEARCH.monthly);
  });

  it('age 80 ends the record with reason age80', () => {
    let s = employed('professor', 60_000_000, { pensionMonthly: 1_000_000 }, { stage: 'retired', month: 500, ageMonths: 65 * 12 });
    let ticks = 0;
    while (s.stage === 'retired') { s = advanceYear(s, data); ticks++; }
    expect(ticks).toBe(15);
    expect(s).toMatchObject({ stage: 'end', ageMonths: 80 * 12, month: 500 + 15 * 12 });
    expect(s.end).toEqual({ reason: 'age80', month: s.month });
    expect(advanceYear(s, data)).toBe(s);
  });

  it('pre and phd stages cannot take a career year', () => {
    expect(() => advanceYear(fixtureCareerState({ stage: 'phd', career: undefined }), data)).toThrow(/stage/);
  });

  it('a whole career from 35 to 80 resolves each decision point exactly once', () => {
    let s = employed('industry', 60_000_000, { degreeMonth: 40 }, { month: 100 });
    for (let guard = 0; guard < 100 && s.stage !== 'end'; guard++) {
      s = advanceYear(s, data);
      if (s.pending) s = resolve(s);
    }
    expect(s.stage).toBe('end'); expect(s.end!.reason).toBe('age80');
    expect(s.ageMonths).toBe(80 * 12);
    const dps = s.decisions.map(d => d.dp);
    expect(dps.filter(d => d === 'career-5y')).toHaveLength(1);
    expect(dps.filter(d => d === 'career-10y')).toHaveLength(1);
    expect(dps.filter(d => d === 'pre-retirement').length).toBeLessThanOrEqual(1);
    expect(s.career!.pensionMonthly).toBeGreaterThan(0);
    expect(s.money.cash).toBeGreaterThan(0);
  });
});
