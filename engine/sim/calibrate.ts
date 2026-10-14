// 보정 하네스 (계획 Task 11, 선택권 §4.2·§4.6, 노동 §4.3). 사용법:
//   npm run calibrate -- --seeds 1000 [--out docs/oracle/calibration-wave4.md] [--group 이공|인문사회]
//                        [--override KEY=JSON ...] [--candidates] [--candidate-seeds 300] [--json]
// 읽기 전용 모의실험이다. engine/src 는 한 줄도 바꾸지 않는다.
//
// 측정 정의 (표 아래 "측정 정의"에도 같은 내용이 찍힌다):
//  - seed i = newSeed(`cal${i}`), i = 0..N-1. createLife({auto:true}) 로 모든 선택을 운에 맡긴다(--group 은 group 만 고정한다).
//  - 박사과정 결과(outcome)는 stage 가 'phd' 를 처음 떠나는 순간에 잡는다. 석사 수료 이탈은 stage 가 'career' 로 넘어가며 end.reason = 'exit-master'
//    를 남기지만 은퇴 때 age80 으로 덮이므로 최종 상태가 아니라 이 순간을 읽어야 한다.
//  - 학위 기간 = 졸업 달 / 12 (입학 = 0개월). 졸업자만의 중앙값.
//  - 연 휴학 경험 비율 = 12개월 창(입학부터)마다 휴학 중인 달이 하나라도 있으면 1, 마지막 창은 길이 비율로 가중. 12개월 휴학이 두 창에 걸치면 두 번 센다.
//  - 연 이탈 비율 = 학위 없이 박사과정을 떠난 삶(dropout·residence·financial·exit-master) 수 / 박사과정 삶-년.
//  - 학위 후 1년 안 취업 = 첫 'log.hired' 의 달 ≤ 졸업 달 + 12 (졸업 전 구직 채용 포함, 임시직 bridge 포함). 석사 수료 이탈자는 분모에서 뺀다.
//  - 수요 계수 = 경력 단계의 매 달 demand(state, route) 평균. advanceYear 는 연말 상태만 돌려주므로, 같은 newsSeed 로 updateNews 를 달마다 다시 돌리는
//    그림자 상태에서 표본을 뽑는다(뉴스는 newsSeed 와 달에만 의존한다). 연말에 그림자 뉴스와 실제 뉴스가 다르면 shadowMismatch 로 센다.
//  - M̄ 실현값 = 휴학이 아니고 project < 100 인 박사과정 달마다 progressGain(g = 1) 을 틱과 같은 입력(월+1, 정책 포커스, 수업 기간)으로 다시 계산한 값의 평균.
//
// --override 는 가져온 ASSUMED 객체에 Object.assign 하는 sim 전용 편법이다(런타임에는 동결되지 않은 보통 객체). 얕은 덮어쓰기이고, 실행이 끝나면 되돌린다.
// 모듈 안에서 import 시점에 값을 굳히는 상수(career/tick.ts 의 FIVE_YEARS_MONTHS 등, phd/papers.ts 의 FIRST_TIER, decide.ts 의 CAREER_5Y_STAY_MIND)는 덮어써도 닿지 않는다.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSUMED } from '../src/assumed';
import { demand, updateNews } from '../src/career/news';
import { loadData, type DataBundle } from '../src/data/load';
import { dropoutRate, durationYears, employedRate, leaveRate } from '../src/data/statistics';
import { advanceMonth, advanceYear, createLife, newSeed } from '../src/index';
import { professorBaseline } from '../src/career/labor';
import { acceptedCount } from '../src/phd/papers';
import { policyFocus } from '../src/policy';
import { progressGain, blockedProbability, researchTime } from '../src/phd/progress';
import { draw } from '../src/rng';
import type { FundingRoute, Group, Kedi, Ksced, LifeState, Route } from '../src/types';

// ───────────────────────── 상수 ─────────────────────────
export const KEDIS: readonly Kedi[] = ['humanities', 'social', 'natural', 'engineering'];
export const KSCEDS: readonly Ksced[] = ['ict', 'natural-math', 'engineering', 'social', 'business-law', 'arts-humanities'];
export const GROUPS: readonly Group[] = ['이공', '인문사회'];
export const DEMAND_ROUTES: readonly Route[] = ['professor', 'nontenure', 'lecturer', 'postdoc', 'institute', 'public', 'industry'];
export type Outcome = 'degree' | 'dropout' | 'residence' | 'financial' | 'exit-master' | 'capped';
export const OUTCOMES: readonly Outcome[] = ['degree', 'dropout', 'residence', 'financial', 'exit-master', 'capped'];
/** 표의 목표 묶음. 선택권 §4.6 네 개 + 노동 §4.3 의 수요·교수 경험(취업은 두 스펙에 같은 행이라 한 번만 센다). */
export const TARGETS = ['degreeYears', 'leaveRate', 'dropoutRate', 'employment', 'demand', 'professor10y'] as const;
export type TargetId = typeof TARGETS[number];
const TARGET_LABEL: Record<TargetId, string> = {
  degreeYears: '학위 기간 중앙값(년)', leaveRate: '휴학 비율(스냅샷: 휴학 달 ÷ 재적 달)', dropoutRate: '연간 이탈 비율(모든 경로)',
  employment: '학위 후 1년 안 취업', demand: '장기 평균 수요 계수', professor10y: '졸업 후 10년 안 교수 경험(보고만)',
};
const MONTHS = ASSUMED.MONTHS_PER_YEAR;
const CAP_MONTH = ASSUMED.END_AGE * MONTHS;   // 안전 상한: 입학부터 80년
const TENURE_WINDOW_MONTHS = 10 * MONTHS;      // 졸업 후 10년 (보고용 창)
const EMPLOY_WINDOW_MONTHS = MONTHS;           // 졸업 후 1년

// ───────────────────────── 기록 ─────────────────────────
export interface LifeRecord {
  i: number; seed: string; group: Group; kedi: Kedi; ksced: Ksced; track: string; capital: boolean; entryAge: number;
  funding0: FundingRoute;                       // 처음 자금 경로(운 반영 뒤)
  stipend0: number; waiver0: number; family0: number;   // 입학 때 월 장려금, 등록금 감면율, 월 가족 지원
  leaveStarts: { hazard: number; burnout: number; voluntary: number };   // 휴학 시작 횟수(이유별)
  qualFailEnd: boolean;                         // 자격시험 3회 불합격으로 끝났는가
  paperReadyMonth?: number;                     // 채택 논문 수가 학위 요건(계층 하한 포함)을 처음 채운 달
  submitted: number; accepted: number;          // 박사과정 끝 시점 투고·채택 논문 수
  outcome: Outcome; phdMonths: number; degreeMonth?: number;
  leaveMonths: number; leaveHit: number;        // leaveHit = 휴학 달이 있는 창의 길이 가중 합(년)
  qualMonth?: number; project90Month?: number; firstSubmitMonth?: number; pathDecisionMonth?: number;
  firstDebtMonth?: number; limitMonth?: number; negCashMonth?: number; peakDebt: number;
  ledgerPhd: Record<string, number>;            // 박사과정 동안 원장 종류별 합(원)
  netMonthly: number;                           // 박사과정 월평균 순현금흐름 = Δ(cash − debt) / phdMonths
  firstHireMonth?: number; firstHireRoute?: string; firstProfMonth?: number;
  demandSum: number[]; demandN: number;         // DEMAND_ROUTES 순서, 경력 달 수
  shadowMismatch: number;
  mSum: number; mN: number;                     // 실현 M 합과 달 수
  careerMonths: number;
}

const rec0 = (i: number, s: LifeState): LifeRecord => ({
  i, seed: s.seed, group: s.choices.group, kedi: s.choices.kedi, ksced: s.choices.ksced, track: s.choices.track,
  capital: (ASSUMED.CAPITAL_SCHOOLS as readonly string[]).includes(s.choices.school), entryAge: Math.floor(s.ageMonths / MONTHS),
  funding0: s.phd!.fundingState.route, stipend0: s.phd!.fundingState.monthly, waiver0: s.phd!.fundingState.tuitionWaiver, family0: s.phd!.familySupport,
  leaveStarts: { hazard: 0, burnout: 0, voluntary: 0 }, qualFailEnd: false, submitted: 0, accepted: 0, outcome: 'capped', phdMonths: 0, leaveMonths: 0, leaveHit: 0, peakDebt: 0, ledgerPhd: {}, netMonthly: 0,
  demandSum: DEMAND_ROUTES.map(() => 0), demandN: 0, shadowMismatch: 0, mSum: 0, mN: 0, careerMonths: 0,
});

