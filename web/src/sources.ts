// 근거 신뢰도 표시와 출처 footer(#60)의 DOM 없는 부분. 화면이 레코드에서 온 값을 보여줄 때 그 값의 근거 id 를 함께 넘기고,
// footer 는 지금 화면에 보인 근거 id 들의 출처를 적는다. 근거 id 는 레코드 id 이거나 결정 기록 0014 번호(`0014#36`)다.
import type { DataBundle, LifeState, WebSource } from '../../engine/src/browser';
import type { Strings } from './strings.ko';

export type Confidence = 'verified' | 'indexed' | 'assumed';
const ASSUMED_RE = /^0014#(\d+)$/;

/** 근거 id 의 신뢰도: 0014 번호는 assumed, 레코드는 그 레코드의 confidence. 모르는 id 는 던진다. */
export function confidenceOf(id: string, data: DataBundle): Confidence {
  if (ASSUMED_RE.test(id)) return 'assumed';
  const r = data.records.get(id);
  if (!r) throw new Error(`unknown evidence id: ${id}`);
  return r.confidence;
}

/** 값 옆에 붙일 표시. verified 는 빈 문자열. 여러 근거면 가장 약한 것. */
export function markFor(ids: readonly string[], data: DataBundle, t: Strings): string {
  const order: Confidence[] = ['assumed', 'indexed', 'verified'];
  if (ids.length === 0) return '';
  const weakest = ids.map(id => confidenceOf(id, data)).sort((a, b) => order.indexOf(a) - order.indexOf(b))[0]!;
  return t.sources.marks[weakest];
}

/** 화면에 적는 레코드 id: 학교 id 토막(`kaist`)을 가상 표시명으로 바꾼다(결정 기록 0004). */
export function displayId(id: string, t: Strings): string {
  const names: Readonly<Record<string, string>> = t.schoolNames;
  return id.split('-').map(tok => (Object.hasOwn(names, tok) ? `[${names[tok]}]` : tok)).join('-');
}

const fill = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? `{${k}}`));
const man = (won: number, t: Strings): string => fill(t.sources.won, { n: Math.round(won / 10_000).toLocaleString('ko-KR') });

export interface EvidenceRow { label: string; value: string; mark: string; ids: string[] }

/** 돈 표: 현금·빚(엔진 계산, 근거 없음), 박사과정이면 월 자금 수입·최근 등록금·입학금(레코드나 0014 번호가 근거). */
export function moneyRows(s: LifeState, data: DataBundle, t: Strings): EvidenceRow[] {
  const S = t.sources;
  const rows: EvidenceRow[] = [
    { label: S.cash, value: man(s.money.cash, t), mark: '', ids: [] },
    { label: S.debt, value: man(s.money.debt, t), mark: '', ids: [] },
  ];
  const withIds = (label: string, won: number, ids: string[]) => rows.push({ label, value: man(won, t), mark: markFor(ids, data, t), ids });
  const f = s.phd?.fundingState;
  if (s.stage === 'phd' && f) withIds(S.stipend, f.monthly, f.recordIds);
  const lastTuition = [...s.ledger].reverse().find(e => e.kind === 'tuition' && e.recordId);
  if (s.stage === 'phd' && lastTuition) withIds(S.tuition, -lastTuition.amount, [lastTuition.recordId!]);
  const fee = s.ledger.find(e => e.kind === 'entrance-fee' && e.recordId);
  if (fee) withIds(S.entranceFee, -fee.amount, [fee.recordId!]);
  return rows;
}

/** footer 한 줄: 근거 id(학교는 가상 표시명), 표시, 출처(제목 · 발행처 · 연도) 또는 0014 번호. 근거 id 순서는 처음 나온 순. */
export function footerLines(ids: readonly string[], data: DataBundle, sources: Readonly<Record<string, WebSource>>, t: Strings): string[] {
  const out: string[] = [];
  for (const id of [...new Set(ids)]) {
    const a = ASSUMED_RE.exec(id);
    if (a) { out.push(fill(t.sources.assumedLine, { n: `#${a[1]}` })); continue; }
    const r = data.records.get(id);
    if (!r) throw new Error(`unknown evidence id: ${id}`);
    const src = sources[r.source_id];
    const mark = t.sources.marks[r.confidence];
    const where = src ? `${src.title} · ${src.publisher} · ${src.year}` : t.sources.unknownSource;
    out.push(`${displayId(id, t)}${mark ? ` (${mark})` : ''} — ${where}`);
  }
  return out;
}
