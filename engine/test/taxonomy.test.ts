import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { loadData } from '../src/data/load';
import { TRACKS, fieldOf, groupOf, kediOf, kscedOf, subfieldsOf, tracksOf } from '../src/data/taxonomy';

const data = loadData();
const mapping = JSON.parse(readFileSync(join(data.root, 'data/packs/taxonomy/mapping-tracks.json'), 'utf8')) as { track: string; nrf_code: string; level: number; primary: boolean }[];

describe('track tables', () => {
  it('27 tracks equal the mapping-tracks.json primary set', () => {
    expect(TRACKS.length).toBe(27);
    expect(new Set(TRACKS)).toEqual(new Set(mapping.filter(r => r.primary).map(r => r.track)));
  });

  it('group, field, KEDI and KSCED follow agency spec §1', () => {
    expect(groupOf('ai')).toBe('이공');
    expect(groupOf('history')).toBe('인문사회');
    expect(fieldOf('ai')).toBe('cs');
    expect(fieldOf('computer')).toBe('cs');
    expect(fieldOf('bioengineering')).toBe('bio');
    expect(fieldOf('mathematics')).toBe('math');
    expect(fieldOf('civil')).toBe('engineering');
    expect(fieldOf('economics')).toBe('social');
    expect(fieldOf('linguistics')).toBe('humanities');
    expect(kediOf('economics')).toBe('social');
    expect(kediOf('history')).toBe('humanities');
    expect(kediOf('life_science')).toBe('natural');
    expect(kediOf('bioengineering')).toBe('engineering');
    expect(kscedOf('economics')).toBe('business-law');
    expect(kscedOf('public_administration')).toBe('business-law');
    expect(kscedOf('psychology')).toBe('social');
    expect(kscedOf('mathematics')).toBe('natural-math');
    expect(kscedOf('ai')).toBe('ict');
    expect(kscedOf('semiconductor')).toBe('engineering');
    expect(kscedOf('linguistics')).toBe('arts-humanities');
  });

  it('group follows the primary NRF major class (A,B → 인문사회; C,D → 이공) and KEDI follows the letter', () => {
    const letterKedi: Record<string, string> = { A: 'humanities', B: 'social', C: 'natural', D: 'engineering' };
    for (const r of mapping.filter(m => m.primary)) {
      const L = r.nrf_code[0]!;
      expect(groupOf(r.track), r.track).toBe(L === 'A' || L === 'B' ? '인문사회' : '이공');
      expect(kediOf(r.track), r.track).toBe(letterKedi[L]);
    }
  });

  it('tracksOf splits 11 / 16', () => {
    expect(tracksOf('인문사회').length).toBe(11);
    expect(tracksOf('이공').length).toBe(16);
  });

  it('unknown track throws', () => {
    expect(() => groupOf('nope')).toThrow(/unknown track/);
  });
});

describe('subfieldsOf (agency spec §2.3)', () => {
  it('computer has 21 level-3 codes under D130000', () => {
    expect(subfieldsOf(data, 'computer').length).toBe(21);
  });

  it('civil: spec counts 19 + 6 = 25 raw entries, but 4 candidates are already children, so 21 distinct codes', () => {
    const cands = mapping.filter(r => r.track === 'civil' && !r.primary).map(r => r.nrf_code);
    expect(cands.length).toBe(6);
    const s = subfieldsOf(data, 'civil');
    const dup = cands.filter(c => data.records.get(`taxonomy-nrf-${c.toLowerCase()}`)?.value === 3);
    expect(dup.sort()).toEqual(['D140100', 'D140600', 'D141000', 'D141100']);
    expect(s.length).toBe(19 + 6 - dup.length);
    expect(s).toContain('D150000');   // 중분류 후보 2건은 그대로 선택지
    expect(s).toContain('D240000');
  });

  it('a level-3 primary comes first, then candidates', () => {
    const s = subfieldsOf(data, 'ai');
    expect(s[0]).toBe('D131100');
    const cands = mapping.filter(r => r.track === 'ai' && !r.primary).map(r => r.nrf_code);
    expect(s).toEqual(['D131100', ...cands]);
    expect(subfieldsOf(data, 'systems_biology')[0]).toBe('C071600');
  });

  it('every choice is an existing level-2/3 taxonomy code, with no duplicates', () => {
    for (const t of TRACKS) {
      const s = subfieldsOf(data, t);
      expect(new Set(s).size, t).toBe(s.length);
      expect(s.length, t).toBeGreaterThan(0);
      for (const code of s) {
        const rec = data.records.get(`taxonomy-nrf-${code.toLowerCase()}`);
        expect(rec, `${t} ${code}`).toBeDefined();
        expect([2, 3], `${t} ${code}`).toContain(rec!.value);
      }
    }
  });
});