/** 이번 틱(month = state.month + 1)의 g 외 배수 M = progressGain(g = 1). 틱 1·4단계와 같은 입력을 재현한다(휴학 중이면 null). */
function realizedM(state: LifeState, data: DataBundle): number | null {
  const phd = state.phd!;
  if (phd.leave.active || phd.project >= ASSUMED.PROJECT_MAX) return null;
  const month = state.month + 1;
  const coursework = phd.enrolledMonths + 1 < ASSUMED.COURSEWORK_MONTHS;
  const next: LifeState = { ...state, month, phd: { ...phd, coursework } };
  const focus = state.auto ? policyFocus(next, data) : phd.focus;
  const withFocus: LifeState = { ...next, phd: { ...next.phd!, focus } };
  const blocked = draw(state.seed, 'progress', month, 'blocked') < blockedProbability(state.choices.track);
  return progressGain({
    g: 1, u: draw(state.seed, 'progress', month, 'gain'), skill: state.stats.skill, researchTime: researchTime(withFocus), health: state.stats.health,
    support: phd.advisor.support, rigor: phd.advisor.rigor, f: ASSUMED.FOCUS[focus].f, blocked,
  });
}

const sumLedger = (s: LifeState): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const e of s.ledger) out[e.kind] = (out[e.kind] ?? 0) + e.amount;
  return out;
};

/** 삶 하나를 끝까지(또는 안전 상한까지) 돌려 기록을 만든다. 입력 data·ASSUMED 를 바꾸지 않는다. */
export function simulateLife(i: number, data: DataBundle, group?: Group): LifeRecord {
  let s = createLife({ auto: true, ...(group ? { group } : {}) }, newSeed(`cal${i}`), data);
  const r = rec0(i, s);
  const startNet = s.money.cash - s.money.debt;
  const leaveFlags: boolean[] = [];   // 틱마다 휴학 중인가(창 계산용)

  // ── 박사과정: 월 틱 ──
  while (s.stage === 'phd' && s.month < CAP_MONTH) {
    const m = realizedM(s, data);
    if (m !== null) { r.mSum += m; r.mN += 1; }
    s = advanceMonth(s, data);
    const phd = s.phd!, t = s.month;
    leaveFlags.push(phd.leave.active);
    if (phd.leave.active) r.leaveMonths += 1;
    if (phd.qualified && r.qualMonth === undefined) r.qualMonth = t;
    if (r.paperReadyMonth === undefined && acceptedCount(phd.papers, ASSUMED.REQUIRED_PAPERS[s.choices.group].minTier) >= phd.requiredPapers) r.paperReadyMonth = t;
    if (phd.project >= ASSUMED.PRE_GRAD_PROJECT_MIN && r.project90Month === undefined) r.project90Month = t;
    if (r.firstSubmitMonth === undefined && phd.papers.some(p => p.status !== 'draft')) r.firstSubmitMonth = t;
    if (s.money.debt > 0 && r.firstDebtMonth === undefined) r.firstDebtMonth = t;
    if (r.limitMonth === undefined && (s.money.debt >= s.money.loanLimit || s.money.cash < 0)) r.limitMonth = t;
    if (s.money.cash < 0 && r.negCashMonth === undefined) r.negCashMonth = t;
    r.peakDebt = Math.max(r.peakDebt, s.money.debt);
  }
  finishPhd(r, s, startNet, leaveFlags);

  // ── 경력: 연 틱 + 그림자 뉴스 ──
  let shadow: LifeState | null = s.stage === 'career' ? { ...s, log: [], ledger: [], snapshots: [], decisions: [] } : null;
  while ((s.stage === 'career' || s.stage === 'retired') && s.month < CAP_MONTH) {
    const m0 = s.month, wasCareer = s.stage === 'career';
    s = advanceYear(s, data);
    if (wasCareer && shadow) {
      for (let m = m0 + 1; m <= s.month; m++) {
        shadow = updateNews({ ...shadow, month: m, log: [] }, data);
        DEMAND_ROUTES.forEach((rt, k) => { r.demandSum[k] = r.demandSum[k]! + demand(shadow!, rt); });
        r.demandN += 1;
      }
      const a = shadow.news.map(n => n.id).sort().join(), b = s.news.map(n => n.id).sort().join();
      if (a !== b) r.shadowMismatch += 1;
    }
  }
  r.careerMonths = r.demandN;
  // ── 채용 기록 (가장 이른 'log.hired') ──
  for (const e of s.log) {
    if (e.textKey !== 'log.hired') continue;
    if (r.firstHireMonth === undefined) { r.firstHireMonth = e.month; r.firstHireRoute = e.tags[2]; }
    if (r.firstProfMonth === undefined && e.tags[2] === 'professor') r.firstProfMonth = e.month;
  }
  return r;
}

function finishPhd(r: LifeRecord, s: LifeState, startNet: number, flags: boolean[]): void {
  r.phdMonths = s.month;
  if (s.stage === 'phd') r.outcome = 'capped';
  else if (s.stage === 'career') {
    if (s.career!.degree === 'phd') { r.outcome = 'degree'; r.degreeMonth = s.career!.degreeMonth; } else r.outcome = 'exit-master';
  } else r.outcome = s.end!.reason === 'dropout' || s.end!.reason === 'residence' || s.end!.reason === 'financial' ? s.end!.reason : 'dropout';
  const phd = s.phd!;
  r.qualFailEnd = r.outcome === 'dropout' && !phd.qualified && phd.qualAttempts >= ASSUMED.QUAL_EXAM.maxAttempts;
  r.submitted = phd.papers.filter(p => p.status !== 'draft').length;
  r.accepted = phd.papers.filter(p => p.status === 'accepted').length;
  for (const e of s.log) if (e.textKey === 'leave.start') { const why = e.tags[1]; if (why === 'hazard' || why === 'burnout' || why === 'voluntary') r.leaveStarts[why] += 1; }
  const pathDecision = s.decisions.find(d => d.dp === 'pre-graduation-path');
  if (pathDecision) r.pathDecisionMonth = pathDecision.month;
  r.ledgerPhd = sumLedger(s);
  r.netMonthly = r.phdMonths > 0 ? (s.money.cash - s.money.debt - startNet) / r.phdMonths : 0;
  let hit = 0;
  for (let b = 0; b * MONTHS < flags.length; b++) {
    const win = flags.slice(b * MONTHS, (b + 1) * MONTHS);
    if (win.some(Boolean)) hit += win.length / MONTHS;
  }
  r.leaveHit = hit;
}

// ───────────────────────── 집계 ─────────────────────────
export const median = (xs: number[]): number | null => {
  if (xs.length === 0) return null;
  const a = [...xs].sort((p, q) => p - q), h = a.length >> 1;
  return a.length % 2 ? a[h]! : (a[h - 1]! + a[h]!) / 2;
};
const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((p, q) => p + q, 0) / xs.length : null);
const share = (n: number, d: number): number | null => (d > 0 ? n / d : null);

export interface TargetRow {
  target: TargetId; label: string; n: number; sim: number | null; ref: number | null; refId: string;
  lo: number | null; hi: number | null; pass: boolean | null; unit: string;
  alt?: number | null;   // 보조값: 휴학 행의 12개월 창 비율
}
const within = (v: number | null, lo: number, hi: number): boolean | null => (v === null ? false : v >= lo - 1e-12 && v <= hi + 1e-12);

