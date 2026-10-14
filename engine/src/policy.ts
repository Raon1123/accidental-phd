// 자동 진행·동기 정책 (선택권 §4.4, 0014#46). 난수는 stream `policy`, 슬롯 `focus`·`decide:${dp}`.
import { ASSUMED } from './assumed';
import { pathDistribution } from './career/path';
import type { DataBundle } from './data/bundle';
import { LETTERS, PATH_OPTIONS, decisionOutcome, optionUnavailable } from './decide';
import { activeDraft } from './phd/papers';
import { draw } from './rng';
import type { Focus, LifeState, PendingDecision } from './types';
import { pickWeighted } from './util';

/**
 * 이번 달 포커스(선택권 §4.4). 순서: 체력·마음 < 30 → rest, 졸업 직전 구직 중(phd.path 가 정해짐) → network 0.3·thesis 0.7,
 * 자격시험 합격 후 → thesis 0.5·research 0.2·write 0.2·network 0.1, 그 밖 → 활성 초고가 있고 writing < 100 이면 확률 0.6 write, 아니면 research.
 * thesis 는 자격시험 합격 뒤에만 나온다. 휴학 중에는 포커스가 효과가 없으므로 지금 포커스를 그대로 낸다(기록이 불필요하게 바뀌지 않게).
 * 스펙 문구 그대로, 초고가 아직 없으면 자격시험 합격 전에는 write 를 고르지 않는다(초고는 write 포커스가 만든다).
 */
export function policyFocus(state: LifeState, _data?: DataBundle): Focus {
  const phd = state.phd;
  if (!phd) throw new Error('policyFocus: phd state required');
  if (phd.leave.active) return phd.focus;
  const P = ASSUMED.POLICY;
  if (state.stats.health < P.restThreshold || state.stats.mind < P.restThreshold) return 'rest';
  const u = draw(state.seed, 'policy', state.month, 'focus');
  if (phd.path !== undefined) {
    const w: Record<string, number> = phd.qualified ? { ...P.jobSearchFocus } : { network: P.jobSearchFocus.network };
    return pickWeighted(u, w) as Focus;
  }
  if (phd.qualified) return pickWeighted(u, { ...P.postQualFocus }) as Focus;
  const draft = activeDraft(phd.papers);
  return draft !== undefined && draft.writing < ASSUMED.WRITING_MAX && u < P.writeP ? 'write' : 'research';
}

/** POLICY.decisions 의 키: 결과 갈래가 있으면 `${dp}:${갈래}`, 없으면 `${dp}`. pre-graduation-path 는 표가 아니라 §8 분포를 쓴다. */
function weightsFor(state: LifeState, data: DataBundle, pending: PendingDecision): readonly number[] {
  if (pending.dp === 'pre-graduation-path') {
    const dist = pathDistribution(data, state.choices.ksced, state.choices.group);
    return PATH_OPTIONS.map(p => dist[p]);
  }
  const outcome = decisionOutcome(pending);
  const key = outcome ? `${pending.dp}:${outcome}` : pending.dp;
  const table = (ASSUMED.POLICY.decisions as Record<string, readonly number[]>)[key];
  if (!table) throw new Error(`policyDecision: no policy weights for ${key}`);
  return table;
}

/**
 * 결정 지점의 선택지 번호(`pending.options` 의 인덱스)를 고정 가중치로 뽑는다. 기대 효용은 쓰지 않는다(선택권 §4.4).
 * 가중치 배열은 선택지 A, B, C, D 순서다. 실제로 걸린 선택지만 남겨 다시 정규화하고(예: 비학계 경로의 career-5y 는 D 가 없다),
 * decide 가 거부할 선택지(휴학 상한을 넘는 휴학, 이미 시도한 연장 신청)는 가중치 0으로 거른다.
 */
export function policyDecision(state: LifeState, data: DataBundle, pending: PendingDecision): number {
  const table = weightsFor(state, data, pending);
  const w: Record<string, number> = {};
  for (const o of pending.options) {
    const idx = LETTERS.indexOf(o.key as typeof LETTERS[number]);
    w[o.key] = optionUnavailable(state, pending, o.key) ? 0 : (table[idx] ?? 0);
  }
  if (!Object.values(w).some(x => x > 0)) {
    const first = pending.options.findIndex(o => !optionUnavailable(state, pending, o.key));
    if (first < 0) throw new Error(`policyDecision: no available option for ${pending.dp}`);
    return first;
  }
  const picked = pickWeighted(draw(state.seed, 'policy', pending.month, `decide:${pending.dp}`), w);
  return pending.options.findIndex(o => o.key === picked);
}
