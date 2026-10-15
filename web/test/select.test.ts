// 입학 전 선택(#54): 분야(전공군)만 고르고 나머지는 운에 맡긴다(사용자 결정 2026-10-14).
import { describe, expect, it } from 'vitest';
import { TRACKS, createLife, groupOf, newSeed, selfTaProbability } from '../../engine/src/browser';
import { loadData } from '../../engine/src/index';
import { departmentLabel, lifeConfig, selfTaNote, trackGroups, trackLabel } from '../src/select';
import { ko } from '../src/strings.ko';

const data = loadData();

describe('department label (#88)', () => {
  it('is `학과명 (세부전공)`, never a school name, and falls back to the track label without data', () => {
    for (const track of ['computer', 'history', 'mathematics']) {
      const s = createLife(lifeConfig(track), newSeed('dept-label'), data);
      const label = departmentLabel(s.choices, data, ko);
      expect(label, track).toMatch(/^[^()]+( \([^()]+\))?$/);
      expect(departmentLabel(s.choices, undefined, ko)).toBe(trackLabel(track, ko));
    }
  });
});

describe('track selection (#54)', () => {
  it('trackNames has exactly the engine tracks', () => {
    expect(Object.keys(ko.trackNames).sort()).toEqual([...TRACKS].sort());
  });

  it('groups list every track once, under its own group, in engine order', () => {
    const groups = trackGroups(ko);
    expect(groups.map(g => g.group)).toEqual(['인문사회', '이공']);
    expect(groups.flatMap(g => g.tracks.map(x => x.track))).toEqual([...TRACKS]);
    for (const g of groups) for (const x of g.tracks) expect(groupOf(x.track)).toBe(g.group);
    expect(new Set(groups.flatMap(g => g.tracks.map(x => x.label))).size).toBe(TRACKS.length);
  });

  it('trackLabel throws on an unknown track', () => {
    expect(() => trackLabel('alchemy', ko)).toThrow(/alchemy/);
  });

  it('a chosen track is kept and the other five steps are left to luck', () => {
    for (const track of TRACKS) {
      const s = createLife(lifeConfig(track), newSeed(`select-${track}`), data);
      expect(s.choices.track).toBe(track);
      expect(s.choices.group).toBe(groupOf(track));
      expect(s.choices.byLuck).toEqual({ group: false, track: false, subfield: true, department: true, funding: true, advisorPref: true });
    }
  });

  it('"leave the field to luck" leaves all six steps to luck', () => {
    const s = createLife(lifeConfig(null), newSeed('select-luck'), data);
    expect(Object.values(s.choices.byLuck).every(Boolean)).toBe(true);
  });

  it('same choice and seed give the same life', () => {
    const seed = newSeed('select-same');
    expect(createLife(lifeConfig('ai'), seed, data)).toEqual(createLife(lifeConfig('ai'), seed, data));
    expect(createLife(lifeConfig(null), seed, data)).toEqual(createLife(lifeConfig(null), seed, data));
  });
});

describe('self-funding TA odds shown before entry (#163)', () => {
  it('prints the engine probability, not a typed-in number, and says the TA post is an offer', () => {
    const p = selfTaProbability(data).value;
    const note = selfTaNote(data, ko);
    expect(note).toContain(`${Math.round(p * 1000) / 10}%`);
    expect(note).toContain(ko.selfTa.offer);
    // 값이 바뀌면 문장도 바뀐다
    const other = { ...data, records: new Map(data.records) };
    other.records.set('statistics-ta-income-living-cost-2015', { ...data.records.get('statistics-ta-income-living-cost-2015')!, value: 0.5 } as never);
    expect(selfTaNote(other, ko)).toContain('50%');
  });
});
