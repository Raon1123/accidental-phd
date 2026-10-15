import { describe, it, expect } from 'vitest';
import { ASSUMED } from '../src/assumed';
import { pathDistribution } from '../src/career/path';
import { loadData } from '../src/data/load';
import { PATH_OPTIONS, decide, type PendingContext } from '../src/decide';
import { createLife } from '../src/pre/createLife';
import { policyDecision, policyFocus } from '../src/policy';
import type { DecisionId, Focus, LifeState, Paper, PendingDecision, Stats } from '../src/types';

const data = loadData();
const SEED = 'APHD-POLICY01';
const MEAN: Stats = { health: 50, mind: 50, skill: 50, relation: 50, network: 50 };
const SAMPLES = 4000;
const TOL = 0.03;

const base = createLife({ group: '이공', track: 'computer', school: 'snu', funding: 'scholarship', advisorPref: 'support' }, SEED, data);
function life(over: { phd?: Partial<NonNullable<LifeState['phd']>>; stats?: Partial<Stats>; month?: number } = {}): LifeState {
  return { ...base, month: over.month ?? 30, stats: { ...MEAN, ...over.stats }, phd: { ...base.phd!, ...over.phd } };
}
const atMonth = (s: LifeState, m: number): LifeState => ({ ...s, month: m });
const draft = (writing: number): Paper => ({ id: 'p1', status: 'draft', writing, quality: 0, attempts: 0, logitBonus: 0 });

/** 같은 상태로 월만 바꿔 SAMPLES 번 뽑은 포커스 빈도. */
function focusFreq(s: LifeState): Record<string, number> {
  const counts: Record<string, number> = {};
  for (let m = 0; m < SAMPLES; m++) { const f = policyFocus(atMonth(s, m), data); counts[f] = (counts[f] ?? 0) + 1; }
  return Object.fromEntries(Object.entries(counts).map(([k, n]) => [k, n / SAMPLES]));
}

describe('policyFocus (선택권 §4.4)', () => {
  it('health or mind below 30 → rest; exactly 30 is not low', () => {
    expect(policyFocus(life({ stats: { health: 29 } }), data)).toBe('rest');
    expect(policyFocus(life({ stats: { mind: 29 } }), data)).toBe('rest');
    expect(focusFreq(life({ stats: { health: 30, mind: 30 } })).rest).toBeUndefined();
    expect(focusFreq(life({ stats: { health: 10 }, phd: { qualified: true } })).rest).toBeCloseTo(1, 12);
  });
  it('rest wins over job search and thesis', () => {
    expect(policyFocus(life({ stats: { mind: 20 }, phd: { qualified: true, path: 'academia' } }), data)).toBe('rest');
  });
  it('before the qualifying exam and without a draft: always research', () => {
    expect(focusFreq(life())).toEqual({ research: 1 });
  });
  it('before the exam with an active draft under 100: write with probability 0.6, otherwise research', () => {
    const f = focusFreq(life({ phd: { papers: [draft(40)] } }));
    expect(Object.keys(f).sort()).toEqual(['research', 'write']);
    expect(f.write).toBeCloseTo(ASSUMED.POLICY.writeP, 1);
    expect(Math.abs(f.write! - ASSUMED.POLICY.writeP)).toBeLessThan(TOL);
  });
  it('a draft at writing 100 (or only submitted papers) does not count as active', () => {
    expect(focusFreq(life({ phd: { papers: [draft(100)] } }))).toEqual({ research: 1 });
    expect(focusFreq(life({ phd: { papers: [{ ...draft(100), status: 'submitted' }] } }))).toEqual({ research: 1 });
  });
  it('after the exam: weights follow ASSUMED.POLICY.postQualFocus (보정 2026-10-14: thesis 0.3, research 0.1, write 0.5, network 0.1)', () => {
    const f = focusFreq(life({ phd: { qualified: true } }));
    for (const [k, p] of Object.entries(ASSUMED.POLICY.postQualFocus)) expect(Math.abs((f[k] ?? 0) - p), k).toBeLessThan(TOL);
  });
  it('job search (path set): network 0.3, thesis 0.7', () => {
    const f = focusFreq(life({ phd: { qualified: true, path: 'industry' } }));
    expect(Object.keys(f).sort()).toEqual(['network', 'thesis']);
    expect(Math.abs(f.network! - ASSUMED.POLICY.jobSearchFocus.network)).toBeLessThan(TOL);
    expect(Math.abs(f.thesis! - ASSUMED.POLICY.jobSearchFocus.thesis)).toBeLessThan(TOL);
  });
  it('thesis only after qualifying: never in any unqualified case', () => {
    for (const s of [life(), life({ phd: { papers: [draft(10)] } }), life({ phd: { path: 'public' } })]) expect(focusFreq(s).thesis).toBeUndefined();
  });
  it('every focus it returns can be applied (no thesis before qualifying, so applyFocus never throws)', () => {
    const all = new Set<Focus>();
    for (const s of [life(), life({ phd: { qualified: true } }), life({ phd: { qualified: true, path: 'academia' } })]) for (let m = 0; m < 200; m++) all.add(policyFocus(atMonth(s, m), data));
    expect([...all].sort()).toEqual(['network', 'research', 'thesis', 'write']);
  });
  it('on leave it keeps the current focus', () => {
    expect(policyFocus(life({ phd: { leave: { active: true, until: 40, totalMonths: 2 }, focus: 'rest' } }), data)).toBe('rest');
    expect(policyFocus(life({ stats: { health: 10 }, phd: { leave: { active: true, until: 40, totalMonths: 2 }, focus: 'research' } }), data)).toBe('research');
  });
  it('is deterministic per (seed, month) and needs a phd state', () => {
    const s = life({ phd: { qualified: true } });
    expect(policyFocus(s, data)).toBe(policyFocus(s, data));
    expect(() => policyFocus({ ...s, phd: undefined }, data)).toThrow(/phd/);
  });
});

