import { describe, it, expect } from 'vitest';
import { ASSUMED } from '../src/assumed';
import { loadData } from '../src/data/load';
import { venueOptions } from '../src/data/venues';
import { clamp, odds } from '../src/odds';
import { draw } from '../src/rng';
import { createLife } from '../src/pre/createLife';
import {
  acceptProbability, acceptedCount, activeDraft, classifyVerdict, lowerTier, paperScore, resolveVerdicts, resubmit, submitIfReady,
} from '../src/phd/papers';
import type { LifeState, Paper, Tier } from '../src/types';

const data = loadData();
const SEED = 'APHD-PAPERS01';
const MEAN = { health: 50, mind: 50, skill: 50, relation: 50, network: 50 };

/** createLife 로 만든 상태에서 능력치를 평균으로, 지도교수 rigor 를 50으로 고정하고 month·papers 를 정한다. */
function fixture(config: Parameters<typeof createLife>[0], month: number, papers: Paper[], seed = SEED): LifeState {
  const s = createLife(config, seed, data);
  return { ...s, month, stats: { ...MEAN }, phd: { ...s.phd!, papers, advisor: { ...s.phd!.advisor, rigor: 50 } } };
}
const STEM = { group: '이공' as const, track: 'ai' };            // field cs, 학회+저널
const HUM = { group: '인문사회' as const, track: 'sociology' };   // field social
const paper = (id: string, over: Partial<Paper> = {}): Paper => ({ id, status: 'draft', writing: 0, quality: 55, attempts: 0, logitBonus: 0, ...over });
const submitted = (id: string, dueMonth: number, over: Partial<Paper> = {}): Paper =>
  paper(id, { status: 'submitted', writing: 100, tier: 'T1', attempts: 1, submittedMonth: 0, dueMonth, ...over });
const verdictU = (s: LifeState, p: Paper): number => draw(s.seed, 'paper', s.month, `${p.id}:verdict:${p.attempts}`);
const MONTH12 = fixture(STEM, 12, []);
/** 월 12, 평균 능력치 T1(p = 0.25) 논문의 판정 추첨값이 조건을 만족하는 첫 id. */
const idWith = (pred: (u: number) => boolean): string =>
  Array.from({ length: 4000 }, (_, i) => `k${i}`).find(id => pred(verdictU(MONTH12, submitted(id, 12))))!;

describe('acceptProbability (선택권 §6.4)', () => {
  it('T1, mean stats, attempts 1, quality 55 → 0.25', () => {
    const s = fixture(STEM, 10, []);
    expect(acceptProbability(s, data, paper('p1', { tier: 'T1', attempts: 1, quality: 55 }))).toBeCloseTo(0.25, 12);
  });
  it('quality, resubmission and revision bonus enter as logit terms', () => {
    const s = fixture(STEM, 10, []);
    const p = (over: Partial<Paper>): number => acceptProbability(s, data, paper('p1', { tier: 'T1', attempts: 1, quality: 55, ...over }));
    expect(p({ quality: 70 })).toBeCloseTo(odds(0.25, 0.04 * 15, 0.05, 0.90), 12);
    expect(p({ attempts: 3 })).toBeCloseTo(odds(0.25, 0.25 * 2, 0.05, 0.90), 12);
    expect(p({ logitBonus: 0.8 })).toBeCloseTo(odds(0.25, 0.8, 0.05, 0.90), 12);
    expect(p({ tier: 'T4' })).toBeCloseTo(0.60, 12);
  });
  it('is clamped to 0.05–0.90', () => {
    const s = fixture(STEM, 10, []);
    expect(acceptProbability(s, data, paper('p1', { tier: 'T4', attempts: 1, quality: 100, logitBonus: 5 }))).toBe(0.90);
    expect(acceptProbability(s, data, paper('p1', { tier: 'T1', attempts: 1, quality: 0 }))).toBe(0.05);
  });
  it('a conference with an acceptance record uses that rate instead of the tier base', () => {
    const s = fixture(STEM, 10, []);
    const p = acceptProbability(s, data, paper('p1', { tier: 'T1', attempts: 1, quality: 55, venueId: 'venues-conf-neurips-core-rank' }));
    expect(p).toBeCloseTo(0.2452, 4);
  });
  it('a paper without a tier is a programming error', () => {
    expect(() => acceptProbability(MONTH12, data, paper('p1'))).toThrow();
  });
});

