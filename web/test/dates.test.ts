// 월 표기(#129): 달력 연월과 경과 기간, 삶의 정리.
import { describe, expect, it } from 'vitest';
import { createLife, newSeed } from '../../engine/src/browser';
import { loadData } from '../../engine/src/index';
import { calendarLabel, elapsedLabel } from '../src/dates';
import { ko } from '../src/strings.ko';
import { lifeSummary } from '../src/view';

const data = loadData();

describe('month labels (#129)', () => {
  it('calendar: month 0 is 2027-03 and years roll over after December', () => {
    expect(calendarLabel(0, ko)).toBe('2027년 3월');
    expect(calendarLabel(9, ko)).toBe('2027년 12월');
    expect(calendarLabel(10, ko)).toBe('2028년 1월');
    expect(calendarLabel(36, ko)).toBe('2030년 3월');
  });
  it('elapsed: months only under a year, years with the remainder otherwise', () => {
    expect(elapsedLabel(0, ko)).toBe('0개월');
    expect(elapsedLabel(5, ko)).toBe('5개월');
    expect(elapsedLabel(12, ko)).toBe('1년');
    expect(elapsedLabel(40, ko)).toBe('3년 4개월');
  });
});

describe('life summary (#129)', () => {
  it('lists main events in time order with calendar dates, without news or scenes', () => {
    const s = createLife({ track: 'computer', auto: true }, newSeed('summary'), data);
    const log = [
      ...s.log,
      { month: 30, textKey: 'log.qual-pass', tags: [], creative: false },
      { month: 12, textKey: 'log.month', tags: [], creative: false },
      { month: 70, textKey: 'log.degree', tags: [], creative: false },
    ];
    const v = lifeSummary({ ...s, log, stage: 'end' as const, end: { reason: 'degree' as const, month: 70 } }, ko);
    const whens = v.items.map(i => i.when);
    expect(whens).toEqual([...whens].sort((a, b) => {
      const key = (w: string) => { const m = /(\d+)년 (\d+)월/.exec(w)!; return Number(m[1]) * 12 + Number(m[2]); };
      return key(a) - key(b);
    }));
    expect(v.items.some(i => i.text.length > 0)).toBe(true);
    expect(v.span).toContain('2027년 3월');
    expect(v.items.map(i => i.when)).toContain('2029년 9월');   // 30개월째 자격시험 합격
    expect(v.items.length).toBeGreaterThanOrEqual(2);
  });
});
