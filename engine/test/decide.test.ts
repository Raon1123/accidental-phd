import { describe, it, expect } from 'vitest';
import { ASSUMED } from '../src/assumed';
import { pathDistribution } from '../src/career/path';
import { pensionMonthly, promotion } from '../src/career/pay';
import { careerFlow } from '../src/career/tick';
import { advanceYear } from '../src/career/tick';
import { taFundingState, taStipend } from '../src/data/funding';
import { waiverRate } from '../src/data/tuition';
import { loadData } from '../src/data/load';
import {
  PATH_OPTIONS, advisorChangeProbability, decide, decisionOutcome, describeOptions, extensionProbability, fundingExpired, optionUnavailable, promotionProbability,
  type FirstPaperVerdictContext, type PendingContext,
} from '../src/decide';
import { odds, sigmoid, z } from '../src/odds';
import { acceptProbability, lowerTier, reReviewDuration, resolveVerdicts } from '../src/phd/papers';
import { draw } from '../src/rng';
import { createLife } from '../src/pre/createLife';
import { advanceMonth } from '../src/index';
import { pickUniform } from '../src/util';
import type { AdvisorType, CareerState, Choices, DecisionId, LifeState, Paper, Stats } from '../src/types';

const data = loadData();
const SEED = 'APHD-DECIDE01';
const MEAN: Stats = { health: 50, mind: 50, skill: 50, relation: 50, network: 50 };

/** 박사과정 상태: createLife 에서 능력치를 평균으로, 진척 40·month 24 로 고정한다. */
function phdFixture(over: { phd?: Partial<NonNullable<LifeState['phd']>>; month?: number; choices?: Partial<Choices>; stats?: Partial<Stats> } = {}): LifeState {
  const s = createLife({ group: '이공', track: 'computer', school: 'snu', funding: 'scholarship', advisorPref: 'support' }, SEED, data);
  return {
    ...s, month: over.month ?? 24, stats: { ...MEAN, ...over.stats }, choices: { ...s.choices, ...over.choices },
    phd: { ...s.phd!, project: 40, advisor: { type: 'strict', ...ASSUMED.ADVISOR_TYPES.strict }, ...over.phd },
  };
}

const KEYS: Record<DecisionId, string[]> = {
  'post-qualifying': ['A', 'B', 'C'], 'first-paper-verdict': ['A', 'B', 'C'], 'funding-expiry': ['A', 'B', 'C', 'D'],
  'pre-graduation-path': ['A', 'B', 'C', 'D'], 'career-5y': ['A', 'B', 'C', 'D'], 'career-10y': ['A', 'B', 'C', 'D'], 'pre-retirement': ['A', 'B', 'C'],
};
function withPending(s: LifeState, dp: DecisionId, context: PendingContext, keys: string[] = KEYS[dp]): LifeState {
  return { ...s, pending: { dp, month: s.month, context: context as Record<string, unknown>, options: keys.map(key => ({ key, textKey: `decision.${dp}.${key}` })) } };
}
const pick = (s: LifeState, key: string): number => s.pending!.options.findIndex(o => o.key === key);
const choose = (s: LifeState, key: string): LifeState => decide(s, data, pick(s, key));

const findMonth = (from: number, pred: (m: number) => boolean): number => {
  for (let m = from; m < from + 4000; m++) if (pred(m)) return m;
  throw new Error('no month satisfies the predicate');
};


/** 비첫 판정(attempts 2)이 수정 요구로 나오는 시도 번호를 찾아 resolveVerdicts 가 낸 재심 dueMonth 를 돌려준다. */
function resolveVerdictsRevision(base: LifeState): number {
  for (let i = 0; i < 2000; i++) {
    const seed = base.seed;
    const s: LifeState = { ...base, seed, month: 24, pending: null, phd: { ...base.phd!, papers: [{ id: 'p1', status: 'submitted', writing: 100, quality: 55, tier: 'T1', attempts: 2 + i, dueMonth: 24, logitBonus: 0 }] } };
    const r = resolveVerdicts(s, data);
    const p = r.state.phd!.papers[0]!;
    if (r.verdicts[0]!.verdict === 'revision' && p.status === 'revision') return p.dueMonth!;
  }
  throw new Error('no revision verdict found');
}

