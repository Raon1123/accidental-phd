// 가상 학교명(#59, 결정 기록 0004): 매핑 표와 문자열 파일이 같고, 화면에 학교 이름을 내는 경로가 하나이며, 실명이 새지 않는다.
//
// 실명 판정 규칙: data/packs/schools/README.md 매핑 표의 "실명" 열(예: `서울대학교`, `KAIST`)과 그 줄임(`서울대`)을
// 대소문자를 구분해 찾는다. 저장 기록에는 재생에 필요한 소문자 school_id(`kaist`)와 레코드 id(`departments-kaist-…`)가
// 남는데, 0004 는 데이터가 실제 id 를 쓴다고 정했으므로 이것은 실명 표시가 아니다. 대소문자 무시로 바꾸면 모든 저장이 실패한다.
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { advanceMonth, advanceYear, createLife, newSeed, toSave, type LifeState } from '../../engine/src/browser';
import { loadData } from '../../engine/src/index';
import { schoolDisplayName } from '../src/schoolName';
import { ko } from '../src/strings.ko';
import { summaryRows } from '../src/view';

const root = resolve(__dirname, '../..');
const data = loadData();

/** README 매핑 표의 행: [school_id, 실명, 표시명]. */
function readmeTable(): [string, string, string][] {
  const md = readFileSync(join(root, 'data', 'packs', 'schools', 'README.md'), 'utf8');
  const rows: [string, string, string][] = [];
  for (const line of md.split(/\r?\n/)) {
    const m = /^\|\s*([a-z]+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/.exec(line);
    if (m && m[1] !== 'school_id') rows.push([m[1]!, m[2]!, m[3]!]);
  }
  return rows;
}
const table = readmeTable();
const realNames = [...new Set(table.flatMap(([, real]) => (real.endsWith('대학교') ? [real, real.slice(0, -2)] : [real])))];
const leaks = (text: string): string[] => realNames.filter(n => text.includes(n));

const idsFrom = (prefix: string): Set<string> =>
  new Set([...data.records.keys()].filter(k => k.startsWith(prefix)).map(k => k.slice(prefix.length).split('-')[0]!));

describe('school display names (#59)', () => {
  it('strings.ko.ts schoolNames equals the README mapping table', () => {
    expect(table).toHaveLength(21);
    expect(Object.fromEntries(table.map(([id, , shown]) => [id, shown]))).toEqual(ko.schoolNames);
  });

  it('every school in the schools and departments packs has a display name', () => {
    const ids = new Set([...idsFrom('schools-'), ...idsFrom('departments-')]);
    expect(ids.size).toBeGreaterThanOrEqual(20);
    for (const id of ids) expect(schoolDisplayName(id, ko)).not.toBe('');
  });

  it('throws on an unknown id instead of falling back to the id', () => {
    expect(() => schoolDisplayName('nowhere', ko)).toThrow(/nowhere/);
    expect(() => schoolDisplayName('toString', ko)).toThrow();
  });

  it('display names contain no real name', () => {
    expect(Object.values(ko.schoolNames).flatMap(leaks)).toEqual([]);
  });
});

describe('single path to the screen (#59)', () => {
  const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
  const webFiles = [...walk(join(root, 'web', 'src')), join(root, 'web', 'index.html')];

  it('web sources hold no real school name', () => {
    expect(webFiles.flatMap(f => leaks(readFileSync(f, 'utf8')).map(n => `${f}: ${n}`))).toEqual([]);
  });

  it('a school id reaches text only through schoolDisplayName', () => {
    const bad: string[] = [];
    for (const f of webFiles) {
      if (f.endsWith('schoolName.ts')) continue;
      readFileSync(f, 'utf8').split(/\r?\n/).forEach((line, i) => {
        if (/\b(choices\.school|schoolId)\b/.test(line) && !/schoolDisplayName\(\s*[\w.?]*(choices\.school|schoolId)\b/.test(line)) bad.push(`${f}:${i + 1}`);
      });
    }
    expect(bad).toEqual([]);
  });
});

describe('real-name leak scan over automatic lives (#59)', () => {
  const CAP_MONTH = 12 * 80;
  const SEEDS = 8;

  it(`summary rows, research notes and save records of ${SEEDS} lives hold no real name`, () => {
    const found: string[] = [];
    const schools = new Set<string>();
    const check = (where: string, text: string) => { for (const n of leaks(text)) found.push(`${where}: ${n}`); };
    for (let i = 0; i < SEEDS; i++) {
      let s: LifeState = createLife({ auto: true }, newSeed(`leak${i}`), data);
      schools.add(s.choices.school);
      const visit = () => check(`life ${i} month ${s.month} summary`, summaryRows(s, ko).flat().join('\n'));
      visit();
      while (s.stage === 'phd' && s.month < CAP_MONTH) { s = advanceMonth(s, data); visit(); }
      while ((s.stage === 'career' || s.stage === 'retired') && s.month < CAP_MONTH) { s = advanceYear(s, data); visit(); }
      check(`life ${i} research notes`, JSON.stringify(s.log));
      check(`life ${i} save`, JSON.stringify(toSave(s)));
    }
    expect(found).toEqual([]);
    expect(schools.size).toBeGreaterThan(1);   // 서로 다른 학교를 거쳤는지(검사가 한 학교에만 머물지 않도록)
  });
});
