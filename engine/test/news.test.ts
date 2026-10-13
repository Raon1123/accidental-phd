import { describe, it, expect } from 'vitest';
import { ASSUMED } from '../src/assumed';
import { loadData } from '../src/data/load';
import { demand, updateNews } from '../src/career/news';
import type { CareerState, Choices, LifeState, NewsEffect, Route, Stats } from '../src/types';

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


const eff = (o: Partial<NewsEffect> & { effect: number }): NewsEffect =>
  ({ id: 'x', type: 't', startMonth: 0, untilMonth: 1000, target: { kind: 'all', values: [] }, routes: ['industry'], ...o });

describe('demand (노동 §5.1)', () => {
  it('is 1 without news', () => { expect(demand(fixtureCareerState(), 'industry')).toBe(1); });
  it('multiplies (1 + e) of covering effects', () => {
    const s = fixtureCareerState({ news: [eff({ effect: 0.1 }), eff({ id: 'y', effect: 0.1 })] });
    expect(demand(s, 'industry')).toBeCloseTo(1.21, 12);
  });
  it('two −0.30 effects stack to 0.49 but clamp at 0.70', () => {
    const s = fixtureCareerState({ news: [eff({ effect: -0.3 }), eff({ id: 'y', effect: -0.3 })] });
    expect(demand(s, 'industry')).toBe(0.70);
  });
  it('clamps at 1.30 from above', () => {
    expect(demand(fixtureCareerState({ news: [eff({ effect: 0.3 }), eff({ id: 'y', effect: 0.3 })] }), 'industry')).toBe(1.30);
  });
  it('only the listed routes are affected', () => {
    const s = fixtureCareerState({ news: [eff({ effect: -0.2 })] });
    expect(demand(s, 'industry')).toBeCloseTo(0.8, 12);
    expect(demand(s, 'professor')).toBe(1);
  });
  it('ai-boom (track ai, computer) covers a computer-track player and not a sociology one', () => {
    const aiBoom = ASSUMED.NEWS_TYPES.find(t => t.id === 'ai-boom')!;
    expect(aiBoom.target.values).toContain('computer');
    const news = [eff({ effect: 0.2, target: { kind: aiBoom.target.kind, values: [...aiBoom.target.values] }, routes: [...aiBoom.routes] })];
    expect(demand(fixtureCareerState({ news, choices: { track: 'computer' } }), 'industry')).toBeCloseTo(1.2, 12);
    expect(demand(fixtureCareerState({ news, choices: { track: 'ai' } }), 'professor')).toBeCloseTo(1.2, 12);
    expect(demand(fixtureCareerState({ news, choices: { track: 'sociology', group: '인문사회', kedi: 'social' } }), 'industry')).toBe(1);
  });
  it('group, kedi and nrf2 targets', () => {
    const g = [eff({ effect: 0.1, target: { kind: 'group', values: ['이공'] } })];
    expect(demand(fixtureCareerState({ news: g }), 'industry')).toBeCloseTo(1.1, 12);
    expect(demand(fixtureCareerState({ news: g, choices: { group: '인문사회' } }), 'industry')).toBe(1);
    const k = [eff({ effect: 0.1, target: { kind: 'kedi', values: ['humanities', 'social'] } })];
    expect(demand(fixtureCareerState({ news: k, choices: { kedi: 'social' } }), 'industry')).toBeCloseTo(1.1, 12);
    expect(demand(fixtureCareerState({ news: k }), 'industry')).toBe(1);
    const n = [eff({ effect: 0.1, target: { kind: 'nrf2', values: ['D130000'] } })];
    expect(demand(fixtureCareerState({ news: n, choices: { subfield: 'D131100' } }), 'industry')).toBeCloseTo(1.1, 12);   // 인공지능 → 컴퓨터학
    expect(demand(fixtureCareerState({ news: n, choices: { subfield: 'C071600' } }), 'industry')).toBe(1);
  });
});

