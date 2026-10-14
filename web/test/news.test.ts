// 가상 뉴스 텍스트 팩(#58): 종류마다 헤드라인, 창작 표시, 효과 범위가 Wave 3 결정 기록(노동 스펙 §5.3, 0013 §7, 0014 #119) 안.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ASSUMED, advanceMonth, createLife, newSeed, type LifeState } from '../../engine/src/browser';
import { loadData } from '../../engine/src/index';
import { schoolNamePairs } from '../../engine/sim/web-sources';
import { NEWS_TEXT, newsLine, newsTag } from '../src/news';
import { notes } from '../src/play';
import { ko } from '../src/strings.ko';

const root = resolve(__dirname, '../..');
const data = loadData();
const TYPES = ASSUMED.NEWS_TYPES;

/** 노동 스펙 §5.3 표: id → [효과 하한, 상한], [기간 하한, 상한]. */
function specTable(): Map<string, { effect: [number, number]; months: [number, number] }> {
  const md = readFileSync(join(root, 'docs', 'superpowers', 'specs', '2026-10-13-labor-market-news-design.md'), 'utf8');
  const num = (x: string) => Number(x.replace('−', '-').replace('+', ''));
  const out = new Map<string, { effect: [number, number]; months: [number, number] }>();
  for (const line of md.split(/\r?\n/)) {
    const m = /^\| `([a-z-]+)` \|[^|]*\|[^|]*\|[^|]*\| ([−+][0-9.]+) … ([−+][0-9.]+) \| (\d+)–(\d+) \|/.exec(line);
    if (m) out.set(m[1]!, { effect: [num(m[2]!), num(m[3]!)], months: [Number(m[4]), Number(m[5])] });
  }
  return out;
}

describe('news text pack (#58)', () => {
  it('every engine news type has at least one headline, and every item names an engine type', () => {
    const ids = TYPES.map(t => t.id as string);
    for (const id of ids) expect(NEWS_TEXT.filter(x => x.type === id).length, id).toBeGreaterThanOrEqual(1);
    expect(NEWS_TEXT.filter(x => !ids.includes(x.type))).toEqual([]);
    expect(new Set(NEWS_TEXT.map(x => x.id)).size).toBe(NEWS_TEXT.length);
  });

  it('every item is marked creative and has a headline and a body', () => {
    for (const x of NEWS_TEXT) {
      expect(x.creative, x.id).toBe(true);
      expect(x.headline.trim().length, x.id).toBeGreaterThan(0);
      expect(x.body.trim().length, x.id).toBeGreaterThan(0);
    }
  });

  it('no real school names or program brand names in the texts (decision 0004, labor spec §5.4)', () => {
    const banned = [...schoolNamePairs(root).map(([real]) => real), 'BK21', '두뇌한국'];
    const text = NEWS_TEXT.map(x => `${x.headline} ${x.body}`).join('\n');
    expect(banned.filter(b => text.includes(b))).toEqual([]);
  });
});

describe('news effect ranges (#58)', () => {
  const spec = specTable();

  it('the spec table lists all engine news types', () => {
    expect([...spec.keys()].sort()).toEqual(TYPES.map(t => t.id as string).sort());
  });

  it('effect sizes and durations are inside the decision-record ranges: zero out of range', () => {
    const outOfRange: string[] = [];
    for (const t of TYPES) {
      const [eLo, eHi] = t.effect, [mLo, mHi] = t.months;
      const row = spec.get(t.id)!;
      if (eLo < -0.30 || eHi > 0.30 || eLo > eHi || Math.sign(eLo) !== Math.sign(eHi)) outOfRange.push(`${t.id} effect ${eLo}..${eHi} (0013 §7)`);
      if (mLo < 3 || mHi > 12 || mLo > mHi) outOfRange.push(`${t.id} months ${mLo}..${mHi} (0013 §7)`);
      if (eLo !== row.effect[0] || eHi !== row.effect[1]) outOfRange.push(`${t.id} effect differs from 0014 #119 table`);
      if (mLo !== row.months[0] || mHi !== row.months[1]) outOfRange.push(`${t.id} months differ from 0014 #119 table`);
    }
    expect(outOfRange).toEqual([]);
  });

  it('news effects drawn in 8 lives stay inside their type ranges', () => {
    let seen = 0;
    for (let i = 0; i < 8; i++) {
      let s: LifeState = createLife({ auto: true }, newSeed(`news${i}`), data);
      while (s.stage === 'phd' && s.month < 60) {
        s = advanceMonth(s, data);
        for (const n of s.news.filter(x => x.startMonth === s.month)) {
          const t = TYPES.find(x => x.id === n.type)!;
          expect(n.effect).toBeGreaterThanOrEqual(t.effect[0]);
          expect(n.effect).toBeLessThanOrEqual(t.effect[1]);
          const months = n.untilMonth - n.startMonth + 1;
          expect(months).toBeGreaterThanOrEqual(t.months[0]);
          expect(months).toBeLessThanOrEqual(t.months[1]);
          seen += 1;
        }
      }
    }
    expect(seen).toBeGreaterThan(20);
  });
});

describe('news lines in the research notes (#58)', () => {
  it('a live effect shows its drawn size and months; an ended one shows the type range; all are "게임 설정"', () => {
    let s: LifeState = createLife({ auto: true }, newSeed('news-line'), data);
    while (!s.log.some(e => e.textKey.startsWith('news.'))) s = advanceMonth(s, data);
    const e = s.log.find(x => x.textKey.startsWith('news.'))!;
    const live = s.news.find(n => n.startMonth === e.month)!;
    const line = newsLine(e, ko, s);
    expect(line).toContain(`${Math.round(Math.abs(live.effect) * 100)}%`);
    expect(line).toContain(`${live.untilMonth - live.startMonth + 1}개월`);
    expect(line).toContain('게임 설정');
    const t = TYPES.find(x => x.id === live.type)!;
    expect(newsTag(live.type, e.month, undefined, ko)).toContain(`${t.months[0]}~${t.months[1]}개월`);
    const n = notes(s, ko).find(x => x.month === e.month && x.creative && !x.scene)!;
    expect(n.text).toBe(line);
  });
});
