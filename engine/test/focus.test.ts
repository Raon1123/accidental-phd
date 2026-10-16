import { describe, it, expect } from 'vitest';
import { ASSUMED } from '../src/assumed';
import { loadData } from '../src/data/load';
import { createLife } from '../src/pre/createLife';
import { applyDrift, applyFocus, advisorNetworkFactor } from '../src/phd/focus';
import type { AdvisorType, Focus, LifeState, Stats } from '../src/types';

const data = loadData();
const SEED = 'APHD-AAAAAAAA';

/** 지도교수 효과가 0 이 되는 중립 상태(support = rigor = network = 50). */
function base(over: { focus?: Focus; stats?: Partial<Stats>; advisor?: { type: AdvisorType; support: number; rigor: number; network: number }; qualified?: boolean } = {}): LifeState {
  const s = createLife({ funding: 'self', school: 'snu', track: 'philosophy', group: '인문사회' }, SEED, data);
  return {
    ...s,
    stats: { health: 60, mind: 50, skill: 50, relation: 40, network: 30, ...over.stats },
    phd: {
      ...s.phd!, focus: over.focus ?? 'research', qualified: over.qualified ?? false,
      advisor: over.advisor ?? { type: 'support', support: 50, rigor: 50, network: 50 },
    },
  };
}

describe('applyFocus (선택권 §4.1)', () => {
  it('research: health −1.5 keeps the fraction in statCarry (integer stats)', () => {
    const s1 = applyFocus(base(), data);
    expect(s1.stats.health).toBe(59);
    expect(s1.phd!.statCarry.health).toBeCloseTo(-0.5, 10);
    expect(s1.stats.skill).toBe(50);                 // +0.8 은 아직 1 미만
    expect(s1.phd!.statCarry.skill).toBeCloseTo(0.8, 10);
    // 한 달 더: −1.5 + (−0.5) = −2 → 정수로 넘어가고 carry 는 0
    const s2 = applyFocus(s1, data);
    expect(s2.stats.health).toBe(57);
    expect(s2.phd!.statCarry.health).toBeCloseTo(0, 10);
    expect(s2.stats.skill).toBe(51);                 // 0.8 + 0.8 = 1.6 → +1, carry 0.6
    expect(s2.phd!.statCarry.skill).toBeCloseTo(0.6, 10);
    expect(Number.isInteger(s2.stats.mind)).toBe(true);
  });

  // 0014 #41 재유도 2026-10-16(결정 기록 0028): 12 → 25. 이 상태는 근로·과제 참여가 없어 성장 배수 1이다.
  it('write: creates draft p1 and adds 25 + 0.2·skill (skill before this month)', () => {
    const s = applyFocus(base({ focus: 'write', stats: { skill: 60 } }), data);
    expect(s.phd!.papers).toEqual([{ id: 'p1', status: 'draft', writing: 25 + 0.2 * 60, quality: 0, attempts: 0, logitBonus: 0 }]);
    const s2 = applyFocus(s, data);                  // 같은 초고에 이어 쓴다
    expect(s2.phd!.papers).toHaveLength(1);
    expect(s2.phd!.papers[0]!.writing).toBeCloseTo(37 + 25 + 0.2 * s.stats.skill, 10);
  });

  it('write: caps writing at 100 and starts p2 when no draft is active', () => {
    const s0 = base({ focus: 'write' });
    const nearFull = { ...s0, phd: { ...s0.phd!, papers: [{ id: 'p1', status: 'draft' as const, writing: 95, quality: 0, attempts: 0, logitBonus: 0 }] } };
    expect(applyFocus(nearFull, data).phd!.papers[0]!.writing).toBe(ASSUMED.WRITING_MAX);
    const submitted = { ...s0, phd: { ...s0.phd!, papers: [{ id: 'p1', status: 'submitted' as const, writing: 100, quality: 50, attempts: 1, logitBonus: 0 }] } };
    const s = applyFocus(submitted, data);
    expect(s.phd!.papers.map(p => [p.id, p.status])).toEqual([['p1', 'submitted'], ['p2', 'draft']]);
  });

  it('network: cash −100,000 in the ledger only; network gain × advisor factor', () => {
    const s0 = base({ focus: 'network', advisor: { type: 'connected', support: 50, rigor: 50, network: 80 } });
    const s = applyFocus(s0, data);
    expect(s.ledger.filter(e => e.month === 0 && e.kind === 'network-cost')).toEqual([{ month: 0, kind: 'network-cost', amount: -100_000 }]);
    expect(s.money.cash).toBe(s0.money.cash);        // 현금 반영은 applyCashflow
    expect(advisorNetworkFactor(80)).toBeCloseTo(1.3, 10);
    expect(s.stats.network).toBe(30 + 2);            // 2.0 × 1.3 = 2.6 → +2, carry 0.6
    expect(s.phd!.statCarry.network).toBeCloseTo(0.6, 10);
  });

  it('work: +1,000,000 in the ledger as kind work', () => {
    const s = applyFocus(base({ focus: 'work' }), data);
    expect(s.ledger.filter(e => e.kind === 'work')).toEqual([{ month: 0, kind: 'work', amount: 1_000_000 }]);
    expect(s.phd!.statCarry.network).toBeCloseTo(0.3, 10);   // 근로의 네트워크 +0.3 은 배수 없음
  });

  it('rest: health +4, mind +3, no cash entry', () => {
    const s = applyFocus(base({ focus: 'rest', stats: { mind: 40 } }), data);
    expect(s.stats.health).toBe(64);
    expect(s.stats.mind).toBe(43);
    expect(s.ledger.some(e => e.month === 0 && e.kind === 'rest')).toBe(false);
  });

  it('thesis throws when not qualified, works after', () => {
    expect(() => applyFocus(base({ focus: 'thesis' }), data)).toThrow(/qualified/);
    const s = applyFocus(base({ focus: 'thesis', qualified: true }), data);
    expect(s.stats.health).toBe(58);                 // −2.0
    expect(s.stats.mind).toBe(49);                   // −1.0
  });

  it('advisor effects: relation += 0.02·(support − 50), free advisor mind +0.5', () => {
    const sup = applyFocus(base({ focus: 'rest', advisor: { type: 'support', support: 75, rigor: 45, network: 45 } }), data);
    expect(sup.stats.relation).toBe(40 + 1);         // 0.5(rest) + 0.02·25 = 1.0
    const free = applyFocus(base({ focus: 'rest', advisor: { type: 'free', support: 30, rigor: 30, network: 35 } }), data);
    expect(free.stats.mind).toBe(50 + 3);            // +3 + 0.5 = 3.5 → +3, carry 0.5
    expect(free.phd!.statCarry.mind).toBeCloseTo(0.5, 10);
    expect(free.phd!.statCarry.relation).toBeCloseTo(0.5 + 0.02 * -20, 10);   // 0.1
  });

  it('does nothing while on leave', () => {
    const s0 = base({ focus: 'work' });
    const leave = { ...s0, phd: { ...s0.phd!, leave: { active: true, until: 6, totalMonths: 1 } } };
    expect(applyFocus(leave, data)).toBe(leave);
  });

  it('does not mutate its input and is deterministic', () => {
    const s0 = base({ focus: 'write' });
    const snap = JSON.stringify(s0);
    const a = applyFocus(s0, data);
    expect(JSON.stringify(s0)).toBe(snap);
    expect(applyFocus(s0, data)).toEqual(a);
  });

  it('requires phd state', () => {
    const { phd: _p, ...rest } = base();
    expect(() => applyFocus(rest as LifeState, data)).toThrow();
  });
});

