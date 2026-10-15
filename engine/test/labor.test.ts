import { describe, it, expect } from 'vitest';
import { ASSUMED } from '../src/assumed';
import { loadData } from '../src/data/load';
import { applyHire, hireProbability, lecturerH, postingProbability, professorBaseline, routeH, searchMonth } from '../src/career/labor';
import { demand } from '../src/career/news';
import { draw } from '../src/rng';
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

describe('professorBaseline (노동 §2.2–§2.3)', () => {
  it('humanities B = 0.3172 and h hits the 0.10 cap', () => {
    const r = professorBaseline(data, 'humanities');
    expect(Math.abs(r.B - 0.3172)).toBeLessThan(5e-4);
    expect(r.h).toBe(0.10);
  });
  it('engineering, social, natural h = 0.5·B below the cap', () => {
    expect(Math.abs(professorBaseline(data, 'engineering').h - 0.0998)).toBeLessThan(5e-4);
    expect(Math.abs(professorBaseline(data, 'social').h - 0.0960)).toBeLessThan(5e-4);
    expect(Math.abs(professorBaseline(data, 'natural').h - 0.0887)).toBeLessThan(5e-4);
    expect(Math.abs(professorBaseline(data, 'engineering').B - 0.1996)).toBeLessThan(5e-4);
  });
});

describe('lecturerH (노동 §3.1)', () => {
  it('humanities hits 0.85, social 0.454, natural 0.327, engineering 0.299', () => {
    expect(lecturerH(data, 'humanities')).toBe(0.85);
    expect(Math.abs(lecturerH(data, 'social') - 0.454)).toBeLessThan(5e-4);
    expect(Math.abs(lecturerH(data, 'natural') - 0.327)).toBeLessThan(1e-3);
    expect(Math.abs(lecturerH(data, 'engineering') - 0.299)).toBeLessThan(1e-3);
  });
});

describe('routeH', () => {
  it('professor and lecturer come from records, the rest from the assumed table', () => {
    expect(routeH(data, 'professor', '인문사회', 'humanities')).toBe(0.10);
    expect(routeH(data, 'lecturer', '인문사회', 'humanities')).toBe(0.85);
    expect(routeH(data, 'postdoc', '이공', 'engineering')).toBe(0.60);
    expect(routeH(data, 'postdoc', '인문사회', 'humanities')).toBe(0.25);
    expect(routeH(data, 'industry', '이공', 'engineering')).toBe(0.55);
    expect(routeH(data, 'public', '인문사회', 'social')).toBe(0.06);
  });
  it('routes without a posting rate throw', () => {
    expect(() => routeH(data, 'bridge', '이공', 'engineering')).toThrow();
    expect(() => routeH(data, 'startup', '이공', 'engineering')).toThrow();
  });
});

describe('postingProbability (노동 §3.3)', () => {
  it('professor humanities at D = 1 is 0.0874', () => {
    expect(Math.abs(postingProbability(data, 'professor', '인문사회', 'humanities', 1) - 0.0874)).toBeLessThan(5e-4);
  });
  it('matches the other rows of the §3.3 table', () => {
    expect(Math.abs(postingProbability(data, 'postdoc', '이공', 'engineering', 1) - 0.1838)).toBeLessThan(5e-4);
    expect(Math.abs(postingProbability(data, 'industry', '이공', 'engineering', 1) - 0.2146)).toBeLessThan(5e-4);
    expect(Math.abs(postingProbability(data, 'lecturer', '인문사회', 'humanities', 1) - 0.2925)).toBeLessThan(5e-4);
    expect(Math.abs(postingProbability(data, 'public', '이공', 'engineering', 1) - 0.0343)).toBeLessThan(5e-4);
  });
  it('scales with demand and stays inside [0.005, 0.60]', () => {
    const base = postingProbability(data, 'professor', '이공', 'engineering', 1);
    expect(postingProbability(data, 'professor', '이공', 'engineering', 1.3)).toBeCloseTo(base * 1.3, 12);
    expect(postingProbability(data, 'professor', '이공', 'engineering', 1, 0.01)).toBe(ASSUMED.POST_BOUNDS.lo);
    expect(postingProbability(data, 'lecturer', '인문사회', 'humanities', 1.3, 1)).toBeLessThanOrEqual(ASSUMED.POST_BOUNDS.hi);
  });
});

