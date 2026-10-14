// 진행 화면의 DOM 없는 부분(#55): 한 칸 진행, 속도, 자동 모드 전환, 결정 지점 보기, 연구노트, 인생 지도.
// 결정 지점이 걸려 있으면 엔진을 부르지 않는다(step 이 같은 상태를 그대로 돌려준다).
import {
  ASSUMED, advanceMonth, advanceYear, decide, decisionOutcome, describeOptions, policyDecision, previewCareerFlow, previewCashflow,
  type CareerFlow,
  type DataBundle, type Focus, type LifeState, type MonthInput, type PendingDecision,
} from '../../engine/src/browser';
import { newsLine } from './news';
import { decisionResult, logScene, pendingScene } from './scenes';
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
export function step(s: LifeState, data: DataBundle, focus?: Focus, work?: Pick<MonthInput, 'participation' | 'partTime'>): LifeState {
  if (s.pending || s.stage === 'end') return s;
  if (s.stage === 'phd') {
    const base: MonthInput = focus === undefined || (focus === 'thesis' && !s.phd?.qualified) ? {} : { focus };
    return advanceMonth(s, data, { ...base, ...work });
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
  /** 장면 문단(창작, #57). 화면은 창작 표시를 붙인다. */
  scene?: string;
  options: { index: number; key: string; label: string; hint?: string; unavailable?: string }[];
}

/** 결정 지점 화면. 확률 힌트는 백분율만 보여준다(근거 표기는 출처 footer #60 의 몫). */
export function decisionView(s: LifeState, data: DataBundle, t: Strings): DecisionView {
  const p = s.pending;
  if (!p) throw new Error('decisionView: no pending decision');
  const outcome = decisionOutcome(p);
  const prompt = lookup(t.play.prompts, outcome ? `${p.dp}.${outcome}` : p.dp, 'prompt');
  const infos = describeOptions(s, data);
  const scene = pendingScene(s, p)?.text;
  return {
    prompt,
    ...(scene ? { scene } : {}),
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

/** 연구노트 한 줄의 문장. 가상 뉴스(news.*)는 news.ts 의 헤드라인·효과 태그(#58). 모르는 키는 던진다. */
export function noteText(e: LogEntry, t: Strings, s?: LifeState): string {
  if (e.textKey.startsWith('news.')) return newsLine(e, t, s);
  return lookup(t.texts, e.textKey, 'note');
}

/**
 * 연구노트: 최신순. 매달 붙는 'log.month' 는 뺀다(내용이 없는 줄). 창작 줄에는 표시를 붙인다.
 * 서사 장면(#57): 결정 기록 아래에 고른 선택지의 결과 문장을, 채용·학위·종료 같은 기록 아래에 장면을 창작 줄로 붙인다.
 */
export interface Note { month: number; text: string; creative: boolean; scene?: true }
export function notes(s: LifeState, t: Strings): Note[] {
  const groups = s.log.map((e, i): Note[] => {
    if (e.textKey === 'log.month') return [];
    const out: Note[] = [{ month: e.month, text: noteText(e, t, s), creative: e.creative }];
    const extra = e.textKey.startsWith('decision.') ? decisionResult(s.choices.group, e.textKey) : logScene(s, e, i)?.text;
    if (extra) out.push({ month: e.month, text: extra, creative: true, scene: true });
    return out;
  });
  return groups.reverse().flat();
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

// ── 자금 카드(요청 2026-10-14): 들어오는 돈과 나가는 돈을 숫자로 보인다 ──

export interface MoneyView {
  cash: number; debt: number; loanLimit: number;
  /** 박사과정 중에만 있다. 다음 달 정산 예정치(양수 = 크기). */
  flow?: { stipend: number; family: number; living: number; tuition: number; net: number; netWithTuition: number; dutyHours: number; funding: 'scholarship' | 'project' | 'self'; fundingUntil: number };
  /** 경력·은퇴 단계에만 있다(#96). 다음 달 정산 예정치: 급여·연금·은퇴 뒤 연구 수입, 생활비, 이자(부채에 붙음), 상환, 부족분 대출, 월 수지. */
  careerFlow?: CareerFlow & { net: number };
  crisisMonths: number;
}

/** 다음 틱이 정산할 정기 수입·지출과 현재 잔액. 값은 엔진 applyCashflow 와 같은 함수(previewCashflow)에서 온다. */
export function moneyView(s: LifeState, data: DataBundle): MoneyView {
  const base = { cash: s.money.cash, debt: s.money.debt, loanLimit: s.money.loanLimit, crisisMonths: s.phd?.crisisMonths ?? 0 };
  if (s.stage === 'career' || s.stage === 'retired') {
    const f = previewCareerFlow(s);
    return { ...base, careerFlow: { ...f, net: f.pay + f.pension + f.research - f.living - f.repay } };
  }
  if (s.stage !== 'phd' || !s.phd) return base;
  const c = previewCashflow(s, data);
  const net = c.stipend + c.family - c.living;
  const f = s.phd.fundingState;
  return { ...base, flow: { stipend: c.stipend, family: c.family, living: c.living, tuition: c.tuition, net, netWithTuition: net - c.tuition, dutyHours: f.dutyHours, funding: f.route, fundingUntil: f.until } };
}

export interface LedgerRow { month: number; stipend: number; family: number; work: number; living: number; tuition: number; interest: number; loan: number; pay: number; pension: number; repay: number }

/** 월별 계산서: 최근 n개월(원장에 항목이 있는 달만, 최신이 앞). 등록금 열에는 입학금도 넣는다. 이자는 현금이 아니라 부채에 붙는다. */
export function ledgerRows(s: LifeState, n = 12): LedgerRow[] {
  const by = new Map<number, LedgerRow>();
  for (const e of s.ledger) {
    let r = by.get(e.month);
    if (!r) { r = { month: e.month, stipend: 0, family: 0, work: 0, living: 0, tuition: 0, interest: 0, loan: 0, pay: 0, pension: 0, repay: 0 }; by.set(e.month, r); }
    if (e.kind === 'stipend') r.stipend += e.amount;
    else if (e.kind === 'family') r.family += e.amount;
    else if (e.kind === 'living') r.living += e.amount;
    else if (e.kind === 'tuition' || e.kind === 'entrance-fee') r.tuition += e.amount;
    else if (e.kind === 'interest') r.interest += e.amount;
    else if (e.kind === 'loan') r.loan += e.amount;
    else if (e.kind === 'pay') r.pay += e.amount;   // 경력·은퇴 단계 월 정산(#96)
    else if (e.kind === 'pension' || e.kind === 'post-retire-research') r.pension += e.amount;
    else if (e.kind === 'repay') r.repay += e.amount;
    else r.work += e.amount;
  }
  return [...by.values()].sort((a, b) => b.month - a.month).slice(0, n);
}

/** 원 단위 금액을 `1,102.5만 원` 꼴로. 부호는 그대로 둔다(0 은 `0만 원`). */
export function wonText(amount: number, t: Strings): string {
  const man = Math.round(amount / 1000) / 10;
  return t.play.money.won.replace('{n}', man.toLocaleString('ko-KR', { maximumFractionDigits: 1 }));
}
