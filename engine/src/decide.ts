// 결정 지점 7종의 선택지와 효과 (선택권 §3). 결정은 시간이 멈춘 상태(`pending`)에서만 내린다.
// 효과 숫자는 전부 ASSUMED(0014 번호 주석)에서 온다. 현금 효과는 결정 단계가 월 현금 흐름 뒤에 있으므로 현금과 원장에 바로 적는다.
import { ASSUMED } from './assumed';
import { applyHire, leavePhd } from './career/labor';
import { pathDistribution } from './career/path';
import { ACADEMIC_ROUTES, addLog, pensionMonthly, promotion, retireAge, scoreOf } from './career/pay';
import type { DataBundle } from './data/bundle';
import { taFundingState } from './data/funding';
import { clamp, odds, z } from './odds';
import { canStartLeave, startLeave } from './phd/hazards';
import { acceptProbability, acceptedCount, lowerTier, reReviewDuration, resubmit, type Verdict } from './phd/papers';
import { addStats } from './phd/stats';
import { draw } from './rng';
import type {
  AdvisorType, CareerState, DecisionId, LifeState, Paper, PendingDecision, PhdState, Path, Route, Snapshot,
} from './types';
import { pickUniform } from './util';

// ── 결정 지점마다 `pending.context` 에 실리는 값 (Task 7 의 triggers 와 career/tick 이 채운다) ──

export interface PostQualifyingContext { passed: boolean }
export interface FirstPaperVerdictContext { paperId: string; verdict: Verdict }
export type FundingExpiryCause = 'until' | 'scholarship-review' | 'crisis';
/**
 * retry: 연장 신청(A)이 실패해 다음 달 다시 연 경우. 이때 선택지는 B–D 만 싣는다(선택권 §3.3).
 * originalUntil: cause 가 'scholarship-review' 일 때 유지 판정이 기한을 이번 달로 당기기 전의 기한. A 성공이면 이 기한으로 되돌려 "남은 학기 유지"(§3.3)를 지킨다.
 */
export interface FundingExpiryContext { cause: FundingExpiryCause; retry?: boolean; originalUntil?: number }
export type PreGraduationPathContext = Record<string, never>;
/** career-5y·career-10y·pre-retirement 공통. career/tick 이 {route, rank} 를 싣는다. target 은 경로 변경(5년 B, 10년 C)의 목표 경로(기본값은 changePath). */
export interface CareerContext { route: Route; rank?: string; target?: Exclude<Path, 'startup'> }
export type PendingContext = PostQualifyingContext | FirstPaperVerdictContext | FundingExpiryContext | PreGraduationPathContext | CareerContext;

/** 선택지 키. 선택지 순서(A, B, C, D)가 곧 POLICY.decisions 가중치 배열의 순서다. */
export const LETTERS = ['A', 'B', 'C', 'D'] as const;
/** pre-graduation-path 의 선택지 A–D (선택권 §3.4: 학계, 산업, 공공, 창업). 정책과 Task 7 이 같은 순서를 쓴다. */
export const PATH_OPTIONS: readonly Path[] = ['academia', 'industry', 'public', 'startup'];

// 선택권 §3.3 D: 휴학 12개월. 근로 수입은 ASSUMED.LEAVE_JOB_INCOME(0014#36).
const FUNDING_D_LEAVE_MONTHS = ASSUMED.MONTHS_PER_YEAR;
// 선택권 §3.5 D: "한 번 더 버틴다 … 마음 −5" (0014#121, Wave 4 추가).
const CAREER_5Y_STAY_MIND = ASSUMED.CAREER_5Y_STAY_MIND;

// 경로별 구직 대상(labor.ts 의 PATH_ROUTES 와 같다. 거기는 내보내지 않아 여기서 구성한다)
const PATH_SEARCH_ROUTES: Record<Exclude<Path, 'startup'>, readonly Route[]> = {
  academia: ACADEMIC_ROUTES, industry: ['industry'], public: ['institute', 'public'],
};
const BRIDGE_SEARCH_ROUTES: readonly Route[] = ['bridge', 'industry'];                       // 선택권 §3.5 C

