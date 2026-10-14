// "다른 선택 보기" 분기 (상태 §6.3). 결정 지점의 스냅샷에서 다시 시작하고, seed 와 stream·slot 규칙은 그대로다.
import type { DataBundle } from './data/bundle';
import type { DecisionId, LifeState, PendingDecision } from './types';

/**
 * 가장 마지막으로 걸린 `decisionId` 결정 지점으로 돌아간다: 그 결정 직전 상태에 결정 질문(`pending`)이 걸려 있고,
 * `decisions` 에는 그 결정이 없다. 원래 상태는 바꾸지 않는다.
 *
 * 스냅샷 계약: `snapshot.state` 는 결정 직전 상태이고 `pending` 이 질문을 담는다(career/tick 이 그렇게 쌓는다). 질문 없이 쌓인 옛 스냅샷은
 * `decide` 가 결정을 해결하면서 채워 넣고, 아직 결정하지 않은 상태(지금 pending 이 그 결정)에서는 지금의 `pending` 을 쓴다.
 * 돌려주는 상태의 `snapshots` 는 그 결정까지(그 결정 자신 포함)만 남긴다 — 걸려 있는 결정의 스냅샷이 있는 것이 정상 상태이기 때문이다.
 * 뉴스처럼 선택과 무관한 사건은 `newsSeed`·월·슬롯이 같아 두 분기에서 같게 나온다.
 */
export function branch(state: LifeState, data: DataBundle, decisionId: DecisionId): LifeState {
  if (state.dataRevision !== data.dataRevision) {
    throw new Error(`branch: dataRevision differs (${state.dataRevision} vs ${data.dataRevision}); the same conditions cannot be recomputed`);
  }
  let at = -1;
  for (let i = state.snapshots.length - 1; i >= 0; i--) if (state.snapshots[i]!.dp === decisionId) { at = i; break; }
  if (at < 0) throw new Error(`branch: no snapshot for decision ${decisionId}`);
  const snap = state.snapshots[at]!;

  const live: PendingDecision | null = state.pending && state.pending.dp === snap.dp && state.pending.month === snap.month ? state.pending : null;
  const pending = snap.state.pending ?? live;
  if (!pending) throw new Error(`branch: snapshot for ${decisionId} has no pending prompt and the decision is not pending`);

  const out = structuredClone(snap.state);
  out.pending = structuredClone(pending);
  out.snapshots = state.snapshots.slice(0, at + 1).map((x, i) => structuredClone(i === at ? { ...x, state: { ...x.state, pending } } : x));
  return out;
}
