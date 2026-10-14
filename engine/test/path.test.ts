import { describe, it, expect } from 'vitest';
import { ASSUMED } from '../src/assumed';
import { loadData } from '../src/data/load';
import { pathDistribution } from '../src/career/path';
import type { Group, Ksced } from '../src/types';

const data = loadData();

// 선택권 §8 결과 분포 표
const TABLE: [Ksced, Group, number, number, number][] = [
  ['ict', '이공', 0.341, 0.256, 0.378],
  ['engineering', '이공', 0.366, 0.257, 0.352],
  ['natural-math', '이공', 0.452, 0.263, 0.261],
  ['social', '인문사회', 0.670, 0.183, 0.122],
  ['business-law', '인문사회', 0.629, 0.197, 0.149],
  ['arts-humanities', '인문사회', 0.699, 0.173, 0.103],
];

describe('pathDistribution (선택권 §8)', () => {
  it('ict 이공 academia ≈ 0.341 and arts-humanities academia ≈ 0.699', () => {
    expect(Math.abs(pathDistribution(data, 'ict', '이공').academia - 0.341)).toBeLessThan(0.002);
    expect(Math.abs(pathDistribution(data, 'arts-humanities', '인문사회').academia - 0.699)).toBeLessThan(0.002);
  });
  it.each(TABLE)('%s (%s) matches the spec table', (ksced, group, academia, pub, industry) => {
    const d = pathDistribution(data, ksced, group);
    expect(Math.abs(d.academia - academia)).toBeLessThan(0.002);
    expect(Math.abs(d.public - pub)).toBeLessThan(0.002);
    expect(Math.abs(d.industry - industry)).toBeLessThan(0.002);
    expect(d.startup).toBeCloseTo(0.025, 12);
  });
  it.each(TABLE)('%s (%s) sums to 1', (ksced, group) => {
    const d = pathDistribution(data, ksced, group);
    expect(d.academia + d.industry + d.public + d.startup).toBeCloseTo(1, 12);
  });
  it('startup probability is the nonwage-share record', () => {
    expect(pathDistribution(data, 'ict', '이공').startup).toBe(0.025);
    expect(ASSUMED.STARTUP_P_RECORD).toBe('statistics-nonwage-share');
  });
});
