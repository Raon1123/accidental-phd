// 스토리라인(#190): data/text/storylines.ko.json 의 여러 칸에 걸친 연속 문장을 연구노트에 잇는다.
// 조건은 flavor.ts 의 atom 해석기를 같이 쓴다. 추첨은 화면 쪽 seed(flavor.ts roll)로 하고 엔진 상태를 바꾸지 않는다.
// 진행 상태는 엔진 저장에 넣지 않는다: 일상 문장(#183)처럼 화면이 들고 있고, 보관함 항목의 view 로 같이 저장한다(archive.ts, #195).
// 같은 seed·같은 칸 순서면 같은 비트가 나온다.
import type { LifeState } from '../../engine/src/browser';
import pack from '../../data/text/storylines.ko.json';
import { atom, roll, tickMonth, type Tick } from './flavor';

export interface StoryBeat { text: string; gap_months: string; continue_if: string; break_text?: string; break_if?: string }
export interface Storyline {
  id: string; title: string; group: '인문사회' | '이공' | '공통'; start_when: string;
  interrupt?: { when: string; text: string }; ending: '좋게' | '나쁘게' | '흐지부지'; beats: StoryBeat[]; creative: true;
}
export const STORYLINES: readonly Storyline[] = pack as Storyline[];

/** 연구노트에 붙은 줄 하나. kind: 비트 문장, 비트 조건이 깨져 닫는 문장(break), 휴학으로 끊는 문장(interrupt). */
export interface StoryLine { month: number; id: string; beat: number; kind: 'beat' | 'break' | 'interrupt' }
/**
 * 조건이 열린 때의 상태(`start`)에서 읽는 경로(`열린 때보다 X 증가`, `X 열린 때와 다름`). 열 때 이 경로만 남긴다:
 * 상태 전체는 snapshots 때문에 약 450 KB 라 보관함에 같이 저장할 수 없다(#195). 새 조건이 다른 경로를 읽으면 시험이 실패한다.
 */
export const START_PATHS: readonly string[] = ['phd.project', 'phd.advisor.type'];
/** 상태에서 START_PATHS 만 남긴 사본. 조건 해석기는 경로로만 읽으므로 전체 상태와 같게 읽힌다. */
export function pruneStart(s: LifeState): LifeState {
  const out: Record<string, unknown> = {};
  for (const path of START_PATHS) {
    const keys = path.split('.');
    let from: unknown = s;
    for (const k of keys) from = from === null || from === undefined ? undefined : (from as Record<string, unknown>)[k];
    if (from === undefined) continue;
    let to = out;
    for (const k of keys.slice(0, -1)) to = (to[k] ??= {}) as Record<string, unknown>;
    to[keys[keys.length - 1]!] = from;
  }
  return out as unknown as LifeState;
}

/** 열린 스토리라인: 다음 비트 번호, 앞 비트 달(last)과 다음 비트를 처음 볼 달(due), 열린 때의 상태(START_PATHS 만)·달, 묶인 논문. */
export interface StoryOpen { id: string; beat: number; last: number; due: number; start: LifeState; startMonth: number; paper?: string }
/** done 은 이 삶에서 이미 연 스토리라인(열린 것 포함). 같은 스토리라인은 한 삶에 한 번. */
export interface StoryState { lines: StoryLine[]; open?: StoryOpen; done: string[] }
export const NO_STORY: StoryState = { lines: [], done: [] };

type Pred = (k: Tick) => boolean;
export interface Cond { text: string; pred: Pred; unknown: string[] }

/** `AND` 로 이은 조건 문자열을 술어로. 해석하지 못한 원자는 unknown 에 남기고, 그런 조건은 늘 거짓이다. */
export function cond(text: string): Cond {
  const parts = text.split(' AND ');
  const preds: Pred[] = [];
  const unknown: string[] = [];
  for (const p of parts) { const f = atom(p); if (f) preds.push(f); else unknown.push(p.trim()); }
  return { text, pred: unknown.length ? () => false : k => preds.every(f => f(k)), unknown };
}

interface CompiledBeat { beat: StoryBeat; lo: number; hi: number; when: Cond; breakIf?: Cond }
export interface CompiledStory { story: Storyline; start: Cond; interrupt?: Cond; beats: CompiledBeat[] }

/** `N` 또는 `N-M`(개월). */
export function gapRange(g: string): [number, number] {
  const [lo, hi] = g.split('-').map(Number) as [number, number?];
  return [lo, hi ?? lo];
}

export const COMPILED_STORIES: readonly CompiledStory[] = STORYLINES.map(story => ({
  story,
  start: cond(story.start_when),
  ...(story.interrupt ? { interrupt: cond(story.interrupt.when) } : {}),
  beats: story.beats.map(beat => {
    const [lo, hi] = gapRange(beat.gap_months);
    return { beat, lo, hi, when: cond(beat.continue_if), ...(beat.break_if ? { breakIf: cond(beat.break_if) } : {}) };
  }),
}));
const byId = new Map(COMPILED_STORIES.map(c => [c.story.id, c]));

/** 모든 조건의 해석하지 못한 원자(시험이 0 건으로 고정한다). */
export function unknownAtoms(): string[] {
  return COMPILED_STORIES.flatMap(c => [c.start, c.interrupt, ...c.beats.flatMap(b => [b.when, b.breakIf])]
    .filter((x): x is Cond => x !== undefined && x.unknown.length > 0)
    .map(x => `${c.story.id}: ${x.unknown.join(' | ')}`));
}