// ── 1. post-qualifying ──
describe('decide: post-qualifying (선택권 §3.1)', () => {
  const pass = (o: Parameters<typeof phdFixture>[0] = {}) => withPending(phdFixture(o), 'post-qualifying', { passed: true });
  const fail = (o: Parameters<typeof phdFixture>[0] = {}) => withPending(phdFixture(o), 'post-qualifying', { passed: false });

  it('pass A: project +5, mind −3', () => {
    const r = choose(pass(), 'A');
    expect(r.phd!.project).toBe(45);
    expect(r.stats.mind).toBe(47);
  });
  it('pass A clamps project at 100', () => {
    expect(choose(pass({ phd: { project: 98 } }), 'A').phd!.project).toBe(ASSUMED.PROJECT_MAX);
  });
  it('pass B: voluntary leave of 6 months', () => {
    const r = choose(pass(), 'B');
    expect(r.phd!.leave).toEqual({ active: true, until: 24 + 6, totalMonths: 0 });
    expect(r.log.some(l => l.tags.includes('voluntary'))).toBe(true);
  });
  it('pass B past the 36-month cap throws, is reported unavailable, and describeOptions says so', () => {
    const s = pass({ phd: { leave: { active: false, until: -1, totalMonths: 33 } } });
    expect(() => choose(s, 'B')).toThrow(/cap/);
    expect(optionUnavailable(s, s.pending!, 'B')).toBe('leave-cap');
    expect(describeOptions(s, data).find(o => o.key === 'B')!.unavailable).toBe('leave-cap');
    expect(describeOptions(s, data).find(o => o.key === 'A')!.unavailable).toBeUndefined();
  });
  it('pass C: project ×0.6 always; the advisor-change draw (exam / advisor-change) picks success or relation −10', () => {
    const base = pass();
    const p = advisorChangeProbability(base);
    expect(p).toBeCloseTo(ASSUMED.ADVISOR_CHANGE.p0, 12);
    const okMonth = findMonth(24, m => draw(SEED, 'exam', m, 'advisor-change') < p && draw(SEED, 'init', m, 'advisor:re') < ASSUMED.ADVISOR_PREF_P);
    const ok = choose({ ...base, month: okMonth, pending: { ...base.pending!, month: okMonth } }, 'C');
    expect(ok.phd!.project).toBeCloseTo(40 * ASSUMED.POST_QUAL_EFFECTS.passC.projectMult, 12);
    expect(ok.phd!.advisor).toEqual({ type: 'support', ...ASSUMED.ADVISOR_TYPES.support });   // 선호 일치 구간
    expect(ok.stats.relation).toBe(50);

    const failMonth = findMonth(24, m => draw(SEED, 'exam', m, 'advisor-change') >= p);
    const bad = choose({ ...base, month: failMonth, pending: { ...base.pending!, month: failMonth } }, 'C');
    expect(bad.phd!.project).toBeCloseTo(24, 12);
    expect(bad.stats.relation).toBe(50 + ASSUMED.POST_QUAL_EFFECTS.passC.relationOnFail);
    expect(bad.phd!.advisor.type).toBe('strict');
  });
  it('pass C: reassignment outside the preference band picks one of the other three types; byLuck picks among four', () => {
    const base = pass();
    const p = advisorChangeProbability(base);
    const m = findMonth(24, k => draw(SEED, 'exam', k, 'advisor-change') < p && draw(SEED, 'init', k, 'advisor:re') >= ASSUMED.ADVISOR_PREF_P);
    const st = { ...base, month: m, pending: { ...base.pending!, month: m } };
    const u = draw(SEED, 'init', m, 'advisor:re');
    const others = (['support', 'strict', 'free', 'connected'] as AdvisorType[]).filter(k => k !== 'support');
    const type = choose(st, 'C').phd!.advisor.type;
    expect(type).not.toBe('support');
    expect(type).toBe(pickUniform((u - ASSUMED.ADVISOR_PREF_P) / (1 - ASSUMED.ADVISOR_PREF_P), others));

    const luck = { ...st, choices: { ...st.choices, byLuck: { ...st.choices.byLuck, advisorPref: true } } };
    expect(choose(luck, 'C').phd!.advisor.type).toBe(pickUniform(u, ['support', 'strict', 'free', 'connected']));
  });
  it('fail A: skill +3, mind −5; the exam state is untouched', () => {
    const s = fail({ phd: { qualAttempts: 1 } });
    const r = choose(s, 'A');
    expect(r.stats.skill).toBe(53);
    expect(r.stats.mind).toBe(45);
    expect(r.phd!.qualAttempts).toBe(1);
    expect(r.phd!.qualified).toBe(false);
  });
  it('fail B: voluntary leave of 6 months', () => {
    expect(choose(fail(), 'B').phd!.leave).toMatchObject({ active: true, until: 30 });
  });
  it('fail C: master exit — end.reason exit-master, career.degree master-exit, academic routes closed', () => {
    const r = choose(fail(), 'C');
    expect(r.stage).toBe('career');
    expect(r.end).toEqual({ reason: 'exit-master', month: 24 });
    expect(r.career).toMatchObject({ degree: 'master-exit', degreeMonth: 24, route: 'none', annualPay: 0 });
    expect(r.career!.searching).toEqual({ routes: ['institute', 'public', 'industry', 'bridge'], since: 24, penalty: 1 });
    expect(r.career!.searching!.routes).not.toContain('professor');
    expect(r.phd).toBeDefined();
  });
  it('the context must say whether the exam was passed', () => {
    expect(() => decide(withPending(phdFixture(), 'post-qualifying', {} as PendingContext), data, 0)).toThrow(/passed/);
  });
});