// ── 결정 ──
const KEYS: Record<DecisionId, string[]> = {
  'post-qualifying': ['A', 'B', 'C'], 'first-paper-verdict': ['A', 'B', 'C'], 'funding-expiry': ['A', 'B', 'C', 'D'],
  'pre-graduation-path': ['A', 'B', 'C', 'D'], 'career-5y': ['A', 'B', 'C', 'D'], 'career-10y': ['A', 'B', 'C', 'D'], 'pre-retirement': ['A', 'B', 'C'],
};
const pend = (dp: DecisionId, context: PendingContext, month = 0, keys = KEYS[dp]): PendingDecision =>
  ({ dp, month, context: context as Record<string, unknown>, options: keys.map(key => ({ key, textKey: `decision.${dp}.${key}` })) });

/** pending.month 만 바꿔 SAMPLES 번 뽑은 선택지 인덱스 빈도(배열). */
function decisionFreq(s: LifeState, dp: DecisionId, context: PendingContext, keys = KEYS[dp]): number[] {
  const counts = keys.map(() => 0);
  for (let m = 0; m < SAMPLES; m++) counts[policyDecision(s, data, pend(dp, context, m, keys))]! += 1;
  return counts.map(n => n / SAMPLES);
}
const near = (got: number[], want: readonly number[]) => got.forEach((g, i) => expect(Math.abs(g - (want[i] ?? 0)), `index ${i}`).toBeLessThan(TOL));
const T = ASSUMED.POLICY.decisions;

