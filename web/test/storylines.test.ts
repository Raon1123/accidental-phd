// 스토리라인(#190): 조건 해석, 같은 seed 같은 비트, 비트 간격, 조건이 깨지면 닫힘(중간 마무리), 한 삶에 한 번, 비트 달에 일상 줄 없음.
import { describe, expect, it } from 'vitest';
import { createLife, type LifeState } from '../../engine/src/browser';
import { loadData } from '../../engine/src/index';
import type { FlavorPick, Tick } from '../src/flavor';
import { halted, nextFlavor, nextStory, notes, setAuto, step } from '../src/play';
import { COMPILED_STORIES, NO_STORY, STORYLINES, cond, gapRange, stepStory, storyText, unknownAtoms, type StoryOpen, type StoryState } from '../src/storylines';
import { ko } from '../src/strings.ko';

const data = loadData();

function run(seed: string, track: string): { s: LifeState; story: StoryState; picks: FlavorPick[]; phd: LifeState } {
  let s = setAuto(createLife({ track } as never, seed, data), data, true);
  let story = NO_STORY;
  let picks: FlavorPick[] = [];
  let phd: LifeState | undefined;
  for (let k = 0; k < 3000 && !halted(s); k++) {
    let n = step(s, data);
    if (n.pending) n = setAuto(n, data, true);
    story = nextStory(s, n, story);
    picks = nextFlavor(s, n, picks, story.lines);
    s = n;
    if (!phd && s.stage === 'phd' && s.month >= 6 && !s.pending) phd = s;
  }
  return { s, story, picks, phd: phd! };
}

// 탐색으로 고른 seed: 인문사회 박사과정 스토리라인 넷과 휴학 끊김(ST-0), 계약 만료(ST-3), 이공 지도교수·첫 논문(ST-23) 등이 나온다.
const lives = ([['ST-0', 'history'], ['ST-3', 'life_science'], ['ST-7', 'ai'], ['ST-10', 'korean_literature'], ['ST-16', 'history'], ['ST-23', 'materials']] as const)
  .map(([seed, track]) => ({ seed, track, ...run(seed, track) }));
const byId = new Map(COMPILED_STORIES.map(c => [c.story.id, c]));

