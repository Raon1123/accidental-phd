// 박사과정 월 틱 advanceMonth (상태 §7.1). 순서는 규범이다.
//  1 월·나이·재학 개월  2 뉴스  3 학기 경계(장학 유지 판정)  4 진척·포커스·휴학 중 근로  5 자연 변화  6 현금 흐름
//  7 논문 투고·판정  8 마일스톤(자격시험, 학위 심사, 졸업 직전 구직, 졸업)  9 위험률  10 결정 지점  11 종료 확인  12 기록
// 구부린 곳(보고서에 적는다):
//  (a) 진척(applyProgress)은 스펙 4단계 "포커스 효과: 능력치, 진척, 논문 초고"의 일부라 포커스 효과 바로 앞에 부른다(이번 달 갱신 전 능력치로 계산).
//  (b) 11단계(종료 확인)를 10단계(결정 지점) 앞에서 평가한다. 종료가 걸리면 결정 지점을 열지 않는다. 두 단계는 서로의 입력을 바꾸지 않아 결과는 같고, 끝난 삶에 pending 이 남지 않는다.
//  (c) 재학연한 연장 12개월은 신청 필드가 없어 자동 1회로 본다: enrolledMonths 가 96 + 12 를 넘으면 종료(상태 §2, 0014#4).
//  (d) 졸업하는 달은 8단계 끝(graduate)에서 반환한다. 그 달에는 9단계(위험률)도 10단계(결정 지점)도 없다.
//  (e) 졸업 직전 구직(searchMonth)은 진로 결정(10단계, decide)의 다음 달에 시작한다. 스펙 §3.4 는 결정한 달부터라고 쓰지만 그 달의 8단계는 결정 전에 지났다.
import { ASSUMED } from '../assumed';
import { applyHire, searchMonth } from '../career/labor';
import { updateNews } from '../career/news';
import { ACADEMIC_ROUTES, addLog } from '../career/pay';
import type { DataBundle } from '../data/bundle';
import { decide, fundingExpired } from '../decide';
import { odds, z } from '../odds';
import { policyDecision, policyFocus } from '../policy';
import { draw } from '../rng';
import type { CareerState, Focus, LifeState, MonthInput, Path, Route } from '../types';
import { qualWindowOpen, defenseEligible, takeDefense, takeQual } from './exams';
import { applyFocus, applyDrift } from './focus';
import { applyHazards } from './hazards';
import { applyCashflow, crisisStage, isSemesterBoundary, updateCoursework } from './money';
import { submitIfReady, resolveVerdicts } from './papers';
import { applyProgress } from './progress';
import { FIRST_VERDICT_DEFERRED, checkTriggers } from './triggers';

/** 졸업 직전 구직과 졸업 뒤 구직이 찾는 경로 (선택권 §3.4). 창업은 학위 취득 달에 시작한다. */
const PATH_ROUTES: Record<Path, readonly Route[]> = {
  academia: ACADEMIC_ROUTES, industry: ['industry'], public: ['institute', 'public'], startup: [],
};

const patchPhd = (s: LifeState, patch: Partial<NonNullable<LifeState['phd']>>): LifeState => ({ ...s, phd: { ...s.phd!, ...patch } });

/** 이번 달 포커스를 정한다: 입력 > (자동이면 정책) > 지금 포커스. 바뀌었을 때만 focusHistory 에 덧붙인다. */
function chooseFocus(s: LifeState, data: DataBundle, input: MonthInput): LifeState {
  const focus: Focus = input.focus ?? (s.auto ? policyFocus(s, data) : s.phd!.focus);
  if (focus === s.phd!.focus) return s;
  return patchPhd(s, { focus, focusHistory: [...s.phd!.focusHistory, { from: s.month, focus }] });
}

/**
 * 3단계 장학 유지 판정(학기 경계). 장학 경로만, 휴학 중이 아니고 자금이 아직 끝나지 않았을 때.
 * 유지 확률 = odds(SCHOLARSHIP_SELECT_P0, 0.8·z(skill)) (선발과 같은 식, 0014#22). 실패하면 기한을 이번 달로 당겨 funding-expiry 를 건다.
 */