/** 다음 비트를 볼 달: 앞 비트 달 + gap_months 범위 안의 화면 쪽 추첨. */
export function dueMonth(seed: string, id: string, beat: number, from: number): number {
  const b = byId.get(id)!.beats[beat]!;
  return from + b.lo + Math.floor(roll(seed, from, `story:${id}:${beat}`) * (b.hi - b.lo + 1));
}

/** 스토리라인에 묶는 논문: 그 칸에 상태가 바뀐 논문, 없으면 투고한 적 있는 첫 논문. */
function bindPaper(k: Tick): string | undefined {
  const papers = k.next.phd?.papers ?? [];
  const changed = papers.find(p => k.prev.phd?.papers.find(x => x.id === p.id)?.status !== p.status);
  return (changed ?? papers.find(p => p.attempts >= 1))?.id;
}

const groupOk = (s: Storyline, g: LifeState['choices']['group']): boolean => s.group === '공통' || s.group === g;
const ctxOf = (k: Tick, o: Pick<StoryOpen, 'start' | 'startMonth' | 'paper'>): Tick =>
  ({ ...k, start: o.start, startMonth: o.startMonth, ...(o.paper !== undefined ? { paper: o.paper } : {}) });

/**
 * 한 칸을 진행한 뒤의 스토리라인 상태. 한 칸에 많아야 한 줄을 더한다.
 * - 결정 지점에서 멈춘 칸은 건너뛴다(볼 달이 지난 비트는 다음 칸에 본다).
 * - 열린 것이 있으면: 휴학 시작이면 interrupt 문장으로 닫는다. due 부터 비트 조건을 보고, 참이면 비트를 붙인다(마지막이면 닫는다).
 *   거짓이면 gap_months 의 끝(last + 최대 간격)까지 기다리고, 그때도 거짓이면 break_if(없으면 참)가 맞을 때 break_text 를 붙이고 닫는다.
 *   그래서 비트 간격은 gap_months 안이다. 해 단위 칸(경력·은퇴)이면 창이 끝난 뒤 첫 칸까지 본다(앞 칸이 창 안이었을 때). 삶이 끝난 칸에서는 기다리지 않고 break 만 본다.
 * - 열린 것이 없으면: 장면 문장이 붙는 칸이 아니고 삶이 끝나지 않았을 때, 아직 열지 않은 스토리라인 가운데 시작 조건과 첫 비트 조건이
 *   맞는 것 하나를 추첨으로 열고 첫 비트를 붙인다.
 */
export function stepStory(k: Tick, st: StoryState, hasScene: boolean): StoryState {
  const s = k.next;
  if (s.pending || s.stage === 'pre') return st;
  const month = tickMonth(k);
  const ended = s.stage === 'end';
  const add = (line: StoryLine, open?: StoryOpen): StoryState => ({ lines: [...st.lines, line], done: st.done, ...(open ? { open } : {}) });
  if (st.open) {
    const o = st.open;
    const c = byId.get(o.id);
    if (!c) return { lines: st.lines, done: st.done };   // 팩에서 사라진 스토리라인
    const ctx = ctxOf(k, o);
    if (c.interrupt?.pred(ctx)) return add({ month, id: o.id, beat: o.beat, kind: 'interrupt' });
    if (month < o.due && !ended) return st;
    const b = c.beats[o.beat]!;
    // 해 단위 칸(경력·은퇴)은 창을 건너뛸 수 있다: 앞 칸이 창 안이었으면 창 뒤 첫 칸도 본다
    const inWindow = month <= o.last + b.hi || k.prev.month < o.last + b.hi;
    if (month >= o.due && inWindow && b.when.pred(ctx)) {
      const line: StoryLine = { month, id: o.id, beat: o.beat, kind: 'beat' };
      const next = o.beat + 1;
      if (next >= c.beats.length || ended) return add(line);
      return add(line, { ...o, beat: next, last: month, due: dueMonth(s.seed, o.id, next, month) });
    }
    if (!ended && month < o.last + b.hi) return st;   // 창 안: 다음 칸에 다시 본다
    const brk = b.beat.break_text !== undefined && (b.breakIf ? b.breakIf.pred(ctx) : !b.when.pred(ctx));
    return brk ? add({ month, id: o.id, beat: o.beat, kind: 'break' }) : { lines: st.lines, done: st.done };
  }
  if (ended || hasScene) return st;
  const cands: { c: CompiledStory; o: StoryOpen }[] = [];
  for (const c of COMPILED_STORIES) {
    if (st.done.includes(c.story.id) || !groupOk(c.story, s.choices.group)) continue;
    const paper = bindPaper(k);
    const o: StoryOpen = { id: c.story.id, beat: 0, last: month, due: month, start: pruneStart(s), startMonth: month, ...(paper !== undefined ? { paper } : {}) };
    const ctx = ctxOf(k, o);
    if (c.start.pred(ctx) && c.beats[0]!.when.pred(ctx)) cands.push({ c, o });
  }
  if (cands.length === 0) return st;
  const { c, o } = cands[Math.floor(roll(s.seed, month, 'story-open') * cands.length)]!;
  return {
    lines: [...st.lines, { month, id: o.id, beat: 0, kind: 'beat' }],
    done: [...st.done, o.id],
    open: { ...o, beat: 1, last: month, due: dueMonth(s.seed, o.id, 1, month) },
  };
}

/** 줄의 문장. 팩에서 사라진 id 면 undefined. */
export function storyText(l: StoryLine): string | undefined {
  const s = byId.get(l.id)?.story;
  if (!s) return undefined;
  if (l.kind === 'interrupt') return s.interrupt?.text;
  return l.kind === 'break' ? s.beats[l.beat]?.break_text : s.beats[l.beat]?.text;
}
