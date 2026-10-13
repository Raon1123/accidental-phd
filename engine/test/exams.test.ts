import { describe, it, expect } from 'vitest';
import { ASSUMED } from '../src/assumed';
import { loadData } from '../src/data/load';
import { odds, z } from '../src/odds';
import { draw } from '../src/rng';
import { createLife } from '../src/pre/createLife';
import { defenseEligible, defenseProbability, qualProbability, qualWindowOpen, takeDefense, takeQual } from '../src/phd/exams';
import type { LifeState, Paper, PhdState, Stats } from '../src/types';

const data = loadData();
const SEED = 'APHD-EXAMS001';
const MEAN: Stats = { health: 50, mind: 50, skill: 50, relation: 50, network: 50 };
const acc = (id: string, tier: Paper['tier'] = 'T2'): Paper => ({ id, status: 'accepted', writing: 100, quality: 60, tier, attempts: 1, logitBonus: 0 });

function fixture(over: Partial<PhdState> = {}, top: Partial<LifeState> = {}, config: Parameters<typeof createLife>[0] = { group: '이공', track: 'ai' }): LifeState {
  const s = createLife(config, top.seed ?? SEED, data);
  return { ...s, stats: { ...MEAN }, ...top, phd: { ...s.phd!, ...over } };
}
/** 학위 심사 자격 4조건을 모두 갖춘 이공 상태. */
const eligible = (over: Partial<PhdState> = {}, top: Partial<LifeState> = {}): LifeState =>
  fixture({ qualified: true, project: 100, papers: [acc('p1'), acc('p2')], requiredPapers: 2, path: 'academia', ...over }, { month: 50, ...top });

describe('qualWindowOpen (선택권 §7.1)', () => {
  it('opens at enrolledMonths 12, 18, 24 and not between', () => {
    const open = (m: number): boolean => qualWindowOpen(fixture({ enrolledMonths: m }));
    expect([11, 12, 13, 15, 17, 18, 24, 30].map(open)).toEqual([false, true, false, false, false, true, true, true]);
    expect(open(0)).toBe(false);
  });
  it('closed once qualified, after the third failure, or on leave', () => {
    expect(qualWindowOpen(fixture({ enrolledMonths: 12, qualified: true }))).toBe(false);
    expect(qualWindowOpen(fixture({ enrolledMonths: 12, qualAttempts: ASSUMED.QUAL_EXAM.maxAttempts }))).toBe(false);
    expect(qualWindowOpen(fixture({ enrolledMonths: 12, qualAttempts: 2 }))).toBe(true);
    expect(qualWindowOpen(fixture({ enrolledMonths: 12, leave: { active: true, until: 20, totalMonths: 0 } }))).toBe(false);
  });
  it('no phd state → closed', () => {
    expect(qualWindowOpen({ ...fixture(), phd: undefined })).toBe(false);
  });
});

