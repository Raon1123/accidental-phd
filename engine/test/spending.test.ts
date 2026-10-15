// 씀씀이 모형(0014#131, 사용자 규칙 2026-10-15): 사람마다 기본 생활비가 다르고, 늘리기는 쉽고 줄이기는 어렵다.
import { describe, expect, it } from 'vitest';
import { ASSUMED } from '../src/assumed';
import { loadData } from '../src/data/load';
import { createLife } from '../src/pre/createLife';
import { newSeed } from '../src/rng';
import { baseLiving, nextSpending, regionLiving, spendingOf } from '../src/spending';
import type { LifeState } from '../src/types';

const data = loadData();
const life = (k: number, school = 'snu'): LifeState => createLife({ school, track: 'philosophy', group: '인문사회', funding: 'self' }, newSeed(`spend-${k}`), data);

describe('spending (0014#131)', () => {
  it('the base living cost differs by person around the region value and is fixed by the seed', () => {
    const bases = Array.from({ length: 400 }, (_, k) => baseLiving(life(k)));
    expect(new Set(bases).size).toBeGreaterThan(300);
    const median = [...bases].sort((a, b) => a - b)[200]!;
    expect(median / ASSUMED.LIVING_COST.capital).toBeGreaterThan(0.9);
    expect(median / ASSUMED.LIVING_COST.capital).toBeLessThan(1.1);
    expect(baseLiving(life(7))).toBe(baseLiving(life(7)));
    expect(regionLiving(life(1, 'pusan'))).toBe(ASSUMED.LIVING_COST.regional);
    expect(spendingOf(life(3))).toBe(baseLiving(life(3)));   // 저장된 지출이 없으면 기본
  });

  it('rises fast when income exceeds the base and falls slowly when it drops, never below the base', () => {
    let s = life(11);
    const base = baseLiving(s);
    const step = (income: number) => { s = { ...s, money: { ...s.money, spending: nextSpending(s, income) } }; return spendingOf(s); };
    const up1 = step(base + 4_000_000) - base;
    expect(up1).toBeCloseTo(ASSUMED.SPENDING.up * ASSUMED.SPENDING.kappa * 4_000_000, -1);
    for (let i = 0; i < 24; i++) step(base + 4_000_000);
    const high = spendingOf(s);
    expect(high).toBeGreaterThan(base + 1_900_000);
    const down1 = high - step(0);
    expect(down1).toBeLessThan(up1);                          // 줄이기는 늘리기보다 느리다
    for (let i = 0; i < 600; i++) step(0);
    expect(spendingOf(s)).toBeGreaterThanOrEqual(base);
    expect(spendingOf(s) - base).toBeLessThan(10_000);
  });

  it('a PhD month charges the person spending and stores the next level', async () => {
    const { applyCashflow } = await import('../src/phd/money');
    const s0 = { ...life(5), month: 1 };
    const s1 = applyCashflow(s0, data);
    expect(s1.ledger.find(e => e.kind === 'living' && e.month === 1)!.amount).toBe(-spendingOf(s0));
    expect(s1.money.spending).toBeDefined();
  });
});
