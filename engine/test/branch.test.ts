import { describe, it, expect } from 'vitest';
import { ASSUMED } from '../src/assumed';
import { advanceYear } from '../src/career/tick';
import { branch } from '../src/branch';
import { loadData } from '../src/data/load';
import { decide } from '../src/decide';
import { createLife } from '../src/pre/createLife';
import type { LifeState, Snapshot } from '../src/types';

const data = loadData();
const SEED = 'APHD-BRANCH01';

/** 경력 5년차 직전의 회사 연구원. 첫 advanceYear 에서 career-5y 가 걸린다. */
function careerStart(): LifeState {
  const s = createLife({ group: '이공', track: 'computer', school: 'snu' }, SEED, data);
  const { phd: _phd, ...rest } = s;
  return {
    ...rest, stage: 'career', month: 100, ageMonths: 35 * 12, stats: { health: 50, mind: 50, skill: 50, relation: 50, network: 50 },
    career: { degreeMonth: 40, degree: 'phd', route: 'industry', rank: 'staff', employer: { kind: 'company' }, annualPay: 60_000_000, yearsInRoute: 3, workYears: 5, academicMonths: 0, paperScore: 0, careerPapers: 0 },
  };
}

/** 결정이 걸릴 때까지 연 틱을 돈다. */
function untilPending(s: LifeState): LifeState {
  let x = s;
  for (let i = 0; i < 20 && !x.pending; i++) x = advanceYear(x, data);
  if (!x.pending) throw new Error('no decision came up');
  return x;
}

const at5y = untilPending(careerStart());

