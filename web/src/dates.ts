// 월 표기(#129). 게임의 0개월째는 입학 달(2027년 3월)이다(엔진 calendarYear 와 같은 기준).
// 사건 시점은 달력 연월("2030년 3월"), 진행 기간은 경과 기간("3년 4개월").
import { ASSUMED } from '../../engine/src/browser';
import type { Strings } from './strings.ko';

const fill = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? `{${k}}`));

const START_MONTH_OF_YEAR = 3;   // 입학 달 3월

/** 달력 연월: month 개월째 → `YYYY년 M월`. */
export function calendarLabel(month: number, t: Strings): string {
  const m0 = START_MONTH_OF_YEAR - 1 + Math.max(0, Math.round(month));
  const y = ASSUMED.MIN_WAGE_YEAR + Math.floor(m0 / ASSUMED.MONTHS_PER_YEAR);
  return fill(t.dates.calendar, { y, m: (m0 % ASSUMED.MONTHS_PER_YEAR) + 1 });
}

/** 경과 기간: `N년 M개월`, 한 해 안이면 `M개월`, 정확히 N년이면 `N년`. */
export function elapsedLabel(months: number, t: Strings): string {
  const n = Math.max(0, Math.round(months));
  const y = Math.floor(n / ASSUMED.MONTHS_PER_YEAR);
  const m = n % ASSUMED.MONTHS_PER_YEAR;
  if (y === 0) return fill(t.dates.elapsedM, { m });
  return m === 0 ? fill(t.dates.elapsedY, { y }) : fill(t.dates.elapsedYM, { y, m });
}
