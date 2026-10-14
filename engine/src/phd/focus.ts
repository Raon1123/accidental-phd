// 월 포커스 효과(선택권 §4.1, §2.6)와 능력치 자연 변화(상태 §1.5).
// 능력치는 addStats 로만 바꾼다(정수 + statCarry). 현금은 여기서 원장에만 적고, applyCashflow 가 합산한다(틱 순서: 포커스 → 현금 흐름).
import { ASSUMED } from '../assumed';
import type { DataBundle } from '../data/bundle';
import type { Focus, LifeState, Paper } from '../types';
import { addStats, type StatDelta } from './stats';
import { growthMultiplier } from './work';

/** 포커스가 만드는 현금 원장 항목의 종류. 표에 없는 포커스는 포커스 이름을 그대로 쓴다. */
const CASH_KIND: Partial<Record<Focus, string>> = { network: 'network-cost', work: 'work' };

function phdOf(state: LifeState) {
  if (!state.phd) throw new Error('phd state required');
  return state.phd;
}

/** 지도교수 네트워크 배수 1 + (network − 50)/100 (선택권 §2.6). */
export function advisorNetworkFactor(network: number): number {
  return 1 + (network - ASSUMED.STAT_NEUTRAL) / ASSUMED.ADVISOR_NETWORK_SCALE;
}

/** 활성 초고(status 'draft')가 없으면 새로 만들고 writing 을 올린다. 투고는 Task 6 의 submitIfReady 가 맡는다. */
function writeDraft(papers: Paper[], skill: number, growth: number): Paper[] {
  const next = papers.map(p => ({ ...p }));
  let draft = next.find(p => p.status === 'draft');
  if (!draft) {
    draft = { id: `p${next.length + 1}`, status: 'draft', writing: 0, quality: 0, attempts: 0, logitBonus: 0 };
    next.push(draft);
  }
  draft.writing = Math.min(ASSUMED.WRITING_MAX, draft.writing + (ASSUMED.WRITING_RATE_BASE + ASSUMED.WRITING_RATE_SKILL * skill) * growth);   // 성장 배수 #79
  return next;
}

/**
 * 이번 달 포커스(`phd.focus`)의 효과를 적용한다. 휴학 중이면 아무것도 하지 않는다(회복은 hazards 모듈).
 * `thesis` 는 자격시험 합격 전에는 던진다.
 */
export function applyFocus(state: LifeState, _data: DataBundle): LifeState {
  const phd = phdOf(state);
  if (phd.leave.active) return state;
  const focus = phd.focus;
  if (focus === 'thesis' && !phd.qualified) throw new Error('thesis focus requires qualified');
  const e = ASSUMED.FOCUS[focus];
  const adv = phd.advisor;

  const delta: StatDelta = {
    health: e.health,
    mind: e.mind + (adv.type === 'free' ? ASSUMED.ADVISOR_FREE_MIND_PER_MONTH : 0),
    skill: e.skill > 0 ? e.skill * growthMultiplier(state) : e.skill,   // 역량 상승에만 성장 배수(#79)
    relation: e.relation + ASSUMED.ADVISOR_RELATION_PER_SUPPORT * (adv.support - ASSUMED.STAT_NEUTRAL),
    // 네트워크 포커스 이득만 지도교수 배수를 받는다(선택권 §2.6). 근로의 부수 효과는 배수 없음.
    network: focus === 'network' ? e.network * advisorNetworkFactor(adv.network) : e.network,
  };
  let next = addStats(state, delta);

  if (e.cash !== 0) {
    next = { ...next, ledger: [...next.ledger, { month: state.month, kind: CASH_KIND[focus] ?? focus, amount: e.cash }] };
  }
  if (focus === 'write') {
    // 초고 진행량은 이번 달 갱신 전 skill 로 계산한다.
    next = { ...next, phd: { ...next.phd!, papers: writeDraft(next.phd!.papers, state.stats.skill, growthMultiplier(state)) } };
  }
  return next;
}

/** 상태 §1.5: 체력은 매월 −0.5, 마음은 50 쪽으로 2% 회귀. 휴학 여부와 무관하게 매월 적용한다. */
export function applyDrift(state: LifeState): LifeState {
  return addStats(state, {
    health: ASSUMED.HEALTH_DRIFT,
    mind: ASSUMED.MIND_REVERT * (ASSUMED.STAT_NEUTRAL - state.stats.mind),
  });
}