describe('classifyVerdict (선택권 §6.4)', () => {
  it('revision band is min(0.95 − p, 0.29)', () => {
    // p = 0.25 → 수정 요구는 [0.25, 0.54)
    expect(classifyVerdict(0.2499, 0.25)).toBe('accepted');
    expect(classifyVerdict(0.25, 0.25)).toBe('revision');
    expect(classifyVerdict(0.5399, 0.25)).toBe('revision');
    expect(classifyVerdict(0.54, 0.25)).toBe('rejected');
    // p = 0.90 → band = 0.05, 수정 요구는 [0.90, 0.95)
    expect(classifyVerdict(0.9499, 0.90)).toBe('revision');
    expect(classifyVerdict(0.95, 0.90)).toBe('rejected');
  });
});

describe('submitIfReady (선택권 §6.2–§6.3)', () => {
  it('submits a full draft with the quality formula, tier, venue, review clock', () => {
    const s = fixture(STEM, 10, [paper('p1', { writing: 100 })]);
    const out = submitIfReady(s, data);
    const p = out.phd!.papers[0]!;
    const noise = (2 * draw(SEED, 'paper', 10, 'p1:quality') - 1) * 9;
    expect(p.quality).toBeCloseTo(clamp(30 + 0.45 * 50 + 0.08 * 50 + noise + 0.1 * (50 - 50), 0, 100), 12);
    expect(p).toMatchObject({ status: 'submitted', tier: 'T1', attempts: 1, submittedMonth: 10 });
    expect(venueOptions(data, 'ai', 'T1').map(o => o.venueId)).toContain(p.venueId ?? null);
    const [lo, hi] = ASSUMED.REVIEW_MONTHS.cs;
    const review = lo + Math.floor(draw(SEED, 'paper', 10, 'p1:review') * (hi - lo + 1));
    const [dlo, dhi] = ASSUMED.REVIEW_DELAY_MONTHS;
    const delay = draw(SEED, 'paper', 10, 'p1:delay') < ASSUMED.REVIEW_DELAY_P
      ? dlo + Math.floor(draw(SEED, 'paper', 10, 'p1:delay:months') * (dhi - dlo + 1)) : 0;
    expect(p.dueMonth).toBe(10 + review + delay);
  });
  it('picks the venue uniformly from venueOptions using the venue slot', () => {
    const s = fixture(STEM, 10, [paper('p1', { writing: 100 })]);
    const opts = venueOptions(data, 'ai', 'T1');
    const idx = Math.floor(draw(SEED, 'paper', 10, 'p1:venue') * opts.length);
    expect(submitIfReady(s, data).phd!.papers[0]!.venueId).toBe(opts[idx]!.venueId ?? undefined);
  });
  it('advisor rigor shifts quality by 0.1 per point', () => {
    const base = fixture(STEM, 10, [paper('p1', { writing: 100 })]);
    const strict = { ...base, phd: { ...base.phd!, advisor: { ...base.phd!.advisor, rigor: 80 } } };
    const a = submitIfReady(base, data).phd!.papers[0]!.quality, b = submitIfReady(strict, data).phd!.papers[0]!.quality;
    expect(b - a).toBeCloseTo(3, 12);
  });
  it('first tier is T1 for 이공 and T3 for 인문사회', () => {
    expect(submitIfReady(fixture(STEM, 10, [paper('p1', { writing: 100 })]), data).phd!.papers[0]!.tier).toBe('T1');
    expect(submitIfReady(fixture(HUM, 10, [paper('p1', { writing: 100 })]), data).phd!.papers[0]!.tier).toBe('T3');
  });
  it('leaves drafts under 100 and non-drafts alone, does not mutate its input, and is deterministic', () => {
    const papers = [paper('p1', { writing: 99.9 }), paper('p2', { writing: 100 }), submitted('p3', 12)];
    const s = fixture(STEM, 10, papers);
    const frozen = structuredClone(s);
    const out = submitIfReady(s, data);
    expect(s).toEqual(frozen);
    expect(out.phd!.papers[0]).toEqual(papers[0]);
    expect(out.phd!.papers[1]!.status).toBe('submitted');
    expect(out.phd!.papers[2]).toEqual(papers[2]);
    expect(submitIfReady(s, data)).toEqual(out);
  });
  it('review clock stays within the field range plus the delay range, and about 18% are delayed', () => {
    const [lo, hi] = ASSUMED.REVIEW_MONTHS.cs, [, dhi] = ASSUMED.REVIEW_DELAY_MONTHS;
    let delayed = 0;
    const n = 600;
    for (let i = 0; i < n; i++) {
      const out = submitIfReady(fixture(STEM, 10, [paper(`p${i}`, { writing: 100 })]), data);
      const d = out.phd!.papers[0]!.dueMonth! - 10;
      expect(d).toBeGreaterThanOrEqual(lo); expect(d).toBeLessThanOrEqual(hi + dhi);
      if (draw(SEED, 'paper', 10, `p${i}:delay`) < ASSUMED.REVIEW_DELAY_P) delayed++;
    }
    expect(delayed / n).toBeGreaterThan(0.13); expect(delayed / n).toBeLessThan(0.23);
  });
  it('no phd state → returned unchanged', () => {
    const s = { ...fixture(STEM, 10, []), phd: undefined, stage: 'career' as const };
    expect(submitIfReady(s, data)).toBe(s);
  });
});