export function buildTable(records: LifeRecord[], data: DataBundle): TargetRow[] {
  const T = ASSUMED.CALIBRATION_TOL;
  const rows: TargetRow[] = [];
  // 학위 기간 · 휴학 · 이탈 (KEDI 4계열)
  for (const k of KEDIS) {
    const rs = records.filter(r => r.kedi === k);
    const dur = durationYears(data, k), lv = leaveRate(data, k), dr = dropoutRate(data, k);
    const grads = rs.filter(r => r.outcome === 'degree');
    const simDeg = median(grads.map(r => r.degreeMonth! / MONTHS));
    rows.push({ target: 'degreeYears', label: k, n: grads.length, sim: simDeg, ref: dur.value, refId: dur.id, lo: dur.value - T.degreeYears, hi: dur.value + T.degreeYears,
      pass: within(simDeg, dur.value - T.degreeYears, dur.value + T.degreeYears), unit: '년' });
    const py = rs.reduce((a, r) => a + r.phdMonths / MONTHS, 0);
    const simLeave = share(rs.reduce((a, r) => a + r.leaveMonths, 0), rs.reduce((a, r) => a + r.phdMonths, 0));   // 스냅샷: 휴학 달 ÷ 재적 달
    const winLeave = share(rs.reduce((a, r) => a + r.leaveHit, 0), py);   // 보조: 12개월 창
    rows.push({ target: 'leaveRate', label: k, n: rs.length, sim: simLeave, ref: lv.value, refId: lv.id, lo: lv.value * (1 - T.leaveRel), hi: lv.value * (1 + T.leaveRel),
      pass: within(simLeave, lv.value * (1 - T.leaveRel), lv.value * (1 + T.leaveRel)), unit: '비율', alt: winLeave });
    const simDrop = share(rs.filter(r => r.outcome !== 'degree' && r.outcome !== 'capped').length, py);
    rows.push({ target: 'dropoutRate', label: k, n: rs.length, sim: simDrop, ref: dr.value, refId: dr.id, lo: dr.value * (1 - T.dropoutRel), hi: dr.value * (1 + T.dropoutRel),
      pass: within(simDrop, dr.value * (1 - T.dropoutRel), dr.value * (1 + T.dropoutRel)), unit: '/년' });
  }
  // 취업 (KSCED 6계열): 졸업자(석사 수료 이탈 제외)
  for (const c of KSCEDS) {
    const grads = records.filter(r => r.ksced === c && r.outcome === 'degree');
    const emp = employedRate(data, c);
    const ok = grads.filter(r => r.firstHireMonth !== undefined && r.firstHireMonth <= r.degreeMonth! + EMPLOY_WINDOW_MONTHS).length;
    const sim = share(ok, grads.length);
    rows.push({ target: 'employment', label: c, n: grads.length, sim, ref: emp.value, refId: emp.id, lo: emp.value - T.employment, hi: emp.value + T.employment,
      pass: within(sim, emp.value - T.employment, emp.value + T.employment), unit: '비율' });
  }
  // 장기 평균 수요 계수 (경로 7 × 계열 2)
  for (const g of GROUPS) {
    const rs = records.filter(r => r.group === g && r.demandN > 0);
    DEMAND_ROUTES.forEach((rt, k) => {
      const n = rs.reduce((a, r) => a + r.demandN, 0);
      const sim = n > 0 ? rs.reduce((a, r) => a + r.demandSum[k]!, 0) / n : null;
      rows.push({ target: 'demand', label: `${rt} × ${g}`, n, sim, ref: 1, refId: '노동 §5.2', lo: T.demandLo, hi: T.demandHi, pass: within(sim, T.demandLo, T.demandHi), unit: '배' });
    });
  }
  // 졸업 후 10년 안 교수 경험 (보고만). 참고: 졸업자 계열 구성으로 가중한 1 − (1 − h)^10 (연 채용 확률 h, 계속 구직한다고 본 개략 상한)
  for (const g of GROUPS) {
    const grads = records.filter(r => r.group === g && r.outcome === 'degree');
    const ok = grads.filter(r => r.firstProfMonth !== undefined && r.firstProfMonth <= r.degreeMonth! + TENURE_WINDOW_MONTHS).length;
    const ref = mean(grads.map(r => 1 - Math.pow(1 - professorBaseline(data, r.kedi).h, 10)));
    rows.push({ target: 'professor10y', label: g, n: grads.length, sim: share(ok, grads.length), ref, refId: '노동 §2.3 h = min(0.10, 0.5·B)', lo: null, hi: null, pass: null, unit: '비율' });
  }
  return rows;
}

export interface Diagnostics {
  outcomeByGroup: Record<string, Record<Outcome, number> & { n: number }>;
  outcomeMonthMedian: Record<Outcome, number | null>;
  loan: { byFunding: Record<string, { n: number; hitLimit: number; medLimitMonth: number | null; medFirstDebtMonth: number | null; medPeakDebt: number | null }>; medLimitMonthAll: number | null };
  netByFunding: Record<string, { n: number; netMonthly: number | null; perMonth: Record<string, number> }>;
  noPaperShare: { all: number | null; longLived: number | null; nAll: number; nLong: number };
  milestones: { qualShare: number | null; qualMedian: number | null; project90Median: number | null; pathDecisionMedian: number | null; degreeMedian: number | null; firstSubmitMedian: number | null; degreeShare: number | null };
  hire: { medMonthsAfterDegree: number | null; nonBridgeShare: number | null; hiredShare: number | null; nGrads: number };
  mbar: { byKedi: Record<string, { mean: number | null; n: number; impliedG: number | null; gNow: number }>; pooled: number | null; gMbarInit: number };
  causes: {
    leaveStartsPerYear: Record<string, { hazard: number; burnout: number; voluntary: number; windowRate: number | null; prevalence: number | null; personYears: number }>;
    dropoutPerYear: Record<string, { background: number; qualFail: number; residence: number; financial: number; exitMaster: number; personYears: number }>;
    gradMilestones: { n: number; qual: number | null; project90: number | null; paperReady: number | null; pathDecision: number | null; degree: number | null };
    firstHireRoutes: Record<string, Record<string, number>>;   // 계열 → 경로 → 졸업 후 1년 안 첫 채용 수
    income0: Record<string, { n: number; stipend: number | null; stipendMin: number | null; stipendMax: number | null; family: number | null; waiver: number | null; livingCapital: number; livingRegional: number }>;
    papers: { meanSubmitted: number | null; meanAccepted: number | null; n: number };
    employmentVariants: Record<string, { n: number; all: number | null; exLecturer: number | null; exLecturerStartup: number | null; ref: number }>;
  };
  shadowMismatch: number; nLives: number;
}

