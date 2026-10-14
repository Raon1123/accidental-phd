import { describe, it, expect } from 'vitest';
import { find, loadData } from '../src/data/load';
import { monthlyFromRecord, periodOf, projectStipend, scholarshipOptions, taStipend } from '../src/data/funding';

const data = loadData();
const rec = (id: string) => data.records.get(id)!;

describe('monthlyFromRecord: period read from the note (unit is always "krw")', () => {
  it('per month stays as is (snu presidential, note starts "per month")', () => {
    const r = rec('schools-snu-all-scholarship-living-presidential');
    expect(periodOf(r)).toBe('krw-per-month');
    expect(monthlyFromRecord(r)).toBe(2_000_000);
  });
  it('per semester ÷ 6 (yonsei special, 1,200,000 per semester)', () => {
    const r = rec('schools-yonsei-all-scholarship-living-special');
    expect(periodOf(r)).toBe('krw-per-semester');
    expect(monthlyFromRecord(r)).toBe(200_000);
  });
  it('annual ÷ 12 even when the note also mentions "학기당" (snu brm-a: annual 26,000,000)', () => {
    const r = rec('schools-snu-all-scholarship-living-brm-a');
    expect(periodOf(r)).toBe('krw-per-year');
    expect(monthlyFromRecord(r)).toBe(Math.round(26_000_000 / 12));
  });
  it('total ÷ 48 (jnu doctoral-leap, total over 4 semesters)', () => {
    const r = rec('schools-jnu-all-scholarship-living-doctoral-leap');
    expect(periodOf(r)).toBe('krw-total');
    expect(monthlyFromRecord(r)).toBe(Math.round(10_000_000 / 48));
  });
  it('Korean-only period wording falls back to semester (ewha TA: "매학기")', () => {
    expect(periodOf(rec('schools-ewha-all-stipend-ta'))).toBe('krw-per-semester');
  });
  it('a unit that already names the period wins over the note', () => {
    expect(periodOf({ ...rec('schools-snu-all-scholarship-living-presidential'), unit: 'krw-per-semester' })).toBe('krw-per-semester');
  });
  it('throws when the period cannot be determined', () => {
    expect(() => periodOf({ ...rec('schools-ewha-all-stipend-ta'), note: '금액만 있음' })).toThrow(/cannot determine/);
  });
  it('every living-scholarship and stipend record resolves to a plausible monthly amount', () => {
    const all = [...data.records.values()].filter(r => /^schools-[a-z]+-all-(scholarship-living-|stipend-)/.test(r.id));
    expect(all.length).toBe(51);   // akj 연구장학·조교 2건 (#100)
    for (const r of all) {
      const m = monthlyFromRecord(r);
      expect(m, r.id).toBeGreaterThanOrEqual(100_000);
      expect(m, r.id).toBeLessThanOrEqual(5_000_000);
    }
  });
});

describe('scholarshipOptions', () => {
  it('returns the school living-scholarship records in id order', () => {
    expect(scholarshipOptions(data, 'snu').map(r => r.id)).toEqual([
      'schools-snu-all-scholarship-living-brm-a',
      'schools-snu-all-scholarship-living-phd-excellence',
      'schools-snu-all-scholarship-living-presidential',
    ]);
  });
  it('is empty for schools without one (선택권 §5.2: unist, khu, pusan, uos)', () => {
    for (const s of ['unist', 'khu', 'pusan', 'uos']) expect(scholarshipOptions(data, s), s).toEqual([]);
  });
});

describe('projectStipend (0014#27)', () => {
  it('uses the first -stipend-min* record when the school has one', () => {
    expect(projectStipend(data, 'kaist', '이공')).toMatchObject({ value: 1_100_000, id: 'schools-kaist-all-stipend-min', confidence: 'verified' });
    expect(projectStipend(data, 'jnu', '인문사회')).toMatchObject({ value: 1_600_000, id: 'schools-jnu-all-stipend-min-bk21' });
  });
  it('converts a yearly stipend to monthly (dgist)', () => {
    expect(projectStipend(data, 'dgist', '이공').value).toBe(Math.round(22_000_000 / 12));
  });
  it('STEM school without a record falls back to the national floor record', () => {
    expect(projectStipend(data, 'snu', '이공')).toMatchObject({ value: 1_100_000, id: 'salaries-stipend-stem-living-phd-min' });
  });
  it('humanities/social uses the school BK21 link record, indexed for hanyang (0014#28)', () => {
    expect(projectStipend(data, 'hanyang', '인문사회')).toMatchObject({ value: 1_300_000, confidence: 'indexed', id: 'schools-hanyang-all-scholarship-living-bk21' });
    expect(projectStipend(data, 'korea', '인문사회')).toMatchObject({ value: 1_600_000, id: 'schools-korea-all-scholarship-living-bk21' });
  });
  it('humanities/social with no linked record gets 600,000 (assumed 0014#27)', () => {
    expect(projectStipend(data, 'snu', '인문사회')).toMatchObject({ value: 600_000, confidence: 'assumed', id: '0014#27' });
  });
});

describe('taStipend (0014#35)', () => {
  it('uses the first stipend-ta* record by id (선택권 §3.3 examples)', () => {
    expect(taStipend(data, 'snu')).toMatchObject({ value: 300_000, id: 'schools-snu-all-stipend-ta-lecture-research' });
    expect(taStipend(data, 'kaist')).toMatchObject({ value: 550_000, id: 'schools-kaist-all-stipend-ta-type1' });
    expect(taStipend(data, 'cnu')).toMatchObject({ value: 400_000, id: 'schools-cnu-all-stipend-ta' });
  });
  it('falls back to 400,000 (assumed) for schools without a TA record', () => {
    expect(find(data, 'schools-unist-all-stipend-ta')).toEqual([]);
    expect(taStipend(data, 'unist')).toMatchObject({ value: 400_000, confidence: 'assumed', id: '0014#35' });
  });
});