describe('resolveVerdicts (선택권 §6.4, §3.2)', () => {
  it('does not touch papers that are not due', () => {
    const papers = [submitted('p1', 13), paper('p2', { writing: 40 }), paper('p3', { status: 'accepted', tier: 'T2', attempts: 1 })];
    const s = fixture(STEM, 12, papers);
    const { state, verdicts } = resolveVerdicts(s, data);
    expect(verdicts).toEqual([]);
    expect(state.phd!.papers).toEqual(papers);
  });
  it('a due paper gets the verdict its draw implies', () => {
    for (let i = 0; i < 200; i++) {
      const p = submitted(`a${i}`, 12), s = fixture(STEM, 12, [p]);
      const { verdicts } = resolveVerdicts(s, data);
      expect(verdicts).toEqual([{ paperId: p.id, verdict: classifyVerdict(verdictU(s, p), acceptProbability(s, data, p)), first: true }]);
    }
  });
  it('first verdict: status is set to the verdict and nothing is resubmitted', () => {
    const reject = idWith(u => u >= 0.6);
    const { state, verdicts } = resolveVerdicts(fixture(STEM, 12, [submitted(reject, 12)]), data);
    expect(verdicts[0]).toMatchObject({ verdict: 'rejected', first: true });
    expect(state.phd!.papers[0]).toMatchObject({ status: 'rejected', tier: 'T1', attempts: 1 });
    expect(state.phd!.papers[0]!.dueMonth).toBeUndefined();
  });
  it('first is false when an earlier paper already had a verdict or the decision is recorded', () => {
    const withEarlier = fixture(STEM, 12, [paper('p0', { status: 'accepted', tier: 'T2', attempts: 1 }), submitted('x1', 12)]);
    expect(resolveVerdicts(withEarlier, data).verdicts[0]!.first).toBe(false);
    const withDecision = { ...fixture(STEM, 12, [submitted('x1', 12)]), decisions: [{ dp: 'first-paper-verdict' as const, month: 5, option: 'A', byPolicy: false }] };
    expect(resolveVerdicts(withDecision, data).verdicts[0]!.first).toBe(false);
    const draftsAndSubmittedOnly = fixture(STEM, 12, [paper('p0'), submitted('p9', 20), submitted('x1', 12)]);
    expect(resolveVerdicts(draftsAndSubmittedOnly, data).verdicts[0]!.first).toBe(true);
  });
  it('a revision-status paper coming back for re-review is not a first verdict', () => {
    const s = fixture(STEM, 12, [submitted('p1', 12, { status: 'revision' })]);
    expect(resolveVerdicts(s, data).verdicts[0]!.first).toBe(false);
  });
  it('only one paper is first when several are due in the same month', () => {
    const s = fixture(STEM, 12, [submitted('p1', 12), submitted('p2', 12), submitted('p3', 12)]);
    expect(resolveVerdicts(s, data).verdicts.map(v => v.first)).toEqual([true, false, false]);
  });

  const nonFirst = (id: string, tier: Tier): LifeState =>
    fixture(STEM, 12, [paper('p0', { status: 'accepted', tier: 'T2', attempts: 1 }), submitted(id, 12, { tier })]);

  it('non-first rejection → resubmitted one tier lower next month (T4 stays T4)', () => {
    const id = idWith(u => u >= 0.99);   // 어떤 계층에서도 p + 구간 ≤ 0.95 이므로 거절
    for (const [from, to] of [['T1', 'T2'], ['T2', 'T3'], ['T3', 'T4'], ['T4', 'T4']] as const) {
      const { state, verdicts } = resolveVerdicts(nonFirst(id, from), data);
      expect(verdicts.find(v => v.paperId === id)).toMatchObject({ verdict: 'rejected', first: false });
      const p = state.phd!.papers.find(x => x.id === id)!;
      expect(p).toMatchObject({ status: 'submitted', tier: to, attempts: 2, submittedMonth: 13 });
      const [lo, hi] = ASSUMED.REVIEW_MONTHS.cs, [, dhi] = ASSUMED.REVIEW_DELAY_MONTHS;
      expect(p.dueMonth! - 13).toBeGreaterThanOrEqual(lo); expect(p.dueMonth! - 13).toBeLessThanOrEqual(hi + dhi);
    }
  });
  it('#185: every verdict leaves one log line (first verdict too); the automatic resubmission after a rejection leaves none', () => {
    const line = (s: LifeState) => s.log.filter(l => l.textKey.startsWith('log.paper-'));
    for (const [cut, verdict] of [[(u: number) => u < 0.01, 'accepted'], [(u: number) => classifyVerdict(u, 0.25) === 'revision', 'revision'], [(u: number) => u >= 0.99, 'rejected']] as const) {
      const id = idWith(cut);
      for (const base of [fixture(STEM, 12, [submitted(id, 12)]), nonFirst(id, 'T1')]) {
        const p = base.phd!.papers.find(x => x.id === id)!;
        const { state } = resolveVerdicts(base, data);
        expect(line(state)).toEqual([{ month: 12, textKey: `log.paper-${verdict}`, tags: [id, p.tier ?? '', p.venueId ?? '', String(p.attempts)], creative: false }]);
        expect(state.log.slice(0, base.log.length)).toEqual(base.log);
      }
    }
  });
  it('lowerTier', () => {
    expect([lowerTier('T1'), lowerTier('T2'), lowerTier('T3'), lowerTier('T4')]).toEqual(['T2', 'T3', 'T4', 'T4']);
  });
  it('non-first revision → status revision, half-length re-review, quality and bonus unchanged', () => {
    const id = idWith(u => classifyVerdict(u, 0.25) === 'revision');
    const { state, verdicts } = resolveVerdicts(nonFirst(id, 'T1'), data);
    expect(verdicts.find(v => v.paperId === id)).toMatchObject({ verdict: 'revision', first: false });
    const p = state.phd!.papers.find(x => x.id === id)!;
    expect(p).toMatchObject({ status: 'revision', tier: 'T1', attempts: 1, quality: 55, logitBonus: 0 });
    const [lo, hi] = ASSUMED.REVIEW_MONTHS.cs;
    expect(p.dueMonth! - 12).toBeGreaterThanOrEqual(Math.ceil(lo / ASSUMED.REREVIEW_DIVISOR));
    expect(p.dueMonth! - 12).toBeLessThanOrEqual(Math.ceil(hi / ASSUMED.REREVIEW_DIVISOR));
  });
  it('accepted → status accepted, no more clock', () => {
    const id = idWith(u => u < 0.2);
    const { state, verdicts } = resolveVerdicts(nonFirst(id, 'T1'), data);
    expect(verdicts.find(v => v.paperId === id)!.verdict).toBe('accepted');
    const p = state.phd!.papers.find(x => x.id === id)!;
    expect(p.status).toBe('accepted'); expect(p.dueMonth).toBeUndefined();
  });
  it('a revision that comes back again uses the draw of its own month', () => {
    const s = fixture(STEM, 14, [paper('p0', { status: 'accepted', tier: 'T2', attempts: 1 }), submitted('p1', 14, { status: 'revision' })]);
    const { verdicts } = resolveVerdicts(s, data);
    expect(verdicts).toHaveLength(1);
    expect(verdicts[0]!.first).toBe(false);
    expect(verdictU(s, s.phd!.papers[1]!)).toBe(draw(SEED, 'paper', 14, 'p1:verdict:1'));
  });
  it('2000 fixture papers at T1/quality 55: acceptance ≈ 0.25 ± 0.03, revision ≈ 0.29, no input mutation', () => {
    const papers = Array.from({ length: 2000 }, (_, i) => submitted(`m${i}`, 12));
    const s = fixture(STEM, 12, papers, 'APHD-MEAN2000');
    const frozen = structuredClone(s);
    const { verdicts } = resolveVerdicts(s, data);
    expect(s).toEqual(frozen);
    const n = (v: string): number => verdicts.filter(x => x.verdict === v).length;
    expect(verdicts).toHaveLength(2000);
    expect(Math.abs(n('accepted') / 2000 - 0.25)).toBeLessThan(0.03);
    expect(Math.abs(n('revision') / 2000 - 0.29)).toBeLessThan(0.03);
    expect(Math.abs(n('rejected') / 2000 - 0.46)).toBeLessThan(0.03);
  });
});

