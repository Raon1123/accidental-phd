import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, it, expect } from 'vitest';
import { loadData, get, has, find } from '../src/data/load';

const data = loadData();

describe('loadData', () => {
  it('reads every records.json (2794 records, taxonomy included; 법학 학과 11 #70; akj 10 #100)', () => {
    expect(data.records.size).toBe(211 + 506 + 239 + 650 + 148 + 1040);   // #79: 최저시급 2, 물가 2; #100: schools 5, departments 5; Wave 6: statistics 6 (학자금대출 4, 가족 지원 1, 1인가구 소비 1)
    expect(data.records.size).toBe(2794);
    expect(has(data, 'taxonomy-nrf-d131100')).toBe(true);
  });

  it('get returns value, confidence, id and unit', () => {
    expect(get(data, 'salaries-stipend-bk21-phd-min')).toEqual({ id: 'salaries-stipend-bk21-phd-min', value: 1600000, confidence: 'verified', unit: 'krw' });
  });

  it('get throws on an unknown id; has is false', () => {
    expect(() => get(data, 'nope')).toThrow(/record not found: nope/);
    expect(has(data, 'nope')).toBe(false);
  });

  it('find returns prefix matches sorted by id', () => {
    const r = find(data, 'statistics-postdoc-funder-');
    expect(r.length).toBe(6);
    const ids = r.map(x => x.id);
    expect(ids).toEqual([...ids].sort());
    expect(find(data, 'no-such-prefix-')).toEqual([]);
  });

  it('dataRevision is 16 hex digits and stable across loads', () => {
    expect(data.dataRevision).toMatch(/^[0-9a-f]{16}$/);
    expect(loadData(data.root).dataRevision).toBe(data.dataRevision);
  });

  it('root defaults to the directory holding package.json', () => {
    expect(existsSync(join(data.root, 'package.json'))).toBe(true);
    expect(has(data, 'departments-snu-computer')).toBe(true);
  });

  it('reads narratives from every nested json (>= 120, ids start with nar-)', () => {
    expect(data.narratives.size).toBeGreaterThanOrEqual(120);
    for (const [id, n] of data.narratives) {
      expect(id.startsWith('nar-')).toBe(true);
      expect(n.id).toBe(id);
      expect(['verified', 'indexed', 'assumed']).toContain(n.confidence);
    }
    expect(data.narratives.get('nar-hs-admission-1')?.track).toBe('인문사회');
  });
});

describe('dataRevision covers every pack file the engine reads', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'aphd-data-'));
  cpSync(join(data.root, 'data', 'packs'), join(tmp, 'data', 'packs'), { recursive: true });
  const file = (rel: string) => join(tmp, 'data', 'packs', rel);
  afterAll(() => rmSync(tmp, { recursive: true, force: true }));

  it('a copy of the data dir has the same revision', () => {
    expect(loadData(tmp).dataRevision).toBe(data.dataRevision);
  });

  it('changes when mapping-tracks.json changes, and reverts when restored', () => {
    const p = file('taxonomy/mapping-tracks.json');
    const orig = readFileSync(p, 'utf8');
    writeFileSync(p, orig.replace('생물정보학', '생물정보학2'));
    expect(loadData(tmp).dataRevision).not.toBe(data.dataRevision);
    writeFileSync(p, orig);
    expect(loadData(tmp).dataRevision).toBe(data.dataRevision);
  });

  it('changes when a narrative file changes', () => {
    const p = file('narratives/stem/records.json');
    const orig = readFileSync(p, 'utf8');
    writeFileSync(p, orig.replace('"confidence"', '"confidence "'));
    expect(loadData(tmp).dataRevision).not.toBe(data.dataRevision);
    writeFileSync(p, orig);
  });

  it('changes when a records.json changes', () => {
    const p = file('venues/records.json');
    const orig = readFileSync(p, 'utf8');
    writeFileSync(p, orig + ' ');
    expect(loadData(tmp).dataRevision).not.toBe(data.dataRevision);
    writeFileSync(p, orig);
  });

  it('is unchanged by CRLF line endings', () => {
    const p = file('taxonomy/mapping-tracks.json');
    const orig = readFileSync(p, 'utf8');
    writeFileSync(p, orig.replace(/\r?\n/g, '\r\n'));
    expect(loadData(tmp).dataRevision).toBe(data.dataRevision);
    writeFileSync(p, orig);
  });
});
