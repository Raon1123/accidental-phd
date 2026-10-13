import { describe, it, expect } from 'vitest';
import { loadData } from '../src/data/load';
import { indexDepartments, recordKey, trackWeights, unitKey, unitsForTrack } from '../src/data/departments';
import { NUMBERED_SLUGS, TRACKS } from '../src/data/taxonomy';

const data = loadData();
const idx = indexDepartments(data);

describe('department bundles (same_unit_as counted once)', () => {
  it('bundles 22, members 45, units 460 of 483 department records', () => {
    expect(idx.records.size).toBe(483);            // 490 − 7 (`-tuition`)
    expect(idx.bundles.length).toBe(22);
    expect(idx.bundles.reduce((s, b) => s + b.members.length, 0)).toBe(45);
    expect(idx.units.length).toBe(460);
    expect(idx.bundles.map(b => b.n)).toEqual(Array.from({ length: 22 }, (_, i) => i + 1));
  });

  it('representatives match agency spec §10 (incl. uos 17, jnu 22)', () => {
    const rep = (id: string) => idx.bundles.find(b => b.members.includes(id))!.representative;
    expect(rep('departments-uos-computer-2')).toBe('departments-uos-electrical');
    expect(rep('departments-jnu-energy-2')).toBe('departments-jnu-environmental');
    expect(rep('departments-pusan-computer')).toBe('departments-pusan-ai');
    expect(rep('departments-kaist-environmental')).toBe('departments-kaist-civil');
  });

  it('every bundle representative is a member and carries no numeric suffix when one exists', () => {
    for (const b of idx.bundles) {
      expect(b.members).toContain(b.representative);
      if (b.members.some(m => !/-\d+$/.test(m))) expect(b.representative).not.toMatch(/-\d+$/);
      expect(b.members.length).toBeGreaterThanOrEqual(2);
    }
    expect(idx.bundles.filter(b => b.members.length === 3).length).toBe(1);
  });
});

describe('engine keys (agency spec §11)', () => {
  it('record keys unique (483), unit keys 460, slug regex, 87 numbered rows', () => {
    const rks = [...idx.recordKeys.values()];
    expect(new Set(rks).size).toBe(483);
    expect(new Set([...idx.unitKeys.values()]).size).toBe(460);
    for (const k of idx.unitKeys.values()) expect(k.split('/')[1]).toMatch(/^[a-z0-9_-]{1,32}$/);
    expect(Object.keys(NUMBERED_SLUGS).length).toBe(87);
    expect([...idx.records.values()].filter(r => r.numbered).length).toBe(87);
    expect(idx.recordKeys.get('departments-uos-computer-2')).toBe('uos/electrical@computer');
    expect(idx.recordKeys.get('departments-snu-computer-2')).toBe('snu/information-security');
    expect(idx.recordKeys.get('departments-snu-computer')).toBe('snu/computer');
  });

  it('every numbered record has a table entry and the table has no stray ids', () => {
    for (const id of Object.keys(NUMBERED_SLUGS)) expect(idx.records.get(id)?.numbered).toBe(true);
  });

  it('bundled numbered rows agree with the derived record key (rows 63, 74, 79)', () => {
    expect(idx.recordKeys.get('departments-jnu-electrical-2')).toBe('jnu/computer@electrical');
    expect(idx.recordKeys.get('departments-jnu-energy-2')).toBe('jnu/environmental@energy');
    expect(idx.unitKeys.get('departments-jnu-energy-2')).toBe('jnu/environmental');
  });

  it('unitKey and recordKey accessors; bundle members share one unit key', () => {
    const a = idx.records.get('departments-kaist-civil')!, b = idx.records.get('departments-kaist-environmental')!;
    expect(unitKey(a, idx)).toBe('kaist/civil');
    expect(unitKey(b, idx)).toBe('kaist/civil');
    expect(recordKey(b, idx)).toBe('kaist/civil@environmental');
    expect(recordKey(a, idx)).toBe('kaist/civil@civil');
    expect(idx.units).toContain('kaist/aerospace');
    expect(idx.units).toContain('snu/aerospace');
  });
});

