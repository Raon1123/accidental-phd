// 무작위 일상 문장(#183, #124 잔여): data/text/flavor.ko.json 의 줄 가운데 한 칸에 맞는 하나를 고른다.
// 규칙은 docs/design/brainstorm-random-lines.md §3. 추첨은 화면 쪽 seed(저장 seed + `flavor`)로 하고 엔진 상태를 바꾸지 않는다.
// 줄은 그 칸을 진행한 순간의 상태로 고른다(나중 상태로 지난 달 문장이 바뀌지 않게). 고른 줄은 화면이 들고 있다가 notes() 에 넘긴다.
import type { LifeState } from '../../engine/src/browser';
import pack from '../../data/text/flavor.ko.json';

export interface FlavorLine { id: string; category: string; stage: 'phd' | 'career' | 'retired' | 'all'; text: string; tags: string[]; field?: string; when?: string; creative: true }
export const FLAVOR: readonly FlavorLine[] = pack as FlavorLine[];

/** 고른 줄 하나: 그 칸의 달(연구노트 줄과 같은 달)과 줄 id. */
export interface FlavorPick { month: number; id: string }

type LogEntry = LifeState['log'][number];
type LedgerEntry = LifeState['ledger'][number];
/**
 * 한 칸: 진행 전 상태, 진행 뒤 상태, 그 칸에 새로 생긴 기록·원장 줄.
 * 스토리라인(#190)은 열린 때의 상태(`start`)·연구노트 달(`startMonth`)과 묶인 논문 id(`paper`)를 더 넘긴다. 일상 문장은 넘기지 않는다.
 */
export interface Tick { prev: LifeState; next: LifeState; log: readonly LogEntry[]; ledger: readonly LedgerEntry[]; start?: LifeState; startMonth?: number; paper?: string }
type Pred = (k: Tick) => boolean;

// 같은 줄의 재등장 간격(brainstorm-random-lines.md §3): 박사과정 30개월, 그 밖 48개월. 줄의 조건에 "재등장 간격 N개월"이 있으면 그 값.
// 화면 전용 값이라 결정 기록 0014(엔진 결과를 바꾸는 가정 값)에 올리지 않는다(엔진 세션과 합의 2026-10-16).
export const GAP_PHD = 30;
export const GAP_OTHER = 48;
// 칸마다 문장이 붙을 확률. 규칙만으로는 거의 매달 붙으므로 둔다. 목표: 박사과정 중 서너 달에 한 줄(§3).
export const P_PHD = 0.3;
export const P_OTHER = 0.5;
/** 태그 감쇠에 쓰는 최근 줄 수(§3: 최근 4줄 중 같은 첫 태그 수). */
export const RECENT = 4;
// "상위 구간"·"하위 구간"(능력치 0~100).
const HIGH = 65;
const LOW = 35;

const ACADEMIC = new Set(['professor', 'nontenure', 'lecturer', 'postdoc', 'institute']);

/** 조건 경로 `a.b.c` 를 상태에서 읽는다(`phd.focus`, `career.route`, `choices.track` …). */
function read(s: LifeState, path: string): unknown {
  let v: unknown = s;
  for (const p of path.split('.')) v = v === null || v === undefined ? undefined : (v as Record<string, unknown>)[p];
  return v;
}

/** 조건 경로의 값. `paper.` 으로 시작하면 스토리라인에 묶인 논문(#190), 아니면 진행 뒤 상태. */
function val(k: Tick, path: string): unknown {
  if (!path.startsWith('paper.')) return read(k.next, path);
  const p = k.next.phd?.papers.find(x => x.id === k.paper);
  return p === undefined ? undefined : read(p as unknown as LifeState, path.slice('paper.'.length));
}
/** 스토리라인이 열린 달부터의 기록에 키가 있는가. 열린 때가 없으면(일상 문장) 거짓. */
const sinceStart = (k: Tick, test: (e: LogEntry) => boolean): boolean =>
  k.startMonth !== undefined && k.next.log.some(e => e.month >= k.startMonth! && test(e));
const logHas = (k: Tick, re: RegExp): boolean => k.log.some(e => re.test(e.textKey));
const hired = (k: Tick, route?: string): boolean => k.log.some(e => e.textKey === 'log.hired' && (route === undefined || e.tags[2] === route));
/** `log.x`·`decision.x.*` 꼴 키를 정규식으로. `*` 는 아무 꼬리. */
const keyRe = (key: string): RegExp => new RegExp(`^${key.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`);

/**
 * 문장형 원자 표. 형식 원자(`a.b=v`, `a.b>N` …)로 읽히지 않는 것만 여기 둔다.
 * 해석하지 못한 원자가 하나라도 있는 줄은 나오지 않는다(시험이 그런 줄 수를 0 으로 고정한다).
 */
