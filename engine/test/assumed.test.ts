import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ASSUMED } from '../src/assumed';

const source = readFileSync(fileURLToPath(new URL('../src/assumed.ts', import.meta.url)), 'utf8');
const sum = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0);

describe('ASSUMED numbering (decision 0014)', () => {
  const numbers = new Set([...source.matchAll(/0014#(\d+)/g)].map(m => Number(m[1])));
  const MAX = 123;   // 119 + Wave 4 추가 #120(첫 투고 계층)·#121(career-5y D) + #96 추가 #122(경력 상환)·#123(은퇴 뒤 생활비)
  it('cites every row 1..123', () => {
    const missing = Array.from({ length: MAX }, (_, i) => i + 1).filter(n => !numbers.has(n));
    expect(missing).toEqual([]);
  });
  it('cites nothing outside 1..123', () => {
    expect([...numbers].filter(n => n < 1 || n > MAX)).toEqual([]);
  });
});

describe('ASSUMED.NEWS_TYPES (labor spec 5.3, 0014#119)', () => {
  const types = ASSUMED.NEWS_TYPES;
  it('has 17 types with unique ids and weight sum 62 (초안 67, 보정 2026-10-14)', () => {
    expect(types.length).toBe(17);
    expect(new Set(types.map(t => t.id)).size).toBe(17);
    expect(sum(types.map(t => t.weight))).toBe(62);
  });
  it('keeps effects within [-0.30, 0.30] and months within [3, 12]', () => {
    for (const t of types) {
      const [elo, ehi] = t.effect; const [mlo, mhi] = t.months;
      expect(elo).toBeLessThanOrEqual(ehi); expect(mlo).toBeLessThanOrEqual(mhi);
      expect(elo).toBeGreaterThanOrEqual(-0.30); expect(ehi).toBeLessThanOrEqual(0.30);
      expect(mlo).toBeGreaterThanOrEqual(3); expect(mhi).toBeLessThanOrEqual(12);
    }
  });
  it('has a non-empty route list; only kind "all" has empty target values', () => {
    for (const t of types) {
      expect(t.routes.length).toBeGreaterThan(0);
      expect(t.target.values.length === 0).toBe(t.target.kind === 'all');
    }
  });
});

describe('ASSUMED distributions', () => {
  it('sum to 1', () => {
    expect(sum(Object.values(ASSUMED.ENTRY_AGE_DIST))).toBeCloseTo(1, 12);
    expect(sum(ASSUMED.FAMILY_SUPPORT.map(f => f.p))).toBeCloseTo(1, 12);
    expect(sum(Object.values(ASSUMED.LUCK_GROUP_P))).toBeCloseTo(1, 12);
    for (const row of Object.values(ASSUMED.FUNDING_LUCK)) expect(sum(Object.values(row))).toBeCloseTo(1, 12);
    expect(ASSUMED.ADVISOR_PREF_P + 3 * ASSUMED.ADVISOR_OTHER_P).toBeCloseTo(1, 12);
    expect(sum(Object.values(ASSUMED.LEAVE_DURATIONS.map(d => d.p)))).toBeCloseTo(1, 12);
    expect(sum(Object.values(ASSUMED.POLICY.postQualFocus))).toBeCloseTo(1, 12);
    expect(sum(Object.values(ASSUMED.POLICY.jobSearchFocus))).toBeCloseTo(1, 12);
    for (const w of Object.values(ASSUMED.POLICY.decisions)) expect(sum(w)).toBeCloseTo(1, 12);
    for (const row of Object.values(ASSUMED.PERM_PATH)) expect(sum(Object.values(row))).toBeCloseTo(1, 12);
    expect(sum(Object.values(ASSUMED.HUMSOC_NONREG_PATH))).toBeCloseTo(1, 12);
  });
  it('covers the 27 tracks, 6 fields and 4 tiers', () => {
    expect(Object.keys(ASSUMED.TRACK_VENUE_GROUP).length).toBe(27);
    expect(Object.keys(ASSUMED.REVIEW_MONTHS).sort()).toEqual(['bio', 'cs', 'engineering', 'humanities', 'math', 'social']);
    expect(Object.keys(ASSUMED.TIER_BASE)).toEqual(['T1', 'T2', 'T3', 'T4']);
    expect(Object.keys(ASSUMED.FOCUS).sort()).toEqual(['network', 'research', 'rest', 'thesis', 'work', 'write']);
  });
  it('matches spot values of 0014', () => {
    expect(ASSUMED.EWHA_ENGINEERING_TUITION).toBe(7_341_000);
    expect(ASSUMED.EWHA_MATH_TUITION).toBe(6_367_500);
    expect(ASSUMED.ADVISOR_TYPES.connected).toEqual({ support: 45, rigor: 45, network: 80 });
    expect(ASSUMED.ODDS_LO).toBe(0.02); expect(ASSUMED.ODDS_HI).toBe(0.95);
    expect(ASSUMED.CAPITAL_SCHOOLS.length + ASSUMED.REGIONAL_SCHOOLS.length).toBe(20);
  });
});
