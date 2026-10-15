import { describe, it, expect } from 'vitest';
import { loadData } from '../src/data/load';
import { admittedShares, dropoutRate, durationYears, employedRate, facultyMarket, leaveRate, permanentShare, postdocFunders } from '../src/data/statistics';

const data = loadData();

describe('PhD flow statistics', () => {
  it('leave / dropout / duration by KEDI category', () => {
    expect(leaveRate(data, 'humanities').value).toBe(0.188);
    expect(leaveRate(data, 'engineering').value).toBe(0.08);
    expect(dropoutRate(data, 'social').value).toBe(0.064);
    expect(durationYears(data, 'social').value).toBe(5);
    expect(durationYears(data, 'humanities').value).toBe(6);
  });
  it('employment and permanent-job share by KSCED field', () => {
    expect(employedRate(data, 'ict').value).toBe(0.682);
    expect(employedRate(data, 'arts-humanities').value).toBe(0.408);
    expect(permanentShare(data, 'ict').value).toBe(0.615);
    expect(permanentShare(data, 'natural-math').id).toBe('statistics-form-permanent-natural-math-2021-2024');
  });
  it('postdoc funders cover the six categories and sum to 1', () => {
    const f = postdocFunders(data);
    expect(Object.keys(f).sort()).toEqual(['government', 'other', 'private-company', 'private-institute', 'public-institute', 'university']);
    expect(f.government.value + f['public-institute'].value).toBeCloseTo(0.282, 10);
    expect(Object.values(f).reduce((s, v) => s + v.value, 0)).toBeCloseTo(1, 10);
  });
});

describe('facultyMarket 2025 (노동 §2.2, §3.1)', () => {
  const m = facultyMarket(data);
  it('totals', () => {
    expect(m.newHiresAll.value).toBe(4603);
    expect(m.phdAwardedTotal.value).toBe(19831);
    expect(m.stockAll.value).toBe(64672);
    expect(m.honorary.value).toBe(22124);
  });
  it('full-time stock by category, including the residual rows', () => {
    expect(Object.keys(m.stock).sort()).toEqual(['arts', 'education', 'engineering', 'humanities', 'medical', 'natural', 'nodept', 'social', 'undeclared']);
    expect(m.stock.humanities!.value).toBe(8458);
    expect(m.stock.undeclared!.value).toBe(760);
    expect(Object.values(m.stock).reduce((s, v) => s + v.value, 0)).toBe(64672);
  });
  it('PhD awarded by category', () => {
    expect(m.phdAwarded.humanities.value).toBe(1898);
    expect(m.phdAwarded.education.value).toBe(1410);
    expect(m.phdAwarded.engineering.value).toBe(5171);
    expect(m.phdAwarded.medical?.value).toBe(2254);
    expect(m.phdAwarded['arts-sports']?.value).toBe(2492);
    const sum = Object.values(m.phdAwarded).reduce((s, v) => s + v.value, 0);
    expect(sum).toBe(19831);
  });
  it('non-full-time stock by KEDI category', () => {
    expect(m.nonFulltime.humanities.value).toBe(17279);
    expect(m.nonFulltime.engineering.value).toBe(15259);
  });
  it('2024 new hires use the verified "-a" record', () => {
    expect(facultyMarket(data, 2024).newHiresAll).toMatchObject({ value: 4166, id: 'statistics-faculty-new-hires-all-2024-a' });
  });
});

describe('living-cost funding sources 2015, split from the family-support record (decision 0022)', () => {
  const raw = (id: string) => data.records.get(id) as unknown as Record<string, unknown>;
  it('TA income 0.265 and part-time 0.172 share source, table, page and population with the original', () => {
    const orig = raw('statistics-family-support-living-cost-2015');
    for (const [id, value] of [['statistics-ta-income-living-cost-2015', 0.265], ['statistics-part-time-income-living-cost-2015', 0.172]] as const) {
      const r = raw(id);
      expect(r).toMatchObject({ value, unit: 'ratio', source_id: 'nhrc-2015-grad-research-env-survey' });
      for (const k of ['table', 'page', 'population', 'year']) expect(r[k]).toEqual(orig[k]);
    }
  });
});

describe('admittedShares', () => {
  it('2025 PhD admissions by category', () => {
    const a = admittedShares(data);
    expect(a.engineering.value).toBe(8895);
    expect(a.humanities.value).toBe(3497);
    expect(a.social.value).toBe(6406);
    expect(a.natural.value).toBe(4339);
  });
});