describe('hireProbability (노동 §4.1)', () => {
  it('average stats at S = S_ref and no experience gives exactly s0 for every searchable route', () => {
    const s = fixtureCareerState({ career: { paperScore: ASSUMED.S_REF['이공'] } });
    for (const r of Object.keys(ASSUMED.S0) as Route[]) expect(hireProbability(s, data, r)).toBeCloseTo((ASSUMED.S0 as Record<string, number>)[r]!, 12);
  });
  it('S_ref depends on the group', () => {
    const s = fixtureCareerState({ choices: { group: '인문사회', kedi: 'social', ksced: 'social' }, career: { paperScore: ASSUMED.S_REF['인문사회'] } });
    expect(hireProbability(s, data, 'professor')).toBeCloseTo(ASSUMED.S0.professor, 12);
  });
  it('skill, network, score and 24 academic months raise it; score is capped at 12', () => {
    const base = fixtureCareerState({ career: { paperScore: 4 } });
    const p0 = hireProbability(base, data, 'professor');
    expect(hireProbability(fixtureCareerState({ stats: { skill: 90 }, career: { paperScore: 4 } }), data, 'professor')).toBeGreaterThan(p0);
    expect(hireProbability(fixtureCareerState({ stats: { network: 90 }, career: { paperScore: 4 } }), data, 'professor')).toBeGreaterThan(p0);
    expect(hireProbability(fixtureCareerState({ career: { paperScore: 6 } }), data, 'professor')).toBeGreaterThan(p0);
    expect(hireProbability(fixtureCareerState({ career: { paperScore: 4, academicMonths: 24 } }), data, 'professor')).toBeGreaterThan(p0);
    expect(hireProbability(fixtureCareerState({ career: { paperScore: 4, academicMonths: 23 } }), data, 'professor')).toBe(p0);
    expect(hireProbability(fixtureCareerState({ career: { paperScore: 30 } }), data, 'professor')).toBe(hireProbability(fixtureCareerState({ career: { paperScore: 12 } }), data, 'professor'));
  });
  it('stays inside [0.01, 0.60]', () => {
    const hi = fixtureCareerState({ stats: { skill: 100, network: 100 }, career: { paperScore: 30, academicMonths: 60 } });
    const lo = fixtureCareerState({ stats: { skill: 0, network: 0 }, career: { paperScore: 0 } });
    expect(hireProbability(hi, data, 'lecturer')).toBe(ASSUMED.HIRE_BOUNDS.hi);
    expect(hireProbability(lo, data, 'professor')).toBeGreaterThanOrEqual(ASSUMED.HIRE_BOUNDS.lo);   // 능력치만으로는 하한에 닿지 않는다
  });
  it('counts accepted PhD papers while no career exists yet', () => {
    const paper = { id: 'p1', status: 'accepted' as const, writing: 100, quality: 60, tier: 'T1' as const, attempts: 1, logitBonus: 0 };
    const withPaper = { ...fixtureCareerState(), career: undefined, stage: 'phd' as const, phd: { papers: [paper, paper] } as unknown as LifeState['phd'] };
    const without = { ...withPaper, phd: { papers: [] } as unknown as LifeState['phd'] };
    expect(hireProbability(withPaper, data, 'postdoc')).toBeGreaterThan(hireProbability(without, data, 'postdoc'));
  });
});

