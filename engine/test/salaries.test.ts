import { describe, it, expect } from 'vitest';
import { loadData } from '../src/data/load';
import { INSTITUTES, industryPay, institutePay, lecturerAnnual, nationalStep0, officerStepFrom, privateFacultyPay, stepPay } from '../src/data/salaries';

const data = loadData();

describe('privateFacultyPay: rule (a) (0014#87)', () => {
  it('professor is the observed 2024 mean record', () => {
    expect(privateFacultyPay(data, 'professor')).toMatchObject({ value: 101_390_000, id: 'salaries-faculty-private-professor-mean', confidence: 'indexed' });
  });
  it('associate and assistant scale by the 2017 rank ratios', () => {
    expect(Math.abs(privateFacultyPay(data, 'associate').value - 101_390_000 * 7466 / 9631)).toBeLessThanOrEqual(1);
    expect(Math.abs(privateFacultyPay(data, 'assistant').value - 101_390_000 * 4918 / 9631)).toBeLessThanOrEqual(1);
    expect(Number.isInteger(privateFacultyPay(data, 'associate').value)).toBe(true);
  });
  it('lower ranks are indexed and point at the professor record', () => {
    for (const r of ['associate', 'assistant'] as const) {
      expect(privateFacultyPay(data, r)).toMatchObject({ confidence: 'indexed', id: 'salaries-faculty-private-professor-mean' });
    }
  });
});

describe('rule (b): national step', () => {
  it('nationalStep0(35, assistant) = 8 + 11 − 4 = 15', () => {
    expect(nationalStep0(35, 'assistant', data)).toBe(15);
    expect(nationalStep0(35, 'assistant')).toBe(15);
  });
  it('uses the adjustment records for associate (−7) and professor (−10)', () => {
    expect(nationalStep0(40, 'associate', data)).toBe(8 + 16 - 7);
    expect(nationalStep0(45, 'professor', data)).toBe(8 + 21 - 10);
  });
  it('clamps to [1, 33]', () => {
    expect(nationalStep0(20, 'professor', data)).toBe(1);
    expect(nationalStep0(90, 'assistant', data)).toBe(33);
  });
  it('researcher uses adjustment −4 and cap 36', () => {
    expect(nationalStep0(35, 'researcher', data)).toBe(15);
    expect(nationalStep0(90, 'researcher', data)).toBe(36);
  });
  it('officer step = researcher step − 5, at least 1', () => {
    expect(officerStepFrom(15)).toBe(10);
    expect(officerStepFrom(3)).toBe(1);
  });
});

describe('stepPay', () => {
  it('univ-faculty 15 = 3,816,100 × 12 × 1.3 = 59,531,160', () => {
    expect(stepPay(data, 'univ-faculty', 15)).toMatchObject({ value: 59_531_160, id: 'salaries-public-univ-faculty-15', confidence: 'verified' });
  });
  it('clamps the step into each table range (33 / 36 / 32)', () => {
    expect(stepPay(data, 'univ-faculty', 99).id).toBe('salaries-public-univ-faculty-33');
    expect(stepPay(data, 'univ-faculty', 0).id).toBe('salaries-public-univ-faculty-1');
    expect(stepPay(data, 'researcher', 99).id).toBe('salaries-public-researcher-36');
    expect(stepPay(data, 'research-officer', 99).id).toBe('salaries-public-research-officer-32');
  });
  it('pay rises with the step', () => {
    expect(stepPay(data, 'researcher', 10).value).toBeGreaterThan(stepPay(data, 'researcher', 9).value);
  });
});

describe('lecturerAnnual (0014#82)', () => {
  it('school record × 6 × 32', () => {
    expect(lecturerAnnual(data, 'snu')).toMatchObject({ value: 91_834 * 6 * 32, id: 'salaries-faculty-snu-lecturer-hourly-hourly' });
  });
  it('dgist has no record: median of the 18 school records, 74,565 × 6 × 32, assumed', () => {
    expect(lecturerAnnual(data, 'dgist').value).toBe(74_565 * 6 * 32);
    expect(lecturerAnnual(data, 'dgist').value).toBe(14_316_480);
    expect(lecturerAnnual(data, 'dgist')).toMatchObject({ confidence: 'assumed', id: '0014#82' });
    expect(lecturerAnnual(data, 'unist').value).toBe(14_316_480);
  });
  it('aggregate rows (all/national/private) are never treated as a school', () => {
    expect(lecturerAnnual(data, 'national').id).toBe('0014#82');
  });
});

describe('institutes and industry', () => {
  it('institutePay reads the record', () => {
    expect(institutePay(data, 'kribb', 'new-hire').value).toBe(46_000_000);
    expect(institutePay(data, 'kribb', 'principal-researcher').value).toBe(81_000_000);
  });
  it('every institute has all three grades', () => {
    expect(INSTITUTES).toEqual(['etri', 'kaeri', 'kimm', 'kist', 'kisti', 'kribb', 'krict']);
    for (const i of INSTITUTES) for (const g of ['new-hire', 'senior-researcher', 'principal-researcher'] as const) {
      expect(institutePay(data, i, g).value, `${i}/${g}`).toBeGreaterThan(0);
    }
  });
  it('unknown institute throws', () => expect(() => institutePay(data, 'nope', 'new-hire')).toThrow(/unknown institute/));
  it('industryPay uses the proxy records (0014#84)', () => {
    expect(industryPay(data, '이공').value).toBe(63_044_000);
    expect(industryPay(data, '인문사회').value).toBe(52_472_000);
  });
});