describe('qualProbability / takeQual (선택권 §7.1)', () => {
  it('mean stats, first attempt → 0.70', () => {
    expect(qualProbability(MEAN, 1)).toBeCloseTo(0.70, 9);
  });
  it('matches odds() with skill, health and retry terms', () => {
    const st = { ...MEAN, skill: 80, health: 30 };
    expect(qualProbability(st, 3)).toBeCloseTo(odds(0.70, 1.2 * z(80) + 0.3 * z(30) + 0.25 * 2, 0.10, 0.95), 12);
    expect(qualProbability({ ...MEAN, skill: 100, health: 100 }, 6)).toBe(0.95);
    expect(qualProbability({ ...MEAN, skill: 0, health: 0 }, 1)).toBeCloseTo(odds(0.70, -1.5, 0.10, 0.95), 12);   // 하한 0.10 은 첫 시도에서 닿지 않는다
  });
  it('pass: qualified, attempt counted, draw slot is qual:<attempt> in stream exam', () => {
    const s = fixture({ enrolledMonths: 12 }, { month: 12 });
    const u = draw(SEED, 'exam', 12, 'qual:1');
    const r = takeQual(s, data);
    expect(r.passed).toBe(u < qualProbability(s.stats, 1));
    expect(r.state.phd!.qualAttempts).toBe(1);
    expect(r.state.phd!.qualified).toBe(r.passed);
    expect(s.phd!.qualAttempts).toBe(0);   // 입력 불변
  });
  it('pass / fail frequency follows the probability', () => {
    let pass = 0;
    const n = 2000;
    for (let i = 0; i < n; i++) if (takeQual(fixture({ enrolledMonths: 12 }, { month: 12, seed: `APHD-Q${i}` }), data).passed) pass++;
    expect(Math.abs(pass / n - 0.7)).toBeLessThan(0.03);
  });
  // 모든 시도에서 떨어지는 seed 를 찾는다(skill·health 를 낮춰 확률이 낮아도 draw 가 높으면 실패).
  const failingSeed = (): string => {
    for (let i = 0; i < 5000; i++) {
      const seed = `APHD-F${i}`;
      if ([1, 2, 3].every(a => draw(seed, 'exam', 12 + 6 * (a - 1), `qual:${a}`) >= 0.80)) return seed;
    }
    throw new Error('no failing seed');
  };
  it('three failures end the life as dropout; the first two do not', () => {
    const seed = failingSeed();
    let s = fixture({ enrolledMonths: 12 }, { month: 12, seed });
    let r = takeQual(s, data);
    expect(r.passed).toBe(false); expect(r.state.end).toBeUndefined(); expect(r.state.stage).toBe('phd');
    s = { ...r.state, month: 18, phd: { ...r.state.phd!, enrolledMonths: 18 } };
    r = takeQual(s, data);
    expect(r.passed).toBe(false); expect(r.state.end).toBeUndefined();
    s = { ...r.state, month: 24, phd: { ...r.state.phd!, enrolledMonths: 24 } };
    r = takeQual(s, data);
    expect(r.passed).toBe(false);
    expect(r.state.phd!.qualAttempts).toBe(3);
    expect(r.state.end).toEqual({ reason: 'dropout', month: 24 });
    expect(r.state.stage).toBe('end');
  });
  it('refuses nonsense calls: already qualified, attempts exhausted, no phd', () => {
    expect(() => takeQual(fixture({ qualified: true }), data)).toThrow();
    expect(() => takeQual(fixture({ qualAttempts: 3 }), data)).toThrow();
    expect(() => takeQual({ ...fixture(), phd: undefined }, data)).toThrow();
  });
});

describe('defenseEligible (선택권 §7.2)', () => {
  it('true with all four conditions', () => {
    expect(defenseEligible(eligible())).toBe(true);
  });
  it.each([
    ['not qualified', { qualified: false }],
    ['project below 100', { project: 99 }],
    ['too few accepted papers', { papers: [acc('p1')] }],
    ['papers not accepted', { papers: [acc('p1'), { ...acc('p2'), status: 'submitted' as const }] }],
    ['path not decided', { path: undefined }],
    ['on leave', { leave: { active: true, until: 60, totalMonths: 0 } }],
    ['already passed (graduation scheduled)', { graduationMonth: 54 }],
  ])('false when %s', (_n, over) => {
    expect(defenseEligible(eligible(over as Partial<PhdState>))).toBe(false);
  });
  it('인문사회 needs at least one accepted paper at T3 or better', () => {
    const hum = (papers: Paper[]): LifeState => eligible({ papers, requiredPapers: 1 }, { choices: { ...fixture({}, {}, { group: '인문사회', track: 'sociology' }).choices } });
    expect(defenseEligible(hum([acc('p1', 'T4')]))).toBe(false);
    expect(defenseEligible(hum([acc('p1', 'T3')]))).toBe(true);
    expect(defenseEligible(hum([acc('p1', 'T4'), acc('p2', 'T1')]))).toBe(true);
  });
  it('이공 accepts any tier', () => {
    expect(defenseEligible(eligible({ papers: [acc('p1', 'T4'), acc('p2', 'T4')] }))).toBe(true);
  });
  it('waits for nextDefenseMonth after a failed defense', () => {
    expect(defenseEligible(eligible({ nextDefenseMonth: 56 }, { month: 55 }))).toBe(false);
    expect(defenseEligible(eligible({ nextDefenseMonth: 56 }, { month: 56 }))).toBe(true);
  });
  it('no phd state → false', () => {
    expect(defenseEligible({ ...eligible(), phd: undefined })).toBe(false);
  });
});

