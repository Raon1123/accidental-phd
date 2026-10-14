import { describe, it, expect } from 'vitest';
import { ASSUMED } from '../src/assumed';
import { loadData } from '../src/data/load';
import { hazardMonth } from '../src/odds';
import { draw } from '../src/rng';
import { createLife } from '../src/pre/createLife';
import { applyHazards, canStartLeave, dropoutHazard, leaveHazard, startLeave } from '../src/phd/hazards';
import type { LifeState, PhdState, Stats } from '../src/types';

const data = loadData();
const SEED = 'APHD-HAZARD01';
const MEAN: Stats = { health: 50, mind: 50, skill: 50, relation: 50, network: 50 };
const HUM = { group: '인문사회' as const, track: 'history' };   // kedi humanities: 휴학 0.188, 탈락 0.064
const STEM = { group: '이공' as const, track: 'ai' };            // kedi engineering: 휴학 0.08, 탈락 0.046

function fixture(config: Parameters<typeof createLife>[0], over: Partial<PhdState> = {}, top: Partial<LifeState> = {}): LifeState {
  const s = createLife(config, top.seed ?? SEED, data);
  return { ...s, month: 20, stats: { ...MEAN }, ...top, phd: { ...s.phd!, enrolledMonths: 18, ...over } };
}
const seeds = (prefix: string, n: number): string[] => Array.from({ length: n }, (_, i) => `APHD-${prefix}${i}`);
const onLeave = (until: number, totalMonths = 0): Partial<PhdState> => ({ leave: { active: true, until, totalMonths } });
const burnouts = (s: LifeState): boolean => s.log.some(l => l.tags.includes('burnout'));

describe('hazard rates (선택권 §4.5)', () => {
  it('humanities, mean stats: leave = hazardMonth(0.188) ≈ 0.0172, dropout = 0.5 × hazardMonth(0.064)', () => {
    const s = fixture(HUM);
    expect(leaveHazard(s, data)).toBeCloseTo(hazardMonth(0.188), 12);
    expect(leaveHazard(s, data)).toBeCloseTo(0.0172, 3);
    expect(Math.abs(leaveHazard(s, data) - 0.0172)).toBeLessThan(2e-4);
    expect(dropoutHazard(s, data)).toBeCloseTo(0.5 * hazardMonth(0.064), 12);
    expect(dropoutHazard(s, data)).toBeCloseTo(0.00275, 4);
  });
  it('engineering uses its own KEDI rates', () => {
    const s = fixture(STEM);
    expect(leaveHazard(s, data)).toBeCloseTo(hazardMonth(0.08), 12);
    expect(dropoutHazard(s, data)).toBeCloseTo(0.5 * hazardMonth(0.046), 12);
  });
  it('low mind/health raise the hazards by the 0014#48 coefficients', () => {
    const base = fixture(HUM);
    const low = { ...base, stats: { ...MEAN, mind: 0, health: 0, relation: 0 } };
    expect(leaveHazard(low, data) / leaveHazard(base, data)).toBeCloseTo(Math.exp(0.8 + 0.4), 12);
    expect(dropoutHazard(low, data) / dropoutHazard(base, data)).toBeCloseTo(Math.exp(0.8 + 0.5), 12);
    const high = { ...base, stats: { ...MEAN, mind: 100, health: 100, relation: 100 } };
    expect(leaveHazard(high, data)).toBeLessThan(leaveHazard(base, data));
  });
  it('dropout hazard doubles during leave (0014#31)', () => {
    const a = fixture(HUM), b = fixture(HUM, onLeave(30));
    expect(dropoutHazard(b, data) / dropoutHazard(a, data)).toBe(ASSUMED.LEAVE_DROPOUT_MULT);
  });
});