function scholarshipReview(s: LifeState): { state: LifeState; failed: boolean; originalUntil?: number } {
  const phd = s.phd!;
  if (!isSemesterBoundary(s.month) || phd.fundingState.route !== 'scholarship' || phd.leave.active || fundingExpired(s)) return { state: s, failed: false };
  const keep = odds(ASSUMED.SCHOLARSHIP_SELECT_P0, ASSUMED.SCHOLARSHIP_SELECT_BETA_SKILL * z(s.stats.skill));
  if (draw(s.seed, 'funding', s.month, 'scholarship:keep') < keep) return { state: s, failed: false };
  const next = patchPhd(s, { fundingState: { ...phd.fundingState, until: s.month } });
  return { state: addLog(next, 'log.scholarship-review-failed', ['funding', 'scholarship']), failed: true, originalUntil: phd.fundingState.until };
}

/** 자격시험 응시 여부: 입력 > (자동이면 skill ≥ autoSkill 또는 추첨 autoP) > 응시. */
function wantsQual(s: LifeState, input: MonthInput): boolean {
  if (input.takeExam !== undefined) return input.takeExam;
  if (!s.auto) return true;
  const Q = ASSUMED.QUAL_EXAM;
  return s.stats.skill >= Q.autoSkill || draw(s.seed, 'policy', s.month, 'qual:auto') < Q.autoP;
}

/** 졸업(학위 취득): 단계를 경력으로 바꾼다. 졸업 직전 구직에서 이미 채용됐으면 그 경력을 이어받고, 아니면 새로 만든다. `end` 는 쓰지 않는다(학위는 종료가 아니다). */
function graduate(s: LifeState, data: DataBundle): LifeState {
  const path = s.phd!.path ?? 'academia';
  let out = s;
  if (!out.career) {
    out = path === 'startup' ? applyHire(out, data, 'startup', out.month) : {
      ...out,
      career: {
        degreeMonth: out.month, degree: 'phd', route: 'none', annualPay: 0, yearsInRoute: 0, workYears: 0, academicMonths: 0,
        paperScore: 0, careerPapers: 0, searching: { routes: [...PATH_ROUTES[path]], since: out.month, penalty: 1 },
      } satisfies CareerState,
    };
  }
  return addLog({ ...out, stage: 'career', career: { ...out.career!, degreeMonth: out.month } }, 'log.degree', ['phd', 'degree']);
}

const endLife = (s: LifeState): LifeState => addLog(s, `log.end-${s.end!.reason}`, ['end']);

/**
 * 박사과정 한 달. 결정 지점이 걸려 있으면 시간이 멈춘다(`pending` 이면 던진다). 입력 상태를 바꾸지 않는다.
 * `input.focus` 는 자동 모드에서도 우선한다(없으면 정책). `thesis` 는 자격시험 합격 뒤에만.
 * 종료(이탈·재학연한·재정 파탄)나 석사 수료 이탈이면 그 달에서 멈추고, 졸업하면 `stage = 'career'` 로 넘어간다.
 */