const PHRASES: readonly [RegExp, (m: RegExpExecArray) => Pred][] = [
  [/^그 [달해] 기록 log\.hired\((\w+)\)$/, m => k => hired(k, m[1])],
  [/^그 해 기록 decision\.career-10y\.D 또는 log\.hired\(startup\)$/, () => k => logHas(k, /^decision\.career-10y\.D$/) || hired(k, 'startup')],
  [/^그 달 기록 decision\.funding-expiry\.\*\(cause=(\w[\w-]*)\)$/, m => k => k.log.some(e => e.textKey.startsWith('decision.funding-expiry.') && e.tags[3] === m[1])],
  [/^그 달 기록 decision\.funding-expiry\.([A-D]) \(휴학 시작\)$/, m => k => logHas(k, keyRe(`decision.funding-expiry.${m[1]}`))],
  [/^그 [달해] 기록 ((?:log|decision)\.[\w.*-]+)$/, m => k => logHas(k, keyRe(m[1]!))],
  [/^decisions에 (decision\.[\w.-]+)$/, m => k => k.next.log.some(e => e.textKey === m[1])],
  [/^ledger에 ([\w-]+)(?: \(.*\))?$/, m => k => k.ledger.some(e => e.kind === m[1])],
  [/^ledger에 ([\w-]+)가 있는 달$/, m => k => k.ledger.some(e => e.kind === m[1])],
  [/^leave\.start가 있는 달$/, () => k => logHas(k, /^leave\.start$/)],
  [/^month (\d+)~(\d+)$/, m => k => k.prev.month >= Number(m[1]) && k.prev.month <= Number(m[2])],
  [/^month%(\d+) in \{([\d,]+)\}\(.*\)$/, m => k => m[2]!.split(',').map(Number).includes(k.prev.month % Number(m[1]))],
  [/^month%(\d+)==(\d+)\(.*\)$/, m => k => k.prev.month % Number(m[1]) === Number(m[2])],
  [/^ageMonths>=(\d+)\(\d+세\)$/, m => k => k.next.ageMonths >= Number(m[1])],
  [/^([\w.]+) 상위 구간$/, m => k => { const x = read(k.next, m[1]!); return typeof x === 'number' && x >= HIGH; }],
  [/^([\w.]+) 하위 구간$/, m => k => { const x = read(k.next, m[1]!); return typeof x === 'number' && x <= LOW; }],
  [/^phd\.advisor\.type 그대로$/, () => k => k.prev.phd?.advisor.type === k.next.phd?.advisor.type],
  [/^phd\.advisor\.type이 바뀐 뒤 첫 달$/, () => k => k.prev.phd !== undefined && k.prev.phd.advisor.type !== k.next.phd?.advisor.type],
  [/^phd\.partTime\.kind가 (\w+)로 바뀐 달$/, m => k => k.next.phd?.partTime?.kind === m[1] && k.prev.phd?.partTime?.kind !== m[1]],
  [/^phd\.papers\[\] 중 하나가 draft에서 submitted로 바뀐 달$/, () => k => (k.next.phd?.papers ?? []).some(p => p.status === 'submitted' && k.prev.phd?.papers.find(x => x.id === p.id)?.status === 'draft')],
  [/^phd\.papers\[\]에 status=submitted가 몇 달째 유지$/, () => k => (k.next.phd?.papers ?? []).some(p => p.status === 'submitted' && p.submittedMonth !== undefined && k.next.month - p.submittedMonth >= 3)],
  [/^career\.careerPapers가 늘어난 해$/, () => k => (k.next.career?.careerPapers ?? 0) > (k.prev.career?.careerPapers ?? 0)],
  [/^career\.contractUntil (\d+)개월 이내$/, m => k => k.next.career?.contractUntil !== undefined && k.next.career.contractUntil - k.next.month <= Number(m[1])],
  [/^career\.yearsInRoute (\d+)~(\d+)$/, m => k => { const y = k.next.career?.yearsInRoute ?? -1; return y >= Number(m[1]) && y <= Number(m[2]); }],
  [/^career\.searching 있음$/, () => k => k.next.career?.searching !== undefined],
  [/^career\.searching\.routes에 학계 경로$/, () => k => (k.next.career?.searching?.routes ?? []).some(r => ACADEMIC.has(r))],
  [/^career\.searching\.routes에 (\w+)$/, m => k => (k.next.career?.searching?.routes ?? []).some(r => r === m[1])],
  [/^news\.([\w-]+) 유효$/, m => k => k.next.news.some(n => n.type === m[1])],
  [/^대출 한도 소진$/, () => k => k.next.money.loanLimit > 0 && k.next.money.debt >= k.next.money.loanLimit],
  // 스토리라인(#190) 조건. `열린` 이 붙은 것은 열린 때의 상태가 있어야 참이 될 수 있다.
  [/^항상$/, () => () => true],
  [/^그 달 기록 leave\.start(?:\((\w+)\))?$/, m => k => k.log.some(e => e.textKey === 'leave.start' && (m[1] === undefined || e.tags[1] === m[1]))],
  [/^기록에 ((?:log|decision)\.[\w.*-]+)( 없음)?$/, m => { const re = keyRe(m[1]!); return k => k.next.log.some(e => re.test(e.textKey)) !== (m[2] !== undefined); }],
  [/^열린 뒤 기록 log\.hired(?:\((\w+)\))?$/, m => k => sinceStart(k, e => e.textKey === 'log.hired' && (m[1] === undefined || e.tags[2] === m[1]))],
  [/^열린 뒤 기록 ((?:log|decision)\.[\w.*-]+)$/, m => { const re = keyRe(m[1]!); return k => sinceStart(k, e => re.test(e.textKey)); }],
  [/^열린 때보다 ([\w.]+) 증가$/, m => k => { if (!k.start) return false; const a = read(k.start, m[1]!), b = read(k.next, m[1]!); return typeof a === 'number' && typeof b === 'number' && b > a; }],
  [/^([\w.]+) 열린 때와 다름$/, m => k => k.start !== undefined && read(k.start, m[1]!) !== read(k.next, m[1]!)],
  [/^열린 뒤 학기 경계를 지남$/, () => k => k.startMonth !== undefined && Math.floor(k.next.month / 6) > Math.floor(k.startMonth / 6)],
  [/^구직 (\d+)년 이상$/, m => k => k.next.career?.searching !== undefined && k.next.month - k.next.career.searching.since >= 12 * Number(m[1])],
  [/^phd\.graduationMonth (\d+)개월 이내$/, m => k => { const g = k.next.phd?.graduationMonth; return g !== undefined && g - k.next.month <= Number(m[1]); }],
  [/^career\.postRetireResearchUntil 이전$/, () => k => { const u = k.next.career?.postRetireResearchUntil; return u !== undefined && k.next.month < u; }],
  [/^학위 취득 뒤 첫해$/, () => k => k.next.career?.degree === 'phd' && k.next.month - k.next.career.degreeMonth <= 12],
];

