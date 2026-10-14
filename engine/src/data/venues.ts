// 투고처 접근자(선택권 §6.3·§6.4). 저널은 SJR 사분위·KCI 등재 레코드, 학회는 CORE 등급·채택률 레코드에서 계층(T1–T4)을 얻는다.
import { ASSUMED } from '../assumed';
import type { Field, Tier } from '../types';
import { get, type DataBundle, type DataRecord, type DataValue } from './load';

const TIERS: readonly Tier[] = ['T1', 'T2', 'T3', 'T4'];

/** 트랙 → venues 분야군 키(0014#65). 분야군이 없는 트랙(english_literature, linguistics)은 null. */
export function fieldGroupOf(track: string): string | null {
  const g = ASSUMED.TRACK_VENUE_GROUP[track];
  if (g === undefined) throw new Error(`unknown track: ${track}`);
  return g;
}

// 저널 레코드 note 의 "분야군 <한국어 이름>" 을 TRACK_VENUE_GROUP 의 ASCII 키로 바꾸는 표(12개). 저널 103건 전부가 이 12개 중 하나다.
const GROUP_NAME_TO_KEY: Readonly<Record<string, string>> = {
  '컴퓨터과학·인공지능': 'cs-ai',
  '수학': 'math',
  '통계학': 'statistics',
  '생명과학': 'life',
  '기계·전기전자공학': 'mech-elec',
  '화학·재료공학': 'chem-mat',
  '토목·환경공학': 'civil-env',
  '사회학': 'sociology',
  '경제학': 'economics',
  '정치학·행정학': 'politics-admin',
  '심리학': 'psychology',
  '역사학·철학·한국문학': 'history-philosophy-ko',
};

interface JournalEntry { id: string; group: string; tier: Tier }
interface ConferenceEntry { id: string; slug: string; tier: Tier }
interface VenueIndex { journals: JournalEntry[]; conferences: ConferenceEntry[] }

const JOURNAL_RE = /^venues-journal-.+-(sjr-quartile|kci)$/;
const CONF_CORE_RE = /^venues-conf-(.+)-core-rank$/;

function journalTier(rec: DataRecord): Tier {
  if (rec.id.endsWith('-sjr-quartile')) {
    // SJR 사분위 1..4 ↔ T1..T4
    const t = TIERS[rec.value - 1];
    if (!Number.isInteger(rec.value) || !t) throw new Error(`bad SJR quartile: ${rec.id}=${rec.value}`);
    return t;
  }
  // KCI: 등재(1) → T3, 등재후보(0) → T4. 우수등재도 value 1 이므로 T3 이다.
  if (rec.value === 1) return 'T3';
  if (rec.value === 0) return 'T4';
  throw new Error(`bad KCI value: ${rec.id}=${rec.value}`);
}

// CORE 등급 값 A*=4, A=3, B=2, C=1 ↔ T1, T2, T3, T4
function conferenceTier(rec: DataRecord): Tier {
  const t = TIERS[4 - rec.value];
  if (!Number.isInteger(rec.value) || !t) throw new Error(`bad CORE rank: ${rec.id}=${rec.value}`);
  return t;
}

const indexCache = new WeakMap<DataBundle, VenueIndex>();
function venueIndex(data: DataBundle): VenueIndex {
  const hit = indexCache.get(data);
  if (hit) return hit;
  const journals: JournalEntry[] = [];
  const conferences: ConferenceEntry[] = [];
  for (const r of data.records.values()) {
    if (JOURNAL_RE.test(r.id)) {
      const name = /분야군 ([^\s.;,]+)/.exec(r.note)?.[1];
      const group = name === undefined ? undefined : GROUP_NAME_TO_KEY[name];
      if (!group) throw new Error(`${r.id}: unknown venue group "${name}"`);
      journals.push({ id: r.id, group, tier: journalTier(r) });
      continue;
    }
    const m = CONF_CORE_RE.exec(r.id);
    if (m) conferences.push({ id: r.id, slug: m[1]!, tier: conferenceTier(r) });
  }
  const byId = (a: { id: string }, b: { id: string }): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const idx = { journals: journals.sort(byId), conferences: conferences.sort(byId) };
  indexCache.set(data, idx);
  return idx;
}

const virtualBase = (tier: Tier): DataValue => ({ value: ASSUMED.TIER_BASE[tier], confidence: 'assumed', id: '0014#66', unit: 'ratio' });

/** 학회의 채택률 레코드(여러 해가 있으면 가장 최근 해). */
function acceptanceOf(data: DataBundle, slug: string): DataRecord | undefined {
  const prefix = `venues-conf-${slug}-acceptance-`;
  let best: DataRecord | undefined;
  for (const r of data.records.values()) if (r.id.startsWith(prefix) && (!best || r.id > best.id)) best = r;
  return best;
}

/**
 * 계층 기준 채택 확률(0014#66, 선택권 §6.4). 학회(`venues-conf-{slug}-core-rank` 또는 `-acceptance-{year}` id)이고
 * 채택률 레코드가 있으면 그 값, 아니면 계층 기준값(assumed).
 */
export function tierBaseRate(data: DataBundle, tier: Tier, venueId?: string): DataValue {
  const m = venueId === undefined ? null : /^venues-conf-(.+?)-(?:core-rank|acceptance-\d+)$/.exec(venueId);
  const acc = m ? acceptanceOf(data, m[1]!) : undefined;
  return acc ? get(data, acc.id) : virtualBase(tier);
}

/**
 * 트랙·계층에 맞는 투고처 목록. 저널은 트랙의 분야군에서 해당 계층(SJR 사분위·KCI)인 것,
 * computer·ai 트랙에는 CORE 등급이 해당 계층인 학회가 더해진다. venueId 는 저널의 sjr/kci 레코드 id, 학회의 core-rank 레코드 id.
 * 분야군이 없는 트랙, 또는 해당 계층에 실재 투고처가 하나도 없으면 이름 없는 가상 학술지 하나(venueId null)를 돌려준다.
 */
export function venueOptions(data: DataBundle, track: string, tier: Tier): { venueId: string | null; pTier: DataValue }[] {
  const group = fieldGroupOf(track);
  const virtual = [{ venueId: null, pTier: virtualBase(tier) }];
  if (group === null) return virtual;
  const idx = venueIndex(data);
  const out: { venueId: string | null; pTier: DataValue }[] = [];
  for (const j of idx.journals) if (j.group === group && j.tier === tier) out.push({ venueId: j.id, pTier: virtualBase(tier) });
  if ((ASSUMED.CONFERENCE_TRACKS as readonly string[]).includes(track)) {
    for (const c of idx.conferences) if (c.tier === tier) out.push({ venueId: c.id, pTier: tierBaseRate(data, tier, c.id) });
  }
  return out.length > 0 ? out : virtual;
}

/** 분야별 심사 기간 범위(개월, 0014#69). */
export function reviewMonths(field: Field): [number, number] {
  const [lo, hi] = ASSUMED.REVIEW_MONTHS[field];
  return [lo, hi];
}