describe('applyDrift (상태 §1.5)', () => {
  it('health −0.5 and mind reverts 2% toward 50, through the carry', () => {
    const s0 = base({ stats: { health: 60, mind: 40 } });
    const s1 = applyDrift(s0);
    expect(s1.stats.health + s1.phd!.statCarry.health).toBeCloseTo(59.5, 10);
    expect(s1.stats.mind + s1.phd!.statCarry.mind).toBeCloseTo(40.2, 10);
    const s2 = applyDrift(s1);
    expect(s2.stats.health + s2.phd!.statCarry.health).toBeCloseTo(59, 10);
    expect(s2.stats.health).toBe(59);                // −1 이 되는 달에 정수로 넘어간다
  });
  it('mind above 50 falls, 50 stays, skill/relation/network untouched', () => {
    const hi = applyDrift(base({ stats: { mind: 80 } }));
    expect(hi.stats.mind + hi.phd!.statCarry.mind).toBeCloseTo(79.4, 10);
    const mid = applyDrift(base({ stats: { mind: 50 } }));
    expect(mid.stats.mind).toBe(50);
    expect(mid.stats.skill).toBe(50); expect(mid.stats.relation).toBe(40); expect(mid.stats.network).toBe(30);
  });
  it('clamps health at 0', () => {
    const s = applyDrift(base({ stats: { health: 0 } }));
    expect(s.stats.health).toBe(0);
    expect(s.phd!.statCarry.health).toBe(0);
  });
  it('applies on leave too (monthly regardless)', () => {
    const s0 = base({ stats: { health: 60 } });
    const leave = { ...s0, phd: { ...s0.phd!, leave: { active: true, until: 6, totalMonths: 1 } } };
    const s = applyDrift(applyDrift(leave));
    expect(s.stats.health).toBe(59);
  });
});