function pathOfRoute(route: Route): Path | undefined {
  switch (route) {
    case 'professor': case 'nontenure': case 'lecturer': case 'postdoc': return 'academia';
    case 'institute': case 'public': return 'public';
    case 'industry': return 'industry';
    case 'startup': return 'startup';
    default: return undefined;
  }
}

const ageYears = (s: LifeState): number => Math.floor(s.ageMonths / ASSUMED.MONTHS_PER_YEAR);

function ctxOf<T>(p: PendingDecision): T { return p.context as unknown as T; }

/** 결정 결과의 갈래. 정책 가중치 표와 로그 키가 쓴다. 갈래가 없는 결정 지점은 undefined. */
export function decisionOutcome(p: PendingDecision): 'pass' | 'fail' | 'accept' | 'revise' | 'reject' | undefined {
  if (p.dp === 'post-qualifying') {
    const c = ctxOf<PostQualifyingContext>(p);
    if (typeof c.passed !== 'boolean') throw new Error('decide: post-qualifying context needs {passed}');
    return c.passed ? 'pass' : 'fail';
  }
  if (p.dp === 'first-paper-verdict') {
    const v = ctxOf<FirstPaperVerdictContext>(p).verdict;
    if (v === 'accepted') return 'accept';
    if (v === 'revision') return 'revise';
    if (v === 'rejected') return 'reject';
    throw new Error('decide: first-paper-verdict context needs {paperId, verdict}');
  }
  return undefined;
}

// ── 상태 갱신 도우미 ──

function phdOf(s: LifeState): PhdState {
  if (!s.phd) throw new Error('decide: phd state required');
  return s.phd;
}
function careerOf(s: LifeState): CareerState {
  if (!s.career) throw new Error('decide: career state required');
  return s.career;
}
const patchPhd = (s: LifeState, patch: Partial<PhdState>): LifeState => ({ ...s, phd: { ...phdOf(s), ...patch } });
const patchCareer = (s: LifeState, patch: Partial<CareerState>): LifeState => ({ ...s, career: { ...careerOf(s), ...patch } });
const addProject = (s: LifeState, d: number): LifeState => patchPhd(s, { project: clamp(phdOf(s).project + d, 0, ASSUMED.PROJECT_MAX) });
const replacePaper = (s: LifeState, id: string, f: (p: Paper) => Paper): LifeState =>
  patchPhd(s, { papers: phdOf(s).papers.map(p => (p.id === id ? f(p) : p)) });

/** 결정 지점의 일회성 현금 지출·수입: 현금과 원장에 바로 적는다(월 현금 흐름은 이 달 몫을 이미 정산했다). */
function cashNow(s: LifeState, kind: string, amount: number): LifeState {
  return { ...s, money: { ...s.money, cash: s.money.cash + amount }, ledger: [...s.ledger, { month: s.month, kind, amount }] };
}

/** 자발 휴학이 누적 상한(0014#5)에 걸리는가. 걸리면 그 선택지는 고를 수 없다. */
function leaveBlocked(s: LifeState, months: number): boolean {
  return !s.phd || !canStartLeave(s, months);
}

/** 이 선택지를 지금 고를 수 없는 사유. 없으면 undefined. decide 가 던지고, describeOptions 가 보여주고, 정책이 거른다. */
export function optionUnavailable(s: LifeState, p: PendingDecision, key: string): string | undefined {
  if (p.dp === 'post-qualifying' && key === 'B' && leaveBlocked(s, ASSUMED.POST_QUAL_REST_LEAVE_MONTHS)) return 'leave-cap';
  if (p.dp === 'funding-expiry' && key === 'D' && leaveBlocked(s, FUNDING_D_LEAVE_MONTHS)) return 'leave-cap';
  if (p.dp === 'funding-expiry' && key === 'A' && ctxOf<FundingExpiryContext>(p).retry) return 'already-tried';
  if (p.dp === 'funding-expiry' && key === 'A') {
    const f = s.phd?.fundingState;
    if (!f || f.route === 'self' || f.until < 0) return 'no-funding';   // 연장할 자금이 없다: 자비, 또는 끝나는 날이 없는 자금(조교 등)
    // 0014#138(결정 기록 0023): 연장은 이번 달 끝나는 자금(기한 도달, 장학 유지 실패)에만 신청한다. 재정 위기 강제가 살아 있는 자금에 걸리면 닫는다.
    if (!fundingExpired(s)) return 'not-expiring';
  }
  return undefined;
}

