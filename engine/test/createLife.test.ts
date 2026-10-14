import { describe, it, expect } from 'vitest';
import { ASSUMED } from '../src/assumed';
import { loadData, has } from '../src/data/load';
import { indexDepartments, unitKey, unitsForTrack } from '../src/data/departments';
import { entranceFee } from '../src/data/tuition';
import { scholarshipOptions } from '../src/data/funding';
import { newSeed } from '../src/rng';
import { pickUniform, pickWeighted } from '../src/util';
import { createLife } from '../src/pre/createLife';
import { subfieldsOfDepartment } from '../src/data/taxonomy';

const data = loadData();
const idx = indexDepartments(data);
const SEED = 'APHD-AAAAAAAA';

describe('util', () => {
  it('pickWeighted follows key order and skips zero weights', () => {
    const w = { a: 1, b: 0, c: 3 };
    expect(pickWeighted(0, w)).toBe('a');
    expect(pickWeighted(0.3, w)).toBe("c"); expect(pickWeighted(0.24, w)).toBe("a");
    expect(pickWeighted(0.999999, w)).toBe('c');
    expect(() => pickWeighted(0.5, { a: 0 })).toThrow();
  });
  it('pickWeighted frequencies match the weights', () => {
    const w = { x: 0.2, y: 0.5, z: 0.3 }; const n: Record<string, number> = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < 10000; i++) n[pickWeighted((i + 0.5) / 10000, w)]!++;
    expect(n.x).toBe(2000); expect(n.y).toBe(5000); expect(n.z).toBe(3000);
  });
  it('pickUniform is uniform and never out of range', () => {
    expect(pickUniform(0, ['a', 'b', 'c', 'd'])).toBe('a');
    expect(pickUniform(0.999999999, ['a', 'b', 'c', 'd'])).toBe('d');
    expect(pickUniform(0.5, ['a', 'b', 'c', 'd'])).toBe('c');
    expect(() => pickUniform(0.5, [])).toThrow();
  });
});