describe('defenseProbability / takeDefense (선택권 §7.2)', () => {
  it('mean stats, first attempt → 0.73', () => {
    expect(defenseProbability(MEAN, 1)).toBeCloseTo(0.73, 9);
  });
  it('matches odds() with skill, relation, health and retry terms; bounds 0.40–0.95', () => {
    const st = { ...MEAN, skill: 70, relation: 20, health: 60 };
    expect(defenseProbability(st, 2)).toBeCloseTo(odds(0.73, 1.0 * z(70) + 0.4 * z(20) + 0.3 * z(60) + 0.6, 0.40, 0.95), 12);
    expect(defenseProbability({ ...MEAN, skill: 0, relation: 0, health: 0 }, 1)).toBe(0.40);
    expect(defenseProbability({ ...MEAN, skill: 100, relation: 100, health: 100 }, 3)).toBe(0.95);
  });
  it('graduation month is the next semester boundary, strictly after the pass month', () => {
    const passSeed = (month: number): string => {
      for (let i = 0; i < 500; i++) if (draw(`APHD-D${i}`, 'exam', month, 'defense:1') < 0.4) return `APHD-D${i}`;
      throw new Error('no passing seed');
    };
    for (const month of [50, 51, 53, 54, 55, 59, 60]) {
      const r = takeDefense(eligible({}, { month, seed: passSeed(month) }), data);
      expect(r.passed).toBe(true);
      expect(r.state.phd!.graduationMonth).toBe(month + (6 - (month % 6)));
      expect(r.state.phd!.graduationMonth! % 6).toBe(0);
      expect(r.state.phd!.graduationMonth!).toBeGreaterThan(month);
      expect(r.state.phd!.defenseAttempts).toBe(1);
    }
  });
  it('failure schedules the retry six months later and counts the attempt', () => {
    const failSeed = (): string => {
      for (let i = 0; i < 500; i++) if (draw(`APHD-E${i}`, 'exam', 50, 'defense:1') >= 0.96) return `APHD-E${i}`;
      throw new Error('no failing seed');
    };
    const r = takeDefense(eligible({}, { month: 50, seed: failSeed() }), data);
    expect(r.passed).toBe(false);
    expect(r.state.phd!.nextDefenseMonth).toBe(50 + ASSUMED.DEFENSE.retryMonths);
    expect(r.state.phd!.defenseAttempts).toBe(1);
    expect(r.state.phd!.graduationMonth).toBeUndefined();
    expect(r.state.end).toBeUndefined();
    expect(defenseEligible(r.state)).toBe(false);
    expect(defenseEligible({ ...r.state, month: 56 })).toBe(true);
  });
  it('second attempt uses slot defense:2 and the retry bonus', () => {
    const s = eligible({ defenseAttempts: 1 }, { month: 56 });
    const r = takeDefense(s, data);
    expect(r.passed).toBe(draw(SEED, 'exam', 56, 'defense:2') < defenseProbability(s.stats, 2));
    expect(r.state.phd!.defenseAttempts).toBe(2);
  });
  it('pass frequency at mean stats ≈ 0.73', () => {
    let pass = 0;
    const n = 2000;
    for (let i = 0; i < n; i++) if (takeDefense(eligible({}, { seed: `APHD-P${i}` }), data).passed) pass++;
    expect(Math.abs(pass / n - 0.73)).toBeLessThan(0.03);
  });
  it('refuses a defense when not eligible, and does not mutate its input', () => {
    expect(() => takeDefense(eligible({ project: 50 }), data)).toThrow();
    const s = eligible();
    const frozen = structuredClone(s);
    takeDefense(s, data);
    expect(s).toEqual(frozen);
  });
});
