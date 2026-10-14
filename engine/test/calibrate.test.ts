import { describe, it, expect } from 'vitest';
import { ASSUMED } from '../src/assumed';
import { loadData } from '../src/data/load';
import { createLife } from '../src/index';
import { submitIfReady } from '../src/phd/papers';
import { CANDIDATES, FINANCE_NEUTRAL, TARGETS, parseArgs, renderMarkdown, runCalibration, withOverrides, type TargetId } from '../sim/calibrate';

const data = loadData();
const N = 20;
// 선택권 §4.6 의 네 목표(학위 기간·휴학·이탈·취업)와 노동 §4.3 의 세 목표(취업·수요·교수 경험)에서 취업은 같은 행이라, 서로 다른 목표 묶음은 여섯이다.
const EXPECTED_ROWS: Record<TargetId, number> = { degreeYears: 4, leaveRate: 4, dropoutRate: 4, employment: 6, demand: 14, professor10y: 2 };

describe('calibration harness (N=20 smoke)', () => {
  const result = runCalibration({ seeds: N, data });

  it('runs every seed and builds a table with all target families', () => {
    expect(result.records).toHaveLength(N);
    expect([...TARGETS].sort()).toEqual(Object.keys(EXPECTED_ROWS).sort());
    for (const t of TARGETS) expect(result.table.filter(r => r.target === t), t).toHaveLength(EXPECTED_ROWS[t]);
    // 교수 경험은 보고만: 통과 여부와 허용 범위가 없다. 나머지는 통과 여부가 정해진다.
    for (const r of result.table) expect(r.pass === null, `${r.target} ${r.label}`).toBe(r.target === 'professor10y');
  });

  it('leave target is the stock share (leave months / phd months); the 12-month window is the secondary value', () => {
    for (const row of result.table.filter(r => r.target === 'leaveRate')) {
      const rs = result.records.filter(r => r.kedi === row.label);
      const months = rs.reduce((a, r) => a + r.phdMonths, 0);
      expect(row.sim).toBeCloseTo(rs.reduce((a, r) => a + r.leaveMonths, 0) / months, 12);
      expect(row.alt).not.toBeUndefined();
    }
  });

  it('records the PhD outcome at the moment the phd stage ends and keeps the books consistent', () => {
    for (const r of result.records) {
      expect(['degree', 'dropout', 'residence', 'financial', 'exit-master']).toContain(r.outcome);
      expect(r.degreeMonth !== undefined).toBe(r.outcome === 'degree');
      expect(r.phdMonths).toBeGreaterThan(0);
      expect(r.leaveMonths).toBeLessThanOrEqual(r.phdMonths);
      expect(r.leaveHit).toBeLessThanOrEqual(r.phdMonths / 12 + 1e-9);
      if (r.outcome === 'degree') expect(r.degreeMonth! % ASSUMED.SEMESTER_MONTHS).toBe(0);   // 졸업은 학기 경계 달
    }
    const d = result.diagnostics;
    expect(d.outcomeByGroup.all!.n).toBe(N);
    expect(d.shadowMismatch).toBe(0);   // 그림자 뉴스가 실제 뉴스와 같다
  });

  it('renders markdown with the six-column table, diagnostics and the provenance line last', () => {
    const md = renderMarkdown({ result, command: 'npm run calibrate -- --seeds 20', commit: 'test', date: '2026-10-14', causes: '## 원인 후보\n\n(없음)', candidates: [], baselines: {}, data });
    expect(md).toContain('| 목표 | 계열 | 모의값 | 기준값 (레코드 id) | 허용 범위 (0014 #52) | 통과 | 창(12개월) |');
    expect(md).toContain('### 진단');
    expect(md.trimEnd().split('\n').pop()).toBe('Provenance: 91_Handoffs/_HANDOFF-2026-10-13.md (APD)');
  });

  it('is deterministic and leaves ASSUMED untouched', () => {
    const before = JSON.stringify(ASSUMED);
    const again = runCalibration({ seeds: N, data });
    expect(JSON.stringify(ASSUMED)).toBe(before);
    expect(again.table).toEqual(result.table);
  });
});

describe('--override', () => {
  it('LOAN_LIMIT reaches createLife and lowers the financial-end share', () => {
    const base = runCalibration({ seeds: 40, data });
    const lenient = runCalibration({ seeds: 40, data, overrides: { LOAN_LIMIT: 300_000_000 } });
    const share = (r: typeof base): number => r.diagnostics.outcomeByGroup.all!.financial / r.diagnostics.outcomeByGroup.all!.n;
    expect(withOverrides({ LOAN_LIMIT: 300_000_000 }, () => createLife({ auto: true }, 'APHD-CAL00001', data).money.loanLimit)).toBe(300_000_000);
    expect(ASSUMED.LOAN_LIMIT).not.toBe(300_000_000);   // 끝나면 되돌린다
    expect(share(base)).toBeGreaterThan(0.3);
    expect(share(lenient)).toBeLessThan(share(base));
  });

  it('merges plain objects in place (partial LIVING_COST, and the FIRST_TIER reference papers.ts captured at import) and restores them', () => {
    const regional = ASSUMED.LIVING_COST.regional;
    withOverrides({ LIVING_COST: { capital: 1 } }, () => {
      expect(ASSUMED.LIVING_COST.capital).toBe(1);
      expect(ASSUMED.LIVING_COST.regional).toBe(regional);
    });
    expect(ASSUMED.LIVING_COST.capital).toBe(1_600_000);

    const life = createLife({ group: '이공', track: 'computer', school: 'snu' }, 'APHD-CAL00002', data);
    const full = { ...life, phd: { ...life.phd!, papers: [{ id: 'p1', status: 'draft' as const, writing: 100, quality: 50, attempts: 0, logitBonus: 0 }] } };
    const tierOf = (): string | undefined => submitIfReady(full, data).phd!.papers[0]!.tier;
    expect(tierOf()).toBe('T1');
    withOverrides({ FIRST_TIER: { '이공': 'T3' } }, () => expect(tierOf()).toBe('T3'));
    expect(tierOf()).toBe('T1');
  });

  it('rejects an unknown key and restores state when the callback throws', () => {
    expect(() => withOverrides({ NOT_A_CONSTANT: 1 }, () => 0)).toThrow(/unknown ASSUMED key/);
    expect(() => withOverrides({ LOAN_LIMIT: 1 }, () => { throw new Error('boom'); })).toThrow('boom');
    expect(ASSUMED.LOAN_LIMIT).toBe(42_000_000);   // 0014#61 (보정 2026-10-14)
  });

  it('parses repeated KEY=JSON pairs and rejects bad input', () => {
    const a = parseArgs(['--seeds', '12', '--group', '이공', '--override', 'LOAN_LIMIT=5', 'LIVING_COST={"capital":9}', '--candidates']);
    expect(a).toMatchObject({ seeds: 12, group: '이공', candidates: true, overrides: { LOAN_LIMIT: 5, LIVING_COST: { capital: 9 } } });
    expect(() => parseArgs(['--override', 'NOEQUALS'])).toThrow(/KEY=JSON/);
    expect(() => parseArgs(['--group', 'x'])).toThrow(/--group/);
    expect(() => parseArgs(['--bogus'])).toThrow(/unknown argument/);
  });

  it('every candidate names existing ASSUMED keys and finance-neutral is only a loan limit', () => {
    for (const c of CANDIDATES) for (const k of Object.keys(c.overrides())) expect(k in ASSUMED, `${c.id}: ${k}`).toBe(true);
    expect(Object.keys(FINANCE_NEUTRAL)).toEqual(['LOAN_LIMIT']);
  });
});
