// 진행 화면의 DOM 없는 부분(#55): 한 칸 진행, 속도, 자동 모드 전환, 결정 지점 보기, 연구노트, 인생 지도.
// 결정 지점이 걸려 있으면 엔진을 부르지 않는다(step 이 같은 상태를 그대로 돌려준다).
import {
  ASSUMED, advanceMonth, advanceYear, decide, decisionOutcome, describeOptions, policyDecision,
  type DataBundle, type Focus, type LifeState, type MonthInput, type PendingDecision,
} from '../../engine/src/browser';
import type { Strings } from './strings.ko';

/** 속도 5단계(1×~16×). 1× 는 한 칸에 BASE_MS. */
export const SPEEDS = [1, 2, 4, 8, 16] as const;
export type Speed = (typeof SPEEDS)[number];
export const BASE_MS = 800;
export const intervalMs = (speed: Speed): number => BASE_MS / speed;

export const FOCUSES: readonly Focus[] = ['research', 'write', 'network', 'work', 'rest', 'thesis'];

/**
 * 한 칸 진행: 박사과정은 한 달, 경력·은퇴는 한 해. 결정 지점이 걸려 있거나 기록이 끝났으면 입력을 그대로 돌려준다
 * (엔진은 늘 새 객체를 돌려주므로, 같은 참조는 엔진을 부르지 않았다는 뜻이다).
 */
export function step(s: LifeState, data: DataBundle, focus?: Focus): LifeState {
  if (s.pending || s.stage === 'end') return s;
  if (s.stage === 'phd') {
    const input: MonthInput = focus === undefined || (focus === 'thesis' && !s.phd?.qualified) ? {} : { focus };
    return advanceMonth(s, data, input);
  }
  if (s.stage === 'career' || s.stage === 'retired') return advanceYear(s, data);
  return s;
}

/** 진행이 멈춰야 하는가(결정 지점 또는 기록 끝). */
export const halted = (s: LifeState): boolean => s.pending !== null || s.stage === 'end';

/** 자동 모드를 켜고 끈다. 켤 때 결정 지점이 열려 있으면 정책으로 바로 닫는다(엔진은 자기 틱 안에서 연 결정만 닫는다). */
export function setAuto(s: LifeState, data: DataBundle, on: boolean): LifeState {
  let next: LifeState = { ...s, auto: on };
  if (on && next.pending) next = decide(next, data, policyDecision(next, data, next.pending), true);
  return next;
}

/** 결정 선택지·기록의 문자열 키. decide 의 기록 키와 같은 규칙: `decision.<지점>[.<결과>].<선택지>`. */
export function optionKey(p: PendingDecision, key: string): string {
  const outcome = decisionOutcome(p);
  return `decision.${p.dp}${outcome ? `.${outcome}` : ''}.${key}`;
}

function lookup(table: Readonly<Record<string, string>>, key: string, what: string): string {
  const v = Object.hasOwn(table, key) ? table[key] : undefined;
  if (v === undefined) throw new Error(`no ${what} text for ${key}`);
  return v;
}

export interface DecisionView {
  prompt: string;
  options: { index: number; key: string; label: string; hint?: string; unavailable?: string }[];
}

/** 결정 지점 화면. 확률 힌트는 백분율만 보여준다(근거 표기는 출처 footer #60 의 몫). */
export function decisionView(s: LifeState, data: DataBundle, t: Strings): DecisionView {
  const p = s.pending;
  if (!p) throw new Error('decisionView: no pending decision');
  const outcome = decisionOutcome(p);
  const prompt = lookup(t.play.prompts, outcome ? `${p.dp}.${outcome}` : p.dp, 'prompt');
  const infos = describeOptions(s, data);
  return {
    prompt,
    options: p.options.map((o, index) => {
      const info = infos[index]!;
      const view: DecisionView['options'][number] = { index, key: o.key, label: lookup(t.texts, optionKey(p, o.key), 'option') };
      if (info.probabilityHint && !info.unavailable) view.hint = `${t.play.hint} ${Math.round(info.probabilityHint.p * 100)}%`;
      if (info.unavailable) view.unavailable = lookup(t.play.unavailable, info.unavailable, 'unavailable');
      return view;
    }),
  };
}

type LogEntry = LifeState['log'][number];

/** 연구노트 한 줄의 문장. 가상 뉴스(news.*)는 헤드라인 팩(#58)이 생기기 전까지 자리표시 문장을 쓴다. 모르는 키는 던진다. */
export function noteText(e: LogEntry, t: Strings): string {
  if (e.textKey.startsWith('news.')) return t.play.newsPlaceholder;
  return lookup(t.texts, e.textKey, 'note');
}

/** 연구노트: 최신순. 매달 붙는 'log.month' 는 뺀다(내용이 없는 줄). 창작 줄에는 표시를 붙인다. */
export function notes(s: LifeState, t: Strings): { month: number; text: string; creative: boolean }[] {
  return s.log
    .filter(e => e.textKey !== 'log.month')
    .map(e => ({ month: e.month, text: noteText(e, t), creative: e.creative }))
    .reverse();
}

/** 인생 지도 칸 수: 박사과정 1칸 = 1개월, 경력과 은퇴 1칸 = 1년. */
export function lifeMap(s: LifeState): { phdMonths: number; careerYears: number } {
  if (!s.career) return { phdMonths: s.month, careerYears: 0 };
  const degree = s.career.degreeMonth;
  return { phdMonths: degree, careerYears: Math.floor((s.month - degree) / ASSUMED.MONTHS_PER_YEAR) };
}

const pct = (x: number): string => String(x);
const weights = (w: Readonly<Record<string, number>>, t: Strings): string =>
  Object.entries(w).map(([f, p]) => `${t.play.focusNames[f as Focus]} ${pct(p)}`).join(', ');

/** 자동 모드 규칙 문장. 숫자는 엔진 상수(ASSUMED.POLICY)에서 채운다. */
export function autoRuleText(t: Strings): string {
  const P = ASSUMED.POLICY;
  return t.play.autoRule
    .replace('{rest}', String(P.restThreshold))
    .replace('{writeP}', pct(P.writeP))
    .replace('{post}', weights(P.postQualFocus, t))
    .replace('{job}', weights(P.jobSearchFocus, t));
}
