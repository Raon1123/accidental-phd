// 근거 신뢰도 표시와 출처 footer(#60).
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { advanceMonth, createLife, newSeed, type LifeState } from '../../engine/src/browser';
import { loadData } from '../../engine/src/index';
import { readWebSources, schoolNamePairs } from '../../engine/sim/web-sources';
import { confidenceOf, displayId, footerLines, markFor, moneyRows, stipendGuarantee } from '../src/sources';
import { ko } from '../src/strings.ko';

const root = resolve(__dirname, '../..');
const data = loadData();
const sources = readWebSources(root);
// 실명 판정은 #59 테스트와 같은 규칙: 매핑 표 실명과 줄임형, 대소문자 구분.
const realNames = schoolNamePairs(root).map(([real]) => real);
const leaks = (text: string): string[] => realNames.filter(n => text.includes(n));

describe('confidence marks (#60)', () => {
  it('an indexed record is marked "색인 값" and its footer line names the record and source', () => {
    const id = 'schools-postech-all-tuition';
    expect(confidenceOf(id, data)).toBe('indexed');
    expect(markFor([id], data, ko)).toBe(ko.sources.marks.indexed);
    const [line] = footerLines([id], data, sources, ko);
    expect(line).toContain(displayId(id, ko));
    expect(line).toContain(`(${ko.sources.marks.indexed})`);
    expect(line).toContain(sources[data.records.get(id)!.source_id]!.title);
    expect(leaks(line!)).toEqual([]);
    expect(line).not.toContain('postech');
  });

  it('an assumed constant (0014 number) is marked "게임 설정" and its footer line shows the 0014 number', () => {
    expect(confidenceOf('0014#36', data)).toBe('assumed');
    expect(markFor(['0014#36'], data, ko)).toBe('게임 설정');
    expect(footerLines(['0014#36'], data, sources, ko)).toEqual(['결정 기록 0014 #36 — 게임 설정']);
  });

  it('verified values carry no mark; several ids take the weakest', () => {
    const verified = [...data.records.values()].find(r => r.confidence === 'verified')!.id;
    expect(markFor([verified], data, ko)).toBe('');
    expect(markFor([verified, '0014#36'], data, ko)).toBe('게임 설정');
    expect(() => confidenceOf('no-such-record', data)).toThrow();
  });

  it('the money table marks tuition from an indexed record', () => {
    const s = createLife({ track: 'computer', school: 'postech' }, newSeed('src-postech'), data);
    const tuition = moneyRows(s, data, ko).find(r => r.label === ko.sources.tuition)!;
    expect(tuition.ids).toHaveLength(1);
    expect(tuition.mark).toBe(ko.sources.marks[confidenceOf(tuition.ids[0]!, data)]);
  });
});

describe('sources footer (#60)', () => {
  it('is built from registry.json and registry.d with school names replaced', () => {
    const reg = JSON.parse(readFileSync(join(root, 'data', 'sources', 'registry.json'), 'utf8')) as { id: string }[];
    const extra = JSON.parse(readFileSync(join(root, 'data', 'sources', 'registry.d', '47-retirement-rules.json'), 'utf8')) as { id: string }[];
    for (const e of [...reg, ...extra]) expect(Object.hasOwn(sources, e.id)).toBe(true);
    const all = Object.values(sources).map(s => `${s.title} ${s.publisher}`).join('\n');
    expect(leaks(all)).toEqual([]);
    expect(all).toContain('서월대학교');   // 바뀐 것이 실제로 있다
  });

  it('every record source resolves, and footer lines over 8 lives hold no real name', () => {
    for (const r of data.records.values()) expect(Object.hasOwn(sources, r.source_id)).toBe(true);
    const ids = new Set<string>();
    for (let i = 0; i < 8; i++) {
      let s: LifeState = createLife({ auto: true }, newSeed(`src${i}`), data);
      for (const r of moneyRows(s, data, ko)) r.ids.forEach(x => ids.add(x));
      while (s.stage === 'phd' && s.month < 120) {
        s = advanceMonth(s, data);
        for (const r of moneyRows(s, data, ko)) r.ids.forEach(x => ids.add(x));
      }
    }
    expect(ids.size).toBeGreaterThan(5);
    const lines = footerLines([...ids], data, sources, ko);
    expect(lines.filter(l => l.includes(ko.sources.unknownSource))).toEqual([]);
    expect(lines.flatMap(leaks)).toEqual([]);
    for (const k of Object.keys(ko.schoolNames)) expect(lines.some(l => l.split(' ')[0]!.split('-').includes(k))).toBe(false);
  });
});

describe('stipend guarantee (#99)', () => {
  it('tells the institute minimum from the national floor and from non-guarantee records', () => {
    expect(stipendGuarantee(['schools-kaist-all-stipend-min', 'schools-kaist-all-tuition'])).toBe('institute');
    expect(stipendGuarantee(['schools-dgist-all-stipend-min-national'])).toBe('institute');
    expect(stipendGuarantee(['salaries-stipend-stem-living-phd-min'])).toBe('national');
    expect(stipendGuarantee(['schools-snu-all-stipend-ta', '0014#35'])).toBeNull();
    expect(stipendGuarantee([])).toBeNull();
  });
});