describe('searchMonth', () => {
  const searching = (routes: Route[], over: Overrides = {}) =>
    fixtureCareerState({ career: { searching: { routes, since: 0, penalty: 1 } }, ...over });

  it('one posting per route per month: slot post:<route> drives it, drawn once, independent per route', () => {
    const s = searching(['professor', 'industry']);
    let prof = 0, ind = 0, differ = 0;
    for (let m = 1; m <= 600; m++) {
      const r = searchMonth(s, data, m);
      const expProf = draw(SEED, 'labor', m, 'post:professor') < postingProbability(data, 'professor', '이공', 'engineering', demand(s, 'professor'));
      const expInd = draw(SEED, 'labor', m, 'post:industry') < postingProbability(data, 'industry', '이공', 'engineering', demand(s, 'industry'));
      expect(r.postings.includes('professor')).toBe(expProf);
      expect(r.postings.includes('industry')).toBe(expInd);
      expect(r.postings.filter(x => x === 'professor').length).toBeLessThanOrEqual(1);
      if (expProf) prof++;
      if (expInd) ind++;
      if (expProf !== expInd) differ++;
    }
    expect(prof).toBeGreaterThan(20); expect(ind).toBeGreaterThan(80);   // 기대 52, 129
    expect(differ).toBeGreaterThan(50);
  });

  it('calling twice in the same month with the same state is identical and does not touch the input', () => {
    const s = searching(['postdoc', 'professor', 'industry']);
    const clone = structuredClone(s);
    for (let m = 1; m <= 200; m++) expect(searchMonth(s, data, m)).toEqual(searchMonth(s, data, m));
    expect(s).toEqual(clone);
  });

  it('postings do not depend on the hire outcome of an earlier route', () => {
    const s = searching(['postdoc', 'industry']);
    for (let m = 1; m <= 300; m++) {
      const all = searchMonth(s, data, m);
      const noApply = searchMonth(s, data, m, { apply: { postdoc: false, industry: false } });
      expect(all.postings).toEqual(noApply.postings);
      expect(noApply.hired).toBeUndefined();
    }
  });

  it('hires at most one route per month, in route order, and updates the career', () => {
    const s = searching(['postdoc', 'industry'], { stats: { skill: 90, network: 90 } });
    let hits = 0;
    for (let m = 1; m <= 600 && hits < 3; m++) {
      const r = searchMonth(s, data, m);
      if (!r.hired) { expect(r.state).toBe(s); continue; }
      hits++;
      expect(r.state.career!.route).toBe(r.hired);
      expect(r.state.career!.searching).toBeUndefined();
      expect(r.state.career!.annualPay).toBeGreaterThan(0);
      expect(r.postings).toContain(r.hired);
      expect(r.state.log.at(-1)!.tags).toEqual(['career', 'hire', r.hired]);
    }
    expect(hits).toBe(3);
  });

  it('bridge draws slot "bridge" at BRIDGE_SEARCH_P with no posting', () => {
    const s = searching(['bridge']);
    let n = 0;
    for (let m = 1; m <= 800; m++) {
      const r = searchMonth(s, data, m);
      expect(r.postings).toEqual([]);
      expect(r.hired === 'bridge').toBe(draw(SEED, 'labor', m, 'bridge') < ASSUMED.BRIDGE_SEARCH_P);
      if (r.hired) { n++; expect(r.state.career!.annualPay).toBe(ASSUMED.BRIDGE_PAY); }
    }
    expect(Math.abs(n / 800 - ASSUMED.BRIDGE_SEARCH_P)).toBeLessThan(0.06);
  });

  it('master-exit closes academia routes and scales the rest by hireMult', () => {
    const s = searching(['professor', 'postdoc', 'industry'], { career: { degree: 'master-exit', searching: { routes: ['professor', 'postdoc', 'industry'], since: 0, penalty: 1 } } });
    const base = searching(['industry']);
    let exitInd = 0, baseInd = 0;
    for (let m = 1; m <= 2000; m++) {
      const r = searchMonth(s, data, m);
      expect(r.postings).not.toContain('professor'); expect(r.postings).not.toContain('postdoc');
      if (r.postings.includes('industry')) exitInd++;
      if (searchMonth(base, data, m).postings.includes('industry')) baseInd++;
    }
    expect(exitInd).toBeLessThan(baseInd);
    const expected = postingProbability(data, 'industry', '이공', 'engineering', 1, ASSUMED.MASTER_EXIT.hireMult);
    expect(Math.abs(exitInd / 2000 - expected)).toBeLessThan(0.03);
  });

  it('searching.penalty multiplies h (path change × 0.8)', () => {
    const s = fixtureCareerState({ career: { searching: { routes: ['industry'], since: 0, penalty: ASSUMED.PATH_CHANGE_MULT } } });
    let n = 0;
    for (let m = 1; m <= 2000; m++) if (searchMonth(s, data, m).postings.includes('industry')) n++;
    const expected = postingProbability(data, 'industry', '이공', 'engineering', 1, ASSUMED.PATH_CHANGE_MULT);
    expect(Math.abs(n / 2000 - expected)).toBeLessThan(0.03);
    expect(expected).toBeLessThan(postingProbability(data, 'industry', '이공', 'engineering', 1));
  });

  it('news demand changes the posting probability for the covered route only', () => {
    const news = [{ id: 'x', type: 'hiring-chill', startMonth: 0, untilMonth: 10_000, effect: -0.3, target: { kind: 'all' as const, values: [] }, routes: ['industry' as Route] }];
    const s = searching(['industry', 'postdoc'], { news });
    let withNews = 0, without = 0;
    const clean = searching(['industry', 'postdoc']);
    for (let m = 1; m <= 2000; m++) {
      if (searchMonth(s, data, m).postings.includes('industry')) withNews++;
      if (searchMonth(clean, data, m).postings.includes('industry')) without++;
      expect(searchMonth(s, data, m).postings.includes('postdoc')).toBe(searchMonth(clean, data, m).postings.includes('postdoc'));
    }
    expect(withNews).toBeLessThan(without);
  });

  it('not searching returns the same state', () => {
    const s = fixtureCareerState({ career: { route: 'industry', annualPay: 60_000_000 } });
    const r = searchMonth(s, data, 101);
    expect(r.state).toBe(s); expect(r.postings).toEqual([]); expect(r.hired).toBeUndefined();
  });

  it('pre-graduation search from phd.path creates a career and leaves the stage alone', () => {
    const phd = { path: 'industry', papers: [], graduationMonth: undefined } as unknown as LifeState['phd'];
    const s: LifeState = { ...fixtureCareerState({ stage: 'phd', stats: { skill: 90, network: 90 } }), career: undefined, phd };
    let found: ReturnType<typeof searchMonth> | undefined;
    for (let m = 1; m <= 2000 && !found; m++) { const r = searchMonth(s, data, m); if (r.hired) found = r; }
    expect(found?.hired).toBe('industry');
    expect(found!.state.stage).toBe('phd');
    expect(found!.state.career).toMatchObject({ degree: 'phd', route: 'industry', workYears: 0 });
    expect(s.career).toBeUndefined();
    // 경로가 정해지지 않았으면 구직하지 않는다
    expect(searchMonth({ ...s, phd: { ...phd!, path: undefined } }, data, 5).postings).toEqual([]);
    // 창업은 찾을 경로가 없다
    expect(searchMonth({ ...s, phd: { ...phd!, path: 'startup' } }, data, 5).postings).toEqual([]);
  });
});