export function diagnose(records: LifeRecord[], data: DataBundle): Diagnostics {
  const blank = (): Record<Outcome, number> & { n: number } => ({ degree: 0, dropout: 0, residence: 0, financial: 0, 'exit-master': 0, capped: 0, n: 0 });
  const outcomeByGroup: Diagnostics['outcomeByGroup'] = { all: blank() };
  for (const g of GROUPS) outcomeByGroup[g] = blank();
  for (const r of records) for (const key of ['all', r.group]) { outcomeByGroup[key]![r.outcome] += 1; outcomeByGroup[key]!.n += 1; }
  const outcomeMonthMedian = {} as Diagnostics['outcomeMonthMedian'];
  for (const o of OUTCOMES) outcomeMonthMedian[o] = median(records.filter(r => r.outcome === o).map(r => r.phdMonths));

  const fundings: FundingRoute[] = ['scholarship', 'project', 'self'];
  const loanBy: Diagnostics['loan']['byFunding'] = {}, netBy: Diagnostics['netByFunding'] = {};
  for (const f of fundings) {
    const rs = records.filter(r => r.funding0 === f);
    const hit = rs.filter(r => r.limitMonth !== undefined);
    loanBy[f] = { n: rs.length, hitLimit: hit.length, medLimitMonth: median(hit.map(r => r.limitMonth!)),
      medFirstDebtMonth: median(rs.filter(r => r.firstDebtMonth !== undefined).map(r => r.firstDebtMonth!)), medPeakDebt: median(rs.map(r => r.peakDebt)) };
    const perMonth: Record<string, number> = {};
    const kinds = new Set(rs.flatMap(r => Object.keys(r.ledgerPhd)));
    for (const k of kinds) perMonth[k] = median(rs.filter(r => r.phdMonths > 0).map(r => (r.ledgerPhd[k] ?? 0) / r.phdMonths)) ?? 0;
    netBy[f] = { n: rs.length, netMonthly: median(rs.map(r => r.netMonthly)), perMonth };
  }
  const allHit = records.filter(r => r.limitMonth !== undefined);

  const long = records.filter(r => r.phdMonths >= 36);
  const noPaper = (rs: LifeRecord[]) => rs.filter(r => r.firstSubmitMonth === undefined).length;
  const grads = records.filter(r => r.outcome === 'degree');
  const hiredGrads = grads.filter(r => r.firstHireMonth !== undefined);
  const hireDelay = hiredGrads.map(r => Math.max(0, r.firstHireMonth! - r.degreeMonth!));

  const mbarBy: Diagnostics['mbar']['byKedi'] = {};
  for (const k of KEDIS) {
    const rs = records.filter(r => r.kedi === k);
    const n = rs.reduce((a, r) => a + r.mN, 0);
    const m = n > 0 ? rs.reduce((a, r) => a + r.mSum, 0) / n : null;
    const T = durationYears(data, k).value;
    mbarBy[k] = { mean: m, n, impliedG: m ? ASSUMED.PROJECT_MAX / ((MONTHS * T - ASSUMED.G_PREP_MONTHS) * m) : null,
      gNow: ASSUMED.PROJECT_MAX / ((MONTHS * T - ASSUMED.G_PREP_MONTHS) * ASSUMED.G_MBAR_INIT) };
  }
  const nAll = records.reduce((a, r) => a + r.mN, 0);

  const causes: Diagnostics['causes'] = { leaveStartsPerYear: {}, dropoutPerYear: {}, gradMilestones: {} as never, firstHireRoutes: {}, income0: {}, papers: {} as never, employmentVariants: {} };
  for (const key of ['all', ...KEDIS]) {
    const rs = key === 'all' ? records : records.filter(r => r.kedi === key);
    const py = rs.reduce((a, r) => a + r.phdMonths / MONTHS, 0);
    const per = (x: number): number => (py > 0 ? x / py : 0);
    causes.leaveStartsPerYear[key] = {
      hazard: per(rs.reduce((a, r) => a + r.leaveStarts.hazard, 0)), burnout: per(rs.reduce((a, r) => a + r.leaveStarts.burnout, 0)),
      voluntary: per(rs.reduce((a, r) => a + r.leaveStarts.voluntary, 0)), windowRate: py > 0 ? rs.reduce((a, r) => a + r.leaveHit, 0) / py : null,
      prevalence: py > 0 ? rs.reduce((a, r) => a + r.leaveMonths, 0) / MONTHS / py : null, personYears: py,
    };
    causes.dropoutPerYear[key] = {
      background: per(rs.filter(r => r.outcome === 'dropout' && !r.qualFailEnd).length), qualFail: per(rs.filter(r => r.qualFailEnd).length),
      residence: per(rs.filter(r => r.outcome === 'residence').length), financial: per(rs.filter(r => r.outcome === 'financial').length),
      exitMaster: per(rs.filter(r => r.outcome === 'exit-master').length), personYears: py,
    };
  }
  causes.gradMilestones = {
    n: grads.length, qual: median(grads.filter(r => r.qualMonth !== undefined).map(r => r.qualMonth!)), project90: median(grads.filter(r => r.project90Month !== undefined).map(r => r.project90Month!)),
    paperReady: median(grads.filter(r => r.paperReadyMonth !== undefined).map(r => r.paperReadyMonth!)), pathDecision: median(grads.filter(r => r.pathDecisionMonth !== undefined).map(r => r.pathDecisionMonth!)),
    degree: median(grads.map(r => r.degreeMonth!)),
  };
  for (const g of GROUPS) {
    const dist: Record<string, number> = { none: 0 };
    const gs = grads.filter(r => r.group === g);
    for (const r of gs) {
      const late = r.firstHireMonth === undefined || r.firstHireMonth > r.degreeMonth! + EMPLOY_WINDOW_MONTHS;
      const key = late ? 'none' : (r.firstHireRoute ?? '?');
      dist[key] = (dist[key] ?? 0) + 1;
    }
    causes.firstHireRoutes[g] = dist;
  }
  for (const f of fundings) {
    const rs = records.filter(r => r.funding0 === f);
    causes.income0[f] = { n: rs.length, stipend: median(rs.map(r => r.stipend0)), stipendMin: rs.length ? Math.min(...rs.map(r => r.stipend0)) : null, stipendMax: rs.length ? Math.max(...rs.map(r => r.stipend0)) : null, family: mean(rs.map(r => r.family0)), waiver: mean(rs.map(r => r.waiver0)),
      livingCapital: ASSUMED.LIVING_COST.capital, livingRegional: ASSUMED.LIVING_COST.regional };
  }
  for (const c of KSCEDS) {
    const gs = grads.filter(r => r.ksced === c);
    const within12 = (r: LifeRecord): boolean => r.firstHireMonth !== undefined && r.firstHireMonth <= r.degreeMonth! + EMPLOY_WINDOW_MONTHS;
    causes.employmentVariants[c] = {
      n: gs.length, all: share(gs.filter(within12).length, gs.length),
      exLecturer: share(gs.filter(r => within12(r) && r.firstHireRoute !== 'lecturer').length, gs.length),
      exLecturerStartup: share(gs.filter(r => within12(r) && r.firstHireRoute !== 'lecturer' && r.firstHireRoute !== 'startup').length, gs.length),
      ref: employedRate(data, c).value,
    };
  }
  const longLives = records.filter(r => r.phdMonths >= 48);
  causes.papers = { meanSubmitted: mean(longLives.map(r => r.submitted)), meanAccepted: mean(longLives.map(r => r.accepted)), n: longLives.length };
  return {
    outcomeByGroup, outcomeMonthMedian, loan: { byFunding: loanBy, medLimitMonthAll: median(allHit.map(r => r.limitMonth!)) }, netByFunding: netBy,
    noPaperShare: { all: share(noPaper(records), records.length), longLived: share(noPaper(long), long.length), nAll: records.length, nLong: long.length },
    milestones: {
      qualShare: share(records.filter(r => r.qualMonth !== undefined).length, records.length),
      qualMedian: median(records.filter(r => r.qualMonth !== undefined).map(r => r.qualMonth!)),
      project90Median: median(records.filter(r => r.project90Month !== undefined).map(r => r.project90Month!)),
      pathDecisionMedian: median(records.filter(r => r.pathDecisionMonth !== undefined).map(r => r.pathDecisionMonth!)),
      degreeMedian: median(grads.map(r => r.degreeMonth!)),
      firstSubmitMedian: median(records.filter(r => r.firstSubmitMonth !== undefined).map(r => r.firstSubmitMonth!)),
      degreeShare: share(grads.length, records.length),
    },
    hire: { medMonthsAfterDegree: median(hireDelay), nonBridgeShare: share(hiredGrads.filter(r => r.firstHireRoute !== 'bridge').length, hiredGrads.length),
      hiredShare: share(hiredGrads.length, grads.length), nGrads: grads.length },
    mbar: { byKedi: mbarBy, pooled: nAll > 0 ? records.reduce((a, r) => a + r.mSum, 0) / nAll : null, gMbarInit: ASSUMED.G_MBAR_INIT },
    causes, shadowMismatch: records.reduce((a, r) => a + r.shadowMismatch, 0), nLives: records.length,
  };
}

// ───────────────────────── 실행과 override ─────────────────────────
const isPlain = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * ASSUMED 의 키를 덮어쓰고 fn 을 돌린 뒤 되돌린다. sim 전용 편법(위 머리말). 없는 키는 던진다.
 * 값이 보통 객체이면 원래 객체에 제자리 병합(Object.assign)한다. 그래서 `LIVING_COST={"capital":1000000}` 은 regional 을 그대로 두고,
 * import 시점에 객체 참조를 붙들고 있는 모듈(phd/papers.ts 의 FIRST_TIER)도 바뀐 값을 본다. 배열·원시값은 통째로 바꾼다.
 */
export function withOverrides<T>(overrides: Record<string, unknown>, fn: () => T): T {
  const target = ASSUMED as unknown as Record<string, unknown>;
  const undo: (() => void)[] = [];
  try {
    for (const [k, v] of Object.entries(overrides)) {
      if (!(k in target)) throw new Error(`override: unknown ASSUMED key ${k}`);
      const orig = target[k];
      if (isPlain(orig) && isPlain(v)) {
        const before = { ...orig };
        undo.push(() => { for (const key of Object.keys(orig)) delete orig[key]; Object.assign(orig, before); });
        Object.assign(orig, v);
      } else {
        undo.push(() => { target[k] = orig; });
        target[k] = v;
      }
    }
    return fn();
  } finally { for (const u of undo.reverse()) u(); }
}

export interface RunOptions { seeds: number; group?: Group; overrides?: Record<string, unknown>; data?: DataBundle }
export interface CalibrationResult { options: { seeds: number; group?: Group; overrides: Record<string, unknown> }; records: LifeRecord[]; table: TargetRow[]; diagnostics: Diagnostics; seconds: number }

export function runCalibration(opts: RunOptions): CalibrationResult {
  const data = opts.data ?? loadData();
  const overrides = opts.overrides ?? {};
  const t0 = Date.now();
  const records = withOverrides(overrides, () => {
    const out: LifeRecord[] = [];
    for (let i = 0; i < opts.seeds; i++) { const r = simulateLife(i, data, opts.group); out.push(r); }
    return out;
  });
  const table = withOverrides(overrides, () => buildTable(records, data));
  const diagnostics = withOverrides(overrides, () => diagnose(records, data));
  return { options: { seeds: opts.seeds, ...(opts.group ? { group: opts.group } : {}), overrides }, records, table, diagnostics, seconds: (Date.now() - t0) / 1000 };
}

// ───────────────────────── 단일 override 후보 ─────────────────────────
/** 재정을 막지 않고 다른 상수의 효과를 보려는 측정용 맥락: 대출 한도를 사실상 없앤다(LOAN_LIMIT 무한). 제안값이 아니다. */
export const FINANCE_NEUTRAL: Record<string, unknown> = { LOAN_LIMIT: 100_000_000_000 };
/** 실행 맥락. default 는 현재 상수 그대로, finance-neutral 은 재정 파탄이 삶을 끊지 않을 때 나머지 상수가 어떤 모양인지 보는 측정이다. */
export const CONTEXTS = {
  default: {},
  'finance-neutral': FINANCE_NEUTRAL,
} as const satisfies Record<string, Record<string, unknown>>;
export type ContextId = keyof typeof CONTEXTS;
export const CONTEXT_LABEL: Record<ContextId, string> = { default: '기본 상수', 'finance-neutral': '재정 중립(LOAN_LIMIT 무한)' };

