// 동기 4명(상태 §6.4, 결정 기록 0005)과 "다른 선택 보기" 분기(상태 §6.3)의 DOM 없는 부분(#56).
import { branch, cohortSeed, createLife, decisionOutcome, type DataBundle, type DecisionId, type LifeState } from '../../engine/src/browser';
import { step } from './play';
import { schoolDisplayName } from './schoolName';
import { departmentLabel } from './select';
import type { Strings } from './strings.ko';

export const COHORT_SIZE = 4;
const KS = [1, 2, 3, 4] as const;

/** 동기 4명: 플레이어와 같은 계열, seed = cohortSeed(플레이어 seed, k), 자동 진행, 뉴스는 플레이어 seed. */
export function createCohort(player: LifeState, data: DataBundle): LifeState[] {
  return KS.map(k => createLife({ group: player.choices.group, auto: true, cohortOf: player.seed }, cohortSeed(player.seed, k), data));
}

/**
 * 동기를 플레이어의 진행 개월까지 데려간다(이미 지났거나 끝났으면 그대로). 경력 이후는 한 칸이 한 해라 플레이어보다 최대 11개월 앞설 수 있다.
 * 동기는 자동 진행이라 결정 지점에서 멈추지 않는다.
 */
export function catchUp(cohort: readonly LifeState[], month: number, data: DataBundle): LifeState[] {
  return cohort.map(c => {
    let s = c;
    while (s.month < month) {
      const next = step(s, data);
      if (next === s) break;
      s = next;
    }
    return s;
  });
}

const fill = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? `{${k}}`));

/** 동기 패널 한 줄: 이름, 학과(세부전공)·학교(가상 표시명), 지금 단계, 끝난 이유. */
export function cohortRows(cohort: readonly LifeState[], t: Strings, data?: DataBundle): { name: string; who: string; stage: string; end: string }[] {
  return cohort.map((c, i) => ({
    name: fill(t.cohort.name, { k: i + 1 }),
    who: `${departmentLabel(c.choices, data, t)} · ${schoolDisplayName(c.choices.school, t)}`,
    stage: t.play.stageNames[c.stage],
    end: c.end ? t.cohort.endReasons[c.end.reason] : t.cohort.none,
  }));
}

/** 분기할 수 있는 결정 지점: 스냅샷이 있고 이미 고른 결정 전부(같은 지점이 여러 번 걸렸으면 각각). 지금 걸려 있는 결정은 뺀다. 오래된 것부터. */
export interface BranchPoint { dp: DecisionId; month: number; chosen: string; prompt: string }
export function branchPoints(s: LifeState): BranchPoint[] {
  const out: BranchPoint[] = [];
  for (let i = s.snapshots.length - 1; i >= 0; i--) {
    const snap = s.snapshots[i]!;
    const decided = s.decisions.find(d => d.dp === snap.dp && d.month === snap.month);
    if (!decided) continue;   // 아직 고르지 않은(지금 걸린) 결정
    const pending = snap.state.pending;   // decide 가 해결하면서 채운 질문(결과 갈래가 문구 키에 들어간다)
    const outcome = pending ? decisionOutcome(pending) : undefined;
    out.push({ dp: snap.dp, month: snap.month, chosen: decided.option, prompt: outcome ? `${snap.dp}.${outcome}` : snap.dp });
  }
  return out.sort((a, b) => a.month - b.month);
}

/**
 * 분기 열기: 그 결정 직전으로 돌아가 질문이 걸린 상태. 질문은 화면에서 사람이 고른다(decide).
 * 자동 모드 설정은 스냅샷 그대로 둔다 — 바꾸면 포커스 규칙이 달라져 선택 말고 다른 원인으로 기록이 갈라진다(상태 §6.3 3번).
 * 분기를 진행할 때는 포커스 입력을 주지 않으므로, 원래 삶에서 달마다 포커스를 바꿨다면 분기는 지금 포커스를 유지한다.
 */
export function openBranch(s: LifeState, data: DataBundle, dp: DecisionId, month: number): LifeState {
  return branch(s, data, dp, month);
}

/** 분기를 다음 결정 지점이나 끝까지 진행한다. */
export function runUntilHalt(s: LifeState, data: DataBundle, cap = 12 * 90): LifeState {
  let cur = step(s, data);
  while (!cur.pending && cur.stage !== 'end' && cur.month < cap) {
    const next = step(cur, data);
    if (next === cur) break;
    cur = next;
  }
  return cur;
}

/** 두 기록의 decisions 가 같은 접두 길이(상태 §6.3 4번). */
export function sharedPrefix(a: LifeState, b: LifeState): number {
  let n = 0;
  while (n < a.decisions.length && n < b.decisions.length) {
    const x = a.decisions[n]!, y = b.decisions[n]!;
    if (x.dp !== y.dp || x.month !== y.month || x.option !== y.option) break;
    n += 1;
  }
  return n;
}

/** 원래 삶과 분기를 나란히: [항목, 원래, 분기]. */
export function compareRows(a: LifeState, b: LifeState, t: Strings): [string, string, string][] {
  const R = t.cohort.rows;
  const one = (s: LifeState) => ({
    stage: t.play.stageNames[s.stage],
    month: String(s.month),
    end: s.end ? t.cohort.endReasons[s.end.reason] : t.cohort.none,
    route: s.career ? t.cohort.routeNames[s.career.route] : t.cohort.none,
    net: fill(t.cohort.won, { n: Math.round((s.money.cash - s.money.debt) / 10_000).toLocaleString('ko-KR') }),
    decisions: s.decisions.map(d => `${d.month}:${d.option}`).join(' ') || t.cohort.none,
  });
  const x = one(a), y = one(b);
  return (Object.keys(R) as (keyof typeof R)[]).map(k => [R[k], x[k], y[k]]);
}

export { fill };
