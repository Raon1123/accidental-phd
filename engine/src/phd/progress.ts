// 진척 공식(선택권 §4.2). Δproject = g_k × U × (0.65 + skill/140) × researchTime × E × A × f × (막힘 0.2).
import { ASSUMED } from '../assumed';
import { durationYears } from '../data/statistics';
import type { DataBundle } from '../data/bundle';
import { draw } from '../rng';
import { odds } from '../odds';
import type { Kedi, LifeState } from '../types';

/** 계열별 기준 진척 g_k = 100 / ((12·T_k − 6) × M̄). T_k 는 학위 소요 기간 레코드(년). */
export function gK(data: DataBundle, kedi: Kedi): number {
  const t = durationYears(data, kedi).value;
  return ASSUMED.PROJECT_MAX / ((ASSUMED.MONTHS_PER_YEAR * t - ASSUMED.G_PREP_MONTHS) * ASSUMED.G_MBAR_INIT);
}

/** 연구 가용 시간 비율. 근로 포커스일 때만 jobHours 가 빠진다. */
export function researchTime(state: LifeState): number {
  const phd = state.phd;
  if (!phd) throw new Error('phd state required');
  const duty = phd.fundingState.dutyHours;
  const job = phd.focus === 'work' ? ASSUMED.JOB_HOURS : 0;
  const course = phd.coursework ? ASSUMED.COURSEWORK_HOURS : 0;
  return Math.max(ASSUMED.RESEARCH_TIME_MIN, (ASSUMED.WORK_WEEK_HOURS - duty - job - course) / ASSUMED.WORK_WEEK_HOURS);
}

/** 막힘 확률: 수학·통계 트랙 0.24, 그 밖 0.16. */
export function blockedProbability(track: string): number {
  const p = (ASSUMED.BLOCKED_MATH_TRACKS as readonly string[]).includes(track) ? ASSUMED.BLOCKED_P_MATH : ASSUMED.BLOCKED_P;
  return odds(p, 0);
}

export interface GainParams {
  g: number; u: number;            // u: 추첨 [0,1)
  skill: number; researchTime: number; health: number;
  support: number; rigor: number; f: number; blocked: boolean;
}

/** 지도교수 진척 배수 A (선택권 §2.6). */
export function advisorA(support: number, rigor: number): number {
  return ASSUMED.ADVISOR_A_BASE + ASSUMED.ADVISOR_A_SUPPORT * support + ASSUMED.ADVISOR_A_RIGOR * rigor;
}

/** 한 달 진척량(순수 함수). 상한 적용 전. */
export function progressGain(p: GainParams): number {
  const noise = ASSUMED.PROGRESS_NOISE_LO + (ASSUMED.PROGRESS_NOISE_HI - ASSUMED.PROGRESS_NOISE_LO) * p.u;
  const skillTerm = ASSUMED.PROGRESS_SKILL_BASE + p.skill / ASSUMED.PROGRESS_SKILL_DIV;
  const e = ASSUMED.HEALTH_EFFICIENCY_BASE + p.health / ASSUMED.HEALTH_EFFICIENCY_DIV;
  return p.g * noise * skillTerm * p.researchTime * e * advisorA(p.support, p.rigor) * p.f * (p.blocked ? ASSUMED.BLOCKED_MULT : 1);
}

/** 막힘 추첨(`progress`/`blocked`)과 진척 잡음(`progress`/`gain`)으로 project 를 올린다. 휴학 중에는 멈춘다. */
export function applyProgress(state: LifeState, data: DataBundle): LifeState {
  const phd = state.phd;
  if (!phd) throw new Error('phd state required');
  if (phd.leave.active) return state;
  const blocked = draw(state.seed, 'progress', state.month, 'blocked') < blockedProbability(state.choices.track);
  const gain = progressGain({
    g: gK(data, state.choices.kedi), u: draw(state.seed, 'progress', state.month, 'gain'),
    skill: state.stats.skill, researchTime: researchTime(state), health: state.stats.health,
    support: phd.advisor.support, rigor: phd.advisor.rigor, f: ASSUMED.FOCUS[phd.focus].f, blocked,
  });
  return { ...state, phd: { ...phd, blocked, project: Math.min(ASSUMED.PROJECT_MAX, phd.project + gain) } };
}