/** 후보 하나 = 상수 변경 하나(개념상). overrides 는 병합 대상이다. context 는 측정용 추가 override. */
export interface Candidate { id: string; label: string; overrides: () => Record<string, unknown>; context: ContextId; targets: string; note: string }
export interface CandidateRun { candidate: Candidate; table: TargetRow[]; d: Diagnostics; seconds: number }

/** 이공의 연 채용 확률 h 만 0.7 배(인문사회는 그대로). 소수 셋째 자리에서 반올림한다. */
const STEM_ROUTE_H_070 = (): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [r, v] of Object.entries(ASSUMED.ROUTE_H)) out[r] = { ...v, '이공': Math.round(v['이공'] * 0.7 * 1000) / 1000 };
  return out;
};

/** 보정(2026-10-14, 커밋 8f29487) 직전의 값. 적용한 변경의 전후를 같은 seed 로 비교하는 데 쓴다(G_INIT 은 소스가 읽지 않아 뺐다). */
const OLD_NEWS_WEIGHT: Record<string, number> = { 'dept-merger': 5, 'humanities-fund': 3, 'univ-freeze': 4, 'hiring-chill': 4, 'lecturer-policy': 3 };
export const oldConstants = (): Record<string, unknown> => ({
  G_MBAR_INIT: 0.68, LOAN_LIMIT: 30_000_000,
  POLICY: { postQualFocus: { thesis: 0.5, research: 0.2, write: 0.2, network: 0.1 } },
  NEWS_TYPES: ASSUMED.NEWS_TYPES.map(t => ({ ...t, weight: OLD_NEWS_WEIGHT[t.id] ?? t.weight })),
});
export const OLD_RUNS: readonly Candidate[] = (['default', 'finance-neutral'] as const).map(context => ({
  id: 'old', label: '구 상수(#45 M̄ 0.68, #46 0.5/0.2/0.2/0.1, #61 3천만, #119 구 가중치)', overrides: oldConstants, context, targets: '적용한 변경 전후',
  note: '보정 직전 값',
}));

/**
 * `--candidates` 가 돌리는 Wave 6 이월 후보의 단일 override. 현재 상수 위에서 하나만 바꾼다. assumed.ts 는 바꾸지 않는다.
 * finance-neutral 맥락은 재정 파탄이 삶을 일찍 끊어 뒤쪽 단계(논문·졸업·채용)가 보이지 않기 때문에 쓴다.
 */
export const CANDIDATES: readonly Candidate[] = [
  { id: 'living', label: 'LIVING_COST={capital:1000000, regional:800000}', overrides: () => ({ LIVING_COST: { capital: 1_000_000, regional: 800_000 } }), context: 'default', targets: '재정 파탄, 이탈, 학위 취득',
    note: '#60 월 생활비 160/130만 → 100/80만 원' },
  { id: 'dropout', label: 'DROPOUT_BACKGROUND_SHARE=0.75', overrides: () => ({ DROPOUT_BACKGROUND_SHARE: 0.75 }), context: 'finance-neutral', targets: '이탈',
    note: '#49 배경 이탈 비중 0.5 → 0.75' },
  { id: 'routeh', label: 'ROUTE_H 이공 값 ×0.7', overrides: () => ({ ROUTE_H: STEM_ROUTE_H_070() }), context: 'finance-neutral', targets: '취업(이공)',
    note: '#107, #109–#112 이공 박사후·비정년·출연연·공무원·기업의 연 채용 확률 ×0.7' },
  { id: 'lecturer', label: 'LECTURER_H={coef:0.15, lo:0.05, hi:0.20}', overrides: () => ({ LECTURER_H: { coef: 0.15, lo: 0.05, hi: 0.20 } }), context: 'finance-neutral', targets: '취업(인문사회)',
    note: '#106 시간강사 연 채용 확률 상한 0.85 → 0.20, 하한 0.20 → 0.05' },
];

export function summarizeFamilies(table: TargetRow[]): Record<TargetId, { pass: number; total: number }> {
  const out = {} as Record<TargetId, { pass: number; total: number }>;
  for (const t of TARGETS) { const rs = table.filter(r => r.target === t && r.pass !== null); out[t] = { pass: rs.filter(r => r.pass).length, total: rs.length }; }
  return out;
}

// ───────────────────────── 마크다운 ─────────────────────────
const f2 = (v: number | null, d = 2): string => (v === null ? '—' : v.toFixed(d));
const pct = (v: number | null): string => (v === null ? '—' : `${(v * 100).toFixed(1)}%`);
const man = (v: number | null): string => (v === null ? '—' : `${Math.round(v / 10_000).toLocaleString('en-US')}만`);
const mo = (v: number | null): string => (v === null ? '—' : String(Math.round(v)));

export function renderTable(table: TargetRow[]): string {
  const head = '| 목표 | 계열 | 모의값 | 기준값 (레코드 id) | 허용 범위 (0014 #52) | 통과 | 창(12개월) |\n|---|---|---|---|---|---|---|';
  const lines = table.map(r => {
    const dec = r.target === 'demand' ? 3 : r.target === 'degreeYears' ? 2 : 3;
    const range = r.lo === null ? '보고만' : `${f2(r.lo, dec)} – ${f2(r.hi, dec)}`;
    const pass = r.pass === null ? '보고' : r.pass ? '통과' : '**실패**';
    const refCell = r.target === 'demand' ? `1.00 (${r.refId})` : r.ref === null ? '—' : `${f2(r.ref, dec)} (\`${r.refId}\`)`;
    return `| ${TARGET_LABEL[r.target]} | ${r.label} (n=${r.n}) | ${f2(r.sim, dec)} | ${refCell} | ${range} | ${pass} | ${r.alt === undefined ? '—' : f2(r.alt, 3)} |`;
  });
  return [head, ...lines].join('\n');
}