// 수천 번 추첨하는 빈도 검사라 병렬 실행 중에는 기본 제한 5초를 넘길 때가 있다(2026-10-14 두 번 5.2~5.4초). 계산은 바꾸지 않고 제한만 늘린다.
describe('applyHazards, active months', { timeout: 30_000 }, () => {
  it('leave starts exactly when the leave draw is under the hazard; duration is 6 or 12 from leave:months', () => {
    let started = 0;
    const list = seeds('L', 4000);
    for (const seed of list) {
      const s = fixture(HUM, {}, { seed });
      const hit = draw(seed, 'hazard', 20, 'leave') < leaveHazard(s, data) && draw(seed, 'hazard', 20, 'dropout') >= dropoutHazard(s, data);
      const out = applyHazards(s, data);
      expect(out.phd!.leave.active).toBe(hit);
      if (hit) {
        started++;
        const months = draw(seed, 'hazard', 20, 'leave:months') < 0.5 ? 6 : 12;
        expect(out.phd!.leave).toEqual({ active: true, until: 20 + months, totalMonths: 0 });
        expect(out.stats).toEqual(s.stats);   // 시작하는 달에는 회복 없음
        expect(out.log.at(-1)!.tags).toContain('leave');
      } else if (out.stage !== 'end') {
        expect(out.phd!.leave).toEqual(s.phd!.leave);
      }
    }
    expect(started / list.length).toBeGreaterThan(0.0172 - 0.007); expect(started / list.length).toBeLessThan(0.0172 + 0.007);
  });
  it('both leave durations occur', () => {
    const lens = new Set<number>();
    for (const seed of seeds('D', 3000)) { const o = applyHazards(fixture(HUM, {}, { seed }), data); if (o.phd!.leave.active) lens.add(o.phd!.leave.until - 20); }
    expect([...lens].sort((a, b) => a - b)).toEqual([6, 12]);
  });
  it('dropout ends the life with reason dropout at the current month', () => {
    const seed = seeds('X', 3000).find(sd => draw(sd, 'hazard', 20, 'dropout') < dropoutHazard(fixture(HUM, {}, { seed: sd }), data))!;
    const out = applyHazards(fixture(HUM, {}, { seed }), data);
    expect(out.stage).toBe('end'); expect(out.end).toEqual({ reason: 'dropout', month: 20 });
  });
  it('dropout frequency ≈ 0.00275 per month at mean stats', () => {
    let n = 0;
    const list = seeds('Y', 8000);
    for (const seed of list) if (applyHazards(fixture(HUM, {}, { seed }), data).end) n++;
    expect(n / list.length).toBeGreaterThan(0.0012); expect(n / list.length).toBeLessThan(0.0045);
  });
  it('does not mutate its input and is deterministic', () => {
    const s = fixture(HUM, onLeave(30, 3));
    const frozen = structuredClone(s);
    const out = applyHazards(s, data);
    expect(s).toEqual(frozen);
    expect(applyHazards(s, data)).toEqual(out);
  });
  it('no phd state → returned unchanged', () => {
    const s = { ...fixture(HUM), phd: undefined };
    expect(applyHazards(s, data)).toBe(s);
  });
});

describe('leave month (Review Focus 2)', () => {
  const s0 = (until: number, totalMonths: number, stats: Stats = { ...MEAN, health: 40, mind: 41 }): LifeState =>
    fixture(HUM, { ...onLeave(until, totalMonths), enrolledMonths: 18, project: 37 }, { month: 25, stats });
  // 이 달에 이탈 추첨이 걸리지 않는 seed
  const quiet = (st: LifeState): string => seeds('Q', 500).find(sd => draw(sd, 'hazard', 25, 'dropout') >= dropoutHazard({ ...st, seed: sd }, data))!;

  it('health and mind recover +3, totalMonths +1, enrolledMonths and project do not move, leave continues', () => {
    const base = s0(30, 2), seed = quiet(s0(30, 2));
    const out = applyHazards({ ...base, seed }, data);
    expect(out.stats).toMatchObject({ health: 43, mind: 44, skill: 50, relation: 50, network: 50 });
    expect(out.phd!.leave).toEqual({ active: true, until: 30, totalMonths: 3 });
    expect(out.phd!.enrolledMonths).toBe(18);
    expect(out.phd!.project).toBe(37);
    expect(out.month).toBe(25);   // 월·나이는 틱의 몫
  });
  it('recovery is exactly LEAVE_MONTHLY_RECOVERY and clamps at 100', () => {
    const base = s0(30, 0, { ...MEAN, health: 99, mind: 100 });
    const out = applyHazards({ ...base, seed: quiet(base) }, data);
    expect(out.stats.health).toBe(100); expect(out.stats.mind).toBe(100);
    expect(ASSUMED.LEAVE_MONTHLY_RECOVERY).toEqual({ health: 3, mind: 3 });
  });
  it('the last leave month (month ≥ until) still recovers, counts, and then ends the leave', () => {
    const base = s0(25, 5), seed = quiet(s0(25, 5));
    const out = applyHazards({ ...base, seed }, data);
    expect(out.phd!.leave).toEqual({ active: false, until: 25, totalMonths: 6 });
    expect(out.stats.health).toBe(43);
  });
  it('a 6-month leave started in month 20 covers months 21–26: six recoveries, then the leave ends', () => {
    const seed = seeds('R', 500).find(sd => [21, 22, 23, 24, 25, 26].every(m => draw(sd, 'hazard', m, 'dropout') >= 0.05))!;
    let s = startLeave(fixture(HUM, {}, { month: 20, seed }), 6, 'voluntary');
    expect(s.phd!.leave).toEqual({ active: true, until: 26, totalMonths: 0 });
    for (let m = 21; m <= 26; m++) {
      s = applyHazards({ ...s, month: m }, data);
      expect(s.phd!.leave.totalMonths).toBe(m - 20);
      expect(s.phd!.leave.active).toBe(m < 26);
      expect(s.stats.health).toBe(50 + 3 * (m - 20));
    }
    expect(s.phd!.enrolledMonths).toBe(18);
  });
  it('no new leave and no burnout while on leave, even at health 10', () => {
    for (const seed of seeds('B', 300)) {
      const base = s0(40, 0, { ...MEAN, health: 10, mind: 10 });
      const out = applyHazards({ ...base, seed }, data);
      if (out.end) continue;
      expect(out.phd!.leave.until).toBe(40);
      expect(burnouts(out)).toBe(false);
    }
  });
  it('dropout while on leave uses the doubled hazard', () => {
    const base = s0(40, 0, MEAN);
    const h = dropoutHazard({ ...base, phd: { ...base.phd!, leave: { active: false, until: -1, totalMonths: 0 } } }, data);   // 휴학이 아닐 때의 값
    const seed = seeds('K', 20000).find(sd => { const u = draw(sd, 'hazard', 25, 'dropout'); return u >= h && u < 2 * h; })!;
    const out = applyHazards({ ...base, seed }, data);
    expect(out.end).toEqual({ reason: 'dropout', month: 25 });
    // 휴학 중이 아니면 같은 seed 에서 이탈하지 않는다
    const active = { ...base, seed, phd: { ...base.phd!, leave: { active: false, until: -1, totalMonths: 0 } } };
    expect(applyHazards(active, data).end).toBeUndefined();
  });
});

