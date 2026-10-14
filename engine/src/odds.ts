import { ASSUMED } from './assumed';

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

/** 능력치 0–100 을 −1…+1 로 옮긴다(상태 §4). 평균 능력치는 0이라 기준 확률을 그대로 받는다. */
export function z(x: number): number {
  return (x - ASSUMED.STAT_NEUTRAL) / ASSUMED.Z_SCALE;
}

export function sigmoid(t: number): number {
  return 1 / (1 + Math.exp(-t));
}

export function logit(p: number): number {
  return Math.log(p / (1 - p));
}

/**
 * 모든 확률의 공통 함수(상태 §4). `terms` 는 Σ βᵢ·zᵢ + Σ γⱼ·wⱼ 를 호출하는 쪽이 합쳐서 넘긴 로짓 보정이다.
 * 결과는 [lo, hi] 로 잘려 0 이나 1 이 되지 않는다(결정 기록 0005).
 */
export function odds(p0: number, terms: number, lo: number = ASSUMED.ODDS_LO, hi: number = ASSUMED.ODDS_HI): number {
  return clamp(sigmoid(logit(p0) + terms), lo, hi);
}

/** 연 비율을 월 위험률로 바꾼다: 1 − (1 − r)^(1/12). */
export function hazardMonth(rYear: number): number {
  return 1 - Math.pow(1 - rYear, 1 / ASSUMED.MONTHS_PER_YEAR);
}