export function advanceMonth(state: LifeState, data: DataBundle, input: MonthInput = {}): LifeState {
  if (state.pending) throw new Error('decision pending');
  if (state.stage !== 'phd' || !state.phd) throw new Error(`advanceMonth: stage ${state.stage} is not phd`);
  if (input.focus === 'thesis' && !state.phd.qualified) throw new Error('thesis focus requires qualified');

  // 1. 월, 나이, 재학 개월(휴학 중이면 늘리지 않는다), 수업 기간
  const onLeave = state.phd.leave.active;
  let s: LifeState = {
    ...state, month: state.month + 1, ageMonths: state.ageMonths + 1,
    phd: { ...state.phd, enrolledMonths: state.phd.enrolledMonths + (onLeave ? 0 : 1) },
  };
  s = updateCoursework(s);
  s = chooseFocus(s, data, input);

  // 2. 가상 뉴스
  s = updateNews(s, data);

  // 3. 학기 경계: 장학 유지 판정(등록금 청구는 6단계 applyCashflow 안에서 한다)
  const review = scholarshipReview(s);
  s = review.state;

  // 4. 진척과 포커스 효과(휴학 중이면 둘 다 멈춘다), 휴학 중 근로 수입
  s = applyProgress(s, data);
  s = applyFocus(s, data);
  if (s.phd!.leave.active && s.phd!.fundingState.recordIds.includes('0014#36')) {
    s = { ...s, ledger: [...s.ledger, { month: s.month, kind: 'leave-work', amount: ASSUMED.LEAVE_JOB_INCOME, recordId: '0014#36' }] };
  }

  // 5. 자연 변화  6. 현금 흐름
  s = applyDrift(s);
  s = applyCashflow(s, data);

  // 7. 논문 파이프라인
  s = submitIfReady(s, data);
  const resolved = resolveVerdicts(s, data);
  s = resolved.state;

  // 8. 마일스톤
  let qualResult: boolean | undefined;
  if (qualWindowOpen(s) && wantsQual(s, input)) {
    const r = takeQual(s, data);
    s = addLog(r.state, r.passed ? 'log.qual-pass' : 'log.qual-fail', ['exam', 'qual']);
    qualResult = r.passed;
    if (s.stage === 'end') return endLife(s);   // 3회 불합격 이탈
  }
  if (defenseEligible(s)) {
    const r = takeDefense(s, data);
    s = addLog(r.state, r.passed ? 'log.defense-pass' : 'log.defense-fail', ['exam', 'defense']);
  }
  if (s.phd!.path !== undefined) {   // 결정한 달부터 졸업(단계 전환)까지. 이미 채용됐으면 searchMonth 가 아무것도 하지 않는다
    s = searchMonth(s, data, s.month, input).state;   // 졸업 직전 구직: 경로마다 슬롯이 다르다(labor)
  }
  if (s.phd!.graduationMonth !== undefined && s.month >= s.phd!.graduationMonth) return graduate(s, data);

  // 9. 위험률
  s = applyHazards(s, data);
  if (s.stage !== 'phd') return endLife(s);

  // 11. 종료 확인(10보다 먼저 평가한다. 위 머리말 참조)
  if (s.phd!.enrolledMonths > ASSUMED.RESIDENCE_MONTHS + ASSUMED.RESIDENCE_EXTENSION) {
    return endLife({ ...s, stage: 'end', end: { reason: 'residence', month: s.month } });
  }
  if (crisisStage(s) === 'financial-end') return endLife({ ...s, stage: 'end', end: { reason: 'financial', month: s.month } });

  // 10. 결정 지점. 걸리면 직전 상태의 snapshot 을 쌓고 시간을 멈춘다. 자동이면 정책으로 바로 해결한다.
  const pending = checkTriggers(s, data, {
    verdicts: resolved.verdicts, ...(qualResult === undefined ? {} : { qualResult }),
    fundingExpired: fundingExpired(s), scholarshipFailed: review.failed,
    ...(review.originalUntil === undefined ? {} : { scholarshipOriginalUntil: review.originalUntil }),
  });
  const deferred = resolved.verdicts.find(v => v.first);
  if (deferred && pending?.dp !== 'first-paper-verdict') {
    // 더 높은 우선순위가 이 달을 가져갔다: 상태에 싣고(다음 틱이 다시 건다) log 에는 기록만 남긴다
    s = addLog(patchPhd(s, { deferredFirstVerdict: { paperId: deferred.paperId, verdict: deferred.verdict } }), FIRST_VERDICT_DEFERRED, ['verdict', 'deferred', deferred.paperId, deferred.verdict]);
  } else if (pending?.dp === 'first-paper-verdict' && s.phd!.deferredFirstVerdict) {
    const { deferredFirstVerdict: _done, ...rest } = s.phd!;   // 밀렸던 판정의 프롬프트가 열렸다
    s = { ...s, phd: rest };
  }
  if (pending) {
    const snapshot = { dp: pending.dp, month: s.month, decisionIndex: s.decisions.length, state: structuredClone({ ...s, snapshots: [], pending }) };
    s = { ...s, snapshots: [...s.snapshots, snapshot], pending };
    if (s.auto) {
      s = decide(s, data, policyDecision(s, data, pending), true);
      if (s.stage !== 'phd') return s;   // 석사 수료 이탈(post-qualifying C): 경력 단계로 넘어갔다
    }
  }

  // 12. 기록
  return addLog(s, 'log.month', ['month']);
}