describe('leave cap (Review Focus 2)', () => {
  const hitSeed = (st: LifeState, month: number, months: 6 | 12): string =>
    seeds('C', 20000).find(sd => draw(sd, 'hazard', month, 'leave') < leaveHazard(st, data) && draw(sd, 'hazard', month, 'dropout') >= dropoutHazard(st, data)
      && (draw(sd, 'hazard', month, 'leave:months') < 0.5 ? 6 : 12) === months)!;

  it('at 36 accumulated months no new leave starts', () => {
    const st = fixture(HUM, { leave: { active: false, until: 15, totalMonths: 36 } });
    expect(canStartLeave(st, 6)).toBe(false);
    const out = applyHazards({ ...st, seed: hitSeed(st, 20, 6) }, data);
    expect(out.phd!.leave.active).toBe(false);
  });
  it('a leave that would exceed the cap is not started, one that reaches it exactly is', () => {
    const st = fixture(HUM, { leave: { active: false, until: 15, totalMonths: 30 } });
    expect(canStartLeave(st, 6)).toBe(true); expect(canStartLeave(st, 12)).toBe(false);
    expect(applyHazards({ ...st, seed: hitSeed(st, 20, 12) }, data).phd!.leave.active).toBe(false);
    expect(applyHazards({ ...st, seed: hitSeed(st, 20, 6) }, data).phd!.leave).toEqual({ active: true, until: 26, totalMonths: 30 });
  });
  it('startLeave refuses over the cap and sets until = month + months without touching totalMonths', () => {
    const st = fixture(HUM, { leave: { active: false, until: 15, totalMonths: 33 } });
    expect(() => startLeave(st, 6, 'voluntary')).toThrow();
    const ok = startLeave(fixture(HUM, { leave: { active: false, until: -1, totalMonths: 4 } }), 12, 'voluntary');
    expect(ok.phd!.leave).toEqual({ active: true, until: 32, totalMonths: 4 });
    expect(ok.log.at(-1)).toMatchObject({ month: 20, tags: ['leave', 'voluntary'] });
  });
});

describe('burnout (선택권 §4.5, 0014#51)', () => {
  const run = (stats: Stats, n = 500, config = HUM): { burn: number; forced6: boolean } => {
    let burn = 0, forced6 = true;
    for (const seed of seeds('N', n)) {
      const out = applyHazards(fixture(config, {}, { seed, stats }), data);
      if (burnouts(out)) { burn++; if (out.phd!.leave.until - 20 !== ASSUMED.BURNOUT.leaveMonths) forced6 = false; }
    }
    return { burn, forced6 };
  };
  it('health 10: the burnout draw happens — about 10% of seeds get a forced 6-month leave', () => {
    const { burn, forced6 } = run({ ...MEAN, health: 10 });
    expect(burn).toBeGreaterThan(0);
    expect(burn).toBeGreaterThan(30); expect(burn).toBeLessThan(75);
    expect(forced6).toBe(true);
  });
  it('mind below the threshold triggers it too; health and mind at the threshold do not', () => {
    expect(run({ ...MEAN, mind: 14 }).burn).toBeGreaterThan(30);
    expect(run({ ...MEAN, health: 15, mind: 15 }).burn).toBe(0);
    expect(run(MEAN).burn).toBe(0);
  });
  it('the burnout draw uses slot burnout in stream hazard', () => {
    for (const seed of seeds('S', 300)) {
      const st = fixture(HUM, {}, { seed, stats: { ...MEAN, health: 10 } });
      const out = applyHazards(st, data);
      if (out.end || (out.phd!.leave.active && !burnouts(out))) continue;   // 이탈, 일반 휴학은 제외
      expect(burnouts(out)).toBe(draw(seed, 'hazard', 20, 'burnout') < ASSUMED.BURNOUT.p);
    }
  });
  it('burnout respects the 36-month cap', () => {
    for (const seed of seeds('M', 400)) {
      const st = fixture(HUM, { leave: { active: false, until: 5, totalMonths: 33 } }, { seed, stats: { ...MEAN, health: 10 } });
      expect(burnouts(applyHazards(st, data))).toBe(false);
    }
  });
});
