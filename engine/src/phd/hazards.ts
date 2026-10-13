// 휴학·이탈·번아웃(선택권 §4.5). 난수는 stream `hazard`, 슬롯 `leave`·`leave:months`·`dropout`·`burnout`.
import { ASSUMED } from '../assumed';
import { hazardMonth, z } from '../odds';
import { draw } from '../rng';
import { dropoutRate, leaveRate } from '../data/statistics';
import { addStats } from './stats';
import type { DataBundle } from '../data/load';
import type { LifeState } from '../types';

export type LeaveReason = 'hazard' | 'burnout' | 'voluntary';

/** 이번 달 휴학이 새로 시작될 확률: hazard_month(r_leave) × exp(−0.8·z(mind) − 0.4·z(health)) (0014#47–#48). */
export function leaveHazard(state: LifeState, data: DataBundle): number {
  const C = ASSUMED.HAZARD_COEF, s = state.stats;
  return Math.min(1, hazardMonth(leaveRate(data, state.choices.kedi).value) * Math.exp(C.leaveMind * z(s.mind) + C.leaveHealth * z(s.health)));
}

/** 이번 달 이탈 확률: 0.5 × hazard_month(r_drop) × exp(−0.8·z(mind) − 0.5·z(relation)). 휴학 중이면 ×2 (0014#31, #48–#49). */
export function dropoutHazard(state: LifeState, data: DataBundle): number {
  const C = ASSUMED.HAZARD_COEF, s = state.stats;
  const base = ASSUMED.DROPOUT_BACKGROUND_SHARE * hazardMonth(dropoutRate(data, state.choices.kedi).value)
    * Math.exp(C.dropMind * z(s.mind) + C.dropRelation * z(s.relation));
  return Math.min(1, state.phd?.leave.active ? base * ASSUMED.LEAVE_DROPOUT_MULT : base);
}

/** 누적 휴학이 상한(36개월, 0014#5)을 넘지 않는가. */
export function canStartLeave(state: LifeState, months: number): boolean {
  return !!state.phd && state.phd.leave.totalMonths + months <= ASSUMED.LEAVE_CAP_MONTHS;
}

/**
 * 휴학을 시작한다: leave = { active: true, until: month + months }, totalMonths 는 그대로(휴학 달마다 applyHazards 가 올린다).
 * 상한을 넘으면 예외 — 호출하는 쪽이 canStartLeave 로 먼저 확인한다. reason 은 log 의 tags 에 남는다.
 */
export function startLeave(state: LifeState, months: number, reason: LeaveReason): LifeState {
  const phd = state.phd;
  if (!phd) throw new Error('startLeave: no phd state');
  if (!canStartLeave(state, months)) throw new Error(`startLeave: ${months} months would exceed the ${ASSUMED.LEAVE_CAP_MONTHS}-month cap`);
  return {
    ...state,
    phd: { ...phd, leave: { active: true, until: state.month + months, totalMonths: phd.leave.totalMonths } },
    log: [...state.log, { month: state.month, textKey: 'leave.start', tags: ['leave', reason], creative: false }],
  };
}

const dropOut = (state: LifeState): LifeState => ({ ...state, stage: 'end', end: { reason: 'dropout', month: state.month } });

/** 휴학 기간 추첨(슬롯 `leave:months`): LEAVE_DURATIONS 의 누적 확률. */
function leaveMonths(state: LifeState): number {
  const u = draw(state.seed, 'hazard', state.month, 'leave:months');
  let acc = 0;
  for (const d of ASSUMED.LEAVE_DURATIONS) { acc += d.p; if (u < acc) return d.months; }
  return ASSUMED.LEAVE_DURATIONS[ASSUMED.LEAVE_DURATIONS.length - 1]!.months;
}

/**
 * 월 틱 9단계(상태 §7.1). 월·나이·enrolledMonths 는 건드리지 않는다 — 1단계(틱)의 몫이다(휴학 중에는 enrolledMonths 가 늘지 않는다).
 *  - 휴학 중: 이탈 추첨(×2)에 걸리면 종료, 아니면 체력·마음 +3, totalMonths +1, month ≥ until 이면 복학(active false). 새 휴학·번아웃 없음.
 *  - 휴학이 아닐 때: 이탈 → 휴학 → 번아웃 순. 이탈이 걸리면 바로 종료한다. 휴학이 시작된 달에는 번아웃 추첨을 하지 않는다.
 *    휴학 기간이 누적 상한을 넘기면 시작하지 않는다. 번아웃은 체력 또는 마음이 문턱 미만일 때만 추첨한다.
 */
export function applyHazards(state: LifeState, data: DataBundle): LifeState {
  const phd = state.phd;
  if (!phd) return state;
  if (draw(state.seed, 'hazard', state.month, 'dropout') < dropoutHazard(state, data)) return dropOut(state);

  if (phd.leave.active) {
    const recovered = addStats(state, ASSUMED.LEAVE_MONTHLY_RECOVERY);
    const leave = { ...phd.leave, active: state.month < phd.leave.until, totalMonths: phd.leave.totalMonths + 1 };
    return { ...recovered, phd: { ...recovered.phd!, leave } };
  }

  if (draw(state.seed, 'hazard', state.month, 'leave') < leaveHazard(state, data)) {
    const months = leaveMonths(state);
    if (canStartLeave(state, months)) return startLeave(state, months, 'hazard');
  }

  const B = ASSUMED.BURNOUT;
  if ((state.stats.health < B.threshold || state.stats.mind < B.threshold)
    && draw(state.seed, 'hazard', state.month, 'burnout') < B.p && canStartLeave(state, B.leaveMonths)) {
    return startLeave(state, B.leaveMonths, 'burnout');
  }
  return state;
}
