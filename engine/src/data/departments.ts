// departments 팩(483건)의 note 를 파싱해 학과 단위·묶음·엔진 키·트랙 가중치를 만든다(선택권 §2.2, §10, §11).
// note 는 ` · ` 로 나뉜 토큰이다. 첫 토큰이 학과명이고 `field X`, `track Y`, `NRF 코드 이름`, `KEDI 코드 …`,
// `same_unit_as: id, id`, `대표 id (묶음 N)` 토큰이 이어진다. 옛 표기 `same_unit_as(구 표기)` 는 읽지 않는다.
import type { Confidence, Field } from '../types';
import type { DataBundle } from './load';
import { NUMBERED_SLUGS } from './taxonomy';

export interface DeptRecord {
  id: string; school: string; slug: string; name: string; field: Field; track: string; nrf: string; kedi?: string;
  confidence: Confidence; sameUnitAs: string[]; representative: string | null; bundle: number | null;
  numbered: boolean; noAdmission: boolean;
}
export interface DeptIndex {
  records: Map<string, DeptRecord>;
  bundles: { n: number; members: string[]; representative: string }[];
  unitKeys: Map<string, string>;     // 레코드 id → 단위 키 `<school>/<unit_slug>`
  recordKeys: Map<string, string>;   // 레코드 id → 레코드 키
  units: string[];                   // 고유 단위 키(사전순)
}

const FIELDS: readonly string[] = ['cs', 'math', 'bio', 'engineering', 'social', 'humanities'];
const SLUG_RE = /^[a-z0-9_-]{1,32}$/;
// 이번 차수 박사 모집이 없는 단위(선택권 §2.4의 3건)의 note 표지: `박사 ×(…)` 또는 `박사 모집여부 ×(…)`.
// "석박통합 미모집", "1차 미모집이므로 대체 후보" 같은 다른 문장은 모집 없음이 아니다.
const NO_ADMISSION_RE = /박사 (?:모집여부 )?×/;
const SUFFIX_RE = /-\d+$/;

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function parseRecord(id: string, note: string, confidence: Confidence): DeptRecord & { repNote: { id: string; n: number } | null } {
  const m = id.match(/^departments-([a-z0-9]+)-(.+)$/);
  if (!m) throw new Error(`unexpected department id: ${id}`);
  const tokens = note.split(' · ').map(t => t.trim());
  const field = tokens.find(t => t.startsWith('field '))?.slice('field '.length);
  const track = tokens.find(t => t.startsWith('track '))?.slice('track '.length);
  const nrf = tokens.find(t => t.startsWith('NRF '))?.split(/\s+/)[1];
  if (!field || !FIELDS.includes(field)) throw new Error(`${id}: missing or invalid field token`);
  if (!track) throw new Error(`${id}: missing track token`);
  if (!nrf || !/^[A-Z]\d{6}$/.test(nrf)) throw new Error(`${id}: missing or invalid NRF token`);
  const kediTok = tokens.find(t => t.startsWith('KEDI '))?.split(/\s+/)[1];
  const kedi = kediTok && /^U\d+$/.test(kediTok) ? kediTok : undefined;   // "KEDI 해당 없음" 은 undefined

  const same = tokens.filter(t => t.startsWith('same_unit_as:'));
  if (same.length > 1) throw new Error(`${id}: more than one same_unit_as marker`);
  const sameUnitAs = same.length ? same[0]!.slice('same_unit_as:'.length).split(',').map(s => s.trim()).filter(Boolean) : [];
  const rep = tokens.map(t => t.match(/^대표 (departments-\S+) \(묶음 (\d+)\)$/)).find(Boolean) ?? null;

  return {
    id, school: m[1]!, slug: m[2]!, name: tokens[0]!, field: field as Field, track, nrf, ...(kedi ? { kedi } : {}),
    confidence, sameUnitAs, representative: rep ? rep[1]! : null, bundle: rep ? Number(rep[2]) : null,
    numbered: SUFFIX_RE.test(id), noAdmission: NO_ADMISSION_RE.test(note), repNote: rep ? { id: rep[1]!, n: Number(rep[2]) } : null,
  };
}