describe('policyDecision (선택권 §4.4, 0014#46)', () => {
  const s = life({ phd: { papers: [{ id: 'p1', status: 'rejected', writing: 100, quality: 50, tier: 'T1', attempts: 1, logitBonus: 0 }] } });

  it('post-qualifying: pass and fail both (A 0.7, B 0.2, C 0.1)', () => {
    near(decisionFreq(s, 'post-qualifying', { passed: true }), T['post-qualifying:pass']);
    near(decisionFreq(s, 'post-qualifying', { passed: false }), T['post-qualifying:fail']);
  });
  it('first-paper-verdict: reject (0.3, 0.6, 0.1), revise (0.6, 0.3, 0.1), accept (0.5, 0.2, 0.3)', () => {
    near(decisionFreq(s, 'first-paper-verdict', { paperId: 'p1', verdict: 'rejected' }), T['first-paper-verdict:reject']);
    near(decisionFreq(s, 'first-paper-verdict', { paperId: 'p1', verdict: 'revision' }), T['first-paper-verdict:revise']);
    near(decisionFreq(s, 'first-paper-verdict', { paperId: 'p1', verdict: 'accepted' }), T['first-paper-verdict:accept']);
  });
  // funding-expiry A 는 이번 달 끝나는 자금에만 열린다(0014#138): 가중치 표를 그대로 보려면 기한을 이번 달로 둔다
  const expiring = life({ phd: { fundingState: { route: 'project', monthly: 1_100_000, tuitionWaiver: 0, until: 30, dutyHours: 0, recordIds: [] } } });
  const liveProject = life({ phd: { fundingState: { route: 'project', monthly: 1_100_000, tuitionWaiver: 0, until: 60, dutyHours: 0, recordIds: [] } } });
  it('funding-expiry (0.5, 0.3, 0.1, 0.1); career-10y (0.5, 0.3, 0.1, 0.1); pre-retirement (0.6, 0.2, 0.2)', () => {
    near(decisionFreq(expiring, 'funding-expiry', { cause: 'until' }), T['funding-expiry']);
    near(decisionFreq(expiring, 'funding-expiry', { cause: 'crisis' }), T['funding-expiry']);
    near(decisionFreq(s, 'career-10y', { route: 'industry' }), T['career-10y']);
    near(decisionFreq(s, 'pre-retirement', { route: 'industry' }), T['pre-retirement']);
  });
  it('career-5y with four options uses (0.6, 0.2, 0.1, 0.1); with three it drops D and renormalizes', () => {
    near(decisionFreq(s, 'career-5y', { route: 'postdoc' }), T['career-5y']);
    const three = decisionFreq(s, 'career-5y', { route: 'industry' }, ['A', 'B', 'C']);
    expect(three).toHaveLength(3);
    near(three, [0.6 / 0.9, 0.2 / 0.9, 0.1 / 0.9]);
  });
  it('weights follow the option keys, not their positions: a retry (B–D) renormalizes 0.3 / 0.1 / 0.1', () => {
    near(decisionFreq(s, 'funding-expiry', { cause: 'until', retry: true }, ['B', 'C', 'D']), [0.6, 0.2, 0.2]);
  });
  it('a crisis on live funding never picks A (not-expiring, 0014#138): B / C / D renormalize to 0.6 / 0.2 / 0.2; with D capped, B / C 0.75 / 0.25', () => {
    const f = decisionFreq(liveProject, 'funding-expiry', { cause: 'crisis' });
    expect(f[0]).toBe(0);
    near(f, [0, 0.6, 0.2, 0.2]);
    const capped = { ...liveProject, phd: { ...liveProject.phd!, leave: { active: false, until: -1, totalMonths: 34 } } };
    const g = decisionFreq(capped, 'funding-expiry', { cause: 'crisis' });
    expect(g[0]).toBe(0); expect(g[3]).toBe(0);
    near(g, [0, 0.75, 0.25, 0]);
  });
  it('leaves that would exceed the 36-month cap are never chosen (post-qualifying B, funding-expiry D)', () => {
    const capped = life({ phd: { leave: { active: false, until: -1, totalMonths: 34 } } });
    const pq = decisionFreq(capped, 'post-qualifying', { passed: true });
    expect(pq[1]).toBe(0);
    near(pq, [0.7 / 0.8, 0, 0.1 / 0.8]);
    expect(decisionFreq(capped, 'funding-expiry', { cause: 'crisis' })[3]).toBe(0);
  });
  it('pre-graduation-path follows the §8 distribution in option order A–D', () => {
    const dist = pathDistribution(data, s.choices.ksced, s.choices.group);
    near(decisionFreq(s, 'pre-graduation-path', {}), PATH_OPTIONS.map(p => dist[p]));
  });
  it('is deterministic, returns an index into pending.options, and does not touch the state', () => {
    const before = structuredClone(s);
    const p = pend('career-10y', { route: 'industry' }, 7);
    const i = policyDecision(s, data, p);
    expect(policyDecision(s, data, p)).toBe(i);
    expect(Number.isInteger(i) && i >= 0 && i < p.options.length).toBe(true);
    expect(s).toEqual(before);
  });
  it('throws for a context that does not say the exam result or the verdict', () => {
    expect(() => policyDecision(s, data, pend('post-qualifying', {} as PendingContext))).toThrow(/passed/);
    expect(() => policyDecision(s, data, pend('first-paper-verdict', {} as PendingContext))).toThrow(/verdict/);
  });
  it('whatever the policy picks, decide accepts it (byPolicy true) for 200 months of every phd decision', () => {
    const rejected = s.phd!.papers[0]!;
    const withPaper = (status: Paper['status']): LifeState => ({ ...s, phd: { ...s.phd!, papers: [{ ...rejected, status }] } });
    const cases: [DecisionId, PendingContext, LifeState][] = [
      ['post-qualifying', { passed: true }, s], ['post-qualifying', { passed: false }, s],
      ['first-paper-verdict', { paperId: 'p1', verdict: 'rejected' }, withPaper('rejected')],
      ['first-paper-verdict', { paperId: 'p1', verdict: 'revision' }, withPaper('revision')],
      ['first-paper-verdict', { paperId: 'p1', verdict: 'accepted' }, withPaper('accepted')],
      ['funding-expiry', { cause: 'until' }, s], ['funding-expiry', { cause: 'crisis' }, liveProject], ['pre-graduation-path', {}, s],
    ];
    for (const [dp, ctx, st] of cases) {
      for (let m = 0; m < 200; m++) {
        const p = pend(dp, ctx, m);
        const out = decide({ ...atMonth(st, m), pending: p }, data, policyDecision(atMonth(st, m), data, p), true);
        expect(out.decisions.at(-1)!.byPolicy).toBe(true);
      }
    }
  });
});
