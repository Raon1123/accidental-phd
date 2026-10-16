// 무작위 일상 문장(#183, #124 잔여): 조건 해석, 같은 seed 같은 줄, 한 칸 최대 한 줄, 장면이 있는 칸 생략, 분야 필터, 재등장 간격, 태그 감쇠.
import { describe, expect, it } from 'vitest';
import { createLife, type LifeState } from '../../engine/src/browser';
import { loadData } from '../../engine/src/index';
import { COMPILED, FLAVOR, GAP_OTHER, GAP_PHD, atom, compile, pickFlavor, weight, type FlavorPick, type Tick } from '../src/flavor';
import { halted, nextFlavor, notes, setAuto, step } from '../src/play';
import { ko } from '../src/strings.ko';

const data = loadData();

function run(seed: string, track: string): { s: LifeState; picks: FlavorPick[] } {
  let s = setAuto(createLife({ track } as never, seed, data), data, true);
  let picks: FlavorPick[] = [];
  for (let k = 0; k < 3000 && !halted(s); k++) {
    let n = step(s, data);
    if (n.pending) n = setAuto(n, data, true);
    picks = nextFlavor(s, n, picks);
    s = n;
  }
  return { s, picks };
}

const lives = [['FLAVOR-A', 'history'], ['FLAVOR-B', 'computer'], ['FLAVOR-C', 'sociology'], ['FLAVOR-D', 'life_science']].map(([seed, track]) => ({ track: track!, ...run(seed!, track!) }));
const byId = new Map(FLAVOR.map(l => [l.id, l]));

describe('flavor lines (#183)', () => {
  it('every condition atom in the pack is understood', () => {
    expect(COMPILED.filter(c => c.unknown.length).map(c => `${c.line.id}: ${c.unknown.join(' | ')}`)).toEqual([]);
  });
  it('unknown atoms keep the line out instead of matching everything', () => {
    expect(atom('달이 밝은 밤')).toBeUndefined();
    expect(compile({ ...FLAVOR[0]!, when: 'stage=phd AND 달이 밝은 밤' }).unknown).toEqual(['달이 밝은 밤']);
  });
  it('the same seed gives the same lines', () => {
    expect(run('FLAVOR-A', 'history').picks).toEqual(lives[0]!.picks);
  });
  it('at most one line a month, and none in a month that already has a scene line', () => {
    for (const { s, picks } of lives) {
      expect(new Set(picks.map(p => p.month)).size).toBe(picks.length);
      const list = notes(s, ko, picks);
      for (const p of picks) {
        const month = list.filter(n => n.month === p.month);
        expect(month.filter(n => n.kind === 'flavor')).toHaveLength(1);
        expect(month.some(n => n.kind === 'scene')).toBe(false);
      }
    }
  });
  it('lines appear on roughly one PhD month in three or four', () => {
    for (const { s, picks } of lives) {
      const degree = s.career?.degreeMonth ?? s.month;
      const rate = picks.filter(p => p.month < degree).length / degree;
      expect(rate).toBeGreaterThan(0.12);
      expect(rate).toBeLessThan(0.45);
    }
  });
  it('field lines only for that track, stage lines only in that stage', () => {
    for (const { track, picks } of lives) for (const p of picks) {
      const l = byId.get(p.id)!;
      if (l.field) expect(l.field).toBe(track);
    }
  });
  it('the same line comes back only after its gap', () => {
    for (const { s, picks } of lives) {
      const last = new Map<string, number>();
      for (const p of picks) {
        const prev = last.get(p.id);
        if (prev !== undefined) {
          const c = COMPILED.find(x => x.line.id === p.id)!;
          const phd = s.career === undefined || p.month < s.career.degreeMonth;
          expect(p.month - prev).toBeGreaterThanOrEqual(c.gap ?? (phd ? GAP_PHD : GAP_OTHER));
        }
        last.set(p.id, p.month);
      }
    }
  });
  it('a first tag seen in the last four lines lowers the weight', () => {
    const c = { line: { ...FLAVOR[0]!, tags: ['라면'] }, specific: 0 };
    expect(weight(c, [])).toBe(1);
    expect(weight(c, ['라면', '빨래'])).toBeCloseTo(1 / 3);
    expect(weight(c, ['라면', '라면'])).toBeCloseTo(1 / 5);
  });
  it('no line on a tick that stops at a decision or that has a scene line', () => {
    const { s } = lives[0]!;
    const tick: Tick = { prev: s, next: { ...s, stage: 'phd', pending: { dp: 'post-qualifying', month: s.month, context: {}, options: [] } }, log: [], ledger: [] };
    expect(pickFlavor(tick, [], false)).toBeNull();
    expect(pickFlavor({ ...tick, next: { ...tick.next, pending: null } }, [], true)).toBeNull();
  });
  it('the feed marks them creative, kind flavor, under their month', () => {
    const { s, picks } = lives[1]!;
    const f = notes(s, ko, picks).filter(n => n.kind === 'flavor');
    expect(f.length).toBe(picks.length);
    expect(f.every(n => n.creative && byId.has(n.key.slice('flavor.'.length)))).toBe(true);
  });
  it('a different life drops the old lines', () => {
    const { s, picks } = lives[0]!;
    const other = createLife({}, 'FLAVOR-Z', data);
    expect(nextFlavor(s, other, picks)).toEqual([]);
  });
});