describe('record parsing', () => {
  it('reads name, field, track, NRF, KEDI, confidence from the note', () => {
    const r = idx.records.get('departments-snu-computer')!;
    expect(r).toMatchObject({ school: 'snu', slug: 'computer', name: '컴퓨터공학부', field: 'cs', track: 'computer', nrf: 'D130000', kedi: 'U040801', confidence: 'verified', numbered: false, bundle: null });
  });

  it('track comes from the note, not the slug (konkuk life_science-2 is bioengineering)', () => {
    expect(idx.records.get('departments-konkuk-life_science-2')!.track).toBe('bioengineering');
  });

  it('every record has a known track, a field, and an NRF code', () => {
    const tracks = new Set(TRACKS);
    for (const r of idx.records.values()) {
      expect(tracks.has(r.track)).toBe(true);
      expect(r.nrf).toMatch(/^[A-Z]\d{6}$/);
    }
  });

  it('KEDI is absent for the 12 units with no KEDI sub-category', () => {
    expect([...idx.records.values()].filter(r => r.kedi === undefined).length).toBe(12);
  });

  it('noAdmission marks exactly the three units without a recruitment this round', () => {
    const ids = [...idx.records.values()].filter(r => r.noAdmission).map(r => r.id).sort();
    expect(ids).toEqual(['departments-knu-mechanical', 'departments-knu-philosophy', 'departments-pusan-psychology']);
  });

  it('sameUnitAs lists only record ids that exist', () => {
    const marked = [...idx.records.values()].filter(r => r.sameUnitAs.length > 0);
    expect(marked.length).toBe(45);
    for (const r of marked) for (const o of r.sameUnitAs) expect(idx.records.has(o)).toBe(true);
    expect(idx.records.get('departments-pusan-ai')!.sameUnitAs).toEqual(['departments-pusan-bioengineering', 'departments-pusan-computer']);
  });
});

describe('track weights (agency spec §2.2)', () => {
  const w = trackWeights(idx);
  it('equal the §2.2 table and sum to 460', () => {
    expect(w.ai).toBeCloseTo(30.83, 2);
    expect(w.computer).toBeCloseTo(25.33, 2);
    expect(w.bioengineering).toBeCloseTo(26.33, 2);
    expect(w.energy).toBe(26.5);
    expect(w.neuroscience).toBe(9);
    expect(w.linguistics).toBe(6.5);
    expect(Object.values(w).reduce((a, b) => a + b, 0)).toBeCloseTo(460, 6);
    expect(Object.keys(w).length).toBe(26);
  });

  it('reproduce every cell of the §2.2 table', () => {
    const table: Record<string, number> = {
      ai: 30.83, mechanical: 27, energy: 26.5, bioengineering: 26.33, materials: 25.5, computer: 25.33, life_science: 24.5, neuroscience: 9,
      electrical: 22, chemical: 18, semiconductor: 18.5, mathematics: 16.5, civil: 16.5, environmental: 15.5, statistics: 12.5, systems_biology: 4.5,
      sociology: 14, political: 16, psychology: 13, economics: 15, public_administration: 15, history: 18, philosophy: 15, korean_literature: 15,
      english_literature: 13.5, linguistics: 6.5,
    };
    for (const [t, v] of Object.entries(table)) expect(w[t], t).toBeCloseTo(v, 2);
  });
});

describe('unitsForTrack', () => {
  it('lists representative ids once per bundle, sorted', () => {
    const civil = unitsForTrack(idx, 'civil');
    expect(civil).toEqual([...civil].sort());
    expect(civil).toContain('departments-kaist-civil');
    // kaist environmental 은 같은 묶음의 대표(kaist-civil)로 environmental 트랙 목록에 나온다
    expect(unitsForTrack(idx, 'environmental')).toContain('departments-kaist-civil');
    expect(unitsForTrack(idx, 'environmental')).not.toContain('departments-kaist-environmental');
    expect(unitsForTrack(idx, 'nope')).toEqual([]);
  });

  it('a track with a bundle of 3 shows the representative once', () => {
    const ai = unitsForTrack(idx, 'ai');
    expect(ai.filter(id => id === 'departments-pusan-ai').length).toBe(1);
    expect(unitsForTrack(idx, 'computer')).toContain('departments-pusan-ai');
  });
});
