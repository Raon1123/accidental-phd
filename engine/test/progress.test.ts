import { describe, it, expect } from 'vitest';
import { ASSUMED } from '../src/assumed';
import { loadData } from '../src/data/load';
import { createLife } from '../src/pre/createLife';
import { draw } from '../src/rng';
import { advisorA, applyProgress, blockedProbability, gK, progressGain, researchTime, type GainParams } from '../src/phd/progress';
import type { Focus, Kedi, LifeState } from '../src/types';

const data = loadData();
const SEED = 'APHD-AAAAAAAA';

function base(over: { focus?: Focus; month?: number; track?: string; group?: '이공' | '인문사회'; coursework?: boolean; duty?: number; project?: number } = {}): LifeState {
  const group = over.group ?? '인문사회';
  const s = createLife({ funding: 'self', school: 'snu', track: over.track ?? 'philosophy', group }, SEED, data);
  return {
    ...s, month: over.month ?? 1,
    stats: { health: 60, mind: 50, skill: 70, relation: 50, network: 50 },
    phd: {
      ...s.phd!, focus: over.focus ?? 'research', coursework: over.coursework ?? false, project: over.project ?? 0,
      advisor: { type: 'support', support: 50, rigor: 50, network: 50 },
      fundingState: { ...s.phd!.fundingState, dutyHours: over.duty ?? 0 },
    },
  };
}

const params = (o: Partial<GainParams> = {}): GainParams =>
  ({ g: 2, u: 0.5, skill: 70, researchTime: 1, health: 50, support: 50, rigor: 50, f: 1, blocked: false, ...o });

describe('gK (선택권 §4.2)', () => {
  it('matches 100 / ((12·T − 6) × 0.68) from the duration records', () => {
    const t: Record<Kedi, number> = { humanities: 6, social: 5, natural: 5.5, engineering: 5.5 };
    for (const k of Object.keys(t) as Kedi[]) {
      expect(gK(data, k)).toBeCloseTo(100 / ((12 * t[k] - 6) * 0.68), 10);
    }
  });
  it('is within 0.01 of the starting values in ASSUMED.G_INIT', () => {
    expect(gK(data, 'humanities')).toBeCloseTo(2.23, 1);
    expect(gK(data, 'social')).toBeCloseTo(2.72, 1);
    expect(gK(data, 'natural')).toBeCloseTo(2.45, 1);
    expect(gK(data, 'engineering')).toBeCloseTo(2.45, 1);
    for (const k of Object.keys(ASSUMED.G_INIT) as Kedi[]) expect(Math.abs(gK(data, k) - ASSUMED.G_INIT[k])).toBeLessThanOrEqual(0.01);
  });
});

describe('researchTime', () => {
  it('coursework + TA (10h) = max(0.12, (44 − 10 − 0 − 6)/44)', () => {
    const s = base({ coursework: true, duty: ASSUMED.TA_DUTY_HOURS });
    expect(researchTime(s)).toBeCloseTo(Math.max(0.12, (44 - 10 - 0 - 6) / 44), 10);
    expect(researchTime(s)).toBeCloseTo(28 / 44, 10);
  });
  it('work focus removes 20 job hours; others do not', () => {
    expect(researchTime(base({ focus: 'work' }))).toBeCloseTo(24 / 44, 10);
    expect(researchTime(base({ focus: 'research' }))).toBe(1);
    expect(researchTime(base({ focus: 'write' }))).toBe(1);
  });
  it('never falls below 0.12', () => {
    expect(researchTime(base({ focus: 'work', coursework: true, duty: 40 }))).toBe(ASSUMED.RESEARCH_TIME_MIN);
  });
});

describe('progressGain (pure formula)', () => {
  it('equals the product of every factor', () => {
    const p = params({ u: 0.5, support: 75, rigor: 45, f: 0.3, researchTime: 28 / 44, health: 80 });
    const expected = 2 * (0.65 + 0.85 * 0.5) * (0.65 + 70 / 140) * (28 / 44) * (0.5 + 0.8) * (0.75 + 0.003 * 75 + 0.002 * 45) * 0.3;
    expect(progressGain(p)).toBeCloseTo(expected, 10);
  });
  it('blocked month is × 0.2', () => {
    expect(progressGain(params({ blocked: true }))).toBeCloseTo(0.2 * progressGain(params()), 10);
  });
  it('health 0 → E = 0.5, health 100 → E = 1.5', () => {
    expect(progressGain(params({ health: 0 })) / progressGain(params({ health: 50 }))).toBeCloseTo(0.5 / 1.0, 10);
    expect(progressGain(params({ health: 100 })) / progressGain(params({ health: 50 }))).toBeCloseTo(1.5 / 1.0, 10);
  });
  it('noise spans U(0.65, 1.50); rest (f = 0) gives nothing', () => {
    expect(progressGain(params({ u: 0 })) / progressGain(params({ u: 0.999999999 }))).toBeCloseTo(0.65 / 1.5, 6);
    expect(progressGain(params({ f: 0 }))).toBe(0);
  });
  it('advisor multiplier A is 1.00 at support = rigor = 50', () => {
    expect(advisorA(50, 50)).toBeCloseTo(1.0, 10);
    expect(advisorA(75, 45)).toBeCloseTo(0.75 + 0.225 + 0.09, 10);
  });
});