// ── 2. first-paper-verdict ──
describe('decide: first-paper-verdict (선택권 §3.2)', () => {
  const paper = (over: Partial<Paper> = {}): Paper => ({ id: 'p1', status: 'rejected', writing: 100, quality: 55, tier: 'T1', attempts: 1, submittedMonth: 10, logitBonus: 0, ...over });
  const at = (status: Paper['status'], verdict: FirstPaperVerdictContext['verdict'], over: Partial<Paper> = {}, o: Parameters<typeof phdFixture>[0] = {}) =>
    withPending(phdFixture({ ...o, phd: { papers: [paper({ status, ...over })], ...o.phd } }), 'first-paper-verdict', { paperId: 'p1', verdict });
  const p1 = (s: LifeState) => s.phd!.papers.find(x => x.id === 'p1')!;

  it('the fixture is a cs-field life (review months 2–6)', () => {
    expect(phdFixture().choices.field).toBe('cs');
  });

  describe('reject', () => {
    it('A: resubmit at the same tier, attempts + 1, a new due month', () => {
      const r = choose(at('rejected', 'rejected'), 'A');
      expect(p1(r)).toMatchObject({ status: 'submitted', tier: 'T1', attempts: 2, logitBonus: 0, submittedMonth: 24 });
      expect(p1(r).dueMonth).toBeGreaterThanOrEqual(24 + ASSUMED.REVIEW_MONTHS.cs[0]);
    });
    it('B: resubmit one tier lower; T4 stays T4', () => {
      expect(p1(choose(at('rejected', 'rejected'), 'B'))).toMatchObject({ status: 'submitted', tier: 'T2', attempts: 2 });
      expect(p1(choose(at('rejected', 'rejected', { tier: 'T4' }), 'B'))).toMatchObject({ tier: 'T4', attempts: 2 });
    });
    it('C: drop the paper, project +3, mind −5', () => {
      const r = choose(at('rejected', 'rejected'), 'C');
      expect(p1(r).status).toBe('dropped');
      expect(r.phd!.project).toBe(43);
      expect(r.stats.mind).toBe(45);
    });
  });

  describe('revise', () => {
    it('A: full revision — quality +8, logit +0.8, due month = month + 2 + ceil(drawn review / 2)', () => {
      const r = choose(at('revision', 'revision'), 'A');
      expect(p1(r)).toMatchObject({ status: 'revision', quality: 63, logitBonus: 0.8, tier: 'T1', attempts: 1 });
      expect(p1(r).dueMonth).toBe(24 + 2 + reReviewDuration(r, 'p1'));   // 추첨 U{2..6}의 절반 올림이라 1–3
      expect(p1(r).dueMonth! - 26).toBeGreaterThanOrEqual(1);
      expect(p1(r).dueMonth! - 26).toBeLessThanOrEqual(3);
    });
    it('B: minimal revision — quality +2, logit +0.4, due month = month + 1 + ceil(drawn review / 2)', () => {
      const r = choose(at('revision', 'revision'), 'B');
      expect(p1(r)).toMatchObject({ status: 'revision', quality: 57, logitBonus: 0.4 });
      expect(p1(r).dueMonth).toBe(24 + 1 + reReviewDuration(r, 'p1'));
    });
    it('the drawn review is halved and rounded up for the other fields (math 4–10 → 2–5)', () => {
      const s = at('revision', 'revision', {}, { choices: { field: 'math' } });
      const re = p1(choose(s, 'A')).dueMonth! - 24 - 2;
      expect(re).toBeGreaterThanOrEqual(2);
      expect(re).toBeLessThanOrEqual(5);
    });
    it('선택권 §6.4: 재심 기간은 슬롯 `<id>:review:re` 추첨의 ceil(U{lo..hi} / 2)이고 resolveVerdicts의 비첫 판정과 같은 식이다', () => {
      const [lo, hi] = ASSUMED.REVIEW_MONTHS.cs;   // cs 2–6
      const withSeed = (seed: string) => ({ ...at('revision', 'revision'), seed });
      const seedFor = (pred: (u: number) => boolean): string => {
        for (let i = 0; i < 5000; i++) if (pred(draw(`REV${i}`, 'paper', 24, 'p1:review:re'))) return `REV${i}`;
        throw new Error('no seed');
      };
      const seedLo = seedFor(u => u < 0.1), seedHi = seedFor(u => u >= 0.9);
      const dueLo = p1(choose(withSeed(seedLo), 'A')).dueMonth!, dueHi = p1(choose(withSeed(seedHi), 'A')).dueMonth!;
      expect(dueLo).toBe(24 + 2 + Math.ceil(lo / ASSUMED.REREVIEW_DIVISOR));
      expect(dueHi).toBe(24 + 2 + Math.ceil(hi / ASSUMED.REREVIEW_DIVISOR));
      expect(dueLo).not.toBe(dueHi);
      // 같은 seed 의 resolveVerdicts(비첫 판정, attempts 2) 재심 기간과 같다
      for (const seed of [seedLo, seedHi]) {
        const base = withSeed(seed);
        const resolved = resolveVerdictsRevision(base);
        expect(resolved - 24).toBe(p1(choose(base, 'B')).dueMonth! - 24 - 1);
      }
    });
    it('revision quality is capped at 100', () => {
      expect(p1(choose(at('revision', 'revision', { quality: 97 }), 'A')).quality).toBe(100);
    });
    it('C: withdraw and resubmit one tier lower; the revision bonus is gone', () => {
      const r = choose(at('revision', 'revision', { logitBonus: 0.8 }), 'C');
      expect(p1(r)).toMatchObject({ status: 'submitted', tier: 'T2', attempts: 2, logitBonus: 0 });
    });
  });

  describe('accept', () => {
    it('A: a new draft starts at writing 20', () => {
      const r = choose(at('accepted', 'accepted'), 'A');
      expect(r.phd!.papers).toHaveLength(2);
      expect(r.phd!.papers[1]).toMatchObject({ id: 'p2', status: 'draft', writing: 20, attempts: 0 });
    });
    it('A: with a draft already under way, that draft is raised to 20 instead of opening a second one', () => {
      const s = withPending(phdFixture({ phd: { papers: [paper({ status: 'accepted' }), paper({ id: 'p2', status: 'draft', writing: 5, tier: undefined, attempts: 0 })] } }),
        'first-paper-verdict', { paperId: 'p1', verdict: 'accepted' });
      const r = choose(s, 'A');
      expect(r.phd!.papers).toHaveLength(2);
      expect(r.phd!.papers[1]!.writing).toBe(20);
      const ahead = withPending(phdFixture({ phd: { papers: [paper({ status: 'accepted' }), paper({ id: 'p2', status: 'draft', writing: 60, tier: undefined, attempts: 0 })] } }),
        'first-paper-verdict', { paperId: 'p1', verdict: 'accepted' });
      expect(choose(ahead, 'A').phd!.papers[1]!.writing).toBe(60);
    });
    it('B: network +8 and −500,000 won in cash and the ledger', () => {
      const s = at('accepted', 'accepted');
      const r = choose(s, 'B');
      expect(r.stats.network).toBe(58);
      expect(r.money.cash).toBe(s.money.cash - 500_000);
      expect(r.ledger.at(-1)).toEqual({ month: 24, kind: 'conference', amount: -500_000 });
    });
    it('C: project +5', () => {
      expect(choose(at('accepted', 'accepted'), 'C').phd!.project).toBe(45);
    });
  });

  it('an unknown paper or a context without a verdict throws', () => {
    expect(() => decide(withPending(phdFixture(), 'first-paper-verdict', { paperId: 'p9', verdict: 'rejected' }), data, 0)).toThrow(/verdict|paper/);
    expect(() => decide(withPending(phdFixture(), 'first-paper-verdict', {} as PendingContext), data, 0)).toThrow(/verdict/);
  });

  it('decisionOutcome maps the verdict and the exam result', () => {
    const o = (verdict: FirstPaperVerdictContext['verdict']) => decisionOutcome(at('accepted', verdict).pending!);
    expect([o('accepted'), o('revision'), o('rejected')]).toEqual(['accept', 'revise', 'reject']);
    expect(decisionOutcome(withPending(phdFixture(), 'career-5y', { route: 'industry' }).pending!)).toBeUndefined();
  });
});

