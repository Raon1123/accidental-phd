import { describe, it, expect } from 'vitest';
import { addStats } from '../src/phd/stats';
import { createLife } from '../src/pre/createLife';
import { loadData } from '../src/data/load';

const data = loadData();

describe('addStats', () => {
  it('accumulates fractional deltas in statCarry and moves whole units', () => {
    let s = createLife({}, 'APHD-AAAAAAAA', data);
    const h0 = s.stats.health;
    s = addStats(s, { health: -0.5 });
    expect(s.stats.health).toBe(h0);
    expect(s.phd!.statCarry.health).toBeCloseTo(-0.5, 12);
    s = addStats(s, { health: -0.5 });
    expect(s.stats.health).toBe(h0 - 1);
    expect(s.phd!.statCarry.health).toBeCloseTo(0, 12);
  });
  it('clamps to 0–100 and drops carry at the bound', () => {
    let s = createLife({}, 'APHD-AAAAAAAA', data);
    s = { ...s, stats: { ...s.stats, health: 1 } };
    s = addStats(s, { health: -3.7 });
    expect(s.stats.health).toBe(0);
    expect(s.phd!.statCarry.health).toBe(0);
  });
  it('does not mutate the input', () => {
    const s = createLife({}, 'APHD-AAAAAAAA', data);
    const before = structuredClone(s);
    addStats(s, { mind: 2.3, skill: -1.1 });
    expect(s).toEqual(before);
  });
});
