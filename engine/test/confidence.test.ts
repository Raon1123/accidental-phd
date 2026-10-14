// 선택권 §12 표: indexed 로 표시해야 하는 레코드. 이 값들은 화면에 "근거: 2차 자료" 로 노출된다(이관 "indexed 근거 노출").
// 주의: Scimago 재확인(이월 항목)으로 어떤 레코드가 verified 가 되면 아래 기대값을 verified 로 바꾸고,
// 해당 행을 스펙 §12 표에서도 뺀다. 이 테스트는 그때까지 스펙 표와 데이터가 어긋나지 않는지 지키는 용도다.
import { describe, it, expect } from 'vitest';
import { find, get, loadData } from '../src/data/load';
import { facultyMarket } from '../src/data/statistics';
import { privateFacultyPay } from '../src/data/salaries';
import { tierBaseRate } from '../src/data/venues';
import { tuitionPerSemester } from '../src/data/tuition';
import { projectStipend } from '../src/data/funding';

const data = loadData();

const SJR = find(data, 'venues-journal-').filter(r => r.id.endsWith('-sjr-quartile'));

const FACULTY_2017 = ['national', 'private'].flatMap(o => ['professor', 'associate-professor', 'assistant-professor'].map(r => `salaries-faculty-${o}-${r}-mean-2017`));

const SECTION_12_IDS = [
  ...FACULTY_2017,
  'salaries-faculty-all-fulltime-mean',
  'salaries-faculty-private-nontenure-mean',
  'salaries-faculty-private-professor-mean',
  'schools-postech-all-tuition',
  'schools-postech-all-entrance-fee',
  'schools-ewha-all-entrance-fee',
  'schools-hanyang-all-scholarship-living-bk21',
  'venues-conf-icml-acceptance-2025',
  'venues-conf-isscc-core-rank',
  'departments-pusan-psychology',
  'departments-knu-mechanical',
  'departments-knu-philosophy',
];

describe('§12 indexed records', () => {
  it('has 60 SJR quartile records, all indexed', () => {
    expect(SJR.length).toBe(60);
    for (const r of SJR) expect(r.confidence, r.id).toBe('indexed');
  });

  it('has the 6 faculty 2017 mean records', () => expect(FACULTY_2017.length).toBe(6));

  it.each(SECTION_12_IDS)('%s is indexed', id => {
    expect(get(data, id).confidence).toBe('indexed');
  });

  it('narratives nar-hs-early-career-5, -6 and nar-hs-mid-career-5 are indexed', () => {
    for (const id of ['nar-hs-early-career-5', 'nar-hs-early-career-6', 'nar-hs-mid-career-5']) {
      expect(data.narratives.get(id)?.confidence, id).toBe('indexed');
    }
  });

  it('inside the venues pack the indexed set is exactly SJR (60) + icml acceptance + isscc core rank', () => {
    const indexed = find(data, 'venues-').filter(r => r.confidence === 'indexed').map(r => r.id).sort();
    const expected = [...SJR.map(r => r.id), 'venues-conf-icml-acceptance-2025', 'venues-conf-isscc-core-rank'].sort();
    expect(indexed).toEqual(expected);
  });

  it('every other venue record is verified (CORE, KCI, other acceptance rates)', () => {
    const rest = find(data, 'venues-').filter(r => !SJR.includes(r) && !SECTION_12_IDS.includes(r.id));
    expect(rest.length).toBeGreaterThan(50);
    for (const r of rest) expect(r.confidence, r.id).toBe('verified');
  });
});

describe('accessors expose the stored confidence', () => {
  it('postech tuition and entrance fee, ewha entrance fee (0014#56)', () => {
    expect(tuitionPerSemester(data, 'postech', 'cs', 'departments-postech-computer').confidence).toBe('indexed');
    expect(get(data, 'schools-postech-all-entrance-fee').confidence).toBe('indexed');
  });
  it('hanyang BK21 stipend for humanities/social (0014#28)', () => {
    expect(projectStipend(data, 'hanyang', '인문사회').confidence).toBe('indexed');
  });
  it('icml acceptance as p_tier (0014#70)', () => {
    expect(tierBaseRate(data, 'T1', 'venues-conf-icml-acceptance-2025').confidence).toBe('indexed');
  });
  it('private faculty pay (rule (a)): professor and lower ranks are indexed (0014#87)', () => {
    for (const r of ['professor', 'associate', 'assistant'] as const) expect(privateFacultyPay(data, r).confidence, r).toBe('indexed');
  });
  it('statistics inputs used by the labor model are verified', () => {
    const m = facultyMarket(data);
    for (const v of [m.newHiresAll, m.phdAwardedTotal, m.stockAll, m.honorary]) expect(v.confidence, v.id).toBe('verified');
  });
});