const num = (v: string): number | undefined => (/^-?\d+(\.\d+)?$/.test(v) ? Number(v) : undefined);
const same = (x: unknown, v: string): boolean => (typeof x === 'boolean' || typeof x === 'number' ? String(x) === v : x === v);

/** 원자 하나를 술어로. 읽지 못하면 undefined. `stage=` 와 `month` 는 칸을 진행하기 전 달·단계 기준(그 칸의 기록과 같은 달). */
export function atom(a: string): Pred | undefined {
  a = a.trim();
  const or = a.split(' OR ');
  if (or.length > 1) {
    const ps = or.map(atom);
    return ps.every(Boolean) ? k => ps.some(p => p!(k)) : undefined;
  }
  if (a.startsWith('NOT ')) { const p = atom(a.slice(4)); return p ? k => !p(k) : undefined; }
  for (const [re, make] of PHRASES) { const m = re.exec(a); if (m) return make(m); }
  let m = /^stage=(\w+)$/.exec(a);
  if (m) return k => k.next.stage === m![1];
  m = /^month(>=|<=)(\d+)$/.exec(a);
  if (m) { const n = Number(m[2]); return m[1] === '>=' ? k => k.prev.month >= n : k => k.prev.month <= n; }
  m = /^([a-z][\w.]*) in \{([^}]*)\}$/i.exec(a);
  if (m) { const vs = m[2]!.split(',').map(x => x.trim()); const path = m[1]!; return k => vs.some(v => same(val(k, path), v)); }
  m = /^([a-z][\w.]*)(>=|<=|>|<|=)([^\s]+)$/i.exec(a);
  if (m) {
    const [, path, op, v] = m as unknown as [string, string, string, string];
    const n = num(v);
    if (op === '=') return k => same(val(k, path), v);
    if (n === undefined) return undefined;
    return k => {
      const x = val(k, path);
      if (typeof x !== 'number') return false;
      return op === '>' ? x > n : op === '<' ? x < n : op === '>=' ? x >= n : x <= n;
    };
  }
  return undefined;
}