/** 자금이 끝났는가: 기한이 있고(until ≥ 0) 이번 달이 기한 이후. 연장 실패(until = 결정한 달)는 다음 달에도 참이라 Task 7 이 다시 연다. */
export function fundingExpired(s: LifeState): boolean {
  const f = s.phd?.fundingState;
  return !!f && f.route !== 'self' && f.until >= 0 && s.month >= f.until;
}

// ── 1. post-qualifying (선택권 §3.1) ──

/** 지도교수 유형 재배정(§2.6 규칙): 선호 일치 0.6, 나머지는 다른 셋 균등. 운에 맡겼으면 넷 균등. 슬롯 `advisor:re`(init). */
function reassignAdvisor(s: LifeState): AdvisorType {
  const keys = Object.keys(ASSUMED.ADVISOR_TYPES) as AdvisorType[];
  const u = draw(s.seed, 'init', s.month, 'advisor:re');
  if (s.choices.byLuck.advisorPref) return pickUniform(u, keys);
  const pref = s.choices.advisorPref;
  if (u < ASSUMED.ADVISOR_PREF_P) return pref;
  return pickUniform((u - ASSUMED.ADVISOR_PREF_P) / (1 - ASSUMED.ADVISOR_PREF_P), keys.filter(k => k !== pref));
}

/** P(지도교수 변경 성공) = odds(0.70, 0.6·z(network) + 0.4·z(relation), lo 0.2, hi 0.9) (0014#30). */
export function advisorChangeProbability(s: LifeState): number {
  const A = ASSUMED.ADVISOR_CHANGE;
  return odds(A.p0, A.betaNetwork * z(s.stats.network) + A.betaRelation * z(s.stats.relation), A.lo, A.hi);
}

function restLeave(s: LifeState, months: number): LifeState {
  if (leaveBlocked(s, months)) throw new Error(`decide: leave of ${months} months would exceed the ${ASSUMED.LEAVE_CAP_MONTHS}-month cap`);
  return startLeave(s, months, 'voluntary');
}

/** 석사 수료 이탈: 박사과정을 마치고 경력 단계로 넘어간다. 학계 경로는 닫힌다(채용·급여 보정은 searchMonth·startingPay 가 degree 로 건다). */
const masterExit = (s: LifeState): LifeState => leavePhd(s, 'exit-master');

function postQualifying(s: LifeState, _data: DataBundle, p: PendingDecision, key: string): LifeState {
  const E = ASSUMED.POST_QUAL_EFFECTS;
  if (decisionOutcome(p) === 'pass') {
    if (key === 'A') return addProject(addStats(s, { mind: E.passA.mind }), E.passA.project);
    if (key === 'B') return restLeave(s, ASSUMED.POST_QUAL_REST_LEAVE_MONTHS);
    // C: 진척은 성공 여부와 관계없이 줄고, 성공하면 지도교수를 다시 배정받고, 실패하면 관계가 깎인다.
    const reduced = patchPhd(s, { project: phdOf(s).project * E.passC.projectMult });
    if (draw(s.seed, 'exam', s.month, 'advisor-change') < advisorChangeProbability(s)) {
      const type = reassignAdvisor(s);
      return patchPhd(reduced, { advisor: { type, ...ASSUMED.ADVISOR_TYPES[type] } });
    }
    return addStats(reduced, { relation: E.passC.relationOnFail });
  }
  if (key === 'A') return addStats(s, { skill: E.failA.skill, mind: E.failA.mind });   // 재응시는 응시 창(exams.qualWindowOpen)이 6개월 간격으로 연다
  if (key === 'B') return restLeave(s, ASSUMED.POST_QUAL_REST_LEAVE_MONTHS);
  return masterExit(s);
}