// ── 3. funding-expiry ──
describe('decide: funding-expiry (선택권 §3.3)', () => {
  const project = { route: 'project' as const, monthly: 600_000, tuitionWaiver: 0.5, until: 24, dutyHours: 0, recordIds: [] };
  const scholarship = { route: 'scholarship' as const, monthly: 1_000_000, tuitionWaiver: 1, until: 48, dutyHours: 0, recordIds: [] };
  const expiry = (fundingState: typeof project | typeof scholarship, month: number, o: Parameters<typeof phdFixture>[0] = {}, ctx: PendingContext = { cause: 'until' }) =>
    withPending(phdFixture({ ...o, month, phd: { fundingState, ...o.phd } }), 'funding-expiry', ctx);
  const retarget = (s: LifeState, m: number): LifeState => ({ ...s, month: m, pending: { ...s.pending!, month: m } });

  it('A: extension probability = odds(0.50, 0.6·z(relation) + 0.4·z(skill) + 0.3·min(accepted, 2), 0.10, 0.90)', () => {
    const s = expiry(project, 24);
    expect(extensionProbability(s)).toBeCloseTo(0.5, 12);
    const rich = expiry(project, 24, { stats: { relation: 80, skill: 70 }, phd: { papers: [1, 2, 3].map(i => ({ id: `p${i}`, status: 'accepted' as const, writing: 100, quality: 60, attempts: 1, logitBonus: 0 })) } });
    expect(extensionProbability(rich)).toBeCloseTo(odds(0.5, 0.6 * z(80) + 0.4 * z(70) + 0.3 * 2, 0.10, 0.90), 12);
  });
  it('A success on a project: until moves 24 months past the expiry month', () => {
    const base = expiry(project, 24);
    const m = findMonth(24, k => draw(SEED, 'funding', k, 'funding:extend') < 0.5);
    const r = choose(retarget(base, m), 'A');
    expect(r.phd!.fundingState.until).toBe(m + ASSUMED.PROJECT_MONTHS);
    expect(fundingExpired(r)).toBe(false);
  });
  it('A failure: the funding ends this month, so fundingExpired is true next month (Task 7 reopens with retry)', () => {
    const base = expiry(project, 24);
    const m = findMonth(24, k => draw(SEED, 'funding', k, 'funding:extend') >= 0.5);
    const r = choose(retarget(base, m), 'A');
    expect(r.phd!.fundingState.until).toBe(m);
    expect(fundingExpired({ ...r, month: m + 1 })).toBe(true);
    const again = withPending(r, 'funding-expiry', { cause: 'until', retry: true }, ['B', 'C', 'D']);
    expect(optionUnavailable(again, again.pending!, 'A')).toBe('already-tried');
  });
  it('A success on a scholarship after the term: re-selected for a fresh term (inside the term A is not-expiring, 0014#138)', () => {
    const m = findMonth(30, k => draw(SEED, 'funding', k, 'funding:extend') < 0.5);
    const inside = retarget(expiry(scholarship, 30, {}, { cause: 'crisis' }), m);
    expect(inside.phd!.fundingState.until).toBe(48);
    expect(optionUnavailable(inside, inside.pending!, 'A')).toBe('not-expiring');
    expect(() => choose(inside, 'A')).toThrow(/unavailable \(not-expiring\)/);
    const m2 = findMonth(48, k => draw(SEED, 'funding', k, 'funding:extend') < 0.5);
    expect(choose(retarget(expiry(scholarship, 48), m2), 'A').phd!.fundingState.until).toBe(m2 + ASSUMED.SCHOLARSHIP_MONTHS);
  });
  it('A after a failed scholarship review restores the original end (48), not month + 48', () => {
    // 학기 경계 24 에서 유지 판정이 실패해 until 을 24 로 당겼다. 원래 기한 48 은 context 의 originalUntil 이 들고 있다.
    const failed = { ...scholarship, until: 24 };
    const m = findMonth(24, k => draw(SEED, 'funding', k, 'funding:extend') < 0.5);
    const s = retarget(expiry(failed, 24, {}, { cause: 'scholarship-review', originalUntil: 48 }), m);
    expect(choose(s, 'A').phd!.fundingState.until).toBe(48);
    expect(fundingExpired(choose(s, 'A'))).toBe(false);
    // originalUntil 이 없으면(기한이 그냥 끝난 경우) 재선발로 보고 새 기한을 준다
    expect(choose(retarget(expiry(failed, 24, {}, { cause: 'until' }), m), 'A').phd!.fundingState.until).toBe(m + ASSUMED.SCHOLARSHIP_MONTHS);
    // 실패하면 기한은 이번 달로 남는다
    const mf = findMonth(24, k => draw(SEED, 'funding', k, 'funding:extend') >= 0.5);
    expect(choose(retarget(expiry(failed, 24, {}, { cause: 'scholarship-review', originalUntil: 48 }), mf), 'A').phd!.fundingState.until).toBe(mf);
  });
  it('A is open only on funding that ends this month: until reached, or a failed scholarship review; live funding is not-expiring (0014#138)', () => {
    for (const live of [{ ...project, until: 34 }, { ...scholarship, until: 34 }]) {
      for (const cause of ['crisis', 'until'] as const) {
        const s = expiry(live, 24, {}, { cause });
        expect(fundingExpired(s)).toBe(false);
        expect(optionUnavailable(s, s.pending!, 'A')).toBe('not-expiring');
        expect(() => choose(s, 'A')).toThrow(/unavailable \(not-expiring\)/);
        const a = describeOptions(s, data).find(o => o.key === 'A')!;
        expect(a.unavailable).toBe('not-expiring');
        expect(a.probabilityHint).toBeUndefined();
        expect(['B', 'C', 'D'].map(k => optionUnavailable(s, s.pending!, k))).toEqual([undefined, undefined, undefined]);
      }
    }
    // 기한 도달(until === month), 재정 위기가 같은 달 겹쳐도
    for (const cause of ['until', 'crisis'] as const) expect(optionUnavailable(expiry(project, 24, {}, { cause }), expiry(project, 24, {}, { cause }).pending!, 'A')).toBeUndefined();
    // 장학 유지 실패: 틱이 기한을 이번 달로 당기고 원래 기한을 context 에 싣는다
    const review = expiry({ ...scholarship, until: 30 }, 30, {}, { cause: 'scholarship-review', originalUntil: 48 });
    expect(optionUnavailable(review, review.pending!, 'A')).toBeUndefined();
    expect(describeOptions(review, data)[0]!.probabilityHint).toBeDefined();
  });
  it('A is unavailable on a self-funded student, and on funding with no end date; decide throws', () => {
    const self = { route: 'self' as const, monthly: 0, tuitionWaiver: 0, until: -1, dutyHours: 0, recordIds: [] };
    const s = withPending(phdFixture({ phd: { fundingState: self } }), 'funding-expiry', { cause: 'crisis' });
    expect(optionUnavailable(s, s.pending!, 'A')).toBe('no-funding');
    expect(optionUnavailable(s, s.pending!, 'B')).toBeUndefined();
    expect(describeOptions(s, data).find(o => o.key === 'A')!.unavailable).toBe('no-funding');
    expect(() => decide(s, data, 0)).toThrow(/unavailable \(no-funding\)/);
    const ta = { ...project, until: -1 };
    const t = expiry(ta, 24, {}, { cause: 'crisis' });
    expect(optionUnavailable(t, t.pending!, 'A')).toBe('no-funding');
    expect(optionUnavailable(expiry(project, 24), expiry(project, 24).pending!, 'A')).toBeUndefined();
  });
  it('B: teaching assistant — the school TA stipend, 10 duty hours, no end date, project route', () => {
    const r = choose(expiry(project, 24), 'B');
    const ta = taStipend(data, 'snu');
    expect(ta.value).toBe(300_000);
    expect(r.phd!.fundingState).toMatchObject({ route: 'project', monthly: 300_000, dutyHours: ASSUMED.TA_DUTY_HOURS, until: -1 });
    expect(r.phd!.fundingState.recordIds[0]).toBe(ta.id);
  });
  it('B: a school without a TA record falls back to 400,000 won', () => {
    const r = choose(expiry(project, 24, { choices: { school: 'hanyang' } }), 'B');
    expect(r.phd!.fundingState.monthly).toBe(ASSUMED.TA_FALLBACK_MONTHLY);
    expect(r.phd!.fundingState.recordIds[0]).toBe('0014#35');
  });
  const SELF_RESET = { route: 'self', monthly: 0, tuitionWaiver: 0, until: -1, dutyHours: 0, recordIds: [] };
  it('C on funding that ends this month: self-funding — no stipend, no waiver, no end date (0014#139)', () => {
    expect(choose(expiry(project, 24), 'C').phd!.fundingState).toEqual(SELF_RESET);
    expect(choose(expiry(project, 24, {}, { cause: 'crisis' }), 'C').phd!.fundingState).toEqual(SELF_RESET);
  });
  it('C in a crisis on live project or scholarship funding keeps the funding state and next month’s stipend (0014#139)', () => {
    const stipendNext = (s: LifeState): number =>
      advanceMonth({ ...s, pending: null }, data).ledger.filter(e => e.month === s.month + 1 && e.kind === 'stipend').reduce((a, e) => a + e.amount, 0);
    for (const live of [{ ...project, until: 34 }, { ...scholarship, until: 34 }]) {
      const s = expiry(live, 24, { phd: { participation: 0.5 } }, { cause: 'crisis' });
      const r = choose(s, 'C');
      expect(r.phd!.fundingState).toEqual(s.phd!.fundingState);
      expect(fundingExpired(r)).toBe(false);
      const want = stipendNext(s);
      expect(want).toBeGreaterThan(0);
      expect(stipendNext(r)).toBe(want);
    }
  });
  it('C on the self route resets to the bare self state, including after D (the 0014#36 leave-work marker is cleared)', () => {
    const afterD = { route: 'self' as const, monthly: 2_000_000, tuitionWaiver: 0, until: 20, dutyHours: 0, recordIds: ['0014#36'] };
    const s = withPending(phdFixture({ phd: { fundingState: afterD } }), 'funding-expiry', { cause: 'crisis' });
    expect(choose(s, 'C').phd!.fundingState).toEqual(SELF_RESET);
  });
  it('D: leave for 12 months with the job-income marker; the monthly leave-work line is Task 7’s', () => {
    const s = expiry(project, 24);
    const r = choose(s, 'D');
    expect(r.phd!.leave).toMatchObject({ active: true, until: 36 });
    expect(r.phd!.fundingState).toMatchObject({ route: 'self', monthly: 2_000_000, until: 36, recordIds: ['0014#36'] });
    expect(r.ledger).toEqual(s.ledger);   // decide 는 원장에 쓰지 않는다
  });
  it('D past the leave cap throws', () => {
    const s = expiry(project, 24, { phd: { leave: { active: false, until: -1, totalMonths: 30 } } });
    expect(() => choose(s, 'D')).toThrow(/cap/);
  });
  it('B equals taFundingState(…, project) exactly (refactor regression: monthly, waiver, dutyHours, recordIds order)', () => {
    for (const school of ['snu', 'korea', 'hanyang']) {
      const r = choose(expiry(project, 24, { choices: { school } }), 'B');
      const want = taFundingState(data, school, 'project');
      expect(r.phd!.fundingState).toEqual(want);
      expect(want.recordIds).toEqual([taStipend(data, school).id, waiverRate(data, school, 'project').id]);
    }
  });
  it('self-funded TA life (decision 0022): never expires; on forced expiry A is no-funding, B gives the project-route TA state, C resets the self route and zeroes the TA income (0014#139)', () => {
    const ta = taFundingState(data, 'snu', 'self');
    const s = phdFixture({ month: 99, phd: { fundingState: ta } });
    expect(fundingExpired(s)).toBe(false);
    const p = withPending(s, 'funding-expiry', { cause: 'crisis' });
    expect(optionUnavailable(p, p.pending!, 'A')).toBe('no-funding');
    expect(choose(p, 'B').phd!.fundingState).toEqual(taFundingState(data, 'snu', 'project'));
    expect(choose(p, 'C').phd!.fundingState.monthly).toBe(0);
  });
});

