import { describe, it, expect } from 'vitest';
import { clamp, z, sigmoid, logit, odds, hazardMonth } from '../src/odds';

describe('odds', () => {
  it('returns p0 when terms = 0', () => {
    expect(Math.abs(odds(0.7, 0) - 0.7)).toBeLessThan(1e-12);
  });
  it('clamps to default bounds 0.02 / 0.95', () => {
    expect(odds(0.7, 10)).toBe(0.95);
    expect(odds(0.7, -10)).toBe(0.02);
  });
  it('respects custom bounds', () => {
    expect(odds(0.5, 0, 0.1, 0.6)).toBeCloseTo(0.5, 12);
    expect(odds(0.5, 10, 0.1, 0.6)).toBe(0.6);
    expect(odds(0.5, -10, 0.1, 0.6)).toBe(0.1);
  });
  it('is monotone in terms', () => {
    expect(odds(0.5, 1)).toBeGreaterThan(odds(0.5, 0));
    expect(odds(0.5, -1)).toBeLessThan(odds(0.5, 0));
  });
});

describe('hazardMonth', () => {
  it('matches the agency spec 4.5 table (humanities leave 0.188 -> 0.01720)', () => {
    expect(Math.abs(hazardMonth(0.188) - 0.01720)).toBeLessThan(1e-4);
  });
  it('is 0 at 0 and compounds back to the annual rate', () => {
    expect(hazardMonth(0)).toBe(0);
    expect(1 - (1 - hazardMonth(0.3)) ** 12).toBeCloseTo(0.3, 12);
  });
});

describe('helpers', () => {
  it('z maps 0..100 to -1..1', () => {
    expect(z(50)).toBe(0); expect(z(0)).toBe(-1); expect(z(100)).toBe(1);
  });
  it('clamp, sigmoid and logit', () => {
    expect(clamp(5, 0, 3)).toBe(3); expect(clamp(-5, 0, 3)).toBe(0); expect(clamp(2, 0, 3)).toBe(2);
    expect(sigmoid(0)).toBe(0.5);
    expect(sigmoid(logit(0.3))).toBeCloseTo(0.3, 12);
  });
});