describe('applyHire employers', () => {
  const base = (o: Overrides = {}) => fixtureCareerState({ career: { searching: { routes: ['professor'], since: 0, penalty: 1 } }, ...o });

  it('professor: national share 0.3 via slot hire:national', () => {
    let nat = 0;
    for (let m = 1; m <= 1000; m++) {
      const hired = applyHire(base(), data, 'professor', m).career!;
      expect(hired.employer!.national).toBe(draw(SEED, 'labor', m, 'hire:national') < ASSUMED.NATIONAL_HIRE_SHARE);
      if (hired.employer!.national) { nat++; expect(hired.step).toBeDefined(); } else expect(hired.step).toBeUndefined();
      expect(hired.rank).toBe('assistant');
    }
    expect(Math.abs(nat / 1000 - ASSUMED.NATIONAL_HIRE_SHARE)).toBeLessThan(0.05);
  });
  it('institute (이공) picks one of the seven institutes uniformly via hire:institute', () => {
    const seen = new Set<string>();
    for (let m = 1; m <= 300; m++) seen.add(applyHire(base(), data, 'institute', m).career!.employer!.instituteId!);
    expect([...seen].sort()).toEqual(['etri', 'kaeri', 'kimm', 'kist', 'kisti', 'kribb', 'krict']);
  });
  it('postdoc goes to an institute with the group share via hire:postdoc-employer', () => {
    let inst = 0;
    for (let m = 1; m <= 1000; m++) {
      const c = applyHire(base(), data, 'postdoc', m).career!;
      expect(c.employer!.kind === 'institute').toBe(draw(SEED, 'labor', m, 'hire:postdoc-employer') < ASSUMED.POSTDOC_INSTITUTE_SHARE['이공']);
      if (c.employer!.kind === 'institute') inst++;
      expect(c.contractUntil).toBe(m + ASSUMED.CONTRACT.postdoc.years * 12);
    }
    expect(Math.abs(inst / 1000 - ASSUMED.POSTDOC_INSTITUTE_SHARE['이공'])).toBeLessThan(0.05);
  });
  it('lecturer contract is one year; non-academic routes have no contract', () => {
    expect(applyHire(base(), data, 'lecturer', 7).career!.contractUntil).toBe(7 + 12);
    expect(applyHire(base(), data, 'industry', 7).career!.contractUntil).toBeUndefined();
  });
  it('non-tenure faculty and temporary jobs get contract periods too; regular routes do not (#84, 0014 #133·#134)', () => {
    expect(applyHire(base(), data, 'nontenure', 7).career!.contractUntil).toBe(7 + ASSUMED.CONTRACT.nontenure.years * 12);
    expect(applyHire(base(), data, 'bridge', 7).career!.contractUntil).toBe(7 + ASSUMED.CONTRACT.bridge.years * 12);
    for (const r of ['professor', 'institute', 'public', 'startup'] as const) expect(applyHire(base(), data, r, 7).career!.contractUntil).toBeUndefined();
  });
  it('replaces an existing job and resets yearsInRoute, keeping totals', () => {
    const s = fixtureCareerState({ career: { route: 'postdoc', annualPay: 37_800_000, yearsInRoute: 3, workYears: 3, academicMonths: 36, paperScore: 4, searching: { routes: ['professor'], since: 90, penalty: 1 }, retireAge: 61 } });
    const c = applyHire(s, data, 'professor', 101).career!;
    expect(c).toMatchObject({ route: 'professor', yearsInRoute: 0, workYears: 3, academicMonths: 36, paperScore: 4 });
    expect(c.searching).toBeUndefined(); expect(c.retireAge).toBeUndefined();
  });
});