describe('resubmit', () => {
  it('moves a paper to the given tier with attempts + 1, a fresh venue and clock, and a reset revision bonus', () => {
    const s = fixture(STEM, 20, [paper('p1', { status: 'rejected', writing: 100, tier: 'T1', attempts: 1, quality: 61, logitBonus: 0.8 })]);
    const out = resubmit(s, data, 'p1', 'T2');
    const p = out.phd!.papers[0]!;
    expect(p).toMatchObject({ status: 'submitted', tier: 'T2', attempts: 2, quality: 61, submittedMonth: 20, logitBonus: 0 });
    expect(venueOptions(data, 'ai', 'T2').map(o => o.venueId)).toContain(p.venueId ?? null);
    expect(p.dueMonth).toBeGreaterThan(20);
    expect(s.phd!.papers[0]!.status).toBe('rejected');
  });
  it('throws for an unknown paper', () => {
    expect(() => resubmit(fixture(STEM, 20, []), data, 'nope', 'T1')).toThrow();
  });
});

describe('score and counts', () => {
  const ps = [paper('a', { status: 'accepted', tier: 'T1' }), paper('b', { status: 'accepted', tier: 'T3' }), paper('c', { status: 'submitted', tier: 'T1' }),
    paper('d', { status: 'rejected', tier: 'T2' }), paper('e', { status: 'accepted', tier: 'T4' })];
  it('paperScore sums the tier weights of accepted papers (0014#71)', () => {
    expect(paperScore(ps)).toBe(3 + 1.5 + 1);
    expect(paperScore([])).toBe(0);
  });
  it('acceptedCount, optionally restricted to a minimum tier', () => {
    expect(acceptedCount(ps)).toBe(3);
    expect(acceptedCount(ps, 'T3')).toBe(2);
    expect(acceptedCount(ps, 'T1')).toBe(1);
  });
  it('activeDraft is the first draft', () => {
    expect(activeDraft(ps)).toBeUndefined();
    expect(activeDraft([...ps, paper('f'), paper('g')])!.id).toBe('f');
  });
});
