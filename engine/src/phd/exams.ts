// 자격시험과 학위 심사(선택권 §7). 난수는 stream `exam`, 슬롯 `qual:${attempt}`·`defense:${attempt}`.
import { ASSUMED } from '../assumed';
import { odds, z } from '../odds';
import { draw } from '../rng';
import { acceptedCount } from './papers';
import type { DataBundle } from '../data/bundle';
import type { LifeState, Stats } from '../types';

/** 자격시험 응시 창이 열린 달인가: enrolledMonths = 12, 18, 24, … (선택권 §7.1). */
export function qualWindowOpen(state: LifeState): boolean {
  const phd = state.phd, Q = ASSUMED.QUAL_EXAM;
  if (!phd || phd.qualified || phd.qualAttempts >= Q.maxAttempts || phd.leave.active) return false;
  return phd.enrolledMonths >= Q.firstWindowMonths && (phd.enrolledMonths - Q.firstWindowMonths) % Q.intervalMonths === 0;
}

/** 합격 확률(순수): odds(0.70, 1.2·z(skill) + 0.3·z(health) + 0.25·(시도 − 1), 0.10, 0.95). */
export function qualProbability(stats: Stats, attempt: number): number {
  const Q = ASSUMED.QUAL_EXAM;
  return odds(Q.p0, Q.betaSkill * z(stats.skill) + Q.betaHealth * z(stats.health) + Q.retryLogit * (attempt - 1), Q.lo, Q.hi);
}

/**
 * 자격시험을 한 번 본다. 시도 횟수를 올리고 합격이면 qualified, 마지막(3번째) 시도 불합격이면 end { dropout } 이다.
 * 응시 창 확인은 호출하는 쪽(월 틱)의 몫이다. 이미 합격했거나 시도를 다 쓴 상태에서 부르면 예외.
 * 결정 지점 post-qualifying 은 틱이 qualAttempts 변화를 보고 건다(Task 7).
 */
export function takeQual(state: LifeState, _data: DataBundle): { state: LifeState; passed: boolean } {
  const phd = state.phd;
  if (!phd) throw new Error('takeQual: no phd state');
  if (phd.qualified || phd.qualAttempts >= ASSUMED.QUAL_EXAM.maxAttempts) throw new Error('takeQual: no attempts left');
  const attempt = phd.qualAttempts + 1;
  const passed = draw(state.seed, 'exam', state.month, `qual:${attempt}`) < qualProbability(state.stats, attempt);
  const next: LifeState = { ...state, phd: { ...phd, qualAttempts: attempt, qualified: passed } };
  if (!passed && attempt === ASSUMED.QUAL_EXAM.maxAttempts) return { state: { ...next, stage: 'end', end: { reason: 'dropout', month: state.month } }, passed };
  return { state: next, passed };
}

/**
 * 학위 심사를 받을 수 있는가(선택권 §7.2): 자격시험 합격, project ≥ 100, 채택 논문 ≥ requiredPapers(계층 하한 포함: 인문사회는 T3 이상),
 * 진로(path) 결정 완료. 거기에 휴학 중이 아니고, 아직 통과하지 않았고(graduationMonth 없음), 불합격 뒤 재심 달에 이르렀을 것.
 */
export function defenseEligible(state: LifeState): boolean {
  const phd = state.phd;
  if (!phd || !phd.qualified || phd.project < ASSUMED.PROJECT_MAX || phd.path === undefined || phd.leave.active) return false;
  if (phd.graduationMonth !== undefined) return false;
  if (phd.nextDefenseMonth !== undefined && state.month < phd.nextDefenseMonth) return false;
  return acceptedCount(phd.papers, ASSUMED.REQUIRED_PAPERS[state.choices.group].minTier) >= phd.requiredPapers;
}

/** 통과 확률(순수): odds(0.73, 1.0·z(skill) + 0.4·z(relation) + 0.3·z(health) + 0.6·(시도 − 1), 0.40, 0.95). */
export function defenseProbability(stats: Stats, attempt: number): number {
  const D = ASSUMED.DEFENSE;
  return odds(D.p0, D.betaSkill * z(stats.skill) + D.betaRelation * z(stats.relation) + D.betaHealth * z(stats.health) + D.retryLogit * (attempt - 1), D.lo, D.hi);
}

/**
 * 학위 심사를 한 번 받는다. 통과하면 graduationMonth = month 보다 엄밀히 뒤의 다음 학기 경계(month + (6 − month mod 6)).
 * 학위 취득과 stage 전환은 그 달의 틱이 한다(Task 7). 불합격이면 nextDefenseMonth = month + 6. 자격이 안 되면 예외.
 */
export function takeDefense(state: LifeState, _data: DataBundle): { state: LifeState; passed: boolean } {
  if (!defenseEligible(state)) throw new Error('takeDefense: not eligible');
  const phd = state.phd!;
  const attempt = phd.defenseAttempts + 1;
  const passed = draw(state.seed, 'exam', state.month, `defense:${attempt}`) < defenseProbability(state.stats, attempt);
  const base = { ...phd, defenseAttempts: attempt };
  const next = passed
    ? { ...base, graduationMonth: state.month + (ASSUMED.SEMESTER_MONTHS - (state.month % ASSUMED.SEMESTER_MONTHS)) }
    : { ...base, nextDefenseMonth: state.month + ASSUMED.DEFENSE.retryMonths };
  return { state: { ...state, phd: next }, passed };
}