// ── 2. first-paper-verdict (선택권 §3.2) ──

function firstPaperVerdict(s: LifeState, data: DataBundle, p: PendingDecision, key: string): LifeState {
  const { paperId } = ctxOf<FirstPaperVerdictContext>(p);
  const paper = phdOf(s).papers.find(x => x.id === paperId);
  if (!paper) throw new Error(`decide: no such paper ${paperId}`);
  const F = ASSUMED.FIRST_PAPER;
  const tier = paper.tier;
  const outcome = decisionOutcome(p);

  if (outcome === 'reject') {
    if (key === 'C') return addStats(addProject(replacePaper(s, paperId, x => ({ ...x, status: 'dropped' })), F.rejectC.project), { mind: F.rejectC.mind });
    if (!tier) throw new Error(`decide: paper ${paperId} has no tier`);
    return resubmit(s, data, paperId, key === 'A' ? tier : lowerTier(tier));
  }
  if (outcome === 'revise') {
    if (key === 'C') {
      if (!tier) throw new Error(`decide: paper ${paperId} has no tier`);
      return resubmit(s, data, paperId, lowerTier(tier));   // resubmit 이 로짓 보정을 0으로 되돌린다: 철회 뒤 새 투고에는 이전 심사 보정이 없다
    }
    const R = key === 'A' ? F.reviseA : F.reviseB;
    return replacePaper(s, paperId, x => ({
      ...x, status: 'revision', quality: clamp(x.quality + R.quality, ASSUMED.STAT_MIN, ASSUMED.STAT_MAX),
      dueMonth: s.month + R.months + reReviewDuration(s, paperId), logitBonus: R.logit,
    }));
  }
  // accept
  if (key === 'A') {
    // 후속 논문: 새 초고를 writing 20 에서 시작한다. 이미 쓰는 초고가 있으면 그것을 20 이상으로 올린다(초고는 한 번에 하나).
    const papers = phdOf(s).papers;
    const draft = papers.find(x => x.status === 'draft');
    if (draft) return replacePaper(s, draft.id, x => ({ ...x, writing: Math.max(x.writing, F.acceptA.newDraftWriting) }));
    return patchPhd(s, { papers: [...papers, { id: `p${papers.length + 1}`, status: 'draft', writing: F.acceptA.newDraftWriting, quality: 0, attempts: 0, logitBonus: 0 }] });
  }
  if (key === 'B') return cashNow(addStats(s, { network: F.acceptB.network }), 'conference', F.acceptB.cash);
  return addProject(s, F.acceptC.project);
}

// ── 3. funding-expiry (선택권 §3.3) ──

/** P(연장 성공) = odds(0.50, 0.6·z(relation) + 0.4·z(skill) + 0.3·min(채택 논문 수, 2), lo 0.10, hi 0.90) (0014#34). */
export function extensionProbability(s: LifeState): number {
  const E = ASSUMED.FUNDING_EXTEND;
  const accepted = acceptedCount(phdOf(s).papers);
  return odds(E.p0, E.betaRelation * z(s.stats.relation) + E.betaSkill * z(s.stats.skill) + E.gammaPapers * Math.min(accepted, E.papersCap), E.lo, E.hi);
}

