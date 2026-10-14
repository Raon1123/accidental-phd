// 학위 없이 박사과정이 끝나도(이탈·재학연한·재정 파탄) 경력 단계로 넘어가 80세까지 이어진다(#85).
import { describe, expect, it } from 'vitest';
import { ASSUMED, advanceMonth, advanceYear, createLife, newSeed } from '../src/browser';
import { loadData } from '../src/index';
import type { LifeState } from '../src/types';

const data = loadData();

function phdOf(seed: string): LifeState {
  let s = createLife({ auto: true }, newSeed(seed), data);
  while (s.stage === 'phd') s = advanceMonth(s, data);
  return s;
}

describe('life continues after a PhD that ends without a degree (#85)', () => {
  const ended = new Map<string, LifeState>();
  for (let i = 0; i < 200 && ended.size < 2; i++) {
    const s = phdOf(`after-phd${i}`);
    const reason = s.end?.reason;
    if ((reason === 'dropout' || reason === 'financial') && !ended.has(reason)) ended.set(reason, s);
  }
  // 재학연한 초과는 자동 생애에서 드물어, 박사과정 중인 생애의 재학 개월을 연한 끝으로 옮겨 만든다
  for (let i = 0; i < 200 && !ended.has('residence'); i++) {
    let s = createLife({ auto: true }, newSeed(`after-phd-res${i}`), data);
    for (let k = 0; k < 6 && s.stage === 'phd'; k++) s = advanceMonth(s, data);
    if (s.stage !== 'phd') continue;
    s = advanceMonth({ ...s, phd: { ...s.phd!, enrolledMonths: ASSUMED.RESIDENCE_MONTHS + ASSUMED.RESIDENCE_EXTENSION } }, data);
    if (s.end?.reason === 'residence') ended.set('residence', s);
  }

  it('all three no-degree endings are found', () => {
    expect([...ended.keys()].sort()).toEqual(['dropout', 'financial', 'residence']);
  });

  for (const reason of ['dropout', 'financial', 'residence'] as const) {
    it(`${reason}: the career stage starts that month, searches outside academia, and the record ends at 80`, () => {
      let s = ended.get(reason)!;
      expect(s.stage).toBe('career');
      expect(s.career).toMatchObject({ degree: 'none', degreeMonth: s.end!.month });
      const academic = ['professor', 'nontenure', 'lecturer', 'postdoc'];
      while (s.stage !== 'end') s = advanceYear(s, data);
      expect(s.end!.reason).toBe('age80');
      expect(s.log.at(-1)!.textKey).toBe('log.end-age80');
      const hires = s.log.filter(e => e.textKey === 'log.hired').map(e => e.tags[2]!);
      expect(hires.filter(r => academic.includes(r))).toEqual([]);
    });
  }
});