describe('createLife (선택권 §2, 상태 §1.4)', () => {
  it('same input → same state', () => {
    const a = createLife({}, SEED, data), b = createLife({}, SEED, data);
    expect(a).toEqual(b);
  });

  it('fills every LifeState field for a fresh phd life', () => {
    const s = createLife({}, SEED, data);
    expect(s).toMatchObject({
      version: 1, engineRevision: 'wave4', dataRevision: data.dataRevision, seed: SEED, stage: 'phd', month: 0,
      news: [], decisions: [], pending: null, snapshots: [], auto: false, newsSeed: SEED,
      money: { debt: 0, loanLimit: ASSUMED.LOAN_LIMIT },
      log: [{ month: 0, textKey: 'life.start', tags: ['start'], creative: false }],
    });
    expect(s.phd).toMatchObject({
      enrolledMonths: 0, leave: { active: false, until: -1, totalMonths: 0 }, coursework: true, project: 0, blocked: false,
      qualified: false, qualAttempts: 0, defenseAttempts: 0, papers: [], focus: 'research',
      focusHistory: [{ from: 0, focus: 'research' }], crisisMonths: 0, postCrisisMonths: 0,
      statCarry: { health: 0, mind: 0, skill: 0, relation: 0, network: 0 },
    });
    expect(s.career).toBeUndefined(); expect(s.end).toBeUndefined();
    expect(s.phd!.path).toBeUndefined();
    expect(ASSUMED.FAMILY_SUPPORT.map(f => f.monthly)).toContain(s.phd!.familySupport);
    expect(createLife({ auto: true }, SEED, data).auto).toBe(true);
  });

  it('explicit choices are kept, byLuck false; luck fills the rest', () => {
    const s = createLife({ group: '이공', track: 'ai', funding: 'self' }, SEED, data);
    expect(s.choices.group).toBe('이공'); expect(s.choices.byLuck.group).toBe(false);
    expect(s.choices.byLuck.track).toBe(false); expect(s.choices.byLuck.funding).toBe(false);
    for (const k of ['subfield', 'department', 'advisorPref'] as const) expect(s.choices.byLuck[k]).toBe(true);
    expect(s.choices.field).toBe('cs'); expect(s.choices.ksced).toBe('ict'); expect(s.choices.kedi).toBe('engineering');
    expect(s.stats.mind).toBeLessThanOrEqual(70 - 5 + 0); // 자비 −5 (0014#17)
  });

  it('self funding subtracts 5 mind after the 30–70 clamp (0014#17)', () => {
    const self = createLife({ funding: 'self' }, SEED, data);
    expect(self.phd!.fundingState).toMatchObject({ route: 'self', monthly: 0, until: -1, tuitionWaiver: 0, dutyHours: 0, recordIds: [] });
    // 같은 seed 에서 능력치 추첨은 선택과 무관하다: 자비가 아닌 쪽과 비교하면 마음만 5 낮다.
    let compared = 0;
    for (let i = 0; i < 40 && compared < 5; i++) {
      const seed = newSeed(`mind${i}`);
      const a = createLife({ funding: 'self' }, seed, data), b = createLife({ funding: 'project' }, seed, data);
      if (b.phd!.fundingState.route === 'self') continue;
      expect(a.stats.mind).toBe(Math.max(0, b.stats.mind - 5));
      for (const k of ['health', 'skill', 'relation', 'network'] as const) expect(a.stats[k]).toBe(b.stats[k]);
      compared++;
    }
    expect(compared).toBeGreaterThan(0);
  });

  it('initial stats within 30–70, cash 5,000,000 less entrance fee, ageMonths from 0014#3 support', () => {
    for (let i = 0; i < 200; i++) {
      const s = createLife({ funding: 'project' }, newSeed(`st${i}`), data);
      for (const [k, v] of Object.entries(s.stats)) {
        expect(Number.isInteger(v)).toBe(true);
        if (k === 'mind' && s.phd!.fundingState.route === 'self') { expect(v).toBeGreaterThanOrEqual(25); expect(v).toBeLessThanOrEqual(65); }
        else { expect(v).toBeGreaterThanOrEqual(30); expect(v).toBeLessThanOrEqual(70); }
      }
      const age = s.ageMonths / 12;
      expect(Number.isInteger(age)).toBe(true);
      expect(Object.keys(ASSUMED.ENTRY_AGE_DIST).map(Number)).toContain(age);
      const tuition0 = s.ledger.find(e => e.kind === 'tuition')?.amount ?? 0;   // 첫 학기 등록금(§5.1, month 0 = 학기 경계)
      expect(s.money.cash).toBe(ASSUMED.INIT_CASH - entranceFee(data, s.choices.school).value + tuition0);
    }
    expect(ASSUMED.INIT_CASH).toBe(5_000_000);
  });

  it('stat and age distributions look right over 2000 seeds', () => {
    let sum = 0, sumSq = 0, ageSum = 0;
    const n = 2000;
    for (let i = 0; i < n; i++) {
      const s = createLife({ funding: 'project' }, newSeed(`d${i}`), data);
      sum += s.stats.skill; sumSq += s.stats.skill ** 2; ageSum += s.ageMonths / 12;
    }
    const mean = sum / n, sd = Math.sqrt(sumSq / n - mean ** 2);
    expect(mean).toBeGreaterThan(49); expect(mean).toBeLessThan(51);
    expect(sd).toBeGreaterThan(7); expect(sd).toBeLessThan(8.6);   // 30–70 자르기로 8 보다 약간 작다
    const expected = Object.entries(ASSUMED.ENTRY_AGE_DIST).reduce((a, [k, p]) => a + Number(k) * p, 0);
    expect(Math.abs(ageSum / n - expected)).toBeLessThan(0.25);
  });

  it('luck group ratio ≈ 0.572 over 2000 seeds', () => {
    let stem = 0; for (let i = 0; i < 2000; i++) if (createLife({}, newSeed(`s${i}`), data).choices.group === '이공') stem++;
    expect(stem / 2000).toBeGreaterThan(0.54); expect(stem / 2000).toBeLessThan(0.60);
  });

  it('advisor preference matched with p≈0.6 (0014#19)', () => {
    let hit = 0; const N = 2000;
    for (let i = 0; i < N; i++) if (createLife({ advisorPref: 'strict' }, newSeed(`a${i}`), data).phd!.advisor.type === 'strict') hit++;
    expect(hit / N).toBeGreaterThan(0.56); expect(hit / N).toBeLessThan(0.64);
  });

  it('advisor by luck is uniform over four types and parameters follow 0014#18', () => {
    const n: Record<string, number> = { support: 0, strict: 0, free: 0, connected: 0 };
    for (let i = 0; i < 2000; i++) {
      const s = createLife({}, newSeed(`al${i}`), data);
      expect(s.choices.byLuck.advisorPref).toBe(true);
      const { type, ...params } = s.phd!.advisor;
      expect(params).toEqual(ASSUMED.ADVISOR_TYPES[type]);
      n[type]!++;
    }
    for (const v of Object.values(n)) { expect(v / 2000).toBeGreaterThan(0.21); expect(v / 2000).toBeLessThan(0.29); }
  });

  it('funding route resolves: scholarship fails → project → self (0014#22,#25)', () => {
    const routes: Record<string, number> = { scholarship: 0, project: 0, self: 0 };
    let projectFallback = 0;
    for (let i = 0; i < 300; i++) {
      const s = createLife({ group: '이공', track: 'ai', funding: 'scholarship' }, newSeed(`f${i}`), data);
      const f = s.phd!.fundingState;
      expect(s.choices.funding).toBe('scholarship');   // 고른 값은 그대로, 실제 경로만 달라진다
      routes[f.route]!++;
      if (f.route !== 'scholarship') {
        expect(['project', 'self']).toContain(f.route);
        if (f.route === 'project') {
          projectFallback++;
          expect(f.recordIds.length).toBeGreaterThan(0);
          expect(f.until).toBe(ASSUMED.PROJECT_MONTHS);
          expect(f.monthly).toBeGreaterThan(0);
          expect(f.dutyHours).toBe(0);
        }
      }
      for (const id of f.recordIds) expect(has(data, id)).toBe(true);
    }
    expect(routes.scholarship).toBeGreaterThan(0);
    expect(projectFallback).toBeGreaterThan(0);
    expect(routes.scholarship! + routes.project! + routes.self!).toBe(300);
  });

  it('scholarship chosen with a living record: monthly from the record, 48 months, waiver from the max-rate record', () => {
    let seen = 0;
    for (let i = 0; i < 100 && seen < 3; i++) {
      const s = createLife({ school: 'snu', track: 'ai', funding: 'scholarship' }, newSeed(`sc${i}`), data);
      const f = s.phd!.fundingState;
      if (f.route !== 'scholarship') continue;
      seen++;
      expect(s.choices.school).toBe('snu');
      const opts = scholarshipOptions(data, 'snu');
      expect(opts.length).toBeGreaterThan(0);
      expect(f.until).toBe(ASSUMED.SCHOLARSHIP_MONTHS);
      expect(f.dutyHours).toBe(0);
      const used = f.recordIds.filter(id => id.includes(ASSUMED.SCHOLARSHIP_RECORD_INFIX));
      expect(used).toHaveLength(1);
      expect(opts.map(o => o.id)).toContain(used[0]);
      expect(f.tuitionWaiver).toBeGreaterThanOrEqual(0); expect(f.tuitionWaiver).toBeLessThanOrEqual(1);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('schools without living-scholarship records still select with waiver only (monthly 0)', () => {
    for (const school of ['unist', 'khu', 'pusan', 'uos']) {
      expect(scholarshipOptions(data, school)).toHaveLength(0);
      let found = false;
      for (let i = 0; i < 60 && !found; i++) {
        const s = createLife({ school, group: '이공', funding: 'scholarship' }, newSeed(`ns${school}${i}`), data);
        if (s.phd!.fundingState.route !== 'scholarship') continue;
        found = true;
        expect(s.phd!.fundingState).toMatchObject({ monthly: 0, until: ASSUMED.SCHOLARSHIP_MONTHS });
      }
      expect(found).toBe(true);
    }
  });

  it('humanities-social luck funding shares follow 0014#16', () => {
    const n = { scholarship: 0, project: 0, self: 0 }; let total = 0;
    for (let i = 0; i < 2000; i++) {
      const s = createLife({ group: '인문사회', track: 'sociology' }, newSeed(`fl${i}`), data);
      expect(s.choices.byLuck.funding).toBe(true);
      n[s.choices.funding]++; total++;
    }
    // 인문사회: 장학 0.30, 과제 0.20, 자비 0.50
    expect(n.scholarship / total).toBeGreaterThan(0.26); expect(n.scholarship / total).toBeLessThan(0.34);
    expect(n.project / total).toBeGreaterThan(0.16); expect(n.project / total).toBeLessThan(0.24);
    expect(n.self / total).toBeGreaterThan(0.46); expect(n.self / total).toBeLessThan(0.54);
  });

  it('stem luck funding uses the institute table only for the five science institutes', () => {
    const share = (school: string): number => {
      let sch = 0, tot = 0;
      for (let i = 0; i < 1500; i++) {
        const s = createLife({ school, group: '이공' }, newSeed(`fi${school}${i}`), data);
        tot++; if (s.choices.funding === 'scholarship') sch++;
      }
      return sch / tot;
    };
    expect(Math.abs(share('kaist') - ASSUMED.FUNDING_LUCK.stemInstitute.scholarship)).toBeLessThan(0.05);
    expect(Math.abs(share('snu') - ASSUMED.FUNDING_LUCK.stemOther.scholarship)).toBeLessThan(0.05);
  });

  it('department: key, record and school agree; luck picks representatives of the track uniformly', () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 1500; i++) {
      const s = createLife({ track: 'ai' }, newSeed(`dp${i}`), data);
      const c = s.choices;
      expect(unitsForTrack(idx, 'ai')).toContain(c.departmentRecord);
      const rec = idx.records.get(c.departmentRecord)!;
      expect(c.department).toBe(unitKey(rec, idx));
      expect(c.school).toBe(rec.school);
      counts.set(c.departmentRecord, (counts.get(c.departmentRecord) ?? 0) + 1);
    }
    const units = unitsForTrack(idx, 'ai');
    expect(counts.size).toBe(units.length);   // 1500 번이면 모든 단위가 한 번은 나온다
  });

  it('school given without department restricts the draw to that school; none → throw', () => {
    for (let i = 0; i < 20; i++) {
      const s = createLife({ school: 'kaist', track: 'ai' }, newSeed(`k${i}`), data);
      expect(s.choices.school).toBe('kaist'); expect(s.choices.byLuck.department).toBe(true);
      expect(idx.records.get(s.choices.departmentRecord)!.school).toBe('kaist');
    }
    const absent = [...new Set([...idx.records.values()].map(r => r.school))].find(sc => unitsForTrack(idx, 'ai').every(id => idx.records.get(id)!.school !== sc))!;
    expect(absent).toBeDefined();
    expect(() => createLife({ school: absent, track: 'ai' }, SEED, data)).toThrow();
  });

  it('explicit department (unit key) is honoured; track and school follow', () => {
    const rep = unitsForTrack(idx, 'ai')[0]!;
    const key = unitKey(idx.records.get(rep)!, idx);
    const s = createLife({ department: key }, SEED, data);
    expect(s.choices).toMatchObject({ department: key, departmentRecord: rep, track: 'ai', group: '이공', school: idx.records.get(rep)!.school });
    expect(s.choices.byLuck).toMatchObject({ department: false, track: false, group: false });
    expect(() => createLife({ track: 'sociology', department: key }, SEED, data)).toThrow();
  });

  it('subfield: luck is drawn from the track list; explicit value must belong to it', () => {
    const s = createLife({ track: 'ai' }, SEED, data);
    const t = createLife({ track: 'ai', subfield: s.choices.subfield }, SEED, data);
    expect(t.choices.subfield).toBe(s.choices.subfield); expect(t.choices.byLuck.subfield).toBe(false);
    expect(() => createLife({ track: 'ai', subfield: 'ZZZZZZZ' }, SEED, data)).toThrow();
  });

  it('subfield by luck comes from the chosen department NRF subtree, never outside it (#68)', () => {
    for (let i = 0; i < 300; i++) {
      const s = createLife({}, newSeed(`t68-${i}`), data);
      const nrf = idx.records.get(s.choices.departmentRecord)!.nrf;
      expect(subfieldsOfDepartment(data, nrf)).toContain(s.choices.subfield);
    }
  });

  it('every department record offers at least one subfield', () => {
    for (const r of idx.records.values()) expect(subfieldsOfDepartment(data, r.nrf).length).toBeGreaterThan(0);
  });

  it('explicit subfield narrows the department draw; one no department offers throws', () => {
    const base = createLife({ track: 'computer' }, SEED, data);
    const sf = base.choices.subfield;
    for (let i = 0; i < 50; i++) {
      const s = createLife({ track: 'computer', subfield: sf }, newSeed(`t68-${i}`), data);
      expect(subfieldsOfDepartment(data, idx.records.get(s.choices.departmentRecord)!.nrf)).toContain(sf);
      expect(s.choices.subfield).toBe(sf);
    }
    expect(() => createLife({ track: 'computer', subfield: 'B130100' }, SEED, data)).toThrow();
    const rec = idx.records.get(base.choices.departmentRecord)!;
    expect(() => createLife({ department: rec.id, subfield: 'B130100' }, SEED, data)).toThrow();
  });

  it('unknown or inconsistent explicit values throw', () => {
    expect(() => createLife({ track: 'nope' }, SEED, data)).toThrow();
    expect(() => createLife({ school: 'nowhere' }, SEED, data)).toThrow();
    expect(() => createLife({ department: 'snu/nope' }, SEED, data)).toThrow();
    expect(() => createLife({ group: '인문사회', track: 'ai' }, SEED, data)).toThrow();
    expect(() => createLife({ funding: 'grant' as never }, SEED, data)).toThrow();
    expect(() => createLife({ advisorPref: 'kind' as never }, SEED, data)).toThrow();
  });

  it('luck track is drawn from the group; requiredPapers by group', () => {
    for (let i = 0; i < 200; i++) {
      const s = createLife({ group: '인문사회' }, newSeed(`t${i}`), data);
      expect(s.choices.group).toBe('인문사회'); expect(s.choices.byLuck.track).toBe(true);
      expect(['sociology', 'political', 'public_administration', 'law', 'psychology', 'economics', 'history', 'philosophy', 'korean_literature', 'english_literature', 'linguistics']).toContain(s.choices.track);
      expect(s.phd!.requiredPapers).toBe(ASSUMED.REQUIRED_PAPERS['인문사회'].count);
    }
    const stem = createLife({ group: '이공' }, SEED, data);
    expect(stem.phd!.requiredPapers).toBe(ASSUMED.REQUIRED_PAPERS['이공'].count);
  });

  it('entrance fee is charged at month 0 in the ledger', () => {
    const s = createLife({ school: 'snu', track: 'ai' }, SEED, data);
    const fee = entranceFee(data, 'snu');
    expect(fee.value).toBeGreaterThan(0);
    expect(s.ledger[0]).toEqual({ month: 0, kind: 'entrance-fee', amount: -fee.value, recordId: fee.id });
    // 첫 학기 등록금도 month 0 에 청구된다(§5.1; 감면율 반영, 레코드 id 기록)
    const t = s.ledger.find(e => e.kind === 'tuition')!;
    expect(t.amount).toBeLessThan(0); expect(t.recordId).toMatch(/tuition$/);
    expect(s.money.cash).toBe(ASSUMED.INIT_CASH - fee.value + t.amount);
    const k = createLife({ school: 'kaist', track: 'ai' }, SEED, data);   // 입학금 0원 (0014#54)
    expect(k.ledger.find(e => e.kind === 'entrance-fee')).toBeUndefined();
    expect(k.money.cash).toBe(ASSUMED.INIT_CASH + (k.ledger.find(e => e.kind === 'tuition')?.amount ?? 0));
    expect(k.ledger.every(e => e.amount !== 0)).toBe(true);
  });

  it('cohort: needs group, newsSeed = cohortOf', () => {
    expect(() => createLife({ cohortOf: 'APHD-BBBBBBBB' }, SEED, data)).toThrow();
    const c = createLife({ cohortOf: 'APHD-BBBBBBBB', group: '이공' }, SEED, data);
    expect(c.newsSeed).toBe('APHD-BBBBBBBB'); expect(c.seed).toBe(SEED); expect(c.choices.group).toBe('이공');
  });

  it('different seeds differ; named slots are independent of choices that do not feed them', () => {
    const a = createLife({}, newSeed('x1'), data), b = createLife({}, newSeed('x2'), data);
    expect(a).not.toEqual(b);
    // 같은 seed 에서 advisorPref 만 고정해도 계열·트랙·세부전공·학과·능력치 추첨은 그대로다.
    const c = createLife({}, SEED, data), d = createLife({ advisorPref: 'free' }, SEED, data);
    expect([d.choices.group, d.choices.track, d.choices.subfield, d.choices.departmentRecord, d.choices.funding])
      .toEqual([c.choices.group, c.choices.track, c.choices.subfield, c.choices.departmentRecord, c.choices.funding]);
    expect(d.stats).toEqual(c.stats);
    expect(d.ageMonths).toBe(c.ageMonths);
  });
});
