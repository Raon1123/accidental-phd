// 논문 심사 결과 표시(#189, 엔진 기록은 #185): 투고처 계층·종류가 든 문장, 피드 종류, 삶의 정리에는 채택만.
import { describe, expect, it } from 'vitest';
import { createLife, newSeed } from '../../engine/src/browser';
import { loadData } from '../../engine/src/index';
import { noteKind, noteText } from '../src/play';
import { ko } from '../src/strings.ko';
import { lifeSummary } from '../src/view';

const data = loadData();
const entry = (verdict: string, tier: string, venueId: string, month = 20) => ({ month, textKey: `log.paper-${verdict}`, tags: ['p1', tier, venueId, '1'], creative: false });

describe('paper verdict notes (#189)', () => {
  it('the line names the venue tier and kind', () => {
    expect(noteText(entry('accepted', 'T2', 'venues-journal-x'), ko)).toBe('Q2 학술지에 낸 논문이 채택되었습니다.');
    expect(noteText(entry('rejected', 'T1', 'venues-conf-y'), ko)).toBe('Q1 학회에 낸 논문이 거절되었습니다.');
    expect(noteText(entry('revision', '', ''), ko)).toBe('Q4 학술지에 낸 논문에 수정 요구가 왔습니다.');
  });
  it('accepted is an achievement, rejected a failure, revision a plain record', () => {
    expect(noteKind('log.paper-accepted')).toBe('good');
    expect(noteKind('log.paper-rejected')).toBe('bad');
    expect(noteKind('log.paper-revision')).toBe('plain');
  });
  it('the life summary keeps acceptances and leaves out rejections and revisions', () => {
    const s = createLife({ track: 'computer', auto: true }, newSeed('verdict-summary'), data);
    const log = [...s.log, entry('rejected', 'T1', 'venues-journal-x', 20), entry('revision', 'T2', 'venues-journal-x', 26), entry('accepted', 'T2', 'venues-journal-x', 32)];
    const texts = lifeSummary({ ...s, log }, ko).items.map(i => i.text);
    expect(texts).toContain('Q2 학술지에 낸 논문이 채택되었습니다.');
    expect(texts.some(x => x.includes('거절') || x.includes('수정 요구'))).toBe(false);
  });
});