// ── 4. pre-graduation-path ──
describe('decide: pre-graduation-path (선택권 §3.4)', () => {
  it('A–D set phd.path to academia, industry, public, startup', () => {
    expect(PATH_OPTIONS).toEqual(['academia', 'industry', 'public', 'startup']);
    const s = withPending(phdFixture({ phd: { qualified: true, project: 92 } }), 'pre-graduation-path', {});
    expect(['A', 'B', 'C', 'D'].map(k => choose(s, k).phd!.path)).toEqual(['academia', 'industry', 'public', 'startup']);
    expect(choose(s, 'A').phd!.project).toBe(92);
  });
});

// ── 5. career-5y ──
type CareerOver = Partial<CareerState>;
function careerFixture(career: CareerOver, o: { month?: number; ageMonths?: number; stats?: Partial<Stats> } = {}): LifeState {
  const s = phdFixture();
  const { phd: _phd, ...rest } = s;
  return {
    ...rest, stage: 'career', month: o.month ?? 160, ageMonths: o.ageMonths ?? 36 * 12, stats: { ...MEAN, ...o.stats },
    career: { degreeMonth: 100, degree: 'phd', route: 'none', annualPay: 0, yearsInRoute: 0, workYears: 0, academicMonths: 0, paperScore: 0, careerPapers: 0, ...career },
  };
}
const assistant: CareerOver = { route: 'professor', rank: 'assistant', annualPay: 70_000_000, employer: { kind: 'university', national: false }, workYears: 5 };
const career = (dp: 'career-5y' | 'career-10y' | 'pre-retirement', c: CareerOver, ctx: Partial<PendingContext> = {}, o: Parameters<typeof careerFixture>[1] = {}, keys?: string[]) =>
  withPending(careerFixture(c, o), dp, { route: c.route ?? 'none', rank: c.rank, ...ctx } as PendingContext, keys);