export function renderDiagnostics(d: Diagnostics, data: DataBundle): string {
  const L: string[] = [];
  L.push('### 박사과정 결과 분포 (stage 가 phd 를 처음 떠나는 순간)', '', '| 계열 | n | 학위 | 이탈 dropout | 재학연한 residence | 재정 파탄 financial | 석사 수료 이탈 | 상한 |', '|---|---|---|---|---|---|---|---|');
  for (const key of ['all', ...GROUPS]) {
    const o = d.outcomeByGroup[key]!;
    L.push(`| ${key === 'all' ? '전체' : key} | ${o.n} | ${OUTCOMES.map(k => pct(share(o[k], o.n))).join(' | ')} |`);
  }
  L.push('', `결과별 박사과정 지속 개월 중앙값: ${OUTCOMES.map(k => `${k} ${mo(d.outcomeMonthMedian[k])}`).join(', ')}.`);

  L.push('', '### 대출', '', '| 처음 자금 경로 | n | 한도 도달 | 한도 도달 개월 중앙값 | 첫 대출 개월 중앙값 | 최대 부채 중앙값 |', '|---|---|---|---|---|---|');
  for (const [f, v] of Object.entries(d.loan.byFunding)) L.push(`| ${f} | ${v.n} | ${pct(share(v.hitLimit, v.n))} | ${mo(v.medLimitMonth)} | ${mo(v.medFirstDebtMonth)} | ${man(v.medPeakDebt)} |`);
  L.push('', `한도(또는 현금 음수) 도달 개월 중앙값, 전체: ${mo(d.loan.medLimitMonthAll)}.`);

  L.push('', '### 박사과정 월 현금 흐름 (원장 종류별 월평균의 중앙값, 단위 만 원)', '', '| 처음 자금 경로 | n | 순현금흐름 Δ(현금−부채) 중앙값 | stipend | family | living | tuition | interest | 그 밖 |', '|---|---|---|---|---|---|---|---|---|');
  for (const [f, v] of Object.entries(d.netByFunding)) {
    const pm = v.perMonth, known = ['stipend', 'family', 'living', 'tuition', 'interest'];
    const other = Object.entries(pm).filter(([k]) => !known.includes(k) && k !== 'loan').map(([k, x]) => `${k} ${man(x)}`).join(', ') || '—';
    L.push(`| ${f} | ${v.n} | ${man(v.netMonthly)} | ${man(pm.stipend ?? 0)} | ${man(pm.family ?? 0)} | ${man(pm.living ?? 0)} | ${man(pm.tuition ?? 0)} | ${man(pm.interest ?? 0)} | ${other} |`);
  }

  const ms = d.milestones;
  L.push('', '### 마일스톤과 논문', '',
    `- 논문을 한 번도 투고하지 않은 삶: 전체 ${pct(d.noPaperShare.all)} (n=${d.noPaperShare.nAll}), 36개월 이상 지속한 삶 ${pct(d.noPaperShare.longLived)} (n=${d.noPaperShare.nLong}).`,
    `- 자격시험 합격 삶 ${pct(ms.qualShare)}, 합격 개월 중앙값 ${mo(ms.qualMedian)}.`,
    `- 첫 투고 개월 중앙값 ${mo(ms.firstSubmitMedian)}; 진척 ≥ 90 개월 중앙값 ${mo(ms.project90Median)}; 졸업 직전 진로 결정(pre-graduation-path) 개월 중앙값 ${mo(ms.pathDecisionMedian)}; 졸업 개월 중앙값 ${mo(ms.degreeMedian)} (졸업 ${pct(ms.degreeShare)}).`,
    `- 졸업자 중 졸업 뒤 첫 채용까지 중앙값 ${mo(d.hire.medMonthsAfterDegree)}개월(졸업 전 채용은 0), 채용된 졸업자 ${pct(d.hire.hiredShare)}, 그중 임시직(bridge)이 아닌 비율 ${pct(d.hire.nonBridgeShare)} (n=${d.hire.nGrads}).`);

  const c = d.causes, gm = c.gradMilestones;
  L.push('', '### 휴학 시작 이유와 이탈 원인 (삶-년당 발생, 계열별)', '', '| 계열 | 삶-년 | 창(12개월) | 휴학 중인 달 비율(스냅샷, 표의 모의값) | 휴학 시작/년 hazard | burnout | voluntary | 이탈/년 background | 자격시험 3불합격 | residence | financial | 석사 수료 이탈 |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const key of ['all', ...KEDIS]) {
    const l = c.leaveStartsPerYear[key]!, x = c.dropoutPerYear[key]!;
    L.push(`| ${key === 'all' ? '전체' : key} | ${f2(l.personYears, 0)} | ${f2(l.windowRate, 3)} | ${f2(l.prevalence, 3)} | ${f2(l.hazard, 3)} | ${f2(l.burnout, 3)} | ${f2(l.voluntary, 3)} | ${f2(x.background, 3)} | ${f2(x.qualFail, 3)} | ${f2(x.residence, 3)} | ${f2(x.financial, 3)} | ${f2(x.exitMaster, 3)} |`);
  }
  L.push('', `졸업자(n=${gm.n})의 마일스톤 개월 중앙값: 자격시험 합격 ${mo(gm.qual)}, 진척 ≥ 90 ${mo(gm.project90)}, 채택 논문이 요건을 채움 ${mo(gm.paperReady)}, 졸업 직전 진로 결정 ${mo(gm.pathDecision)}, 졸업 ${mo(gm.degree)}.`,
    `48개월 이상 지속한 삶(n=${c.papers.n})의 평균 투고 ${f2(c.papers.meanSubmitted, 2)}편, 채택 ${f2(c.papers.meanAccepted, 2)}편.`,
    '', '졸업 후 1년 안 첫 채용 경로(졸업자 수):', '');
  for (const g of GROUPS) L.push(`- ${g}: ${Object.entries(c.firstHireRoutes[g]!).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  L.push('', '취업 변형(졸업자 중 졸업 후 1년 안 첫 채용; 표의 취업은 `전체`):', '', '| KSCED | 졸업자 n | 전체 | 시간강사 제외 | 시간강사·창업 제외 | 기준값 |', '|---|---|---|---|---|---|');
  for (const [k, v] of Object.entries(c.employmentVariants)) L.push(`| ${k} | ${v.n} | ${f2(v.all, 3)} | ${f2(v.exLecturer, 3)} | ${f2(v.exLecturerStartup, 3)} | ${f2(v.ref, 3)} |`);
  L.push('', '입학 때 소득 구조(월):', '', '| 처음 자금 경로 | n | 장려금 중앙값 (최소–최대) | 가족 지원 평균 | 등록금 감면율 평균 | 생활비 수도권/비수도권 |', '|---|---|---|---|---|---|');
  for (const [f, v] of Object.entries(c.income0)) L.push(`| ${f} | ${v.n} | ${man(v.stipend)} (${man(v.stipendMin)}–${man(v.stipendMax)}) | ${man(v.family)} | ${pct(v.waiver)} | ${man(v.livingCapital)} / ${man(v.livingRegional)} |`);
  L.push('', '### M̄ 실현값 (0014 #45, 선택권 §4.2)', '',
    `현재 \`ASSUMED.G_MBAR_INIT\` = ${d.mbar.gMbarInit}. 계획 문서가 \`PROGRESS_MBAR\` 라고 적은 상수는 코드에서 \`G_MBAR_INIT\` 다. \`G_INIT\`(계열별 g 표)은 소스 어디에서도 읽지 않는다(\`gK\` 가 레코드와 \`G_MBAR_INIT\` 에서 계산한다).`, '',
    '| 계열 | 실현 M̄ (휴학이 아니고 project < 100 인 달) | 달 수 | 현재 g | 실현 M̄ 를 쓴 g |', '|---|---|---|---|---|');
  for (const k of KEDIS) { const v = d.mbar.byKedi[k]!; L.push(`| ${k} | ${f2(v.mean, 3)} | ${v.n} | ${f2(v.gNow, 3)} | ${f2(v.impliedG, 3)} |`); }
  L.push(`| 전체 | ${f2(d.mbar.pooled, 3)} | | | |`, '', `그림자 뉴스와 실제 뉴스가 연말에 어긋난 횟수: ${d.shadowMismatch} (삶 ${d.nLives}).`);
  void data;
  return L.join('\n');
}

export const DEFINITIONS = [
  'seed i = `newSeed(\\`cal${i}\\`)`, i = 0..N-1. `createLife({ auto: true })` 로 계열·트랙·학교·자금·지도교수를 모두 운에 맡긴다.',
  '박사과정 결과(학위·dropout·residence·financial·exit-master)는 stage 가 `phd` 를 처음 떠나는 순간에 잡는다(석사 수료 이탈의 `end.reason` 은 은퇴 때 덮인다).',
  '학위 기간 = 졸업 달 ÷ 12(입학 = 0개월), 졸업자만의 중앙값. 졸업자가 없으면 모의값 `—` 이고 실패로 센다.',
  '휴학 비율(주 지표, 스냅샷) = 휴학 중인 달 ÷ 박사과정 달 수(휴학 달 포함). KEDI 레코드 휴학률이 휴학생 ÷ 재적생이라 같은 정의다.',
  '창(12개월, 보조) = 입학부터 12개월 창마다 휴학 중인 달이 하나라도 있으면 1(마지막 창은 길이 비율로 가중) ÷ 박사과정 삶-년. 6·12개월 휴학이 여러 창에 걸리므로 스냅샷의 약 2.2 배다. 판정에는 쓰지 않는다.',
  '연 이탈 비율 = 학위 없이 박사과정을 떠난 삶(dropout, residence, financial, exit-master) ÷ 박사과정 삶-년.',
  '취업 = 첫 `log.hired` 달 ≤ 졸업 달 + 12(졸업 전 구직 채용·창업·임시직 포함). 석사 수료 이탈자는 분모에서 뺐다.',
  '수요 계수 = 경력 단계 매달 `demand(state, route)` 평균. `advanceYear` 가 연말 상태만 돌려주므로 같은 newsSeed 의 `updateNews` 를 달마다 다시 돌리는 그림자 상태에서 뽑는다.',
  '교수 경험 = 첫 `professor` 채용 달 ≤ 졸업 달 + 120. 참고값 = 졸업자 계열 구성으로 가중한 1 − (1 − h)^10 (h = 노동 §2.3 교수 연 채용 확률, 계속 구직한다고 본 개략 상한).',
  '표본이 적은 칸은 n 을 함께 읽는다. 허용 범위는 0014 #52(`CALIBRATION_TOL`).',
];

export interface MarkdownArgs {
  result: CalibrationResult; command: string; commit: string; date: string; causes: string; data: DataBundle;
  /** 재정 중립 실행(전체 N). 있으면 2절을 쓴다. */
  neutral?: CalibrationResult;
  /** 보정 전후 비교: 구 상수 실행 두 개(맥락별)와 현재 상수 기준 실행 두 개. */
  compare?: { old: CandidateRun[]; current: Record<string, CandidateRun> };
  /** Wave 6 후보 단일 override 실행과 그 기준(현재 상수) 실행. */
  candidates: CandidateRun[]; baselines: Record<string, CandidateRun>;
  mbar?: string;
}

const sectionHead = (title: string, r: CalibrationResult): string[] => {
  const fam = summarizeFamilies(r.table);
  return [title, '', `N=${r.options.seeds}, 실행 ${r.seconds.toFixed(1)}초. 통과 칸 수: ${TARGETS.filter(t => t !== 'professor10y').map(t => `${TARGET_LABEL[t]} ${fam[t].pass}/${fam[t].total}`).join(', ')}.`, ''];
};

