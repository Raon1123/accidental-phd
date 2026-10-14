// 논문 생애주기(선택권 §6): 초고 → 투고 → 심사 → 판정. 난수는 전부 stream `paper`, 슬롯 `${id}:…`(상태 §6.2).
import { ASSUMED } from '../assumed';
import { clamp, odds } from '../odds';
import { draw } from '../rng';
import { tierBaseRate, venueOptions, reviewMonths } from '../data/venues';
import type { DataBundle } from '../data/bundle';
import type { Group, LifeState, Paper, Tier } from '../types';

export type Verdict = 'accepted' | 'revision' | 'rejected';

const TIERS: readonly Tier[] = ['T1', 'T2', 'T3', 'T4'];

// 첫 투고 계층 방침(0014#120): 이공은 최상위(T1)부터, 인문사회는 졸업 요건(T3 이상, 0014#63)을 겨냥해 T3 부터.
const FIRST_TIER: Record<Group, Tier> = ASSUMED.FIRST_TIER;

/** 한 계층 낮춘다. T4 는 T4 로 유지한다(선택권 §3.2·§6.4 투고 방침 "한 계층 낮춤"). */
export function lowerTier(t: Tier): Tier {
  return TIERS[Math.min(TIERS.length - 1, TIERS.indexOf(t) + 1)]!;
}

/** 균등 정수 U{lo..hi}. */
const uniformInt = (u: number, lo: number, hi: number): number => lo + Math.min(hi - lo, Math.floor(u * (hi - lo + 1)));

const replacePaper = (state: LifeState, id: string, f: (p: Paper) => Paper): LifeState => ({
  ...state, phd: { ...state.phd!, papers: state.phd!.papers.map(p => (p.id === id ? f(p) : p)) },
});

/** 투고 달부터 판정 달까지의 길이: U{field 범위} + (0.18 확률로 U{1..3} 지연). 슬롯 `${id}:review`, `${id}:delay`, `${id}:delay:months`. */
function reviewDuration(state: LifeState, id: string): number {
  const [lo, hi] = reviewMonths(state.choices.field);
  const base = uniformInt(draw(state.seed, 'paper', state.month, `${id}:review`), lo, hi);
  if (draw(state.seed, 'paper', state.month, `${id}:delay`) >= ASSUMED.REVIEW_DELAY_P) return base;
  const [dlo, dhi] = ASSUMED.REVIEW_DELAY_MONTHS;
  return base + uniformInt(draw(state.seed, 'paper', state.month, `${id}:delay:months`), dlo, dhi);
}

/** 수정 요구 뒤 재심 기간(선택권 §6.4): 이번 달에 심사 기간 U{field 범위}를 새로 추첨(슬롯 `${id}:review:re`)해 ceil(추첨값 / REREVIEW_DIVISOR). resolveVerdicts 와 decide 의 첫 논문 판정이 같이 쓴다. */
export function reReviewDuration(state: LifeState, id: string): number {
  const [lo, hi] = reviewMonths(state.choices.field);
  return Math.ceil(uniformInt(draw(state.seed, 'paper', state.month, `${id}:review:re`), lo, hi) / ASSUMED.REREVIEW_DIVISOR);
}

/**
 * 논문 하나를 `tier` 로 (재)투고한다. 투고처는 venueOptions 에서 균등 추첨(슬롯 `${id}:venue`), 시계는 reviewDuration.
 * `startOffset` 은 투고 시점을 이번 달에서 몇 달 뒤로 잡을지다(자동 방침의 "다음 달 재투고"는 1). 결정 지점에서 부르면 0.
 * 재투고는 수정 요구 로짓 보정(logitBonus)을 0으로 되돌린다: 보정은 이전 심사에 대한 것이다. 필요하면 호출 뒤에 다시 설정한다.
 */
export function resubmit(state: LifeState, data: DataBundle, paperId: string, tier: Tier, startOffset = 0): LifeState {
  if (!state.phd?.papers.some(p => p.id === paperId)) throw new Error(`resubmit: no such paper ${paperId}`);
  const opts = venueOptions(data, state.choices.track, tier);
  const venue = opts[Math.min(opts.length - 1, Math.floor(draw(state.seed, 'paper', state.month, `${paperId}:venue`) * opts.length))]!.venueId;
  const due = state.month + startOffset + reviewDuration(state, paperId);
  return replacePaper(state, paperId, p => {
    const { venueId: _old, ...rest } = p;
    return { ...rest, ...(venue === null ? {} : { venueId: venue }), status: 'submitted', tier, attempts: p.attempts + 1,
      submittedMonth: state.month + startOffset, dueMonth: due, logitBonus: 0 };
  });
}

/** writing ≥ 100 인 초고마다 질을 추첨하고 첫 계층에 투고한다(선택권 §6.2–§6.3). */
export function submitIfReady(state: LifeState, data: DataBundle): LifeState {
  const phd = state.phd;
  if (!phd) return state;
  let out = state;
  for (const p of phd.papers) {
    if (p.status !== 'draft' || p.writing < ASSUMED.PROJECT_MAX) continue;
    const q = ASSUMED.PAPER_QUALITY;
    const noise = (2 * draw(state.seed, 'paper', state.month, `${p.id}:quality`) - 1) * q.noise;
    const quality = clamp(
      q.base + q.skill * state.stats.skill + q.relation * state.stats.relation + noise
        + ASSUMED.ADVISOR_QUALITY_PER_RIGOR * (phd.advisor.rigor - ASSUMED.STAT_NEUTRAL), ASSUMED.STAT_MIN, ASSUMED.STAT_MAX);
    out = resubmit(replacePaper(out, p.id, x => ({ ...x, quality })), data, p.id, FIRST_TIER[state.choices.group]);
  }
  return out;
}