describe('branch (상태 §6.3)', () => {
  it('the fixture reaches career-5y; career/tick stores the snapshot with the prompt and without the decision (the contract)', () => {
    expect(at5y.pending!.dp).toBe('career-5y');
    expect(at5y.snapshots).toHaveLength(1);
    expect(at5y.snapshots[0]!.state.pending).toEqual(at5y.pending);
    expect(at5y.snapshots[0]!.state.decisions).toHaveLength(0);
  });

  it('from a state whose decision is still pending: returns the state before the decision with the prompt; the input is untouched', () => {
    const before = structuredClone(at5y);
    const b = branch(at5y, data, 'career-5y');
    expect(at5y).toEqual(before);
    expect(b.pending).toEqual(at5y.pending);
    expect(b.decisions).toHaveLength(0);
    expect(b.month).toBe(at5y.month);
    expect({ ...b, snapshots: [] }).toEqual({ ...at5y, snapshots: [] });
    expect(b.snapshots).toHaveLength(1);
    expect(b.snapshots[0]!.state.pending).toEqual(at5y.pending);
  });

  it('after the decision is made (pending cleared): branch still finds the prompt in the snapshot', () => {
    const decided = decide(at5y, data, 0);
    expect(decided.pending).toBeNull();
    const before = structuredClone(decided);
    const b = branch(decided, data, 'career-5y');
    expect(decided).toEqual(before);
    expect(b.pending?.dp).toBe('career-5y');
    expect(b.pending).toEqual(at5y.pending);
    expect(b.decisions).toHaveLength(0);
    expect(b.career).toEqual(at5y.career);
    expect({ ...b, snapshots: [] }).toEqual({ ...at5y, snapshots: [] });
  });

  it('news identical across branches (Review Focus 5): two different choices see the same news for three years', () => {
    const decided = decide(at5y, data, 0);
    const b = branch(decided, data, 'career-5y');
    let x = decide(b, data, 0);    // 승진 도전
    let y = decide(b, data, 1);    // 경로 변경
    expect(x.career).not.toEqual(y.career);   // 선택이 다르면 상태가 갈라진다
    for (let i = 0; i < 3; i++) {
      x = x.pending ? decide(x, data, 0) : advanceYear(x, data);
      y = y.pending ? decide(y, data, 0) : advanceYear(y, data);
      expect(x.month).toBe(y.month);
      expect(x.news).toEqual(y.news);
      expect(x.log.filter(l => l.tags.includes('news'))).toEqual(y.log.filter(l => l.tags.includes('news')));
    }
    expect(x.news.length + y.news.length).toBeGreaterThanOrEqual(0);
    expect(x.log.some(l => l.tags.includes('news'))).toBe(true);   // 비교가 빈 배열끼리가 아님을 보장
  });

  it('truncates snapshots to the branched decision (inclusive) and restores the decisions made before it', () => {
    let s = decide(at5y, data, 0);
    s = untilPending(s);
    expect(s.pending!.dp).toBe('career-10y');
    expect(s.snapshots.map(x => x.dp)).toEqual(['career-5y', 'career-10y']);

    const b5 = branch(s, data, 'career-5y');
    expect(b5.snapshots.map(x => x.dp)).toEqual(['career-5y']);
    expect(b5.decisions).toHaveLength(0);
    expect(b5.pending!.dp).toBe('career-5y');

    const b10 = branch(s, data, 'career-10y');
    expect(b10.snapshots.map(x => x.dp)).toEqual(['career-5y', 'career-10y']);
    expect(b10.decisions.map(d => d.dp)).toEqual(['career-5y']);
    expect(b10.pending).toEqual(s.pending);
    expect(b10.month).toBe(s.month);
  });

  it('a branched state can be decided and branched again (the snapshot of its own prompt travels with it)', () => {
    const b = branch(at5y, data, 'career-5y');
    const d = decide(b, data, 2);
    expect(d.decisions).toHaveLength(1);
    const again = branch(d, data, 'career-5y');
    expect({ ...again, snapshots: [] }).toEqual({ ...b, snapshots: [] });
  });

  it('picks the last snapshot when the same decision came up twice', () => {
    const first = at5y.snapshots[0]!;
    const secondState = { ...structuredClone(first.state), month: first.month + 12, decisions: [{ dp: 'career-5y' as const, month: first.month, option: 'A', byPolicy: false }] };
    const second: Snapshot = { dp: 'career-5y', month: first.month + 12, decisionIndex: 1, state: { ...secondState, pending: { ...at5y.pending!, month: first.month + 12 } } };
    const s: LifeState = { ...at5y, month: second.month, pending: null, decisions: secondState.decisions, snapshots: [first, second] };
    const b = branch(s, data, 'career-5y');
    expect(b.month).toBe(second.month);
    expect(b.decisions).toHaveLength(1);
    expect(b.snapshots).toHaveLength(2);
  });

  it('branches a phd-stage decision from a hand-made snapshot', () => {
    const life = createLife({ group: '이공', track: 'computer', school: 'snu' }, SEED, data);
    const prompt = { dp: 'post-qualifying' as const, month: 12, context: { passed: true }, options: ['A', 'B', 'C'].map(key => ({ key, textKey: `decision.post-qualifying.${key}` })) };
    const before = { ...life, month: 12 };
    const pending: LifeState = { ...before, pending: prompt, snapshots: [{ dp: 'post-qualifying', month: 12, decisionIndex: 0, state: structuredClone(before) }] };
    const decided = decide(pending, data, 2);
    expect(decided.stage).toBe('phd');
    const b = branch(decided, data, 'post-qualifying');
    expect(b.pending).toEqual(prompt);
    expect(b.phd).toEqual(before.phd);
    expect(decide(b, data, 1).phd!.leave.active).toBe(true);
  });

  it('throws when dataRevision differs (checked first)', () => {
    expect(() => branch({ ...at5y, dataRevision: 'x' }, data, 'career-5y')).toThrow(/dataRevision/);
    expect(() => branch({ ...at5y, dataRevision: 'x' }, data, 'post-qualifying')).toThrow(/dataRevision/);
  });

  it('throws when there is no snapshot for the decision', () => {
    expect(() => branch(at5y, data, 'career-10y')).toThrow(/no snapshot/);
    expect(() => branch({ ...at5y, snapshots: [] }, data, 'career-5y')).toThrow(/no snapshot/);
  });

  // 프롬프트 없이 저장된 옛 스냅샷(스냅샷 계약 이전의 저장)을 흉내 낸다
  const promptless = (s: LifeState): LifeState => ({ ...s, snapshots: s.snapshots.map(x => ({ ...x, state: { ...x.state, pending: null } })) });

  it('a snapshot stored without its prompt falls back to the live pending of the same decision', () => {
    const b = branch(promptless(at5y), data, 'career-5y');
    expect(b.pending).toEqual(at5y.pending);
    expect(b.snapshots[0]!.state.pending).toEqual(at5y.pending);
  });

  it('throws when the snapshot has no prompt and the decision is not pending', () => {
    expect(() => branch({ ...promptless(at5y), pending: null }, data, 'career-5y')).toThrow(/prompt/);
  });

  it('ignores a live pending of another month', () => {
    const other: LifeState = { ...promptless(at5y), pending: { ...at5y.pending!, month: at5y.pending!.month + 1 } };
    expect(() => branch(other, data, 'career-5y')).toThrow(/prompt/);
  });

  it('the returned state shares nothing with the input', () => {
    const b = branch(at5y, data, 'career-5y');
    b.stats.skill = 0;
    b.career!.annualPay = 0;
    b.snapshots[0]!.state.stats.mind = 0;
    b.pending!.options.pop();
    expect(at5y.stats.skill).toBe(50);
    expect(at5y.career!.annualPay).toBeGreaterThan(0);
    expect(at5y.snapshots[0]!.state.stats.mind).toBe(50);
    expect(at5y.pending!.options.length).toBeGreaterThan(b.pending!.options.length);
    expect(ASSUMED.MONTHS_PER_YEAR).toBe(12);
  });
});