function fundingExpiry(s: LifeState, data: DataBundle, p: PendingDecision, key: string): LifeState {
  const f = phdOf(s).fundingState;
  if (key === 'A') {
    if (draw(s.seed, 'funding', s.month, 'funding:extend') < extensionProbability(s)) {
      const expired = f.until >= 0 && s.month >= f.until;
      // 과제는 24개월 연장(0014#26), 장학은 남은 학기 유지(기한 안이면 그대로). 유지 판정 실패로 당겨진 기한은 원래 기한으로 되돌린다(originalUntil).
      // 기한이 그냥 끝난 장학은 재선발로 보고 새 기한을 준다(스펙이 정하지 않은 부분).
      if (f.route === 'project') return patchPhd(s, { fundingState: { ...f, until: Math.max(f.until, s.month) + ASSUMED.PROJECT_MONTHS } });
      const original = ctxOf<FundingExpiryContext>(p).originalUntil;
      if (original !== undefined && (original < 0 || original > s.month)) return patchPhd(s, { fundingState: { ...f, until: original } });
      return expired ? patchPhd(s, { fundingState: { ...f, until: s.month + ASSUMED.SCHOLARSHIP_MONTHS } }) : s;
    }
    // 실패: 자금이 이번 달로 끝난다. 다음 달 fundingExpired 가 참이라 Task 7 이 B–D 로 다시 연다(retry).
    return patchPhd(s, { fundingState: { ...f, until: s.month } });
  }
  // B: 조교 상태(0014#35, 입학 때 조교 추첨과 같은 값 — data/funding.ts taFundingState).
  // 조교 상태 표식 0014#140(결정 기록 0026): 경로 self + 의무 10시간, 입학 조교와 같은 상태라 참여율·배수가 걸리지 않는다.
  // 입학 때 조교를 얻은 자비 삶이 §5.5 강제 만료로 여기 오면 B 는 같은 값을 다시 준다. 결정 기록 0023 은 B 효과를 바꾸지 않는다(수입 비교를 가용 조건에 넣지 않는다).
  if (key === 'B') return patchPhd(s, { fundingState: taFundingState(data, s.choices.school) });
  // C(0014#139·#141, 결정 기록 0023·0026): 자금이 끝났거나(fundingExpired) 조교가 아닌 자비 경로이면 자비로 전환하고,
  // 살아 있는 과제·장학 자금과 조교 상태(dutyHours > 0)는 그대로 둔다.
  // 끝난 자금을 유지하면 route 가 과제·장학인 채 기한이 지나 checkTriggers 가 달마다 funding-expiry 를 다시 연다 — 그래서 전환한다.
  // 자비 경로는 유지가 아니라 초기화한다: D 뒤의 자비 상태(monthly 200만, '0014#36' 표지)가 남으면 이후 휴학마다 leave-work 가 지급된다.
  // 조교 상태(dutyHours > 0)는 살아 있는 자금으로 유지한다(0014#141). until −1 이라 fundingExpired 가 거짓이므로 다시 열리지 않는다. 새 대출은 §5.4 한도 규칙만 정하고 C 가 열지 않는다.
  if (key === 'C') {
    return (fundingExpired(s) || (f.route === 'self' && f.dutyHours === 0))
      ? patchPhd(s, { fundingState: { route: 'self', monthly: 0, tuitionWaiver: 0, until: -1, dutyHours: 0, recordIds: [] } })
      : s;
  }
  // D: 휴학하고 일한다. 월 근로 수입(LEAVE_JOB_INCOME)은 fundingState 에 표지로만 적는다. 휴학 중에는 money.fundingActive 가 거짓이라 지급되지 않으므로
  // 달마다 'leave-work' 원장 항목을 넣는 일은 Task 7 의 틱이 한다(recordIds 의 '0014#36' 표지와 leave.active 로 알아본다).
  const left = restLeave(s, FUNDING_D_LEAVE_MONTHS);
  return patchPhd(left, { fundingState: {
    route: 'self', monthly: ASSUMED.LEAVE_JOB_INCOME, tuitionWaiver: 0, until: s.month + FUNDING_D_LEAVE_MONTHS, dutyHours: 0, recordIds: ['0014#36'],
  } });
}

// ── 4. pre-graduation-path (선택권 §3.4) ──