describe('decide: career-5y (선택권 §3.5)', () => {
  it('A: the promotion draw is the one promotion() makes (labor / promotion); success raises the rank', () => {
    const base = career('career-5y', assistant);
    expect(promotionProbability(base, 'career-5y')).toBeCloseTo(0.75, 12);
    const win = findMonth(160, m => draw(SEED, 'labor', m, 'promotion') < 0.75);
    const lose = findMonth(160, m => draw(SEED, 'labor', m, 'promotion') >= 0.75);
    for (const m of [win, lose]) {
      const s = { ...base, month: m, pending: { ...base.pending!, month: m } };
      const r = choose(s, 'A');
      const expected = promotion({ ...s, pending: null }, data, 'career-5y');
      expect(r.career).toEqual(expected.state.career);
      expect(r.career!.rank).toBe(expected.promoted ? 'associate' : 'assistant');
    }
    expect(choose({ ...base, month: win, pending: { ...base.pending!, month: win } }, 'A').career!.rank).toBe('associate');
  });
  it('B: change path — industry by default, ×0.8 on hiring; the current job is kept', () => {
    const r = choose(career('career-5y', assistant), 'B');
    expect(r.career!.searching).toEqual({ routes: ['industry'], since: 160, penalty: ASSUMED.PATH_CHANGE_MULT });
    expect(r.career!.route).toBe('professor');
  });
  it('B: a company researcher defaults to academia; the context target overrides the default', () => {
    expect(choose(career('career-5y', { route: 'industry', rank: 'staff', annualPay: 60_000_000 }), 'B').career!.searching!.routes).toEqual(['postdoc', 'lecturer', 'nontenure', 'professor']);
    expect(choose(career('career-5y', assistant, { target: 'public' }), 'B').career!.searching!.routes).toEqual(['institute', 'public']);
    expect(choose(career('career-5y', assistant, { target: 'academia' }), 'B').career!.searching!.routes).toEqual(['postdoc', 'lecturer', 'nontenure', 'professor']);
  });
  it('C: leave research — bridge or non-research company jobs, no penalty', () => {
    expect(choose(career('career-5y', assistant), 'C').career!.searching).toEqual({ routes: ['bridge', 'industry'], since: 160, penalty: 1 });
  });
  it('D: hold on — mind −5; an existing search is kept, otherwise an academic search starts', () => {
    const searching = { routes: ['postdoc' as const], since: 150, penalty: 1 };
    const postdoc: CareerOver = { route: 'postdoc', annualPay: 37_800_000, searching };
    const kept = choose(career('career-5y', postdoc), 'D');
    expect(kept.stats.mind).toBe(45);
    expect(kept.career!.searching).toEqual(searching);
    const started = choose(career('career-5y', { route: 'postdoc', annualPay: 37_800_000 }), 'D');
    expect(started.career!.searching).toEqual({ routes: ['postdoc', 'lecturer', 'nontenure', 'professor'], since: 160, penalty: 1 });
  });
  it('decide does not offer D unless the tick built it (3 options are fine)', () => {
    const s = career('career-5y', assistant, {}, {}, ['A', 'B', 'C']);
    expect(describeOptions(s, data).map(o => o.key)).toEqual(['A', 'B', 'C']);
    expect(() => decide(s, data, 3)).toThrow(/out of range/);
  });
});

