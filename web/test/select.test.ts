// 입학 전 선택(#54): 분야(전공군)만 고르고 나머지는 운에 맡긴다(사용자 결정 2026-10-14).
import { describe, expect, it } from 'vitest';
import { TRACKS, createLife, groupOf, newSeed } from '../../engine/src/browser';
import { loadData } from '../../engine/src/index';
import { compatible, lifeConfig, offerings, schoolIds, trackGroups, trackLabel } from '../src/select';
import { ko } from '../src/strings.ko';

const data = loadData();

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

describe('school selection (#69)', () => {
  const o = offerings(data);

  it('every school with units has a display name and every track is offered by some school', () => {
    expect([...o.tracksOf.keys()].sort()).toEqual([...schoolIds(o, ko)].sort());
    for (const track of TRACKS) expect(o.schoolsOf.get(track)!.size).toBeGreaterThan(0);
  });

  it('schools differ in what they offer', () => {
    const sizes = new Set([...o.tracksOf.values()].map(s => s.size));
    expect(sizes.size).toBeGreaterThan(1);
  });

  it('compatible() is true when either side is luck, and false for a track a school lacks', () => {
    expect(compatible(o, null, 'snu')).toBe(true);
    expect(compatible(o, 'ai', null)).toBe(true);
    const lacking = [...o.tracksOf].flatMap(([school, ts]) => TRACKS.filter(t => !ts.has(t)).map(t => [t, school] as const));
    expect(lacking.length).toBeGreaterThan(0);
    for (const [t, s] of lacking) expect(compatible(o, t, s)).toBe(false);
  });

  it('every compatible (track, school) pair starts a life at that school; screen and engine agree', () => {
    for (const [track, schools] of o.schoolsOf) {
      for (const school of schools) {
        const s = createLife(lifeConfig(track, school), newSeed(`pair-${track}-${school}`), data);
        expect(s.choices.track).toBe(track);
        expect(s.choices.school).toBe(school);
        expect(s.choices.byLuck.department).toBe(true);
      }
    }
  });

  it('an incompatible pair is refused by the engine (the screen never offers it)', () => {
    for (const [school, ts] of o.tracksOf) {
      const t = TRACKS.find(x => !ts.has(x));
      if (t) { expect(() => createLife(lifeConfig(t, school), newSeed('bad'), data)).toThrow(); return; }
    }
    throw new Error('no incompatible pair found');
  });

  it('lifeConfig keeps school only when chosen', () => {
    expect(lifeConfig(null, null)).toEqual({});
    expect(lifeConfig('ai')).toEqual({ track: 'ai' });
    expect(lifeConfig(null, 'snu')).toEqual({ school: 'snu' });
    expect(lifeConfig('ai', 'snu')).toEqual({ track: 'ai', school: 'snu' });
  });
});