/** 계층 기준 채택 확률에 질·재투고·수정 보정을 로짓 항으로 더한다(선택권 §6.4). */
export function acceptProbability(state: LifeState, data: DataBundle, paper: Paper): number {
  if (!paper.tier) throw new Error(`acceptProbability: paper ${paper.id} has no tier`);
  const A = ASSUMED.ACCEPT;
  const pTier = tierBaseRate(data, paper.tier, paper.venueId).value;
  return odds(pTier, A.gamma * (paper.quality - A.center) + A.resubmitLogit * (paper.attempts - 1) + paper.logitBonus, A.lo, A.hi);
}

/** u < p 채택, u < p + min(0.95 − p, 0.29) 수정 요구, 그 밖 거절(선택권 §6.4). */
export function classifyVerdict(u: number, pAcc: number): Verdict {
  if (u < pAcc) return 'accepted';
  return u < pAcc + Math.min(ASSUMED.REVISE_P_CEIL - pAcc, ASSUMED.REVISE_BAND_MAX) ? 'revision' : 'rejected';
}

/**
 * dueMonth === month 인 submitted/revision 논문을 판정한다.
 * `first` = 이 판정이 플레이어의 첫 판정이다(그 전에 판정을 받은 논문이 없고 'first-paper-verdict' 결정도 기록되지 않았다).
 * 첫 판정은 상태만 판정대로 바꾸고 dueMonth 를 비운다 — 결정 지점(Task 7·9)이 재투고·수정을 처리한다.
 * 첫 판정이 아니면 기본 방침을 바로 적용한다:
 *   거절 → 한 계층 낮춰 다음 달 재투고(T4 유지), 수정 요구 → status 'revision', 재심 기간 = ceil(심사 기간 / 2), 질·로짓 보정 그대로(최소 수정).
 * 재심 기간은 이번 달에 심사 기간을 새로 추첨(슬롯 `${id}:review:re`)해 절반으로 올림한다.
 */
export function resolveVerdicts(state: LifeState, data: DataBundle): { state: LifeState; verdicts: { paperId: string; verdict: Verdict; first: boolean }[] } {
  if (!state.phd) return { state, verdicts: [] };
  let out = state;
  const verdicts: { paperId: string; verdict: Verdict; first: boolean }[] = [];
  for (const id of state.phd.papers.filter(p => p.dueMonth === state.month && (p.status === 'submitted' || p.status === 'revision')).map(p => p.id)) {
    const p = out.phd!.papers.find(x => x.id === id)!;
    const verdict = classifyVerdict(draw(state.seed, 'paper', state.month, `${id}:verdict:${p.attempts}`), acceptProbability(out, data, p));
    const first = p.status === 'submitted' && p.attempts <= 1
      && !out.decisions.some(d => d.dp === 'first-paper-verdict')
      && !out.phd!.papers.some(x => x.id !== id && x.status !== 'draft' && x.status !== 'submitted');
    verdicts.push({ paperId: id, verdict, first });

    const settle = (status: Paper['status']): LifeState => replacePaper(out, id, x => { const { dueMonth: _d, ...rest } = x; return { ...rest, status }; });
    if (verdict === 'accepted' || first) { out = settle(verdict === 'accepted' ? 'accepted' : verdict === 'revision' ? 'revision' : 'rejected'); continue; }
    if (verdict === 'rejected') { out = resubmit(settle('rejected'), data, id, lowerTier(p.tier!), 1); continue; }
    out = replacePaper(out, id, x => ({ ...x, status: 'revision', dueMonth: state.month + reReviewDuration(state, id) }));
  }
  return { state: out, verdicts };
}

const TIER_RANK = (t: Tier): number => TIERS.indexOf(t);

/** 채택 논문 수. `minTier` 를 주면 그 계층 이상(T1 이 가장 높다)만 센다(0014#63 인문사회 T3 이상). */
export function acceptedCount(papers: readonly Paper[], minTier?: Tier): number {
  return papers.filter(p => p.status === 'accepted' && (minTier === undefined || (p.tier !== undefined && TIER_RANK(p.tier) <= TIER_RANK(minTier)))).length;
}

/** 채용 심사의 논문 점수 S = Σ w(tier), 채택 논문만(0014#71). */
export function paperScore(papers: readonly Paper[]): number {
  return papers.reduce((s, p) => (p.status === 'accepted' && p.tier ? s + ASSUMED.PAPER_SCORE_WEIGHT[p.tier] : s), 0);
}

/** 쓰고 있는 초고(첫 draft). 없으면 undefined. */
export function activeDraft(papers: readonly Paper[]): Paper | undefined {
  return papers.find(p => p.status === 'draft');
}
