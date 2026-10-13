// 박사과정 결정 지점 트리거 (선택권 §3.1–§3.4). 월 틱 10단계(상태 §7.1)가 부른다.
// 한 달에 결정 지점은 하나만 건다. 우선순위: post-qualifying > funding-expiry > first-paper-verdict > pre-graduation-path.
// 자격시험 결과(post-qualifying)만 그 달의 사건이다. 나머지 셋은 상태에서 다시 계산할 수 있어서, 우선순위에 밀리면 다음 달에 다시 걸린다(사건이 사라지지 않는다).
import { ASSUMED } from '../assumed';
import type { DataBundle } from '../data/load';
import {
  LETTERS, PATH_OPTIONS,
  type FirstPaperVerdictContext, type FundingExpiryCause, type FundingExpiryContext, type PostQualifyingContext, type PreGraduationPathContext,
} from '../decide';
import type { DecisionId, LifeState, PendingDecision } from '../types';
import { crisisStage } from './money';
import { acceptedCount, type Verdict } from './papers';

/** 틱이 이번 달에 모은 사건. fundingExpired 는 `decide.fundingExpired(state)` (자금 기한 도달 또는 장학 유지 실패 뒤 기한을 이번 달로 당긴 경우). */
export interface TriggerEvents {
  verdicts: { paperId: string; verdict: Verdict; first: boolean }[];
  qualResult?: boolean;
  fundingExpired: boolean;
  scholarshipFailed: boolean;
}

function prompt(dp: DecisionId, month: number, context: Record<string, unknown>, keys: readonly string[]): PendingDecision {
  return { dp, month, context, options: keys.map(key => ({ key, textKey: `decision.${dp}.${key}` })) };
}

const ABC = LETTERS.slice(0, 3);
const BCD = LETTERS.slice(1, 4);

/** 틱이 밀린 첫 판정에 남기는 log 표지. tags = ['verdict', 'deferred', paperId, verdict]. */
export const FIRST_VERDICT_DEFERRED = 'log.first-verdict-deferred';

/**
 * 첫 판정을 받았지만 같은 달에 더 높은 우선순위 결정이 걸려 결정 지점이 열리지 않은 논문.
 * resolveVerdicts 는 첫 판정이면 상태만 판정대로 바꾸고 dueMonth 를 비우므로, 틱이 밀린 판정을 log 표지(FIRST_VERDICT_DEFERRED)로 남기고
 * 다음 달 이후 틱이 이 표지를 읽어 다시 건다. 첫 번째 결정이 기록되면(decisions) 더는 읽지 않는다.
 */
function awaitingFirstVerdict(state: LifeState): { paperId: string; verdict: Verdict } | undefined {
  if (state.decisions.some(d => d.dp === 'first-paper-verdict')) return undefined;
  for (let i = state.log.length - 1; i >= 0; i--) {
    const entry = state.log[i]!;
    if (entry.textKey !== FIRST_VERDICT_DEFERRED) continue;
    const [, , paperId, verdict] = entry.tags;
    const paper = state.phd?.papers.find(p => p.id === paperId);
    if (paper && (verdict === 'accepted' || verdict === 'revision' || verdict === 'rejected') && paper.status === verdict) return { paperId: paper.id, verdict };
  }
  return undefined;
}

/**
 * 연장 신청(A)이 실패한 바로 뒤인가: 마지막 funding-expiry 결정이 A 이고, 실패한 A 가 남긴 `fundingState.until`(= 결정한 달)이 그대로다.
 * 성공한 A 는 until 을 앞으로 옮기거나(과제·재선발) 기한 안에서 건드리지 않아 이 조건이 거짓이다.
 */
function afterFailedExtension(state: LifeState): boolean {
  const last = [...state.decisions].reverse().find(d => d.dp === 'funding-expiry');
  return last !== undefined && last.option === 'A' && state.phd?.fundingState.until === last.month;
}

/** 심사 준비 단계(선택권 §3.4): 자격시험 합격, 진척 ≥ 90, 채택 논문 ≥ requiredPapers(계층 하한 포함 — 학위 심사와 같은 기준, §6.1). */
function readyForDefensePrep(state: LifeState): boolean {
  const phd = state.phd!;
  return phd.qualified && phd.project >= ASSUMED.PRE_GRAD_PROJECT_MIN
    && acceptedCount(phd.papers, ASSUMED.REQUIRED_PAPERS[state.choices.group].minTier) >= phd.requiredPapers;
}

/** 이번 달 걸릴 결정 지점. 없으면 null. 호출하는 쪽(틱)이 snapshot 을 쌓고 `pending` 을 채운다. */
export function checkTriggers(state: LifeState, _data: DataBundle, events: TriggerEvents): PendingDecision | null {
  const phd = state.phd;
  if (!phd) return null;
  const month = state.month;

  // 3.1 자격시험 결과가 나온 달. 합격·불합격 모두.
  if (events.qualResult !== undefined) {
    const ctx: PostQualifyingContext = { passed: events.qualResult };
    return prompt('post-qualifying', month, { ...ctx }, ABC);
  }

  // 3.3 자금 만료: 재정 위기 강제 > 장학 유지 실패 > 기한 도달
  const crisis = crisisStage(state) === 'force-funding-expiry';
  if (crisis || events.fundingExpired || events.scholarshipFailed) {
    const cause: FundingExpiryCause = crisis ? 'crisis' : events.scholarshipFailed ? 'scholarship-review' : 'until';
    const retry = !crisis && !events.scholarshipFailed && events.fundingExpired && afterFailedExtension(state);
    const ctx: FundingExpiryContext = retry ? { cause, retry: true } : { cause };
    return prompt('funding-expiry', month, { ...ctx }, retry ? BCD : LETTERS);
  }

  // 3.2 첫 논문의 첫 판정
  const first = events.verdicts.find(v => v.first) ?? awaitingFirstVerdict(state);
  if (first) {
    const ctx: FirstPaperVerdictContext = { paperId: first.paperId, verdict: first.verdict };
    return prompt('first-paper-verdict', month, { ...ctx }, ABC);
  }

  // 3.4 심사 준비 단계에 처음 들어선 달(진로가 아직 정해지지 않은 동안 계속 참이라 밀려도 다시 걸린다)
  if (phd.path === undefined && readyForDefensePrep(state)) {
    const ctx: PreGraduationPathContext = {};
    return prompt('pre-graduation-path', month, { ...ctx }, LETTERS.slice(0, PATH_OPTIONS.length));
  }
  return null;
}