function preGraduationPath(s: LifeState, _data: DataBundle, _p: PendingDecision, key: string): LifeState {
  const path = PATH_OPTIONS[LETTERS.indexOf(key as typeof LETTERS[number])];
  if (!path) throw new Error(`decide: no path for option ${key}`);
  return patchPhd(s, { path });   // 구직 하위 단계는 phd.path 를 보고 Task 7 의 틱이 돈다
}

// ── 5·6. career-5y, career-10y (선택권 §3.5, §3.6) ──

/** 경로 변경: 목표 경로 구직을 시작한다. 채용 기준값 × 0.8(0014#96). 목표를 주지 않으면 산업, 이미 산업이면 학계. 지금 자리는 새 자리를 얻을 때까지 유지한다. */
function changePath(s: LifeState, p: PendingDecision): LifeState {
  const c = careerOf(s);
  const target = ctxOf<CareerContext>(p).target ?? (pathOfRoute(c.route) === 'industry' ? 'academia' : 'industry');
  return patchCareer(s, { searching: { routes: [...PATH_SEARCH_ROUTES[target]], since: s.month, penalty: ASSUMED.PATH_CHANGE_MULT } });
}

function career5y(s: LifeState, data: DataBundle, p: PendingDecision, key: string): LifeState {
  if (key === 'A') return promotion(s, data, 'career-5y').state;
  if (key === 'B') return changePath(s, p);
  if (key === 'C') return patchCareer(s, { searching: { routes: [...BRIDGE_SEARCH_ROUTES], since: s.month, penalty: 1 } });
  // D: 한 번 더 버틴다 — 구직을 유지하고(없으면 학계 구직을 시작하고) 마음이 깎인다.
  const c = careerOf(s);
  return addStats(patchCareer(s, { searching: c.searching ?? { routes: [...ACADEMIC_ROUTES], since: s.month, penalty: 1 } }), { mind: CAREER_5Y_STAY_MIND });
}

function career10y(s: LifeState, data: DataBundle, p: PendingDecision, key: string): LifeState {
  if (key === 'A') return promotion(s, data, 'career-10y').state;
  if (key === 'B') {
    // 연구 집중. 그해 경력 논문 확률 p0 0.50 → 0.70 (CAREER_10Y_RESEARCH.paperP0): researchFocusYear 를 켜 두면 yearEnd 가 그 확률로 추첨하고 지운다.
    const R = ASSUMED.CAREER_10Y_RESEARCH;
    return addLog(patchCareer(addStats(s, { skill: R.skill, network: R.network }), { researchFocusYear: true }), 'decision.career-10y.B.paper-p0', ['decision', 'career-10y', 'career-paper-p0']);
  }
  if (key === 'C') return changePath(s, p);
  // D: 독립. 이미 창업 중이면 그대로 둔다.
  if (careerOf(s).route === 'startup') return s;
  return applyHire(s, data, 'startup', s.month);
}

// ── 7. pre-retirement (선택권 §3.7) ──

function preRetirement(s: LifeState, _data: DataBundle, _p: PendingDecision, key: string): LifeState {
  if (key === 'A') return s;
  if (key === 'B') {
    // 지금 은퇴: stage 를 바로 retired 로 옮겨 다음 연 틱부터 저장한 노후 월수입(×0.85)을 받게 한다(남은 해의 급여를 받지 않는다).
    const pension = Math.round(pensionMonthly(s) * ASSUMED.EARLY_RETIRE_MULT);
    return addLog({ ...patchCareer(s, { retireAge: ageYears(s), pensionMonthly: pension }), stage: 'retired' }, 'log.retired', ['career', 'retire', 'early']);
  }
  // C: 은퇴 뒤에도 연구. 확률 0.6으로 은퇴 후 5년 동안 월 50만 원(0014#98). postRetireResearchUntil 은 달력 월(month)이다: 정년 도달 달 + 60개월.
  if (draw(s.seed, 'life', s.month, 'post-retire') >= ASSUMED.POST_RETIRE_RESEARCH.p) return addLog(s, 'decision.pre-retirement.C.declined', ['decision', 'pre-retirement']);
  const untilRetire = Math.max(0, retireAge(s) * ASSUMED.MONTHS_PER_YEAR - s.ageMonths);
  return patchCareer(s, { postRetireResearchUntil: s.month + untilRetire + ASSUMED.POST_RETIRE_RESEARCH.years * ASSUMED.MONTHS_PER_YEAR });
}