export function indexDepartments(data: DataBundle): DeptIndex {
  const records = new Map<string, DeptRecord>();
  for (const r of data.records.values()) {
    if (!r.id.startsWith('departments-') || r.id.endsWith('-tuition')) continue;
    const { repNote: _unused, ...rec } = parseRecord(r.id, r.note, r.confidence);
    records.set(r.id, rec);
  }

  // 묶음: same_unit_as 마커를 union-find 로 묶는다. 마커가 한쪽에만 있어도 양쪽 모두 구성원이다.
  const parent = new Map<string, string>();
  const root = (x: string): string => {
    let r = x;
    while (parent.has(r) && parent.get(r) !== r) r = parent.get(r)!;
    parent.set(x, r);
    return r;
  };
  const inBundle = new Set<string>();
  for (const rec of records.values()) {
    for (const o of rec.sameUnitAs) {
      if (!records.has(o)) throw new Error(`${rec.id}: same_unit_as target not found: ${o}`);
      inBundle.add(rec.id);
      inBundle.add(o);
      const a = root(rec.id), b = root(o);
      if (a !== b) parent.set(a, b);
    }
  }
  const groups = new Map<string, string[]>();
  for (const id of inBundle) {
    const g = root(id);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(id);
  }

  const bundles: DeptIndex['bundles'] = [];
  for (const members of groups.values()) {
    members.sort(cmp);
    // 대표: 번호 접미가 없는 레코드 먼저, 그 안에서 id 사전순 첫 레코드(선택권 §10 규칙 3).
    const rule = [...members].sort((a, b) => Number(SUFFIX_RE.test(a)) - Number(SUFFIX_RE.test(b)) || cmp(a, b))[0]!;
    const declared = new Set(members.map(id => records.get(id)!.representative));
    const nums = new Set(members.map(id => records.get(id)!.bundle));
    if (declared.size !== 1 || nums.size !== 1 || declared.has(null) || nums.has(null)) {
      throw new Error(`bundle ${members.join(',')}: members disagree on the 대표 note (${[...declared].join(',')} / ${[...nums].join(',')})`);
    }
    const noteRep = [...declared][0]!;
    if (noteRep !== rule) throw new Error(`bundle ${members.join(',')}: note representative ${noteRep} != rule representative ${rule}`);
    const n = [...nums][0]!;
    bundles.push({ n, members, representative: rule });
  }
  bundles.sort((a, b) => a.n - b.n);
  if (new Set(bundles.map(b => b.n)).size !== bundles.length) throw new Error('duplicate bundle number');

  // 엔진 키(선택권 §11).
  const bundleOf = new Map<string, { n: number; members: string[]; representative: string }>();
  for (const b of bundles) for (const id of b.members) bundleOf.set(id, b);
  const ownUnitKey = (rec: DeptRecord): string => {
    const slug = rec.numbered ? NUMBERED_SLUGS[rec.id] : rec.slug;
    if (!slug) throw new Error(`${rec.id}: numbered record without NUMBERED_SLUGS entry`);
    return `${rec.school}/${slug}`;
  };
  const unitKeys = new Map<string, string>();
  const recordKeys = new Map<string, string>();
  for (const rec of records.values()) {
    const b = bundleOf.get(rec.id);
    if (!b) {
      const k = ownUnitKey(rec);
      unitKeys.set(rec.id, k);
      recordKeys.set(rec.id, k);
    } else {
      const k = ownUnitKey(records.get(b.representative)!);
      unitKeys.set(rec.id, k);
      recordKeys.set(rec.id, `${k}@${rec.track}`);
      if (rec.numbered && `${rec.school}/${NUMBERED_SLUGS[rec.id]}` !== recordKeys.get(rec.id)) {
        throw new Error(`${rec.id}: NUMBERED_SLUGS ${NUMBERED_SLUGS[rec.id]} != derived record key ${recordKeys.get(rec.id)}`);
      }
    }
  }
  for (const [id, k] of unitKeys) {
    const slug = k.split('/')[1]!;
    if (!SLUG_RE.test(slug)) throw new Error(`${id}: unit slug violates format: ${slug}`);
  }
  if (new Set(recordKeys.values()).size !== recordKeys.size) throw new Error('record keys are not unique');
  const units = [...new Set(unitKeys.values())].sort(cmp);
  return { records, bundles, unitKeys, recordKeys, units };
}

export function unitKey(rec: DeptRecord, idx: DeptIndex): string {
  const k = idx.unitKeys.get(rec.id);
  if (!k) throw new Error(`unknown department record: ${rec.id}`);
  return k;
}

export function recordKey(rec: DeptRecord, idx: DeptIndex): string {
  const k = idx.recordKeys.get(rec.id);
  if (!k) throw new Error(`unknown department record: ${rec.id}`);
  return k;
}

/** 트랙별 가중치 = 그 트랙의 고유 학과 단위 수. 묶음 구성원은 1/k 씩 자기 트랙에 센다(선택권 §2.2). */
export function trackWeights(idx: DeptIndex): Record<string, number> {
  const bundleSize = new Map<string, number>();
  for (const b of idx.bundles) for (const id of b.members) bundleSize.set(id, b.members.length);
  const w: Record<string, number> = {};
  for (const rec of idx.records.values()) w[rec.track] = (w[rec.track] ?? 0) + 1 / (bundleSize.get(rec.id) ?? 1);
  return w;
}

/** 트랙에 걸친 학과 단위의 대표 레코드 id. 묶음은 한 번만 나오고, id 사전순이다. */
export function unitsForTrack(idx: DeptIndex, track: string): string[] {
  const bundleOf = new Map<string, string>();
  for (const b of idx.bundles) for (const id of b.members) bundleOf.set(id, b.representative);
  const out = new Set<string>();
  for (const rec of idx.records.values()) if (rec.track === track) out.add(bundleOf.get(rec.id) ?? rec.id);
  return [...out].sort(cmp);
}