describe('blockedProbability', () => {
  it('0.24 for mathematics and statistics, 0.16 otherwise', () => {
    expect(blockedProbability('mathematics')).toBeCloseTo(0.24, 10);
    expect(blockedProbability('statistics')).toBeCloseTo(0.24, 10);
    expect(blockedProbability('philosophy')).toBeCloseTo(0.16, 10);
  });
});

/** 같은 seed 에서 막힘 슬롯이 문턱 아래인 달과 위인 달을 찾는다. */
function findMonths(p: number): { blocked: number; free: number } {
  let blocked = -1, free = -1;
  for (let m = 1; m < 400 && (blocked < 0 || free < 0); m++) {
    if (draw(SEED, 'progress', m, 'blocked') < p) { if (blocked < 0) blocked = m; } else if (free < 0) free = m;
  }
  return { blocked, free };
}

describe('applyProgress', () => {
  it('uses the progress/blocked and progress/gain slots', () => {
    const { blocked, free } = findMonths(0.16);
    expect(blocked).toBeGreaterThan(0);
    for (const m of [blocked, free]) {
      const s0 = base({ month: m });
      const s = applyProgress(s0, data);
      const isBlocked = draw(SEED, 'progress', m, 'blocked') < 0.16;
      expect(s.phd!.blocked).toBe(isBlocked);
      const expected = progressGain({
        g: gK(data, 'humanities'), u: draw(SEED, 'progress', m, 'gain'), skill: 70, researchTime: 1, health: 60,
        support: 50, rigor: 50, f: 1, blocked: isBlocked,
      });
      expect(s.phd!.project).toBeCloseTo(expected, 10);
    }
  });

  it('a blocked month yields 0.2 × the unblocked gain for the same noise draw', () => {
    const { blocked } = findMonths(0.16);
    const s0 = base({ month: blocked });
    const withBlock = applyProgress(s0, data).phd!.project;
    const u = draw(SEED, 'progress', blocked, 'gain');
    const open = progressGain({ g: gK(data, 'humanities'), u, skill: 70, researchTime: 1, health: 60, support: 50, rigor: 50, f: 1, blocked: false });
    expect(withBlock).toBeCloseTo(0.2 * open, 10);
  });

  it('uses 0.24 for mathematics: a draw in [0.16, 0.24) blocks only there', () => {
    let m = -1;
    for (let i = 1; i < 2000 && m < 0; i++) { const u = draw(SEED, 'progress', i, 'blocked'); if (u >= 0.16 && u < 0.24) m = i; }
    expect(m).toBeGreaterThan(0);
    expect(applyProgress(base({ month: m, track: 'mathematics', group: '이공' }), data).phd!.blocked).toBe(true);
    expect(applyProgress(base({ month: m }), data).phd!.blocked).toBe(false);
  });

  it('project never exceeds 100', () => {
    const { free } = findMonths(0.16);
    const s = applyProgress(base({ month: free, project: 99.99 }), data);
    expect(s.phd!.project).toBe(ASSUMED.PROJECT_MAX);
    expect(applyProgress(s, data).phd!.project).toBe(ASSUMED.PROJECT_MAX);
  });

  it('rest gives no progress; leave freezes progress and the blocked flag', () => {
    const { free } = findMonths(0.16);
    expect(applyProgress(base({ month: free, focus: 'rest' }), data).phd!.project).toBe(0);
    const s0 = base({ month: free });
    const leave = { ...s0, phd: { ...s0.phd!, project: 12, blocked: true, leave: { active: true, until: 12, totalMonths: 1 } } };
    expect(applyProgress(leave, data)).toBe(leave);
  });

  it('is deterministic and does not mutate its input', () => {
    const s0 = base({ month: 5 });
    const snap = JSON.stringify(s0);
    expect(applyProgress(s0, data)).toEqual(applyProgress(s0, data));
    expect(JSON.stringify(s0)).toBe(snap);
  });

  it('a different month gives a different draw (named slot per month)', () => {
    const a = applyProgress(base({ month: 3 }), data).phd!.project;
    const b = applyProgress(base({ month: 4 }), data).phd!.project;
    expect(a).not.toBe(b);
  });
});
