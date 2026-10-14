// 씀씀이(생활비 지출) 모형(사용자 규칙 2026-10-15: "생활비도 사람마다 다르다. 씀씀이를 늘리는 건 쉽지만 줄이는 건 어렵다").
// 사람마다 기본 생활비 = 지역 생활비(0014#60) × 성향 exp(σ·N), 성향은 seed 로 한 번 정해진다.
// 달마다 목표 = 기본 + κ × max(0, 정기 수입 − 기본). 지출은 목표보다 낮으면 빠르게(up), 높으면 천천히(down) 목표로 움직인다(0014#131).
// 목표는 기본 아래로 내려가지 않으므로 지출도 기본 아래로 내려가지 않는다.
import { ASSUMED } from './assumed';
import { drawNormal } from './rng';
import type { LifeState } from './types';

/** 지역 생활비(0014#60): 수도권 학교면 capital, 아니면 regional. 경력·은퇴 단계도 박사과정 학교 지역을 쓴다(0014#123). */
export function regionLiving(s: LifeState): number {
  return (ASSUMED.CAPITAL_SCHOOLS as readonly string[]).includes(s.choices.school) ? ASSUMED.LIVING_COST.capital : ASSUMED.LIVING_COST.regional;
}

/** 이 사람의 기본 생활비: 지역 생활비 × exp(σ·N). seed 의 init 스트림 슬롯 `spending:taste` 하나로 정해진다. */
export function baseLiving(s: LifeState): number {
  const taste = Math.exp(ASSUMED.SPENDING.tasteSigma * drawNormal(s.seed, 'init', 0, 'spending:taste'));
  return Math.round(regionLiving(s) * taste);
}

/** 이번 달에 나갈 생활비: 저장된 지출 수준, 없으면 기본 생활비. */
export function spendingOf(s: LifeState): number {
  return s.money.spending ?? baseLiving(s);
}

/** 이번 달 정기 수입(income)을 받은 뒤의 다음 달 지출 수준. 늘 때는 빠르게, 줄 때는 천천히 목표로 간다. */
export function nextSpending(s: LifeState, income: number): number {
  const P = ASSUMED.SPENDING;
  const base = baseLiving(s);
  const now = spendingOf(s);
  const target = base + P.kappa * Math.max(0, income - base);
  const rate = target > now ? P.up : P.down;
  return Math.round(now + rate * (target - now));
}