// ── 6. career-10y ──
describe('decide: career-10y (선택권 §3.6)', () => {
  const associate: CareerOver = { ...assistant, rank: 'associate' };
  it('A: next-rank promotion (associate → professor at p0 0.75)', () => {
    const base = career('career-10y', associate);
    expect(promotionProbability(base, 'career-10y')).toBeCloseTo(0.75, 12);
    const win = findMonth(160, m => draw(SEED, 'labor', m, 'promotion') < 0.75);
    const r = choose({ ...base, month: win, pending: { ...base.pending!, month: win } }, 'A');
    expect(r.career!.rank).toBe('professor');
  });
  it('B: research focus — skill +5, network −3, researchFocusYear set, and a log marker', () => {
    const r = choose(career('career-10y', associate), 'B');
    expect(r.stats.skill).toBe(55);
    expect(r.stats.network).toBe(47);
    expect(r.log.some(l => l.tags.includes('career-paper-p0'))).toBe(true);
    expect(r.career!.researchFocusYear).toBe(true);
    expect(ASSUMED.CAREER_10Y_RESEARCH.paperP0 - ASSUMED.CAREER_PAPER.p0).toBeCloseTo(0.2, 12);
  });
  it('C: change path (×0.8), same as the 5-year option B', () => {
    expect(choose(career('career-10y', associate), 'C').career!.searching).toEqual({ routes: ['industry'], since: 160, penalty: ASSUMED.PATH_CHANGE_MULT });
  });
  it('D: start a company — route startup, self-employed, income from startingPay', () => {
    const r = choose(career('career-10y', associate), 'D');
    expect(r.career).toMatchObject({ route: 'startup', employer: { kind: 'self' }, yearsInRoute: 0 });
    expect(r.career!.annualPay).toBeGreaterThan(0);
    expect(r.career!.searching).toBeUndefined();
  });
  it('D on a founder changes nothing about the job', () => {
    const s = career('career-10y', { route: 'startup', annualPay: 30_000_000, employer: { kind: 'self' } });
    expect(choose(s, 'D').career).toEqual(s.career);
  });
});

// ── 7. pre-retirement ──
describe('decide: pre-retirement (선택권 §3.7)', () => {
  const prof: CareerOver = { ...assistant, rank: 'professor', workYears: 30 };
  const near = (keys?: string[]) => career('pre-retirement', prof, {}, { ageMonths: 63 * 12 }, keys);

  it('A: work until the regular retirement age — nothing changes', () => {
    const s = near();
    const r = choose(s, 'A');
    expect(r.career).toEqual(s.career);
    expect(r.stage).toBe('career');
  });
  it('B: retire now — retireAge = current age, pension ×0.85, stage retired so the stored pension is paid', () => {
    const s = near();
    const r = choose(s, 'B');
    expect(r.career!.retireAge).toBe(63);
    expect(r.career!.pensionMonthly).toBe(Math.round(pensionMonthly(s) * ASSUMED.EARLY_RETIRE_MULT));
    expect(r.stage).toBe('retired');
    const next = advanceYear(r, data);
    const f = careerFlow({ ...r, month: r.month + 1 });   // 은퇴 뒤에도 달마다 생활비와 상환이 나간다(#96)
    expect(next.ledger.filter(e => e.kind === 'pension').map(e => e.amount)).toEqual(Array(12).fill(r.career!.pensionMonthly!));
    expect(f.pension).toBe(r.career!.pensionMonthly);
    expect(next.career!.pensionMonthly).toBe(r.career!.pensionMonthly);
  });
  it('C: the 0.6 draw (life / post-retire) decides; success sets a calendar-month end 60 months after the retirement month', () => {
    const base = near();
    const win = findMonth(160, m => draw(SEED, 'life', m, 'post-retire') < ASSUMED.POST_RETIRE_RESEARCH.p);
    const lose = findMonth(160, m => draw(SEED, 'life', m, 'post-retire') >= ASSUMED.POST_RETIRE_RESEARCH.p);
    const w = choose({ ...base, month: win, pending: { ...base.pending!, month: win } }, 'C');
    expect(w.career!.postRetireResearchUntil).toBe(win + (65 - 63) * 12 + 60);
    const l = choose({ ...base, month: lose, pending: { ...base.pending!, month: lose } }, 'C');
    expect(l.career!.postRetireResearchUntil).toBeUndefined();
    expect(l.log.some(e => e.textKey === 'decision.pre-retirement.C.declined')).toBe(true);
  });
  it('describeOptions: C carries the 0.6 hint', () => {
    expect(describeOptions(near(), data).find(o => o.key === 'C')!.probabilityHint!.p).toBe(0.6);
  });
});