describe('updateNews (노동 §5.2)', () => {
  it('removes effects whose untilMonth is before the month, keeps the one ending this month', () => {
    const s = fixtureCareerState({ month: 50, newsSeed: 'NO-ARRIVAL', news: [eff({ id: 'old', effect: 0.1, untilMonth: 49 }), eff({ id: 'edge', effect: 0.1, untilMonth: 50 })] });
    const after = updateNews(s, data);
    expect(after.news.map(n => n.id)).not.toContain('old');
    expect(after.news.map(n => n.id)).toContain('edge');
    expect(updateNews({ ...after, month: 51 }, data).news.map(n => n.id)).not.toContain('edge');
  });

  it('a new effect is active for exactly its months and gone the month after untilMonth', () => {
    let s = fixtureCareerState({ month: 0, career: undefined, stage: 'phd' });
    let found: NewsEffect | undefined;
    for (let m = 1; m <= 200 && !found; m++) { s = updateNews({ ...s, month: m }, data); found = s.news.find(n => n.startMonth === m); }
    expect(found).toBeDefined();
    expect(found!.untilMonth).toBeGreaterThanOrEqual(found!.startMonth + 2);
    s = updateNews({ ...s, month: found!.untilMonth }, data);
    expect(s.news.map(n => n.id)).toContain(found!.id);
    s = updateNews({ ...s, month: found!.untilMonth + 1 }, data);
    expect(s.news.map(n => n.id)).not.toContain(found!.id);
  });

  it('draws only from newsSeed (a cohort member with another seed sees the same news)', () => {
    const a = fixtureCareerState({ seed: 'APHD-BBBBBBBB', newsSeed: SEED });
    const b = fixtureCareerState({ seed: 'APHD-CCCCCCCC', newsSeed: SEED });
    let x = a, y = b;
    for (let m = 1; m <= 120; m++) { x = updateNews({ ...x, month: m }, data); y = updateNews({ ...y, month: m }, data); }
    expect(x.news).toEqual(y.news);
    expect(x.log.length).toBeGreaterThan(0);
  });

  it('arrival rate over 2000 months is 0.5 ± 0.04', () => {
    let s = fixtureCareerState({ month: 0 });
    let arrivals = 0;
    for (let m = 1; m <= 2000; m++) {
      const before = s.log.length;
      s = updateNews({ ...s, month: m }, data);
      if (s.log.length > before) arrivals++;
    }
    expect(Math.abs(arrivals / 2000 - ASSUMED.NEWS_MONTHLY_P)).toBeLessThan(0.04);
  });

  it('every effect lies in its type range on a 0.01 grid, with an integer duration in range; log lines are creative', () => {
    let s = fixtureCareerState({ month: 0 });
    const seen = new Set<string>();
    for (let m = 1; m <= 1500; m++) {
      s = updateNews({ ...s, month: m }, data);
      for (const n of s.news.filter(x => x.startMonth === m)) {
        const t = ASSUMED.NEWS_TYPES.find(x => x.id === n.type)!;
        seen.add(t.id);
        expect(n.effect).toBeGreaterThanOrEqual(t.effect[0] - 1e-12); expect(n.effect).toBeLessThanOrEqual(t.effect[1] + 1e-12);
        expect(Math.abs(n.effect * 100 - Math.round(n.effect * 100))).toBeLessThan(1e-9);
        const months = n.untilMonth - n.startMonth + 1;
        expect(months).toBeGreaterThanOrEqual(t.months[0]); expect(months).toBeLessThanOrEqual(t.months[1]);
        expect(n.id).toBe(`${t.id}:${m}`);
        expect(n.routes).toEqual([...t.routes]); expect(n.target.kind).toBe(t.target.kind);
      }
    }
    expect(seen.size).toBe(ASSUMED.NEWS_TYPES.length);
    expect(s.log.every(l => l.creative && l.tags[0] === 'news')).toBe(true);
  });

  it('does not mutate its input', () => {
    const s = fixtureCareerState({ month: 5 });
    const clone = structuredClone(s);
    updateNews(s, data); expect(s).toEqual(clone);
  });
});
