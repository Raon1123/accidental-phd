// 동기 4명과 "다른 선택 보기"(#56, 상태 스펙 §6.3·§6.4).
import { describe, expect, it } from 'vitest';
import { cohortSeed, createLife, decide, newSeed, policyDecision, type LifeState } from '../../engine/src/browser';
import { loadData } from '../../engine/src/index';
import { COHORT_SIZE, branchPoints, catchUp, cohortRows, compareRows, createCohort, openBranch, runUntilHalt, sharedPrefix } from '../src/cohort';
import { ko } from '../src/strings.ko';

const data = loadData();

/** 사람처럼(자동 꺼짐) 진행하며 결정은 정책 번호로 고른다. n 번째 결정을 내린 직후 멈춘다. */
function playUntilDecisions(seed: string, n: number): LifeState {
  let s = createLife({}, newSeed(seed), data);
  while (s.decisions.length < n && s.stage !== 'end' && s.month < 12 * 90) {
    s = s.pending ? decide(s, data, policyDecision(s, data, s.pending)) : runUntilHalt(s, data);
  }
  return s;
}

describe('cohort of four (#56)', () => {
  const player = createLife({ track: 'ai' }, newSeed('cohort-player'), data);
  const cohort = createCohort(player, data);

  it('has four lives with cohort seeds, the player group, the same entry month, and the player news seed', () => {
    expect(cohort).toHaveLength(COHORT_SIZE);
    cohort.forEach((c, i) => {
      expect(c.seed).toBe(cohortSeed(player.seed, (i + 1) as 1 | 2 | 3 | 4));
      expect(c.choices.group).toBe(player.choices.group);
      expect(c.month).toBe(player.month);
      expect(c.ageMonths).toBeGreaterThan(0);
      expect(c.newsSeed).toBe(player.seed);
      expect(c.auto).toBe(true);
    });
  });

  it('is reproducible from the player seed', () => {
    expect(createCohort(player, data)).toEqual(cohort);
    expect(catchUp(createCohort(player, data), 40, data)).toEqual(catchUp(cohort, 40, data));
  });

  it('catches up to the player month and shows stage and end reason', () => {
    const later = catchUp(cohort, 36, data);
    for (const c of later) expect(c.stage === 'end' || c.month >= 36).toBe(true);
    const rows = cohortRows(later, ko);
    expect(rows.map(r => r.name)).toEqual(['동기 1', '동기 2', '동기 3', '동기 4']);
    later.forEach((c, i) => {
      expect(rows[i]!.stage).toBe(ko.play.stageNames[c.stage]);
      expect(rows[i]!.end).toBe(c.end ? ko.cohort.endReasons[c.end.reason] : ko.cohort.none);
    });
  });
});

describe('see another choice (#56)', () => {
  const life = playUntilDecisions('branch-life', 2);
  const points = branchPoints(life);

  it('offers every past decision point, none while undecided', () => {
    expect(life.decisions.length).toBeGreaterThanOrEqual(2);
    const withSnapshot = life.decisions.filter(d => life.snapshots.some(x => x.dp === d.dp && x.month === d.month));
    expect(points.map(p => `${p.month}:${p.dp}:${p.chosen}`)).toEqual(withSnapshot.map(d => `${d.month}:${d.dp}:${d.option}`));
    expect(points.length).toBe(life.decisions.length);
    const fresh = createLife({}, newSeed('branch-fresh'), data);
    expect(branchPoints(fresh)).toEqual([]);
  });

  it('the record before the branch equals the original life', () => {
    for (const p of points) {
      const b = openBranch(life, data, p.dp, p.month);
      expect(b.pending?.dp).toBe(p.dp);
      expect(b.month).toBe(p.month);
      const k = b.decisions.length;
      expect(b.decisions).toEqual(life.decisions.slice(0, k));
      expect(life.decisions[k]).toMatchObject({ dp: p.dp, month: p.month, option: p.chosen });
      expect(b.log).toEqual(life.log.slice(0, b.log.length));
      expect(b.seed).toBe(life.seed);
    }
  });

  it('a different choice shares the decision prefix and differs from the branched decision on', () => {
    const p = points[0]!;
    const b0 = openBranch(life, data, p.dp, p.month);
    const other = b0.pending!.options.findIndex(o => o.key !== p.chosen);
    let b = decide(b0, data, other);
    b = runUntilHalt(b, data);
    const k = b0.decisions.length;
    expect(sharedPrefix(life, b)).toBe(k);
    expect(b.decisions[k]!.option).not.toBe(p.chosen);
    const rows = compareRows(life, b, ko);
    expect(rows.map(r => r[0])).toEqual(Object.values(ko.cohort.rows));
    expect(rows.find(r => r[0] === ko.cohort.rows.decisions)![1]).toContain(`${p.month}:${p.chosen}`);
  });

  it('an earlier occurrence of a repeated decision point can be opened', () => {
    let found: LifeState | undefined;
    for (let i = 0; i < 40 && !found; i++) {
      const s = playUntilDecisions(`branch-repeat${i}`, 4);
      const dps = s.decisions.map(d => d.dp);
      if (dps.some((d, j) => dps.indexOf(d) !== j)) found = s;
    }
    expect(found).toBeDefined();
    const s = found!;
    const ps = branchPoints(s);
    const dup = ps.find((p, j) => ps.findIndex(q => q.dp === p.dp) !== j)!;
    const first = ps.find(p => p.dp === dup.dp)!;
    expect(first.month).toBeLessThan(dup.month);
    const b = openBranch(s, data, first.dp, first.month);
    expect(b.month).toBe(first.month);
    expect(b.pending).toMatchObject({ dp: first.dp, month: first.month });
    expect(b.decisions).toEqual(s.decisions.slice(0, b.decisions.length));
  });
});