describe('storylines (#190)', () => {
  it('every condition atom in the pack is understood', () => {
    expect(unknownAtoms()).toEqual([]);
  });
  it('a condition with an unknown atom is never true', () => {
    const c = cond('항상 AND 달이 밝은 밤');
    expect(c.unknown).toEqual(['달이 밝은 밤']);
    expect(c.pred({} as Tick)).toBe(false);
  });
  it('the same seed gives the same beats', () => {
    expect(run('ST-10', 'korean_literature').story.lines).toEqual(lives[3]!.story.lines);
  });
  it('the sample lives open several storylines and finish some', () => {
    const opened = new Set(lives.flatMap(l => l.story.done));
    expect(opened.size).toBeGreaterThanOrEqual(8);
    const finished = lives.flatMap(l => l.story.done.filter(id => l.story.lines.some(x => x.id === id && x.kind === 'beat' && x.beat === byId.get(id)!.beats.length - 1)));
    expect(finished.length).toBeGreaterThanOrEqual(4);
  });
  it('each storyline opens at most once a life, one at a time', () => {
    for (const { story } of lives) {
      expect(new Set(story.done).size).toBe(story.done.length);
      // 줄을 달 순서로 보면 한 스토리라인이 닫히기 전에 다른 것이 끼지 않는다
      const order = story.lines.map(l => l.id).filter((id, i, a) => i === 0 || a[i - 1] !== id);
      expect(new Set(order).size).toBe(order.length);
    }
  });
  it('beats come in order, gaps within gap_months (yearly ticks: the first tick inside or after the window start)', () => {
    for (const { s, story } of lives) {
      for (const id of story.done) {
        const ls = story.lines.filter(l => l.id === id);
        ls.forEach((l, i) => expect(l.beat).toBe(i === ls.length - 1 && l.kind !== 'beat' ? l.beat : i));
        for (let i = 1; i < ls.length; i++) {
          if (ls[i]!.kind !== 'beat') continue;
          const [lo, hi] = gapRange(byId.get(id)!.story.beats[i]!.gap_months);
          const gap = ls[i]!.month - ls[i - 1]!.month;
          const yearly = s.career !== undefined && ls[i]!.month > s.career.degreeMonth;
          expect(gap).toBeGreaterThanOrEqual(lo);
          expect(gap).toBeLessThanOrEqual(yearly ? hi + 11 : hi);
        }
      }
    }
  });
  it('nothing follows a break or interrupt line', () => {
    for (const { story } of lives) for (const id of story.done) {
      const ls = story.lines.filter(l => l.id === id);
      const cut = ls.findIndex(l => l.kind !== 'beat');
      if (cut >= 0) expect(cut).toBe(ls.length - 1);
    }
    expect(lives[0]!.story.lines.some(l => l.kind === 'interrupt')).toBe(true);
  });
  it('no daily line in a month with a storyline line; the feed shows them as creative story notes', () => {
    for (const { s, story, picks } of lives) {
      const months = new Set(story.lines.map(l => l.month));
      expect(picks.filter(p => months.has(p.month))).toEqual([]);
      const f = notes(s, ko, picks, story.lines).filter(n => n.kind === 'story');
      expect(f.length).toBe(story.lines.length);
      expect(f.every(n => n.creative && n.text.length > 0)).toBe(true);
    }
  });
  it('a different life drops the old storyline state', () => {
    const { s, story } = lives[0]!;
    expect(nextStory(s, createLife({}, 'ST-Z', data), story)).toEqual(NO_STORY);
  });

  // 직접 만든 칸: 열린 스토리라인 하나를 두고 다음 칸의 결과를 본다.
  const base = lives[3]!.phd;
  const at = (s: LifeState, month: number): LifeState => ({ ...s, month, pending: null });
  const tick = (prev: LifeState, next: LifeState, log: LifeState['log'] = []): Tick => ({ prev, next, log, ledger: [] });
  const open = (id: string, beat: number, last: number, due: number, start: LifeState = base): StoryState =>
    ({ lines: [], done: [id], open: { id, beat, last, due, start, startMonth: last } satisfies StoryOpen });

  it('a leave starting while open closes it with the interrupt line', () => {
    const st = open('story-hs-phd-1', 1, 10, 12);
    const leave = [{ month: 11, textKey: 'leave.start', tags: ['leave', 'voluntary'], creative: false }];
    const out = stepStory(tick(at(base, 11), at(base, 12), leave), st, false);
    expect(out.open).toBeUndefined();
    expect(out.lines).toEqual([{ month: 11, id: 'story-hs-phd-1', beat: 1, kind: 'interrupt' }]);
    expect(storyText(out.lines[0]!)).toBe(STORYLINES.find(x => x.id === 'story-hs-phd-1')!.interrupt!.text);
  });
  it('a false beat condition waits inside the window, then closes quietly when there is no break line', () => {
    const noDuty = { ...base, phd: { ...base.phd!, fundingState: { ...base.phd!.fundingState, dutyHours: 0 } } };
    const st = open('story-hs-phd-1', 1, 10, 11);   // 비트 1: 1~3개월, 조건 dutyHours>0
    const waiting = stepStory(tick(at(noDuty, 11), at(noDuty, 12)), st, false);
    expect(waiting).toBe(st);
    const closed = stepStory(tick(at(noDuty, 13), at(noDuty, 14)), st, false);
    expect(closed.open).toBeUndefined();
    expect(closed.lines).toEqual([]);
  });
  it('a broken beat with a break line closes with it (advisor did not change)', () => {
    const st = open('story-stem-phd-5', 3, 20, 23);   // 비트 3: 3~6개월, 지도교수 유형이 열린 때와 다름
    const out = stepStory(tick(at(base, 26), at(base, 27)), st, false);
    expect(out.lines).toEqual([{ month: 26, id: 'story-stem-phd-5', beat: 3, kind: 'break' }]);
    expect(storyText(out.lines[0]!)).toBe('옮길 연구실을 찾지 못해 기존 연구실 책상이 그대로 남는다.');
  });
  it('break_if decides whether the break line shows', () => {
    const st = open('story-stem-phd-6', 3, 40, 43);   // 비트 3: accepted 면 비트, rejected 면 break, 그 밖이면 조용히
    const paper = base.phd!.papers[0] ?? { id: 'p1', status: 'submitted', writing: 1, quality: 50, attempts: 1, logitBonus: 0 };
    const withPaper = (status: string): LifeState => ({ ...base, phd: { ...base.phd!, papers: [{ ...paper, status } as never] } });
    const o = (status: string): StoryState => ({ ...st, open: { ...st.open!, paper: paper.id, start: withPaper('submitted') } });
    expect(stepStory(tick(at(withPaper('accepted'), 44), at(withPaper('accepted'), 45)), o('accepted'), false).lines[0]!.kind).toBe('beat');
    expect(stepStory(tick(at(withPaper('rejected'), 46), at(withPaper('rejected'), 47)), o('rejected'), false).lines[0]!.kind).toBe('break');
    expect(stepStory(tick(at(withPaper('submitted'), 46), at(withPaper('submitted'), 47)), o('submitted'), false).lines).toEqual([]);
  });
  it('a yearly tick just past the window still shows the beat when the tick before was inside it', () => {
    const career = { ...base, stage: 'career' as const };
    const st = open('story-life-family-retire-3', 2, 100, 112);   // 비트 2: 12~24개월, 조건 stage=career, 창 끝 124
    const out = stepStory(tick(at(career, 120), at(career, 132), [{ month: 132, textKey: 'log.month', tags: [], creative: false }]), st, false);
    expect(out.lines).toEqual([{ month: 132, id: 'story-life-family-retire-3', beat: 2, kind: 'beat' }]);
    const late = stepStory(tick(at(career, 132), at(career, 144), [{ month: 144, textKey: 'log.month', tags: [], creative: false }]), st, false);
    expect(late.lines).toEqual([]);
    expect(late.open).toBeUndefined();
  });
  it('no storyline opens on a tick that stops at a decision or has a scene line', () => {
    const k = tick(at(base, 3), { ...at(base, 4), pending: { dp: 'post-qualifying', month: 4, context: {}, options: [] } });
    expect(stepStory(k, NO_STORY, false)).toBe(NO_STORY);
    expect(stepStory(tick(at(base, 3), at(base, 4)), NO_STORY, true)).toBe(NO_STORY);
  });
});