const EFFECTS: Record<DecisionId, (s: LifeState, data: DataBundle, p: PendingDecision, key: string) => LifeState> = {
  'post-qualifying': postQualifying,
  'first-paper-verdict': firstPaperVerdict,
  'funding-expiry': fundingExpiry,
  'pre-graduation-path': preGraduationPath,
  'career-5y': career5y,
  'career-10y': career10y,
  'pre-retirement': preRetirement,
};

/**
 * 걸린 결정 지점을 해결한다. `pending.options[optionIndex].key` 의 효과를 적용하고, `decisions` 에 기록하고, `pending` 을 비운다.
 * 입력을 바꾸지 않는다. pending 이 없거나 optionIndex 가 범위 밖이거나 고를 수 없는 선택지(휴학 상한)이면 던진다.
 * `byPolicy` 는 자동 진행·동기 정책이 골랐을 때 true (Task 7).
 * 스냅샷 보정: 이 결정의 스냅샷에 `state.pending` 이 비어 있으면 지금의 pending 을 채워 넣는다 — branch 가 "결정 직전 상태 + 질문"으로 돌아가게 한다.
 */
export function decide(state: LifeState, data: DataBundle, optionIndex: number, byPolicy = false): LifeState {
  const pending = state.pending;
  if (!pending) throw new Error('decide: no pending decision');
  const opt = Number.isInteger(optionIndex) ? pending.options[optionIndex] : undefined;
  if (!opt) throw new Error(`decide: option index out of range: ${optionIndex} (0..${pending.options.length - 1})`);
  const blocked = optionUnavailable(state, pending, opt.key);
  if (blocked) throw new Error(`decide: option ${opt.key} of ${pending.dp} is unavailable (${blocked})`);

  const outcome = decisionOutcome(pending);
  let next = EFFECTS[pending.dp](state, data, pending, opt.key);
  next = addLog(next, `decision.${pending.dp}${outcome ? `.${outcome}` : ''}.${opt.key}`, ['decision', pending.dp, opt.key]);

  let snapshots: Snapshot[] = next.snapshots;
  for (let i = snapshots.length - 1; i >= 0; i--) {
    const snap = snapshots[i]!;
    if (snap.dp !== pending.dp || snap.month !== pending.month) continue;
    if (snap.state.pending === null) snapshots = snapshots.map((x, j) => (j === i ? { ...x, state: { ...x.state, pending: structuredClone(pending) } } : x));
    break;
  }
  return {
    ...next, snapshots, pending: null,
    decisions: [...next.decisions, { dp: pending.dp, month: pending.month, option: opt.key, byPolicy }],
  };
}

// ── 선택지 설명 (확률 힌트) ──

export interface OptionInfo {
  key: string;
  /** 선택권 §3 이 확률을 주는 선택지의 표시용 확률과 근거 */
  probabilityHint?: { p: number; basis: string };
  /** 지금 고를 수 없는 사유(예: 'leave-cap') */
  unavailable?: string;
}

// pay.promotion 의 transitionFor 와 같은 규칙(그쪽은 내보내지 않는다): 지금 직급에서 가능한 전이의 PROMOTION_P0 키
function promotionKey(c: CareerState, dp: 'career-5y' | 'career-10y'): keyof typeof ASSUMED.PROMOTION_P0 | undefined {
  const five = dp === 'career-5y';
  switch (c.route) {
    case 'professor':
      if (five && c.rank === 'assistant') return 'professor:assistant-to-associate';
      if (!five && c.rank === 'associate') return 'professor:associate-to-full';
      return undefined;
    case 'nontenure': return five ? 'nontenure:to-tenure-track' : undefined;
    case 'institute':
      if (five && c.rank === 'junior') return 'institute:junior-to-senior';
      if (!five && c.rank === 'senior') return 'institute:senior-to-principal';
      return undefined;
    case 'public': return !five && c.rank === 'researcher' ? 'public:researcher-to-officer' : undefined;
    case 'industry': return 'industry:promotion';
    default: return undefined;
  }
}