export function renderMarkdown(args: MarkdownArgs): string {
  const { result, data } = args;
  const o = result.options;
  const all = result.diagnostics.outcomeByGroup.all!;
  const L: string[] = [];
  L.push('# Wave 4 보정 결과표', '',
    `- 날짜: ${args.date}`, `- 커밋: ${args.commit} (engine/src 를 마지막으로 바꾼 커밋. 3절의 구 상수 실행을 빼면 모든 실행이 이 커밋의 상수 위에서 돌았다)`,
    `- N: ${o.seeds}${o.group ? ` (group = ${o.group}, createLife 에 group 을 고정)` : ''}`,
    `- 사용자 override: ${Object.keys(o.overrides).length ? Object.entries(o.overrides).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ') : '없음'}`,
    `- 명령: \`${args.command}\``, '',
    `> **기본 상수에서 자동 생애의 ${pct(share(all.financial, all.n))} 는 여전히 재정 파탄(\`financial\`)으로 끝나고 졸업은 ${pct(share(all.degree, all.n))} 뿐이다.** 이 균형(생활비·장려금·가족 지원·대출)은 결정 기록 0015 §4 에 따라 Wave 6 이 맞춘다. 그래서 두 번 잰다: 1절은 기본 상수, 2절은 대출 한도를 없애 재정 파탄을 걷어낸 재정 중립 측정이다. 학위 기간·휴학·이탈·취업·수요의 보정 판정은 2절을 기준으로 읽는다.`, '');
  L.push(...sectionHead(`## 1. ${CONTEXT_LABEL.default}`, result), renderTable(result.table), '', '### 측정 정의', '', ...DEFINITIONS.map(x => `- ${x}`), '',
    '### 진단', '', renderDiagnostics(result.diagnostics, data), '');
  if (args.neutral) L.push(...sectionHead(`## 2. ${CONTEXT_LABEL['finance-neutral']}`, args.neutral),
    '제안값이 아니라 측정이다. 재정 파탄이 삶을 끊지 않을 때 나머지 상수가 어떤 모양인지 본다. 같은 seed 를 쓴다.', '', renderTable(args.neutral.table), '', '### 진단', '', renderDiagnostics(args.neutral.diagnostics, data), '');
  if (args.compare) L.push(renderCandidates('## 3. 적용한 변경의 전후', `같은 seed ${args.compare.old[0]?.d.nLives ?? 0}개로 구 상수와 현재 상수를 비교한다. 구 상수는 0014 #45(M̄ 0.68), #46(자격시험 뒤 포커스 0.5/0.2/0.2/0.1), #61(대출 한도 3천만), #119(뉴스 가중치 dept-merger 5, humanities-fund 3, univ-freeze 4, hiring-chill 4, lecturer-policy 3)이다. 휴학은 스냅샷 비율이 기준이다.`, args.compare.old, args.compare.current, '(현재 상수)'), '');
  if (args.candidates.length) L.push(renderCandidates('## 4. Wave 6 후보: 현재 상수 위의 단일 override', `현재 상수에서 상수 하나만 바꿔 같은 seed ${args.candidates[0]?.d.nLives ?? 0}개로 돌렸다. 값은 제안이 아니라 방향을 보는 측정이다. 맥락 열이 \`finance-neutral\` 이면 \`LOAN_LIMIT\` 도 무한이다.`, args.candidates, args.baselines, '(현재 상수)'), '');
  if (args.mbar) L.push(args.mbar, '');
  L.push(args.causes.trim(), '', 'Provenance: 91_Handoffs/_HANDOFF-2026-10-13.md (APD)', '');
  return L.join('\n');
}

export function candidateRow(label: string, ctx: string, table: TargetRow[], d: Diagnostics, note: string): string {
  const f = summarizeFamilies(table);
  const degs = KEDIS.map(k => f2(table.find(r => r.target === 'degreeYears' && r.label === k)?.sim ?? null, 1)).join('/');
  const all = d.outcomeByGroup.all!, lv = d.causes.leaveStartsPerYear.all!, dr = d.causes.dropoutPerYear.all!;
  const emp = Object.values(d.causes.employmentVariants).reduce((a, v) => ({ n: a.n + v.n, s: a.s + (v.all ?? 0) * v.n }), { n: 0, s: 0 });
  return `| ${label} | ${ctx} | ${f.degreeYears.pass}/4 | ${f.leaveRate.pass}/4 | ${f.dropoutRate.pass}/4 | ${f.employment.pass}/6 | ${f.demand.pass}/14 | ${pct(share(all.degree, all.n))} | ${pct(share(all.financial, all.n))} | ${pct(share(all.residence, all.n))} | ${mo(d.milestones.degreeMedian)} | ${degs} | ${f2(lv.prevalence, 3)} | ${f2(dr.background + dr.qualFail + dr.residence + dr.financial + dr.exitMaster, 3)} | ${pct(emp.n ? emp.s / emp.n : null)} | ${note} |`;
}

