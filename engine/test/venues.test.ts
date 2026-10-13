import { describe, it, expect } from 'vitest';
import { ASSUMED } from '../src/assumed';
import { loadData } from '../src/data/load';
import { fieldGroupOf, reviewMonths, tierBaseRate, venueOptions } from '../src/data/venues';
import type { Tier } from '../src/types';

const data = loadData();
const TIERS: Tier[] = ['T1', 'T2', 'T3', 'T4'];

describe('fieldGroupOf (0014#65)', () => {
  it('maps tracks to venue groups; linguistics has none', () => {
    expect(fieldGroupOf('linguistics')).toBeNull();
    expect(fieldGroupOf('english_literature')).toBeNull();
    expect(fieldGroupOf('computer')).toBe('cs-ai');
    expect(fieldGroupOf('neuroscience')).toBe('life');
  });
  it('rejects an unknown track', () => expect(() => fieldGroupOf('astrology')).toThrow(/unknown track/));
});

describe('tierBaseRate (0014#66, #70)', () => {
  it('tier base values are assumed', () => {
    expect(tierBaseRate(data, 'T1')).toMatchObject({ value: 0.25, confidence: 'assumed', id: '0014#66' });
    expect(tierBaseRate(data, 'T4').value).toBe(0.60);
  });
  it('a conference with an acceptance record uses it (icml: indexed 0.269)', () => {
    const v = tierBaseRate(data, 'T1', 'venues-conf-icml-acceptance-2025');
    expect(v).toMatchObject({ value: 0.269, confidence: 'indexed', id: 'venues-conf-icml-acceptance-2025' });
    expect(tierBaseRate(data, 'T1', 'venues-conf-icml-core-rank').id).toBe('venues-conf-icml-acceptance-2025');
  });
  it('a conference without an acceptance record, or a journal, falls back to the tier base', () => {
    expect(tierBaseRate(data, 'T1', 'venues-conf-focs-core-rank').id).toBe('0014#66');
    expect(tierBaseRate(data, 'T1', 'venues-journal-aer-sjr-quartile').id).toBe('0014#66');
  });
});

describe('venueOptions (선택권 §6.3)', () => {
  it('T1 conferences are exactly the CORE A* records', () => {
    const confs = venueOptions(data, 'ai', 'T1').filter(o => o.venueId?.startsWith('venues-conf-'));
    expect(confs.length).toBeGreaterThan(10);
    for (const o of confs) expect(data.records.get(o.venueId!)!.value, o.venueId!).toBe(4);
    const allA = [...data.records.values()].filter(r => /^venues-conf-.+-core-rank$/.test(r.id) && r.value === 4).map(r => r.id).sort();
    expect(confs.map(o => o.venueId).sort()).toEqual(allA);
  });
  it('CORE A=3 → T2 (isscc, iros), B=2 → T3 (icassp)', () => {
    expect(venueOptions(data, 'computer', 'T2').map(o => o.venueId)).toEqual(expect.arrayContaining(['venues-conf-isscc-core-rank', 'venues-conf-iros-core-rank']));
    expect(venueOptions(data, 'computer', 'T3').map(o => o.venueId)).toContain('venues-conf-icassp-core-rank');
  });
  it('conference pTier is the acceptance record when one exists, else the tier base', () => {
    const o = venueOptions(data, 'ai', 'T1');
    expect(o.find(x => x.venueId === 'venues-conf-neurips-core-rank')!.pTier).toMatchObject({ value: 0.2452, id: 'venues-conf-neurips-acceptance-2025' });
    expect(o.find(x => x.venueId === 'venues-conf-focs-core-rank')!.pTier).toMatchObject({ value: 0.25, confidence: 'assumed', id: '0014#66' });
  });
  it('conferences appear only for computer and ai tracks', () => {
    expect(ASSUMED.CONFERENCE_TRACKS).toEqual(['computer', 'ai']);
    for (const t of TIERS) {
      expect(venueOptions(data, 'mathematics', t).some(o => o.venueId?.startsWith('venues-conf-')), t).toBe(false);
      expect(venueOptions(data, 'electrical', t).some(o => o.venueId?.startsWith('venues-conf-')), t).toBe(false);
    }
  });
  it('journals are filtered by the track group and the SJR quartile', () => {
    const o = venueOptions(data, 'economics', 'T1');
    expect(o.map(x => x.venueId)).toContain('venues-journal-aer-sjr-quartile');
    for (const x of o) {
      expect(x.venueId).toMatch(/^venues-journal-/);
      expect(data.records.get(x.venueId!)!.note).toContain('분야군 경제학');
    }
  });
  it('KCI 등재(1) → T3, 등재후보(0) → T4', () => {
    expect(venueOptions(data, 'mathematics', 'T3').map(o => o.venueId)).toContain('venues-journal-comm-kms-kci');
    expect(venueOptions(data, 'environmental', 'T4').map(o => o.venueId)).toContain('venues-journal-kosenv-journal-kci');
    expect(venueOptions(data, 'environmental', 'T3').map(o => o.venueId)).not.toContain('venues-journal-kosenv-journal-kci');
  });
  it('tracks of one group share the same journals', () => {
    expect(venueOptions(data, 'history', 'T1')).toEqual(venueOptions(data, 'philosophy', 'T1'));
    expect(venueOptions(data, 'chemical', 'T2')).toEqual(venueOptions(data, 'materials', 'T2'));
  });
  it('tracks without a group get one nameless virtual journal at the tier base', () => {
    for (const t of TIERS) {
      expect(venueOptions(data, 'linguistics', t)).toEqual([{ venueId: null, pTier: { value: ASSUMED.TIER_BASE[t], confidence: 'assumed', id: '0014#66', unit: 'ratio' } }]);
    }
  });
  it('every track and tier has at least one option', () => {
    for (const track of Object.keys(ASSUMED.TRACK_VENUE_GROUP)) for (const t of TIERS) {
      expect(venueOptions(data, track, t).length, `${track}/${t}`).toBeGreaterThan(0);
    }
  });
  it('real venue options carry the tier base for journals (indexed SJR tier, assumed p)', () => {
    for (const o of venueOptions(data, 'sociology', 'T2')) {
      if (o.venueId) expect(o.pTier.id).toBe('0014#66');
    }
  });
});

describe('reviewMonths (0014#69)', () => {
  it('cs = [2, 6]; all fields have lo < hi', () => {
    expect(reviewMonths('cs')).toEqual([2, 6]);
    expect(reviewMonths('math')).toEqual([4, 10]);
    for (const f of ['cs', 'math', 'bio', 'engineering', 'social', 'humanities'] as const) {
      const [lo, hi] = reviewMonths(f);
      expect(lo).toBeLessThan(hi);
    }
  });
});
