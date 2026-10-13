// 엔진 공용 헬퍼. 추첨 값 u 는 draw()가 낸 [0,1) 난수다.

/**
 * 가중치 표에서 하나를 고른다. 주어진 키 순서대로 누적해 u·합계가 처음 넘는 키를 낸다(결정론).
 * 가중치 0 이하인 키는 절대 나오지 않는다. 양의 가중치가 하나도 없으면 예외.
 */
export function pickWeighted(u: number, weights: Record<string, number>): string {
  const keys = Object.keys(weights).filter(k => weights[k]! > 0);
  if (keys.length === 0) throw new Error('pickWeighted: no positive weight');
  let total = 0;
  for (const k of keys) total += weights[k]!;
  const target = u * total;
  let acc = 0;
  for (const k of keys) {
    acc += weights[k]!;
    if (target < acc) return k;
  }
  return keys[keys.length - 1]!;   // 부동소수점 오차로 target 이 합계에 닿은 경우
}

/** 균등하게 하나를 고른다. 빈 목록이면 예외. */
export function pickUniform<T extends string>(u: number, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pickUniform: empty list');
  return items[Math.min(items.length - 1, Math.floor(u * items.length))]!;
}