/** 후보(또는 구 상수) 실행들을 기준 실행과 나란히 놓은 요약표와 세부표. */
export function renderCandidates(title: string, intro: string, runs: CandidateRun[], baselines: Record<string, CandidateRun>, baseLabel: string): string {
  const L: string[] = [title, '', `${intro} 통과 칸 수는 학위 4, 휴학 4, 이탈 4, 취업 6, 수요 14칸 중이다. 이탈은 삶-년당 전체 비율, 취업은 졸업자 전체 평균이다.`, '',
    '| override | 맥락 | 학위 | 휴학 | 이탈 | 취업 | 수요 | 학위 취득 | 재정 파탄 | 재학연한 | 졸업 개월 중앙값 | 학위 기간(인문/사회/자연/공학) | 휴학 비율(스냅샷) | 이탈/년 | 취업 | 메모 |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const [ctx, b] of Object.entries(baselines)) L.push(candidateRow(baseLabel, ctx, b.table, b.d, `비교 기준 (${ctx})`));
  for (const r of runs) L.push(candidateRow(`\`${r.candidate.label}\``, r.candidate.context, r.table, r.d, r.candidate.note));
  L.push('', '#### 세부', '', '| override | 맥락 | 학위 기간(인/사/자/공, 년) | 휴학 스냅샷(인/사/자/공) | 휴학 창 12개월(인/사/자/공) | 이탈/년(인/사/자/공) | 취업(ict/자연수학/공학/사회/경영법/예인문) | 취업, 시간강사 제외 | 실패한 수요 칸 |', '|---|---|---|---|---|---|---|---|---|');
  const one = (label: string, run: CandidateRun): string => {
    const t = run.table, d = run.d;
    const col = (target: TargetId, labels: readonly string[], dec: number, alt = false): string => labels.map(l => {
      const row = t.find(r => r.target === target && r.label === l);
      return f2((alt ? row?.alt : row?.sim) ?? null, dec);
    }).join('/');
    const bad = t.filter(r => r.target === 'demand' && !r.pass).map(r => r.label).join(', ') || '없음';
    const exLect = KSCEDS.map(k => f2(d.causes.employmentVariants[k]?.exLecturer ?? null, 2)).join('/');
    return `| ${label} | ${run.candidate.context} | ${col('degreeYears', KEDIS, 1)} | ${col('leaveRate', KEDIS, 3)} | ${col('leaveRate', KEDIS, 3, true)} | ${col('dropoutRate', KEDIS, 3)} | ${col('employment', KSCEDS, 2)} | ${exLect} | ${bad} |`;
  };
  for (const b of Object.values(baselines)) L.push(one(baseLabel, b));
  for (const r of runs) L.push(one(`\`${r.candidate.id}\``, r));
  L.push('', '기준값: 학위 기간 인문 6.0, 사회 5.0, 자연 5.5, 공학 5.5 (±0.5). 휴학 0.188, 0.190, 0.081, 0.080 (±30%, 스냅샷 기준). 이탈 인문·사회 0.064, 자연 0.048, 공학 0.046 (±30%). 취업 0.682, 0.587, 0.625, 0.470, 0.408, 0.408 (±0.10). 계열별 n 이 작은 칸(특히 취업)은 잡음이 크다.');
  return L.join('\n');
}

// ───────────────────────── M̄ 추정 ─────────────────────────
export interface MbarRun { mbar: number; label: string; degreeYears: (number | null)[]; degreeShare: number | null; residence: number | null; project90: number | null; paperReady: number | null; degreeMonth: number | null }

/** finance-neutral 맥락에서 G_MBAR_INIT 을 바꿔 가며 학위 기간 중앙값을 잰다(g 가 병목인지, 논문 파이프라인이 병목인지 가른다). */
export function mbarSweep(seeds: number, data: DataBundle, group?: Group, extra: Record<string, unknown> = {}): { realized: number | null; runs: MbarRun[] } {
  const ctx = { ...extra, ...FINANCE_NEUTRAL };
  const first = runCalibration({ seeds, ...(group ? { group } : {}), overrides: ctx, data });
  const realized = first.diagnostics.mbar.pooled;
  const grid: [number, string][] = [[ASSUMED.G_MBAR_INIT, '현재'], [Math.round((realized ?? ASSUMED.G_MBAR_INIT) * 1000) / 1000, '실현값'], [0.45, ''], [0.35, ''], [0.25, ''], [0.15, '']];
  const runs: MbarRun[] = grid.map(([m, label]) => {
    const r = runCalibration({ seeds, ...(group ? { group } : {}), overrides: { ...ctx, G_MBAR_INIT: m }, data });
    const all = r.diagnostics.outcomeByGroup.all!;
    const gm = r.diagnostics.causes.gradMilestones;
    return {
      mbar: m, label, degreeYears: KEDIS.map(k => r.table.find(x => x.target === 'degreeYears' && x.label === k)?.sim ?? null),
      degreeShare: share(all.degree, all.n), residence: share(all.residence, all.n), project90: gm.project90, paperReady: gm.paperReady, degreeMonth: gm.degree,
    };
  });
  return { realized, runs };
}

export function renderMbar(res: { realized: number | null; runs: MbarRun[] }, data: DataBundle, seeds: number): string {
  const T = KEDIS.map(k => durationYears(data, k).value);
  const tol = ASSUMED.CALIBRATION_TOL.degreeYears + 1e-12;
  const L: string[] = ['## 5. M̄ 추정 (finance-neutral 맥락, g_k = 100 / ((12·T_k − 6) × M̄))', '',
    `실현 M̄(휴학이 아니고 project < 100 인 달의 g 외 배수 평균, 기본 \`G_MBAR_INIT\` = ${ASSUMED.G_MBAR_INIT} 로 돌린 N=${seeds}): ${f2(res.realized, 3)}. 이 값을 쓰면 g 가 현재보다 커진다. 아래는 같은 seed 로 \`G_MBAR_INIT\` 만 바꿔 돌린 학위 기간 중앙값이다(작은 M̄ = 큰 g). T_k = ${KEDIS.map((k, i) => `${k} ${T[i]}`).join(', ')}.`, '',
    '| G_MBAR_INIT | 비고 | 학위 기간(인/사/자/공, 년) | 계열별 통과(±0.5) | 졸업 | 재학연한 | 진척 ≥ 90 개월 | 채택 논문 요건 개월 | 졸업 개월(중앙값) |', '|---|---|---|---|---|---|---|---|---|'];
  for (const r of res.runs) {
    const pass = r.degreeYears.map((v, i) => (v !== null && Math.abs(v - T[i]!) <= tol ? '통과' : '실패')).join('/');
    L.push(`| ${r.mbar} | ${r.label} | ${r.degreeYears.map(v => f2(v, 1)).join('/')} | ${pass} | ${pct(r.degreeShare)} | ${pct(r.residence)} | ${mo(r.project90)} | ${mo(r.paperReady)} | ${mo(r.degreeMonth)} |`);
  }
  const need = KEDIS.map((k, i) => {
    const ok = res.runs.filter(r => r.degreeYears[i] !== null && Math.abs(r.degreeYears[i]! - T[i]!) <= tol).map(r => r.mbar);
    return `${k}: ${ok.length ? `M̄ ≤ ${Math.max(...ok)} 에서 통과` : `시험한 M̄(최소 ${Math.min(...res.runs.map(r => r.mbar))}) 어디서도 통과 못 함`}`;
  });
  L.push('', `계열별 필요 M̄: ${need.join('; ')}.`);
  return L.join('\n');
}

// ───────────────────────── CLI ─────────────────────────
export interface CliArgs { seeds: number; out?: string; group?: Group; overrides: Record<string, unknown>; candidates: boolean; candidateSeeds: number; mbar: boolean; json: boolean }

export function parseArgs(argv: string[]): CliArgs {
  const a: CliArgs = { seeds: 1000, overrides: {}, candidates: false, candidateSeeds: 300, mbar: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]!;
    const next = (): string => { const v = argv[++i]; if (v === undefined) throw new Error(`${k} needs a value`); return v; };
    if (k === '--seeds') a.seeds = Number(next());
    else if (k === '--out') a.out = next();
    else if (k === '--group') { const g = next(); if (g !== '이공' && g !== '인문사회') throw new Error(`--group must be 이공 or 인문사회, got ${g}`); a.group = g; }
    else if (k === '--override') {
      while (argv[i + 1] !== undefined && !argv[i + 1]!.startsWith('--')) {
        const kv = argv[++i]!, eq = kv.indexOf('=');
        if (eq < 1) throw new Error(`--override expects KEY=JSON, got ${kv}`);
        a.overrides[kv.slice(0, eq)] = JSON.parse(kv.slice(eq + 1));
      }
    }
    else if (k === '--candidates') a.candidates = true;
    else if (k === '--mbar') a.mbar = true;
    else if (k === '--candidate-seeds') a.candidateSeeds = Number(next());
    else if (k === '--json') a.json = true;
    else throw new Error(`unknown argument ${k}`);
  }
  if (!Number.isInteger(a.seeds) || a.seeds < 1) throw new Error('--seeds must be a positive integer');
  return a;
}

const CAUSES_HEADING = '## 원인 후보';
const PROVENANCE = /^Provenance:.*$/m;
/** 이미 쓴 결과 문서에서 손으로 쓴 "## 원인 후보" 절을 보존한다. 없으면 자리표시자. */
function carriedCauses(out: string | undefined): string {
  if (out && existsSync(out)) {
    const text = readFileSync(out, 'utf8');
    const at = text.indexOf(CAUSES_HEADING);
    if (at >= 0) return text.slice(at).replace(PROVENANCE, '').trim();
  }
  return `${CAUSES_HEADING}\n\n(아직 쓰지 않음)`;
}

function gitHead(): string {
  try { return execSync('git log -1 --format=%h -- engine/src', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return 'unknown'; }
}

const asRun = (candidate: Candidate, r: CalibrationResult): CandidateRun => ({ candidate, table: r.table, d: r.diagnostics, seconds: r.seconds });
const CURRENT: Candidate = { id: 'current', label: '(현재 상수)', overrides: () => ({}), context: 'default', targets: '', note: '' };

export function main(argv: string[]): void {
  const args = parseArgs(argv);
  const data = loadData();
  const group = args.group ? { group: args.group } : {};
  const result = runCalibration({ seeds: args.seeds, ...group, overrides: args.overrides, data });
  if (args.json) { console.log(JSON.stringify({ options: result.options, table: result.table, diagnostics: result.diagnostics, seconds: result.seconds })); return; }
  const ctxRun = (seeds: number, ctx: ContextId, extra: Record<string, unknown> = {}): CalibrationResult =>
    runCalibration({ seeds, ...group, overrides: { ...args.overrides, ...extra, ...CONTEXTS[ctx] }, data });   // 맥락이 마지막: 구 상수의 LOAN_LIMIT 이 재정 중립을 덮지 않게

  let neutral: CalibrationResult | undefined;
  let compare: MarkdownArgs['compare'];
  const candidates: CandidateRun[] = [];
  const baselines: Record<string, CandidateRun> = {};
  if (args.candidates) {
    neutral = ctxRun(args.seeds, 'finance-neutral');
    const old = OLD_RUNS.map(c => asRun(c, ctxRun(args.seeds, c.context, c.overrides())));
    compare = { old, current: { default: asRun({ ...CURRENT, context: 'default' }, result), 'finance-neutral': asRun({ ...CURRENT, context: 'finance-neutral' }, neutral) } };
    for (const ctx of Object.keys(CONTEXTS) as ContextId[]) {
      if (!CANDIDATES.some(c => c.context === ctx)) continue;
      baselines[ctx] = asRun({ ...CURRENT, context: ctx }, ctxRun(args.candidateSeeds, ctx));
    }
    for (const c of CANDIDATES) {
      const run = ctxRun(args.candidateSeeds, c.context, c.overrides());
      candidates.push(asRun(c, run));
      console.error(`candidate ${c.id}: ${run.seconds.toFixed(1)}s`);
    }
  }
  const command = `npm run calibrate -- ${argv.join(' ')}`;
  const md = renderMarkdown({
    result, command, commit: process.env.CAL_COMMIT ?? gitHead(), date: process.env.CAL_DATE ?? new Date().toLocaleDateString('sv-SE'),
    causes: carriedCauses(args.out), candidates, baselines, data, ...(neutral ? { neutral } : {}), ...(compare ? { compare } : {}),
    ...(args.mbar ? { mbar: renderMbar(mbarSweep(args.seeds, data, args.group, args.overrides), data, args.seeds) } : {}),
  });
  if (args.out) { writeFileSync(args.out, md); console.error(`wrote ${args.out} (${result.seconds.toFixed(1)}s)`); } else console.log(md);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main(process.argv.slice(2));
