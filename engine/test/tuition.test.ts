import { describe, it, expect } from 'vitest';
import { ASSUMED } from '../src/assumed';
import { loadData } from '../src/data/load';
import { entranceFee, ewhaMedian, tuitionPerSemester, waiverRate } from '../src/data/tuition';

const data = loadData();

describe('tuition (선택권 §5.1)', () => {
  it('ewha median recomputed from 8 Seoul private records equals engine constants', () => {
    expect(ewhaMedian(data, 'engineering')).toBe(7_341_000);
    expect(ewhaMedian(data, 'math')).toBe(6_367_500);
    expect(ewhaMedian(data, 'engineering')).toBe(ASSUMED.EWHA_ENGINEERING_TUITION);
    expect(ewhaMedian(data, 'math')).toBe(ASSUMED.EWHA_MATH_TUITION);
    expect(tuitionPerSemester(data, 'ewha', 'cs', 'departments-ewha-ai').value).toBe(7_341_000);
    expect(tuitionPerSemester(data, 'ewha', 'bio', 'departments-ewha-life_science-2').value).toBe(6_367_500);
  });

  it('ewha rule values are assumed and tagged with their 0014 numbers', () => {
    const eng = tuitionPerSemester(data, 'ewha', 'engineering', 'departments-ewha-ai');
    expect(eng).toMatchObject({ confidence: 'assumed', id: '0014#58', ruleTag: 'ewha-median' });
    expect(tuitionPerSemester(data, 'ewha', 'math', 'departments-ewha-life_science-2')).toMatchObject({ id: '0014#59', ruleTag: 'ewha-median' });
  });

  it('ewha social uses its own record, not the median rule', () => {
    expect(tuitionPerSemester(data, 'ewha', 'social', 'departments-ewha-ai')).toMatchObject({ id: 'schools-ewha-social-tuition', ruleTag: 'school-field' });
  });

  it('department-level tuition record wins', () => {
    const t = tuitionPerSemester(data, 'snu', 'math', 'departments-snu-statistics');
    expect(t.id).toBe('departments-snu-statistics-tuition');
    expect(t.ruleTag).toBe('department');
  });

  it('school-field record, then school-all record', () => {
    expect(tuitionPerSemester(data, 'snu', 'cs', 'departments-snu-computer')).toMatchObject({ id: 'schools-snu-cs-tuition', ruleTag: 'school-field' });
    expect(tuitionPerSemester(data, 'kaist', 'cs', 'departments-kaist-computer')).toMatchObject({ id: 'schools-kaist-all-tuition', ruleTag: 'school-all' });
  });

  it('rule (c) uses engineering tuition for cs at hanyang', () => {
    const t = tuitionPerSemester(data, 'hanyang', 'cs', 'departments-hanyang-computer');
    expect(t.id).toBe('schools-hanyang-engineering-tuition');
    expect(t.ruleTag).toBe('rule-c');
  });

  it('rule (c) holds for every listed school', () => {
    for (const s of ASSUMED.TUITION_CS_FROM_ENGINEERING_SCHOOLS) {
      expect(tuitionPerSemester(data, s, 'cs', `departments-${s}-none`).id).toBe(`schools-${s}-engineering-tuition`);
    }
  });

  it('throws when no record or rule applies', () => {
    expect(() => tuitionPerSemester(data, 'snu', 'cs', 'departments-snu-none')).not.toThrow();
    expect(() => tuitionPerSemester(data, 'nowhere', 'cs', 'departments-nowhere-x')).toThrow(/no tuition record/);
  });

  it('indexed tuition record keeps its confidence (postech, 0014#56)', () => {
    expect(tuitionPerSemester(data, 'postech', 'cs', 'departments-postech-computer')).toMatchObject({ id: 'schools-postech-all-tuition', confidence: 'indexed' });
  });
});

describe('entrance fee (0014#54)', () => {
  it('kaist entrance fee is 0 (0014#54)', () => {
    expect(entranceFee(data, 'kaist')).toMatchObject({ value: 0, confidence: 'assumed', id: '0014#54' });
  });
  it('schools with a record use it', () => {
    expect(entranceFee(data, 'snu')).toMatchObject({ value: 169_000, id: 'schools-snu-all-entrance-fee' });
  });
  it('every no-entrance-fee school lacks a record', () => {
    for (const s of ASSUMED.NO_ENTRANCE_FEE_SCHOOLS) expect(entranceFee(data, s).id).toBe('0014#54');
  });
});

describe('waiverRate (0014#21)', () => {
  it('scholarship route takes the highest rate among the school records', () => {
    expect(waiverRate(data, 'snu', 'scholarship').value).toBe(1);
    expect(waiverRate(data, 'hanyang', 'scholarship')).toMatchObject({ value: 0.7 });
    expect(waiverRate(data, 'sogang', 'scholarship').value).toBe(1);
    expect(waiverRate(data, 'konkuk', 'scholarship').value).toBe(1);
  });
  it('project route uses the -ra / -ta marker record, not -rate or -taa', () => {
    expect(waiverRate(data, 'korea', 'project').id).toBe('schools-korea-all-scholarship-tuition-rate-ra');
    expect(waiverRate(data, 'konkuk', 'project')).toMatchObject({ id: 'schools-konkuk-all-scholarship-tuition-rate-ra', value: 0.5 });
    expect(waiverRate(data, 'uos', 'project').id).toBe('schools-uos-all-scholarship-tuition-rate-ta');
  });
  it('project route without a marker record, and self route, give 0 (assumed 0014#21)', () => {
    expect(waiverRate(data, 'snu', 'project')).toMatchObject({ value: 0, confidence: 'assumed', id: '0014#21' });
    expect(waiverRate(data, 'snu', 'self')).toMatchObject({ value: 0, id: '0014#21' });
    expect(waiverRate(data, 'kaist', 'scholarship')).toMatchObject({ value: 0, id: '0014#21' });
  });
});