/** 승진·전환 확률(§9.3, 0014#93·#94). promotion() 이 추첨에 쓰는 값과 같다. 가능한 전이가 없으면 undefined. */
export function promotionProbability(s: LifeState, dp: 'career-5y' | 'career-10y'): number | undefined {
  const c = s.career;
  const key = c ? promotionKey(c, dp) : undefined;
  if (!key) return undefined;
  const P = ASSUMED.PROMOTION;
  const terms = P.betaSkill * z(s.stats.skill) + P.betaNetwork * z(s.stats.network) + P.betaRelation * z(s.stats.relation)
    + P.gammaScore * Math.min(scoreOf(s), P.scoreCap);
  return odds(ASSUMED.PROMOTION_P0[key], terms, P.lo, P.hi);
}

function hintFor(s: LifeState, data: DataBundle, p: PendingDecision, key: string): OptionInfo['probabilityHint'] {
  switch (p.dp) {
    case 'post-qualifying':
      return decisionOutcome(p) === 'pass' && key === 'C' ? { p: advisorChangeProbability(s), basis: 'agency §3.1 advisor change (0014#30)' } : undefined;
    case 'first-paper-verdict': {
      if (decisionOutcome(p) !== 'revise' || (key !== 'A' && key !== 'B')) return undefined;
      const paper = phdOf(s).papers.find(x => x.id === ctxOf<FirstPaperVerdictContext>(p).paperId);
      if (!paper?.tier) return undefined;
      const R = key === 'A' ? ASSUMED.FIRST_PAPER.reviseA : ASSUMED.FIRST_PAPER.reviseB;
      const revised = { ...paper, quality: clamp(paper.quality + R.quality, ASSUMED.STAT_MIN, ASSUMED.STAT_MAX), logitBonus: R.logit };
      return { p: acceptProbability(s, data, revised), basis: 'agency §3.2/§6.4 acceptance after revision (0014#33, #67)' };
    }
    case 'funding-expiry':
      return key === 'A' ? { p: extensionProbability(s), basis: 'agency §3.3 extension (0014#34)' } : undefined;
    case 'pre-graduation-path': {
      const path = PATH_OPTIONS[LETTERS.indexOf(key as typeof LETTERS[number])];
      return path ? { p: pathDistribution(data, s.choices.ksced, s.choices.group)[path], basis: 'agency §8 path distribution (0014#74–#77)' } : undefined;
    }
    case 'career-5y': case 'career-10y': {
      if (key !== 'A') return undefined;
      const prob = promotionProbability(s, p.dp);
      return prob === undefined ? undefined : { p: prob, basis: 'agency §9.3 promotion (0014#93, #94)' };
    }
    case 'pre-retirement':
      return key === 'C' ? { p: ASSUMED.POST_RETIRE_RESEARCH.p, basis: 'agency §3.7 post-retirement research (0014#98)' } : undefined;
  }
}

/** 걸린 결정 지점의 선택지마다 확률 힌트(스펙 §3 이 확률을 주는 곳만)와 고를 수 없는 사유를 돌려준다. 순서는 `pending.options` 와 같다. */
export function describeOptions(state: LifeState, data: DataBundle): OptionInfo[] {
  const pending = state.pending;
  if (!pending) throw new Error('describeOptions: no pending decision');
  return pending.options.map(o => {
    const info: OptionInfo = { key: o.key };
    const unavailable = optionUnavailable(state, pending, o.key);
    if (unavailable) info.unavailable = unavailable;
    const hint = unavailable ? undefined : hintFor(state, data, pending, o.key);   // 고를 수 없는 선택지에는 확률 힌트를 붙이지 않는다
    if (hint) info.probabilityHint = hint;
    return info;
  });
}