// ── 공통 ──
describe('decide: common behavior', () => {
  const s0 = withPending(phdFixture(), 'post-qualifying', { passed: true });

  it('throws without a pending decision', () => {
    expect(() => decide(phdFixture(), data, 0)).toThrow(/no pending/);
  });
  it('throws for an option index out of range (negative, past the end, fractional, NaN)', () => {
    for (const i of [-1, 3, 1.5, Number.NaN]) expect(() => decide(s0, data, i)).toThrow(/out of range/);
  });
  it('clears pending, appends the decision with the pending month and the resolved option key, and records byPolicy', () => {
    const r = decide(s0, data, 0);
    expect(r.pending).toBeNull();
    expect(r.decisions).toEqual([{ dp: 'post-qualifying', month: 24, option: 'A', byPolicy: false }]);
    expect(decide(s0, data, 1, true).decisions[0]).toEqual({ dp: 'post-qualifying', month: 24, option: 'B', byPolicy: true });
  });
  it('resolves by the key under the index, not by the index: with options B–D the first index is B', () => {
    const s = withPending(phdFixture(), 'funding-expiry', { cause: 'until', retry: true }, ['B', 'C', 'D']);
    expect(decide(s, data, 0).decisions[0]!.option).toBe('B');
  });
  it('does not mutate its input', () => {
    const before = structuredClone(s0);
    decide(s0, data, 2);
    expect(s0).toEqual(before);
  });
  it('is deterministic', () => {
    expect(decide(s0, data, 2)).toEqual(decide(s0, data, 2));
  });
  it('adds one log line whose key names the decision, the outcome and the option', () => {
    expect(decide(s0, data, 0).log.at(-1)).toMatchObject({ textKey: 'decision.post-qualifying.pass.A', tags: ['decision', 'post-qualifying', 'A'] });
    const f = withPending(phdFixture({ phd: { papers: [{ id: 'p1', status: 'accepted', writing: 100, quality: 60, tier: 'T1', attempts: 1, logitBonus: 0 }] } }), 'first-paper-verdict', { paperId: 'p1', verdict: 'accepted' });
    expect(decide(f, data, 2).log.at(-1)!.textKey).toBe('decision.first-paper-verdict.accept.C');
  });
  it('backfills the pending prompt into this decision’s snapshot when the tick stored it without one', () => {
    const snap = { dp: 'post-qualifying' as const, month: 24, decisionIndex: 0, state: { ...structuredClone({ ...s0, snapshots: [] }), pending: null } };
    const older = { ...snap, dp: 'career-5y' as const, month: 3 };
    const r = decide({ ...s0, snapshots: [older, snap] }, data, 0);
    expect(r.snapshots[1]!.state.pending).toEqual(s0.pending);
    expect(r.snapshots[0]!.state.pending).toBeNull();
    expect(snap.state.pending).toBeNull();   // 입력 스냅샷은 그대로
  });
  it('leaves a snapshot that already carries its prompt alone', () => {
    const snap = { dp: 'post-qualifying' as const, month: 24, decisionIndex: 0, state: { ...structuredClone({ ...s0, snapshots: [] }) } };
    const r = decide({ ...s0, snapshots: [snap] }, data, 0);
    expect(r.snapshots[0]).toBe(snap);
  });
  it('describeOptions without a pending decision throws', () => {
    expect(() => describeOptions(phdFixture(), data)).toThrow(/no pending/);
  });
});

// ── 확률 힌트 ──
describe('describeOptions: probability hints (선택권 §3 표)', () => {
  it('post-qualifying: only the pass-case C (advisor change) has a hint', () => {
    const pass = describeOptions(withPending(phdFixture(), 'post-qualifying', { passed: true }), data);
    expect(pass.map(o => o.probabilityHint?.p)).toEqual([undefined, undefined, 0.7]);
    expect(describeOptions(withPending(phdFixture(), 'post-qualifying', { passed: false }), data).every(o => o.probabilityHint === undefined)).toBe(true);
  });
  it('first-paper-verdict revise: A and B show the acceptance probability after the revision', () => {
    const paper: Paper = { id: 'p1', status: 'revision', writing: 100, quality: 55, tier: 'T1', attempts: 1, logitBonus: 0 };
    const s = withPending(phdFixture({ phd: { papers: [paper] } }), 'first-paper-verdict', { paperId: 'p1', verdict: 'revision' });
    const [a, b, c] = describeOptions(s, data);
    expect(a!.probabilityHint!.p).toBeCloseTo(acceptProbability(s, data, { ...paper, quality: 63, logitBonus: 0.8 }), 12);
    expect(b!.probabilityHint!.p).toBeCloseTo(acceptProbability(s, data, { ...paper, quality: 57, logitBonus: 0.4 }), 12);
    expect(a!.probabilityHint!.p).toBeGreaterThan(b!.probabilityHint!.p);
    expect(c!.probabilityHint).toBeUndefined();
    expect(lowerTier('T1')).toBe('T2');
  });
  it('funding-expiry: A shows the extension probability', () => {
    const f = phdFixture().phd!.fundingState;
    const s = withPending(phdFixture({ phd: { fundingState: { ...f, until: 24 } } }), 'funding-expiry', { cause: 'until' });
    expect(describeOptions(s, data)[0]!.probabilityHint!.p).toBeCloseTo(sigmoid(0), 12);
    expect(describeOptions(s, data).slice(1).every(o => o.probabilityHint === undefined)).toBe(true);
  });
  it('pre-graduation-path: each option shows its share of the §8 distribution', () => {
    const s = withPending(phdFixture(), 'pre-graduation-path', {});
    const dist = pathDistribution(data, s.choices.ksced, s.choices.group);
    const hints = describeOptions(s, data).map(o => o.probabilityHint!.p);
    expect(hints).toEqual([dist.academia, dist.industry, dist.public, dist.startup]);
    expect(hints.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    expect(dist.startup).toBeCloseTo(0.025, 12);
  });
  it('career-5y / career-10y: A shows the promotion probability; none when there is no step to take', () => {
    expect(describeOptions(career('career-5y', assistant), data)[0]!.probabilityHint!.p).toBeCloseTo(0.75, 12);
    expect(describeOptions(career('career-5y', { route: 'industry', rank: 'staff', annualPay: 60_000_000 }), data)[0]!.probabilityHint!.p).toBeCloseTo(0.6, 12);
    expect(describeOptions(career('career-5y', { route: 'postdoc', annualPay: 37_800_000 }), data)[0]!.probabilityHint).toBeUndefined();
    expect(describeOptions(career('career-5y', assistant), data).slice(1).every(o => o.probabilityHint === undefined)).toBe(true);
  });
  it('the promotion hint grows with skill, network and relation', () => {
    const lo = promotionProbability(careerFixture(assistant, { stats: { skill: 30 } }), 'career-5y')!;
    const hi = promotionProbability(careerFixture(assistant, { stats: { skill: 80 } }), 'career-5y')!;
    expect(hi).toBeGreaterThan(lo);
  });
});

describe('public API (index.ts)', () => {
  it('re-exports the entry points of the plan’s API block (advanceMonth is added by Task 7)', async () => {
    const api = await import('../src/index');
    for (const name of ['createLife', 'advanceYear', 'decide', 'branch', 'describeOptions', 'loadData', 'get', 'has', 'find', 'toSave', 'fromSave']) {
      expect(typeof (api as Record<string, unknown>)[name], name).toBe('function');
    }
    expect(api.SAVE_VERSION).toBe(1);
    expect(api.ASSUMED.PATH_CHANGE_MULT).toBe(0.8);
  });
});