const GAP_RE = /\s*\(재등장 간격 (\d+)개월\)/;
const GENERIC = /^(stage=|month>=)/;

export interface Compiled { line: FlavorLine; pred: Pred; gap?: number; specific: number; unknown: string[] }

/** 줄의 조건을 술어로. `when` 이 없으면 단계와 최소 3개월째(§2 생활 범주)만 본다. */
export function compile(line: FlavorLine): Compiled {
  if (!line.when) return { line, pred: k => k.prev.month >= 3, specific: 0, unknown: [] };
  const g = GAP_RE.exec(line.when);
  const parts = line.when.replace(GAP_RE, '').split(' AND ');
  const preds: Pred[] = [];
  const unknown: string[] = [];
  for (const p of parts) { const f = atom(p); if (f) preds.push(f); else unknown.push(p); }
  return { line, pred: k => preds.every(f => f(k)), ...(g ? { gap: Number(g[1]) } : {}), specific: parts.filter(p => !GENERIC.test(p.trim())).length, unknown };
}

export const COMPILED: readonly Compiled[] = FLAVOR.map(compile);

// 화면 쪽 추첨: FNV-1a 해시 → [0, 1). 엔진 rng 와 섞지 않는다.
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
export const roll = (seed: string, month: number, slot: string): number => hash(`${seed}|flavor|${month}|${slot}`) / 2 ** 32;

/** 그 칸의 연구노트 달: 새 기록 줄의 마지막 달(없으면 진행 전 달). */
export const tickMonth = (k: Tick): number => (k.log.length ? k.log[k.log.length - 1]!.month : k.prev.month);

/** 후보 가중치: (1 + 구체 조건 수) / (1 + 2 × 최근 줄 중 같은 첫 태그 수). */
export const weight = (c: Pick<Compiled, 'line' | 'specific'>, recentTags: readonly (string | undefined)[]): number =>
  (1 + c.specific) / (1 + 2 * recentTags.filter(t => t === c.line.tags[0]).length);

const stageOk = (line: FlavorLine, stage: LifeState['stage']): boolean =>
  line.stage === 'all' ? stage === 'phd' || stage === 'career' || stage === 'retired' : line.stage === stage;

/**
 * 한 칸에 붙일 줄. 붙이지 않으면 null.
 * - 결정 지점에서 멈춘 칸, 기록이 끝난 칸, 장면 문장이 붙는 칸(hasScene), 이미 줄이 있는 달은 붙이지 않는다.
 * - 칸마다 P_PHD / P_OTHER 확률로만 붙는다.
 * - 후보: 단계·분야·조건이 맞고 재등장 간격이 지난 줄. 가중치 = (1 + 구체 조건 수) / (1 + 2 × 최근 4줄 중 같은 첫 태그 수).
 *   구체 조건 가중은 이 구현이 더한 것이다: 조건 없는 생활 줄 120개가 사건에 붙은 줄을 덮지 않게 한다.
 */
export function pickFlavor(k: Tick, picks: readonly FlavorPick[], hasScene: boolean): FlavorPick | null {
  const s = k.next;
  if (s.pending || s.stage === 'end' || s.stage === 'pre' || hasScene) return null;
  const month = tickMonth(k);
  if (picks.some(p => p.month === month)) return null;
  if (roll(s.seed, month, 'gate') >= (s.stage === 'phd' ? P_PHD : P_OTHER)) return null;
  const lastShown = new Map<string, number>();
  for (const p of picks) lastShown.set(p.id, p.month);
  const recentTags = picks.slice(-RECENT).map(p => FLAVOR.find(l => l.id === p.id)?.tags[0]);
  const cands: { c: Compiled; w: number }[] = [];
  for (const c of COMPILED) {
    if (c.unknown.length || !stageOk(c.line, s.stage)) continue;
    if (c.line.field !== undefined && c.line.field !== s.choices.track) continue;
    const last = lastShown.get(c.line.id);
    const gap = c.gap ?? (s.stage === 'phd' ? GAP_PHD : GAP_OTHER);
    if (last !== undefined && month - last < gap) continue;
    if (!c.pred(k)) continue;
    cands.push({ c, w: weight(c, recentTags) });
  }
  if (cands.length === 0) return null;
  let r = roll(s.seed, month, 'line') * cands.reduce((a, x) => a + x.w, 0);
  for (const x of cands) { r -= x.w; if (r < 0) return { month, id: x.c.line.id }; }
  return { month, id: cands[cands.length - 1]!.c.line.id };
}

/** 고른 줄의 문장. 팩에서 사라진 id 면 undefined. */
export const flavorText = (id: string): string | undefined => FLAVOR.find(l => l.id === id)?.text;
